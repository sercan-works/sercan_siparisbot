import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRetellClient, callRetellApi } from "@/lib/retell"
import { updateBotPromptWithPricingPrompt } from "@/lib/bot-prompt-helper"

export const dynamic = "force-dynamic"

// DELETE /api/bots/[botId]/knowledge-bases/[assignmentId] - Unassign KB from bot
export async function DELETE(
  req: NextRequest,
  { params }: { params: { botId: string; assignmentId: string } }
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

    // Verify assignment exists
    const assignment = await prisma.botKnowledgeBase.findFirst({
      where: {
        id: params.assignmentId,
        botId: params.botId
      },
      include: {
        knowledgeBase: true
      }
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      )
    }

    // Get remaining assignments after deletion
    const remainingAssignments = await prisma.botKnowledgeBase.findMany({
      where: {
        botId: params.botId,
        id: { not: params.assignmentId }
      },
      include: { knowledgeBase: true }
    })

    // Prompt cleanup: remove KB block
    const buildPrompt = (prompt: string) => {
      const start = `<!--KB:${assignment.knowledgeBaseId}-->`
      const end = `<!--/KB:${assignment.knowledgeBaseId}-->`
      const regex = new RegExp(`${start}[\\s\\S]*?${end}`)
      return prompt.replace(regex, "")
    }

    const updatedPrompt = buildPrompt(bot.generalPrompt || "")

    // Verify we have an LLM ID
    if (!bot.retellLlmId) {
      throw new Error("Bot does not have an associated LLM ID")
    }

    // Update Retell LLM: remove KB from knowledge_base_ids array
    try {
      // Build updated knowledge_base_ids array (excluding the one being removed)
      const knowledgeBaseIds = remainingAssignments
        .filter(a => a.knowledgeBase.retellKnowledgeBaseId && !a.knowledgeBase.retellKnowledgeBaseId.startsWith("temp_"))
        .map(a => ({
          knowledge_base_id: a.knowledgeBase.retellKnowledgeBaseId,
          top_k: a.topK,
          filter_score: a.filterScore
        }))

      console.log(`[KB Unassign] Updating Retell LLM ${bot.retellLlmId} with remaining KB IDs:`, knowledgeBaseIds)

      // Update Retell LLM with remaining KBs and updated prompt
      await callRetellApi(
        "PATCH",
        `/update-retell-llm/${bot.retellLlmId}`,
        {
          general_prompt: updatedPrompt,
          knowledge_base_ids: knowledgeBaseIds
        },
        organizationId
      )

      console.log(`[KB Unassign] Successfully updated Retell LLM`)
    } catch (retellErr: any) {
      // Handle 404 errors when LLM no longer exists in Retell
      if (retellErr.message?.includes("404") || retellErr.message?.includes("not found")) {
        console.warn(
          `[KB Unassign] LLM not found in Retell for bot=${bot.id} llm=${bot.retellLlmId}, applying local cleanup only`
        )
      } else {
        console.warn("[KB Unassign] Retell update failed, applying local cleanup only", retellErr)
      }
    }

    // Delete assignment from database
    await prisma.botKnowledgeBase.delete({
      where: { id: params.assignmentId }
    })

    // Persist prompt update locally
    await prisma.bot.update({
      where: { id: bot.id },
      data: { generalPrompt: updatedPrompt }
    })

    // Update bot prompt with pricingPrompt (to remove pricingPrompt if KB was removed)
    // Check if KB belongs to HOTEL customer
    if (assignment.knowledgeBase.customerId) {
      const customer = await prisma.user.findFirst({
        where: {
          id: assignment.knowledgeBase.customerId,
          customerType: "HOTEL"
        }
      })

      if (customer) {
        updateBotPromptWithPricingPrompt(params.botId, organizationId).catch((err) => {
          console.error("[DELETE /api/bots/[botId]/knowledge-bases/[assignmentId]] Failed to update pricingPrompt:", err)
          // Don't fail KB unassignment if pricingPrompt update fails
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unassigning knowledge base:", error)
    return NextResponse.json(
      { error: "Failed to unassign knowledge base" },
      { status: 500 }
    )
  }
}
