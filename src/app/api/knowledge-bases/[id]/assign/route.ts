import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callRetellApi } from "@/lib/retell"
import { z } from "zod"
import { updateBotPromptWithPricingPrompt } from "@/lib/bot-prompt-helper"

export const dynamic = "force-dynamic"

const assignSchema = z.object({
  botId: z.string().cuid().nullable(), // null = unassign
})

/**
 * PATCH /api/knowledge-bases/[id]/assign
 * 1 KB can only be assigned to 1 agent. This replaces any existing assignment.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    const body = await req.json()
    const { botId } = assignSchema.parse(body)

    const kb = await prisma.knowledgeBase.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      include: {
        customer: { select: { id: true } }
      }
    })

    if (!kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      )
    }

    if (role === "CUSTOMER" && kb.customerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (botId) {
      const targetBot = await prisma.bot.findFirst({
        where: { id: botId, organizationId }
      })
      if (!targetBot) {
        return NextResponse.json(
          { error: "Bot not found" },
          { status: 404 }
        )
      }
    }

    // Get current assignments (1 KB → 1 bot enforced by removing all first)
    const currentAssignments = await prisma.botKnowledgeBase.findMany({
      where: { knowledgeBaseId: params.id },
      include: {
        bot: { select: { id: true, retellLlmId: true, generalPrompt: true } },
        knowledgeBase: { select: { retellKnowledgeBaseId: true } }
      }
    })

    // Remove KB from old bots' Retell LLMs
    for (const a of currentAssignments) {
      const buildPromptWithoutKb = (prompt: string) => {
        const start = `<!--KB:${params.id}-->`
        const end = `<!--/KB:${params.id}-->`
        const regex = new RegExp(`${start}[\\s\\S]*?${end}`)
        return prompt.replace(regex, "")
      }
      const updatedPrompt = buildPromptWithoutKb(a.bot.generalPrompt || "")

      const remainingForBot = await prisma.botKnowledgeBase.findMany({
        where: {
          botId: a.bot.id,
          id: { not: a.id }
        },
        include: {
          knowledgeBase: { select: { retellKnowledgeBaseId: true } }
        }
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
            {
              general_prompt: updatedPrompt,
              knowledge_base_ids: knowledgeBaseIds
            },
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
    }

    // Delete all existing assignments for this KB
    await prisma.botKnowledgeBase.deleteMany({
      where: { knowledgeBaseId: params.id }
    })

    // Update pricingPrompt for old bots (HOTEL KB removed)
    if (kb.customerId) {
      const customer = await prisma.user.findFirst({
        where: {
          id: kb.customerId,
          customerType: "HOTEL"
        }
      })
      if (customer) {
        for (const a of currentAssignments) {
          updateBotPromptWithPricingPrompt(a.bot.id, organizationId).catch(
            () => {}
          )
        }
      }
    }

    let assignment = null

    if (botId) {
      const targetBot = await prisma.bot.findFirst({
        where: { id: botId, organizationId }
      })
      if (!targetBot) {
        return NextResponse.json(
          { error: "Bot not found" },
          { status: 404 }
        )
      }

      assignment = await prisma.botKnowledgeBase.create({
        data: {
          botId,
          knowledgeBaseId: params.id,
          topK: 3,
          filterScore: 0.5
        },
        include: {
          bot: { select: { id: true, name: true } }
        }
      })

      if (
        targetBot.retellLlmId &&
        kb.retellKnowledgeBaseId &&
        !kb.retellKnowledgeBaseId.startsWith("temp_")
      ) {
        try {
          const allAssignments = await prisma.botKnowledgeBase.findMany({
            where: { botId },
            include: {
              knowledgeBase: { select: { retellKnowledgeBaseId: true } }
            }
          })
          const knowledgeBaseIds = allAssignments
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
          await callRetellApi(
            "PATCH",
            `/update-retell-llm/${targetBot.retellLlmId}`,
            { knowledge_base_ids: knowledgeBaseIds },
            organizationId
          )
        } catch (err: any) {
          console.warn("[KB Assign] Retell update failed for new bot:", err)
        }
      }

      if (kb.customerId) {
        const customer = await prisma.user.findFirst({
          where: {
            id: kb.customerId,
            customerType: "HOTEL"
          }
        })
        if (customer) {
          updateBotPromptWithPricingPrompt(botId, organizationId).catch(
            () => {}
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      assignedBot: assignment?.bot ?? null
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error assigning knowledge base:", error)
    return NextResponse.json(
      { error: "Failed to assign knowledge base" },
      { status: 500 }
    )
  }
}
