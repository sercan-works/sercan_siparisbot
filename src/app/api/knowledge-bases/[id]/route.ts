import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callRetellApi } from "@/lib/retell"
import { z } from "zod"
import { updateBotPromptWithPricingPrompt } from "@/lib/bot-prompt-helper"

export const dynamic = "force-dynamic"

const updateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  texts: z.array(z.string()).min(1).optional(),
  enableAutoRefresh: z.boolean().optional(),
  customerId: z.string().cuid().optional(), // Admin-only reassignment
})

// GET /api/knowledge-bases/[id] - Get single knowledge base
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    const knowledgeBase = await prisma.knowledgeBase.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      include: {
        bots: {
          include: {
            bot: {
              select: { id: true, name: true }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            customerType: true,
          }
        }
      }
    })

    if (!knowledgeBase) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      )
    }

    if (role === "CUSTOMER" && knowledgeBase.customerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ knowledgeBase })
  } catch (error) {
    console.error("Error fetching knowledge base:", error)
    return NextResponse.json(
      { error: "Failed to fetch knowledge base" },
      { status: 500 }
    )
  }
}

// PUT /api/knowledge-bases/[id] - Update knowledge base
export async function PUT(
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
    const data = updateKnowledgeBaseSchema.parse(body)

    // Verify ownership
    const existingKB = await prisma.knowledgeBase.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!existingKB) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      )
    }

    if (role === "CUSTOMER" && existingKB.customerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    let targetCustomerId = existingKB.customerId
    if (role === "CUSTOMER") {
      targetCustomerId = userId
    } else if (data.customerId) {
      const targetCustomer = await prisma.user.findFirst({
        where: {
          id: data.customerId,
          organizationId,
          role: "CUSTOMER"
        },
        select: { id: true }
      })

      if (!targetCustomer) {
        return NextResponse.json(
          { error: "Customer not found for this organization" },
          { status: 404 }
        )
      }

      targetCustomerId = targetCustomer.id
    }

    // Retell KB güncellenmeyecek, sadece lokal kayıt güncellenecek
    // Mevcut retellKnowledgeBaseId korunur (temp_ ile başlıyorsa değişmez)
    let retellKnowledgeBaseId = existingKB.retellKnowledgeBaseId
    if (!retellKnowledgeBaseId || retellKnowledgeBaseId.startsWith("temp_")) {
      // Eğer temp ID varsa veya yoksa, yeni temp ID oluşturma (mevcut temp ID'yi koru)
      retellKnowledgeBaseId = existingKB.retellKnowledgeBaseId || `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`
    }
    console.log(`[KB Update] Lokal KB güncelleniyor (Retell'e senkronize edilmeyecek): ${retellKnowledgeBaseId}`)

    // Update in database
    const knowledgeBase = await prisma.knowledgeBase.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.texts && { texts: data.texts }),
        ...(data.enableAutoRefresh !== undefined && { enableAutoRefresh: data.enableAutoRefresh }),
        ...(targetCustomerId ? { customerId: targetCustomerId } : {}),
        ...(retellKnowledgeBaseId ? { retellKnowledgeBaseId } : {}),
      },
      include: {
        bots: {
          include: {
            bot: {
              select: { id: true, name: true, retellLlmId: true, generalPrompt: true }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            customerType: true,
          }
        }
      }
    })

    // Update bot prompts if pricingPrompt changed (only pricingPrompt, not full KB)
    if (data.texts && knowledgeBase.bots.length > 0 && knowledgeBase.customer?.customerType === "HOTEL") {
      try {
        // Check if pricing.pricingPrompt changed
        const oldKBTexts = existingKB.texts || []
        const newKBTexts = data.texts
        
        let oldPricingPrompt = ""
        let newPricingPrompt = ""
        
        try {
          if (oldKBTexts.length > 0) {
            const oldHotelData = JSON.parse(oldKBTexts[0])
            oldPricingPrompt = oldHotelData.pricing?.pricingPrompt || ""
          }
        } catch (e) {
          // Ignore parse errors
        }
        
        try {
          if (newKBTexts.length > 0) {
            const newHotelData = JSON.parse(newKBTexts[0])
            newPricingPrompt = newHotelData.pricing?.pricingPrompt || ""
          }
        } catch (e) {
          // Ignore parse errors
        }
        
        // If pricingPrompt changed, update all linked bots
        if (oldPricingPrompt !== newPricingPrompt) {
          for (const assignment of knowledgeBase.bots) {
            updateBotPromptWithPricingPrompt(assignment.bot.id, organizationId).catch((err) => {
              console.error(`[PUT /api/knowledge-bases/[id]] Failed to update pricingPrompt for bot ${assignment.bot.id}:`, err)
            })
          }
        }
      } catch (updateError) {
        console.error("[PUT /api/knowledge-bases/[id]] Error checking pricingPrompt:", updateError)
        // Don't fail KB update if pricingPrompt check fails
      }
    }

    return NextResponse.json({ knowledgeBase })
  } catch (error) {
    console.error("Error updating knowledge base:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update knowledge base" },
      { status: 500 }
    )
  }
}

