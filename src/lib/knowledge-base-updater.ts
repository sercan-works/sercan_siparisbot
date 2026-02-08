import { prisma } from "./prisma"

/**
 * Update daily rates availability in knowledge bases for a given reservation date range
 * Supports both dailyRatesByRoomType (per room type) and legacy dailyRates format.
 * When roomTypeOrId is provided, updates the corresponding room type's rates in dailyRatesByRoomType.
 */
export async function updateKnowledgeBaseDailyRatesAvailability(
  organizationId: string,
  customerId: string,
  checkIn: Date,
  checkOut: Date,
  delta: number, // 1 to decrease, -1 to increase
  roomTypeOrId?: string // Room type name or ID from KB - when provided, updates that room type's rates
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
      }
    })

    if (knowledgeBases.length === 0) {
      console.log(`[KB DailyRates Update] No knowledge bases found for customer ${customerId}`)
      return
    }

    console.log(`[KB DailyRates Update] Found ${knowledgeBases.length} knowledge base(s) to update for date range: ${checkIn.toISOString().split('T')[0]} to ${checkOut.toISOString().split('T')[0]}`)

    // Normalize dates (set to start of day)
    const startDate = new Date(checkIn)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(checkOut)
    endDate.setHours(0, 0, 0, 0)

    // Generate array of dates in range (checkIn inclusive, checkOut exclusive)
    const datesToUpdate: Date[] = []
    const currentDate = new Date(startDate)
    while (currentDate < endDate) {
      datesToUpdate.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log(`[KB DailyRates Update] Updating ${datesToUpdate.length} dates with delta: ${delta}`)

    // Update each knowledge base
    for (const kb of knowledgeBases) {
      try {
        if (!kb.texts || kb.texts.length === 0) {
          console.warn(`[KB DailyRates Update] Knowledge base ${kb.id} has no texts, skipping`)
          continue
        }

        // Parse the first text chunk as JSON (hotel data format)
        let hotelData: any
        try {
          hotelData = JSON.parse(kb.texts[0])
        } catch (parseError) {
          console.warn(`[KB DailyRates Update] Failed to parse JSON for KB ${kb.id}, skipping:`, parseError)
          continue
        }

        // Initialize pricing structure if it doesn't exist
        if (!hotelData.pricing) {
          hotelData.pricing = {}
        }

        const roomTypes = hotelData.roomTypes || []
        const dailyRatesByRoomType = hotelData.pricing.dailyRatesByRoomType || {}
        const hasNewFormat = Object.keys(dailyRatesByRoomType).length > 0

        // Resolve which rates to update: room type specific or legacy
        let targetRoomTypeId: string | null = null
        if (roomTypeOrId && hasNewFormat) {
          if (roomTypes.length > 0) {
            const byId = roomTypes.find((rt: any) => rt.id === roomTypeOrId)
            const byName = roomTypes.find(
              (rt: any) => rt.name && rt.name.toLowerCase() === roomTypeOrId.toLowerCase()
            )
            const match = byId || byName
            if (match && dailyRatesByRoomType[match.id]) {
              targetRoomTypeId = match.id
            }
          }
          if (!targetRoomTypeId && dailyRatesByRoomType["_legacy"]) {
            targetRoomTypeId = "_legacy"
          }
        }

        let updatedCount = 0

        if (targetRoomTypeId && hasNewFormat) {
          // New format: update dailyRatesByRoomType[targetRoomTypeId]
          const dailyRates = dailyRatesByRoomType[targetRoomTypeId] || []
          for (const date of datesToUpdate) {
            const dateKey = date.toISOString().split('T')[0]
            let dailyRate = dailyRates.find((rate: any) => rate.date === dateKey)
            if (dailyRate) {
              const currentAvailableRooms = parseInt(dailyRate.availableRooms || "0")
              const newAvailableRooms = Math.max(0, currentAvailableRooms - delta)
              dailyRate.availableRooms = String(newAvailableRooms)
              updatedCount++
            } else {
              const initialAvailableRooms = Math.max(0, -delta)
              dailyRates.push({
                date: dateKey,
                availableRooms: String(initialAvailableRooms),
                ppPrice: "",
                single: "",
                dbl: "",
                triple: ""
              })
              updatedCount++
            }
          }
          hotelData.pricing.dailyRatesByRoomType = { ...dailyRatesByRoomType, [targetRoomTypeId]: dailyRates }
        } else {
          // Legacy format or fallback: use dailyRates
          if (!hotelData.pricing.dailyRates || !Array.isArray(hotelData.pricing.dailyRates)) {
            hotelData.pricing.dailyRates = []
          }
          const dailyRates = hotelData.pricing.dailyRates

        // Update each date in the range (legacy path)
        for (const date of datesToUpdate) {
          const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD format

          // Find existing daily rate for this date
          let dailyRate = dailyRates.find((rate: any) => rate.date === dateKey)

          if (dailyRate) {
            // Update existing rate
            const currentAvailableRooms = parseInt(dailyRate.availableRooms || "0")
            const newAvailableRooms = Math.max(0, currentAvailableRooms - delta) // delta is 1 to decrease, -1 to increase, so subtract delta
            
            dailyRate.availableRooms = String(newAvailableRooms)
            updatedCount++
            
            console.log(`[KB DailyRates Update] Updated date ${dateKey}: ${currentAvailableRooms} -> ${newAvailableRooms} (delta: ${delta})`)
          } else {
            // Create new daily rate entry
            // If delta is 1 (decreasing), we're creating a reservation, so start with 0 or a default value
            // If delta is -1 (increasing), we're cancelling, so we need to know the base value
            // For new entries, we'll set availableRooms to Math.max(0, -delta) which means:
            // - If delta=1 (decrease), new entry gets 0 (no rooms available)
            // - If delta=-1 (increase), new entry gets 1 (one room becomes available)
            const initialAvailableRooms = Math.max(0, -delta)
            
            dailyRates.push({
              date: dateKey,
              availableRooms: String(initialAvailableRooms),
              ppPrice: "",
              single: "",
              dbl: "",
              triple: ""
            })
            updatedCount++
            
            console.log(`[KB DailyRates Update] Created new date entry ${dateKey} with availableRooms: ${initialAvailableRooms}`)
          }
        }
        }

        if (updatedCount > 0) {
          // Update the knowledge base texts with the updated JSON
          const updatedTexts = [JSON.stringify(hotelData)]
          await prisma.knowledgeBase.update({
            where: { id: kb.id },
            data: { texts: updatedTexts }
          })

          console.log(`[KB DailyRates Update] Updated KB ${kb.id} in database (${updatedCount} dates updated)`)
        } else {
          console.log(`[KB DailyRates Update] No dates to update for KB ${kb.id}`)
        }
      } catch (kbError: any) {
        console.error(`[KB DailyRates Update] Error updating KB ${kb.id}:`, kbError)
        // Continue with other KBs even if one fails
      }
    }

    console.log(`[KB DailyRates Update] Completed updating knowledge bases for date range`)
  } catch (error: any) {
    console.error(`[KB DailyRates Update] Error updating knowledge bases:`, error)
    // Don't throw - KB update is not critical for reservation creation
  }
}

/**
 * Update room count in knowledge bases for a given customer and room type
 * This function finds all HOTEL knowledge bases for the customer, updates the room count
 * in the roomTypes array, and syncs the changes to Retell API
 * @deprecated Use updateKnowledgeBaseDailyRatesAvailability instead
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

        // No longer updating bot prompts - tools handle data access instead of embedding KB in prompt
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

