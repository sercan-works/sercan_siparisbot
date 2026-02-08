import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callRetellApi } from "@/lib/retell"
import { z } from "zod"
import { updateBotPromptWithPricingPrompt } from "@/lib/bot-prompt-helper"

export const dynamic = "force-dynamic"

const assignKBSchema = z.object({
  knowledgeBaseId: z.string().cuid(),
  topK: z.number().int().min(1).max(20).optional().default(3),
  filterScore: z.number().min(0).max(1).optional().default(0.5),
})

// GET /api/bots/[botId]/knowledge-bases - List assigned knowledge bases
export async function GET(
  req: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: {
        id: params.botId,
        organizationId
      }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    const assignments = await prisma.botKnowledgeBase.findMany({
      where: { botId: params.botId },
      include: {
        knowledgeBase: true
      }
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error("Error fetching bot knowledge bases:", error)
    return NextResponse.json(
      { error: "Failed to fetch knowledge bases" },
      { status: 500 }
    )
  }
}

// POST /api/bots/[botId]/knowledge-bases - Assign knowledge base to bot
export async function POST(
  req: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const body = await req.json()
    const data = assignKBSchema.parse(body)

    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: {
        id: params.botId,
        organizationId
      }
    })

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 })
    }

    // Verify KB ownership
    const kb = await prisma.knowledgeBase.findFirst({
      where: {
        id: data.knowledgeBaseId,
        organizationId
      }
    })

    if (!kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      )
    }

    // 1 KB → 1 agent: Remove any existing assignment of this KB to other bots
    const currentAssignments = await prisma.botKnowledgeBase.findMany({
      where: { knowledgeBaseId: data.knowledgeBaseId },
      include: {
        bot: { select: { id: true, retellLlmId: true, generalPrompt: true } }
      }
    })

    for (const a of currentAssignments) {
      const buildPromptWithoutKb = (prompt: string) => {
        const start = `<!--KB:${data.knowledgeBaseId}-->`
        const end = `<!--/KB:${data.knowledgeBaseId}-->`
        const regex = new RegExp(`${start}[\\s\\S]*?${end}`)
        return prompt.replace(regex, "")
      }
      const updatedPrompt = buildPromptWithoutKb(a.bot.generalPrompt || "")
      const remainingForBot = await prisma.botKnowledgeBase.findMany({
        where: { botId: a.bot.id, id: { not: a.id } },
        include: { knowledgeBase: { select: { retellKnowledgeBaseId: true } } }
      })
      const knowledgeBaseIds = remainingForBot
        .filter(
          (x) =>
            x.knowledgeBase.retellKnowledgeBaseId &&
            !x.knowledgeBase.retellKnowledgeBaseId.startsWith("temp_")
        )
        .map((x) => ({
          knowledge_base_id: x.knowledgeBase.retellKnowledgeBaseId!,
          top_k: x.topK,
          filter_score: x.filterScore
        }))
      if (a.bot.retellLlmId) {
        try {
          await callRetellApi(
            "PATCH",
            `/update-retell-llm/${a.bot.retellLlmId}`,
            { general_prompt: updatedPrompt, knowledge_base_ids: knowledgeBaseIds },
            organizationId
          )
        } catch (err: any) {
          console.warn("[KB Assign] Retell update failed for old bot:", err)
        }
      }
      await prisma.bot.update({
        where: { id: a.bot.id },
        data: { generalPrompt: updatedPrompt }
      })
      if (kb.customerId) {
        const customer = await prisma.user.findFirst({
          where: { id: kb.customerId, customerType: "HOTEL" }
        })
        if (customer) {
          updateBotPromptWithPricingPrompt(a.bot.id, organizationId).catch(() => {})
        }
      }
    }

    await prisma.botKnowledgeBase.deleteMany({
      where: { knowledgeBaseId: data.knowledgeBaseId }
    })

    // Create assignment in database
    const assignment = await prisma.botKnowledgeBase.create({
      data: {
        botId: params.botId,
        knowledgeBaseId: data.knowledgeBaseId,
        topK: data.topK,
        filterScore: data.filterScore,
      },
      include: {
        knowledgeBase: true
      }
    })

    // Update Retell LLM with KB assignment
    if (bot.retellLlmId && kb.retellKnowledgeBaseId && !kb.retellKnowledgeBaseId.startsWith("temp_")) {
      try {
        // Get all current KB assignments for this bot
        const allAssignments = await prisma.botKnowledgeBase.findMany({
          where: { botId: params.botId },
          include: {
            knowledgeBase: {
              select: {
                retellKnowledgeBaseId: true
              }
            }
          }
        })

        // Build knowledge_base_ids array for Retell
        const knowledgeBaseIds = allAssignments
          .filter(a => a.knowledgeBase.retellKnowledgeBaseId && !a.knowledgeBase.retellKnowledgeBaseId.startsWith("temp_"))
          .map(a => ({
            knowledge_base_id: a.knowledgeBase.retellKnowledgeBaseId,
            top_k: a.topK,
            filter_score: a.filterScore
          }))

        console.log(`[KB Assign] Updating Retell LLM ${bot.retellLlmId} with KB IDs:`, knowledgeBaseIds)

        // Update Retell LLM
        await callRetellApi(
          "PATCH",
          `/update-retell-llm/${bot.retellLlmId}`,
          {
            knowledge_base_ids: knowledgeBaseIds
          },
          organizationId
        )

        console.log(`[KB Assign] Successfully updated Retell LLM with KB assignment`)
      } catch (retellError: any) {
        console.error("[KB Assign] Failed to update Retell LLM:", retellError)
        // Don't fail assignment if Retell update fails - local assignment is still valid
        // User can sync manually later
      }
    } else {
      if (!bot.retellLlmId) {
        console.warn(`[KB Assign] Bot ${params.botId} has no retellLlmId, skipping Retell update`)
      }
      if (!kb.retellKnowledgeBaseId || kb.retellKnowledgeBaseId.startsWith("temp_")) {
        console.warn(`[KB Assign] KB ${data.knowledgeBaseId} has invalid retellKnowledgeBaseId (${kb.retellKnowledgeBaseId}), skipping Retell update`)
      }
    }

    // Update bot prompt with pricingPrompt if KB belongs to HOTEL customer
    if (kb.customerId) {
      const customer = await prisma.user.findFirst({
        where: {
          id: kb.customerId,
          customerType: "HOTEL"
        }
      })

      if (customer) {
        updateBotPromptWithPricingPrompt(params.botId, organizationId).catch((err) => {
          console.error("[POST /api/bots/[botId]/knowledge-bases] Failed to update pricingPrompt:", err)
          // Don't fail KB assignment if pricingPrompt update fails
        })
      }
    }

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error("Error assigning knowledge base:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to assign knowledge base" },
      { status: 500 }
    )
  }
}