// DELETE /api/knowledge-bases/[id] - Delete knowledge base
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    // Verify ownership + load bots for prompt cleanup
    const existingKB = await prisma.knowledgeBase.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      include: {
        bots: {
          include: {
            bot: {
              select: { id: true, retellLlmId: true, generalPrompt: true }
            }
          }
        }
      }
    })

    if (!existingKB) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      )
    }

    if (role === "CUSTOMER" && existingKB.customerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Remove KB from all Retell LLMs that have it assigned
    if (existingKB.retellKnowledgeBaseId && !existingKB.retellKnowledgeBaseId.startsWith("temp_")) {
      try {
        // Get all bots that have this KB assigned
        const botsWithKB = await prisma.botKnowledgeBase.findMany({
          where: { knowledgeBaseId: params.id },
          include: {
            bot: {
              select: {
                id: true,
                retellLlmId: true
              }
            }
          }
        })

        // Remove KB from each bot's Retell LLM
        for (const assignment of botsWithKB) {
          if (assignment.bot.retellLlmId) {
            try {
              // Get remaining KB assignments for this bot
              const remainingAssignments = await prisma.botKnowledgeBase.findMany({
                where: {
                  botId: assignment.bot.id,
                  knowledgeBaseId: { not: params.id }
                },
                include: {
                  knowledgeBase: {
                    select: {
                      retellKnowledgeBaseId: true
                    }
                  }
                }
              })

              // Build updated knowledge_base_ids array
              const knowledgeBaseIds = remainingAssignments
                .filter(a => a.knowledgeBase.retellKnowledgeBaseId && !a.knowledgeBase.retellKnowledgeBaseId.startsWith("temp_"))
                .map(a => ({
                  knowledge_base_id: a.knowledgeBase.retellKnowledgeBaseId,
                  top_k: a.topK,
                  filter_score: a.filterScore
                }))

              console.log(`[KB Delete] Removing KB from Retell LLM ${assignment.bot.retellLlmId}`)

              await callRetellApi(
                "PATCH",
                `/update-retell-llm/${assignment.bot.retellLlmId}`,
                { knowledge_base_ids: knowledgeBaseIds },
                organizationId
              )
            } catch (botError: any) {
              console.warn(`[KB Delete] Failed to remove KB from bot ${assignment.bot.id}:`, botError)
              // Continue with deletion even if Retell update fails
            }
          }
        }

        // Delete KB from Retell (only if it's a real Retell KB, not temp)
        if (existingKB.retellKnowledgeBaseId && !existingKB.retellKnowledgeBaseId.startsWith("temp_")) {
          try {
            await callRetellApi(
              "DELETE",
              `/delete-knowledge-base/${existingKB.retellKnowledgeBaseId}`,
              null,
              organizationId
            )
            console.log(`[KB Delete] Deleted KB from Retell: ${existingKB.retellKnowledgeBaseId}`)
          } catch (retellError: any) {
            console.warn(`[KB Delete] Failed to delete KB from Retell:`, retellError)
            // Continue with database deletion even if Retell deletion fails
          }
        } else {
          console.log(`[KB Delete] Skipping Retell deletion (temp ID or no Retell KB): ${existingKB.retellKnowledgeBaseId}`)
        }
      } catch (error: any) {
        console.warn(`[KB Delete] Error cleaning up Retell KB assignments:`, error)
        // Continue with database deletion even if Retell cleanup fails
      }
    }

    // Delete from database (cascade will remove BotKnowledgeBase entries)
    await prisma.knowledgeBase.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting knowledge base:", error)
    return NextResponse.json(
      { error: "Failed to delete knowledge base" },
      { status: 500 }
    )
  }
}
