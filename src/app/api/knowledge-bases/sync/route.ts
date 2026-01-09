import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRetellClient, callRetellApi } from "@/lib/retell"

export const dynamic = "force-dynamic"

/**
 * POST /api/knowledge-bases/sync
 * 1) Retell'deki tüm KB'leri çekip yerelde upsert eder (organizasyon scope).
 * 2) Retell LLM -> KB atamalarını çekip BotKnowledgeBase eşleşmelerini günceller.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role } = session.user
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    // 1) Pull KBs from Retell and upsert locally
    // Retell docs: list knowledge bases
    const retell = await getRetellClient(organizationId)
    const remoteKBs = await retell.knowledgeBase.list() as any
    const remoteList = Array.isArray(remoteKBs) ? remoteKBs : (remoteKBs?.data || [])

    let kbCreated = 0
    let kbUpdated = 0
    const remoteKbIds: Set<string> = new Set()

    for (const kb of remoteList) {
      const retellId =
        kb.knowledge_base_id || kb.id || kb.knowledgeBaseId
      if (!retellId) continue
      remoteKbIds.add(retellId)

      const existing = await prisma.knowledgeBase.findFirst({
        where: { organizationId, retellKnowledgeBaseId: retellId }
      })

      const texts = Array.isArray(kb.texts) ? kb.texts : []
      const enableAutoRefresh = kb.enable_auto_refresh ?? false
      const name = kb.knowledge_base_name || kb.name || `KB ${retellId}`

      if (existing) {
        await prisma.knowledgeBase.update({
          where: { id: existing.id },
          data: {
            name,
            texts: texts.length ? texts : existing.texts,
            enableAutoRefresh,
          }
        })
        kbUpdated++
      } else {
        await prisma.knowledgeBase.create({
          data: {
            organizationId,
            retellKnowledgeBaseId: retellId,
            name,
            texts,
            enableAutoRefresh,
          }
        })
        kbCreated++
      }
    }

    // Delete KBs that no longer exist on Retell
    let kbDeleted = 0
    if (remoteKbIds.size > 0) {
      const allLocalKBs = await prisma.knowledgeBase.findMany({
        where: {
          organizationId,
          retellKnowledgeBaseId: {
            notIn: Array.from(remoteKbIds)
          }
        },
        select: { id: true, retellKnowledgeBaseId: true }
      })
      
      // Filter out null retellKnowledgeBaseId values
      const localToDelete = allLocalKBs.filter(kb => kb.retellKnowledgeBaseId !== null)

      if (localToDelete.length > 0) {
        const ids = localToDelete.map(k => k.id)
        // Cascade will remove bot assignments
        await prisma.knowledgeBase.deleteMany({
          where: { id: { in: ids } }
        })
        kbDeleted = ids.length
        console.log("[KB Sync] removed stale KBs", ids)
      }
    } else {
      console.warn("[KB Sync] Retell returned zero KBs; skipping deletion to avoid wiping local records.")
    }

    console.log("[KB Sync] KB upsert complete created=%d updated=%d", kbCreated, kbUpdated)

    // 2) Sync KB assignments per bot LLM
    const bots = await prisma.bot.findMany({
      where: {
        organizationId,
        retellLlmId: { not: null }
      },
      select: {
        id: true,
        name: true,
        retellLlmId: true
      }
    })

    const assignmentSummary: Array<{
      botId: string
      botName: string
      assignmentsCreated: number
      assignmentsUpdated: number
      missingKbIds: string[]
    }> = []

    for (const bot of bots) {
      const llmId = bot.retellLlmId
      if (!llmId) continue

      console.log(`[KB Sync] Fetching LLM for bot=${bot.id} llm=${llmId}`)
      
      let llmData: any
      try {
        llmData = await callRetellApi(
          "GET",
          `/get-retell-llm/${llmId}`,
          null,
          organizationId
        )
      } catch (error: any) {
        // Handle 404 errors when LLM no longer exists in Retell
        if (error.message?.includes("404") || error.message?.includes("not found")) {
          console.warn(
            `[KB Sync] LLM not found in Retell for bot=${bot.id} llm=${llmId}, skipping...`
          )
          assignmentSummary.push({
            botId: bot.id,
            botName: bot.name,
            assignmentsCreated: 0,
            assignmentsUpdated: 0,
            missingKbIds: [`LLM not found: ${llmId}`]
          })
          continue
        }
        // Re-throw other errors
        throw error
      }

      const kbIds: Array<{
        knowledge_base_id: string
        top_k?: number
        filter_score?: number
      }> = llmData.knowledge_base_ids || []

      console.log(
        `[KB Sync] bot=${bot.id} llm=${llmId} kb_count=${kbIds.length}`,
        kbIds
      )

      let created = 0
      let updated = 0
      const missing: string[] = []

      for (const kbEntry of kbIds) {
        const kb = await prisma.knowledgeBase.findFirst({
          where: {
            organizationId,
            retellKnowledgeBaseId: kbEntry.knowledge_base_id
          }
        })

        if (!kb) {
          console.warn(
            `[KB Sync] Missing KB in DB org=${organizationId} retellKbId=${kbEntry.knowledge_base_id} (bot=${bot.id})`
          )
          missing.push(kbEntry.knowledge_base_id)
          continue
        }

        const existing = await prisma.botKnowledgeBase.findUnique({
          where: {
            botId_knowledgeBaseId: {
              botId: bot.id,
              knowledgeBaseId: kb.id
            }
          }
        })

        const topK = kbEntry.top_k ?? 3
        const filterScore = kbEntry.filter_score ?? 0.5

        if (existing) {
          await prisma.botKnowledgeBase.update({
            where: { id: existing.id },
            data: { topK, filterScore }
          })
          updated++
        } else {
          await prisma.botKnowledgeBase.create({
            data: {
              botId: bot.id,
              knowledgeBaseId: kb.id,
              topK,
              filterScore
            }
          })
          created++
        }
      }

      assignmentSummary.push({
        botId: bot.id,
        botName: bot.name,
        assignmentsCreated: created,
        assignmentsUpdated: updated,
        missingKbIds: missing
      })

      console.log(
        `[KB Sync] bot=${bot.id} created=${created} updated=${updated} missing=${missing.length}`
      )
    }

    return NextResponse.json({
      success: true,
      kbSummary: { created: kbCreated, updated: kbUpdated, deleted: kbDeleted },
      assignmentSummary,
    })
  } catch (error: any) {
    console.error("Error syncing KB assignments from Retell:", error)
    return NextResponse.json(
      { error: "Failed to sync KB assignments", details: error.message },
      { status: 500 }
    )
  }
}
