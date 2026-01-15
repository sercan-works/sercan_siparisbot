import { prisma } from "./prisma"
import { callRetellApi } from "./retell"

/**
 * Update bot's generalPrompt with pricingPrompt from assigned knowledge bases
 * This function:
 * 1. Finds all KBs assigned to the bot
 * 2. Extracts pricing.pricingPrompt from each KB
 * 3. Updates bot's generalPrompt by adding/replacing the PRICING_PROMPT block
 * 4. Syncs to Retell API and updates database
 */
export async function updateBotPromptWithPricingPrompt(
  botId: string,
  organizationId: string
): Promise<void> {
  try {
    // Get bot with assigned knowledge bases
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: {
        knowledgeBases: {
          include: {
            knowledgeBase: {
              select: {
                id: true,
                texts: true,
                customerId: true
              }
            }
          }
        }
      }
    })

    if (!bot) {
      console.warn(`[updateBotPromptWithPricingPrompt] Bot ${botId} not found`)
      return
    }

    console.log(`[updateBotPromptWithPricingPrompt] Bot ${botId} has ${bot.knowledgeBases.length} assigned KB(s)`)

    // Extract pricingPrompt from all assigned KBs
    const pricingPrompts: string[] = []

    for (const assignment of bot.knowledgeBases) {
      const kb = assignment.knowledgeBase
      console.log(`[updateBotPromptWithPricingPrompt] Checking KB ${kb.id} (has ${kb.texts?.length || 0} text chunks)`)
      
      if (!kb.texts || kb.texts.length === 0) {
        console.log(`[updateBotPromptWithPricingPrompt] KB ${kb.id} has no texts, skipping`)
        continue
      }

      try {
        // Parse KB JSON
        const hotelData = JSON.parse(kb.texts[0])
        const pricingData = hotelData.pricing

        if (pricingData && pricingData.pricingPrompt && pricingData.pricingPrompt.trim()) {
          console.log(`[updateBotPromptWithPricingPrompt] Found pricingPrompt in KB ${kb.id} (length: ${pricingData.pricingPrompt.trim().length})`)
          pricingPrompts.push(pricingData.pricingPrompt.trim())
        } else {
          console.log(`[updateBotPromptWithPricingPrompt] No pricingPrompt found in KB ${kb.id}`)
        }
      } catch (parseError) {
        console.warn(`[updateBotPromptWithPricingPrompt] Failed to parse KB ${kb.id}:`, parseError)
        continue
      }
    }

    console.log(`[updateBotPromptWithPricingPrompt] Found ${pricingPrompts.length} pricingPrompt(s)`)

    // If no pricingPrompt found, remove existing block if any
    if (pricingPrompts.length === 0) {
      // Remove pricingPrompt block if exists
      const pricingPromptRegex = /<!--PRICING_PROMPT-->[\s\S]*?<!--\/PRICING_PROMPT-->/g
      const updatedPrompt = (bot.generalPrompt || "").replace(pricingPromptRegex, "").trim()

      if (updatedPrompt !== bot.generalPrompt) {
        // Update Retell LLM prompt
        if (bot.retellLlmId) {
          try {
            await callRetellApi(
              "PATCH",
              `/update-retell-llm/${bot.retellLlmId}`,
              { general_prompt: updatedPrompt },
              organizationId
            )
          } catch (retellErr: any) {
            if (!retellErr.message?.includes("404") && !retellErr.message?.includes("not found")) {
              console.warn(`[updateBotPromptWithPricingPrompt] Failed to sync to Retell:`, retellErr.message)
            }
          }
        }

        // Update database
        await prisma.bot.update({
          where: { id: botId },
          data: { generalPrompt: updatedPrompt }
        })

        console.log(`[updateBotPromptWithPricingPrompt] Removed pricingPrompt block from bot ${botId}`)
      }

      return
    }

    // Combine all pricingPrompts (if multiple KBs)
    const combinedPricingPrompt = pricingPrompts.join("\n\n---\n\n")

    // Build pricingPrompt block
    const pricingPromptBlock = `\n\n<!--PRICING_PROMPT-->\n${combinedPricingPrompt}\n<!--/PRICING_PROMPT-->`

    // Upsert pricingPrompt block in generalPrompt
    const pricingPromptRegex = /<!--PRICING_PROMPT-->[\s\S]*?<!--\/PRICING_PROMPT-->/
    const currentPrompt = bot.generalPrompt || ""
    
    let updatedPrompt: string
    if (pricingPromptRegex.test(currentPrompt)) {
      // Replace existing block
      updatedPrompt = currentPrompt.replace(pricingPromptRegex, pricingPromptBlock)
    } else {
      // Append to end
      updatedPrompt = currentPrompt + pricingPromptBlock
    }

    // Update Retell LLM prompt
    if (bot.retellLlmId) {
      try {
        await callRetellApi(
          "PATCH",
          `/update-retell-llm/${bot.retellLlmId}`,
          { general_prompt: updatedPrompt },
          organizationId
        )
        console.log(`[updateBotPromptWithPricingPrompt] Synced pricingPrompt to Retell for bot ${botId}`)
      } catch (retellErr: any) {
        // Handle 404 errors when LLM no longer exists in Retell
        if (retellErr.message?.includes("404") || retellErr.message?.includes("not found")) {
          console.warn(
            `[updateBotPromptWithPricingPrompt] LLM not found in Retell for bot ${botId}, updating local prompt only`
          )
        } else {
          console.warn(`[updateBotPromptWithPricingPrompt] Failed to sync to Retell:`, retellErr.message)
        }
      }
    }

    // Update database
    await prisma.bot.update({
      where: { id: botId },
      data: { generalPrompt: updatedPrompt }
    })

    console.log(`[updateBotPromptWithPricingPrompt] Updated pricingPrompt for bot ${botId}`)
  } catch (error: any) {
    console.error(`[updateBotPromptWithPricingPrompt] Error updating bot ${botId}:`, error)
    // Don't throw - this is not critical for bot creation/update
  }
}

