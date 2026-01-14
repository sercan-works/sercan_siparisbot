import { prisma } from "./prisma"
import { callRetellApi } from "./retell"

/**
 * Update room count in knowledge bases for a given customer and room type
 * This function finds all HOTEL knowledge bases for the customer, updates the room count
 * in the roomTypes array, and syncs the changes to Retell API
 */
export async function updateKnowledgeBaseRoomCount(
  organizationId: string,
  customerId: string,
  roomTypeName: string,
  newCount: number
): Promise<void> {
  try {
    // Find all HOTEL knowledge bases for this customer
    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: {
        organizationId,
        customerId,
        customer: {
          customerType: "HOTEL"
        }
      },
      include: {
        bots: {
          include: {
            bot: {
              select: {
                id: true,
                retellLlmId: true,
                generalPrompt: true
              }
            }
          }
        }
      }
    })

    if (knowledgeBases.length === 0) {
      console.log(`[KB Update] No knowledge bases found for customer ${customerId}`)
      return
    }

    console.log(`[KB Update] Found ${knowledgeBases.length} knowledge base(s) to update for room type: ${roomTypeName}`)

    // Update each knowledge base
    for (const kb of knowledgeBases) {
      try {
        if (!kb.texts || kb.texts.length === 0) {
          console.warn(`[KB Update] Knowledge base ${kb.id} has no texts, skipping`)
          continue
        }

        // Parse the first text chunk as JSON (hotel data format)
        let hotelData: any
        try {
          hotelData = JSON.parse(kb.texts[0])
        } catch (parseError) {
          console.warn(`[KB Update] Failed to parse JSON for KB ${kb.id}, skipping:`, parseError)
          continue
        }

        // Check if this is a hotel knowledge base (has roomTypes array)
        if (!hotelData.roomTypes || !Array.isArray(hotelData.roomTypes)) {
          console.log(`[KB Update] KB ${kb.id} does not have roomTypes array, skipping`)
          continue
        }

        // Log all room types in KB for debugging
        console.log(`[KB Update] KB ${kb.id} has ${hotelData.roomTypes.length} room types:`, hotelData.roomTypes.map((rt: any) => ({ name: rt.name, adet: rt.adet })))

        // Find matching room type (case-insensitive name match)
        let foundRoomType = false
        for (const roomType of hotelData.roomTypes) {
          if (roomType.name && roomType.name.toLowerCase() === roomTypeName.toLowerCase()) {
            // Update the adet (count) field
            const oldAdet = roomType.adet
            roomType.adet = String(newCount)
            foundRoomType = true
            console.log(`[KB Update] Updated room type "${roomType.name}" count from ${oldAdet} to ${newCount} in KB ${kb.id}`)
            break
          }
        }

        if (!foundRoomType) {
          const kbRoomTypeNames = hotelData.roomTypes.map((rt: any) => rt.name).filter(Boolean)
          console.log(`[KB Update] Room type "${roomTypeName}" not found in KB ${kb.id}. Available room types:`, kbRoomTypeNames)
          continue
        }

        // Update the knowledge base texts with the updated JSON
        const updatedTexts = [JSON.stringify(hotelData)]
        await prisma.knowledgeBase.update({
          where: { id: kb.id },
          data: { texts: updatedTexts }
        })

        console.log(`[KB Update] Updated KB ${kb.id} in database`)

        // Update bot prompts for linked bots (same logic as PUT endpoint)
        if (kb.bots.length > 0) {
          const block = (kbName: string, kbTexts: string[], kbId: string) => {
            const content = kbTexts.join("\n---\n")
            return `\n\n<!--KB:${kbId}-->\n## Knowledge Base (${kbName})\n${content}\n<!--/KB:${kbId}-->`
          }

          const upsertBlock = (prompt: string, kbId: string, blk: string) => {
            const start = `<!--KB:${kbId}-->`
            const end = `<!--/KB:${kbId}-->`
            const regex = new RegExp(`${start}[\\s\\S]*?${end}`)
            if (regex.test(prompt)) {
              return prompt.replace(regex, blk)
            }
            return `${prompt}${blk}`
          }

          for (const assignment of kb.bots) {
            const llmId = assignment.bot.retellLlmId
            if (!llmId) {
              console.warn(`[KB Update] Bot ${assignment.bot.id} has no retellLlmId, skipping prompt update`)
              continue
            }

            const newBlock = block(kb.name, updatedTexts, kb.id)
            const updatedPrompt = upsertBlock(assignment.bot.generalPrompt || "", kb.id, newBlock)

            try {
              await callRetellApi(
                "PATCH",
                `/update-retell-llm/${llmId}`,
                { general_prompt: updatedPrompt },
                organizationId
              )
              await prisma.bot.update({
                where: { id: assignment.bot.id },
                data: { generalPrompt: updatedPrompt }
              })
              console.log(`[KB Update] Synced bot ${assignment.bot.id} (LLM ${llmId}) prompt to Retell`)
            } catch (syncErr: any) {
              // Handle 404 errors when LLM no longer exists in Retell
              if (syncErr.message?.includes("404") || syncErr.message?.includes("not found")) {
                console.warn(
                  `[KB Update] LLM not found in Retell for bot ${assignment.bot.id} (LLM ${llmId}), updating local prompt only`
                )
                // Still update local prompt even if Retell LLM doesn't exist
                await prisma.bot.update({
                  where: { id: assignment.bot.id },
                  data: { generalPrompt: updatedPrompt }
                }).catch(() => {
                  console.warn(`[KB Update] Failed to update local prompt for bot ${assignment.bot.id}`)
                })
              } else {
                console.warn(`[KB Update] Failed to sync LLM prompt for bot ${assignment.bot.id}:`, syncErr.message)
              }
            }
          }
        }
      } catch (kbError: any) {
        console.error(`[KB Update] Error updating KB ${kb.id}:`, kbError)
        // Continue with other KBs even if one fails
      }
    }

    console.log(`[KB Update] Completed updating knowledge bases for room type: ${roomTypeName}`)
  } catch (error: any) {
    console.error(`[KB Update] Error updating knowledge bases:`, error)
    // Don't throw - KB update is not critical for reservation creation
  }
}

