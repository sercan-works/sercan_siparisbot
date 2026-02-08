/**
 * Helper to resolve daily rates from pricing data.
 * Supports both legacy (dailyRates array) and new (dailyRatesByRoomType) formats.
 * Returns dailyRates array for LLM compatibility (Yaklaşım A).
 */

export interface DailyRate {
  date: string
  availableRooms: string
  ppPrice: string
  single: string
  dbl: string
  triple: string
  roomTypeId?: string
  roomTypeName?: string
}

export function resolveDailyRates(
  pricingData: {
    dailyRates?: DailyRate[]
    dailyRatesByRoomType?: Record<string, DailyRate[]>
  },
  options?: {
    roomType?: string
    roomTypes?: Array<{ id: string; name: string }>
    date?: string
  }
): DailyRate[] {
  const roomTypes = options?.roomTypes || []
  const roomTypeName = options?.roomType
  const date = options?.date

  let rates: DailyRate[] = []

  if (pricingData.dailyRatesByRoomType && Object.keys(pricingData.dailyRatesByRoomType).length > 0) {
    // New format: dailyRatesByRoomType
    if (roomTypeName && roomTypes.length > 0) {
      const matchedRoomType = roomTypes.find(
        (rt) => rt.name && rt.name.toLowerCase() === roomTypeName.toLowerCase()
      ) || roomTypes.find(
        (rt) => rt.name && rt.name.toLowerCase().includes(roomTypeName.toLowerCase())
      )
      if (matchedRoomType && pricingData.dailyRatesByRoomType[matchedRoomType.id]) {
        rates = pricingData.dailyRatesByRoomType[matchedRoomType.id].map((r) => ({
          ...r,
          roomTypeId: matchedRoomType.id,
          roomTypeName: matchedRoomType.name
        }))
      } else {
        // Merge all room types' rates when roomType specified but no match
        rates = []
        for (const [rtId, rtRates] of Object.entries(pricingData.dailyRatesByRoomType)) {
          const rt = roomTypes.find((r) => r.id === rtId)
          rates.push(
            ...rtRates.map((r) => ({
              ...r,
              roomTypeId: rtId,
              roomTypeName: rt?.name || rtId
            }))
          )
        }
      }
    } else {
      // No room type filter: merge all rates with roomType info
      for (const [rtId, rtRates] of Object.entries(pricingData.dailyRatesByRoomType)) {
        if (rtId === "_legacy") {
          rates.push(...rtRates)
        } else {
          const rt = roomTypes.find((r) => r.id === rtId)
          rates.push(
            ...rtRates.map((r) => ({
              ...r,
              roomTypeId: rtId,
              roomTypeName: rt?.name || rtId
            }))
          )
        }
      }
    }
  } else if (pricingData.dailyRates && Array.isArray(pricingData.dailyRates)) {
    // Legacy format
    rates = [...pricingData.dailyRates]
  }

  if (date) {
    rates = rates.filter((r) => r.date === date)
  }

  return rates
}
