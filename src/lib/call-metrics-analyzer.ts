/**
 * Call Metrics Analyzer
 * 
 * Analyzes call transcripts and tool call results to extract metrics
 * such as price rejection, room availability, product availability, etc.
 */

export type CallOutcome = 
  | "SUCCESS" 
  | "PRICE_TOO_HIGH" 
  | "NO_ROOM_AVAILABLE" 
  | "PRODUCT_UNAVAILABLE" 
  | "OTHER"

export interface CallMetrics {
  callOutcome: CallOutcome | null
  rejectionReason: string | null
}

/**
 * Analyzes transcript text to detect rejection reasons and outcomes
 */
export function analyzeTranscript(transcript: string | null | undefined): CallMetrics {
  if (!transcript) {
    return {
      callOutcome: null,
      rejectionReason: null
    }
  }

  const text = typeof transcript === 'string' ? transcript.toLowerCase() : JSON.stringify(transcript).toLowerCase()

  // Price too high patterns
  const priceTooHighPatterns = [
    /fiyat\s+(yüksek|pahalı|uygun\s+değil|fazla|çok)/i,
    /pahalı/i,
    /fiyat\s+çok/i,
    /ucuz\s+değil/i,
    /bütçe\s+(aştı|dışında|yok)/i,
    /fiyat\s+uygun\s+değil/i,
    /çok\s+pahalı/i,
    /fiyat\s+çok\s+yüksek/i
  ]

  // No room available patterns
  const noRoomPatterns = [
    /yer\s+(yok|kalmadı|dolu)/i,
    /müsait\s+(değil|yok)/i,
    /dolu/i,
    /yer\s+bulunamadı/i,
    /oda\s+(yok|kalmadı|dolu|müsait\s+değil)/i,
    /rezervasyon\s+(yapılamadı|yapamadık)/i,
    /müsaitlik\s+(yok|değil)/i
  ]

  // Product unavailable patterns
  const productUnavailablePatterns = [
    /ürün\s+(yok|kalmadı|bitmiş)/i,
    /stokta\s+(yok|kalmadı)/i,
    /kalmadı/i,
    /tükendi/i,
    /bulunamadı/i,
    /yok\s+artık/i,
    /mevcut\s+değil/i,
    /hazır\s+değil/i
  ]

  // Check for price rejection
  for (const pattern of priceTooHighPatterns) {
    if (pattern.test(text)) {
      return {
        callOutcome: "PRICE_TOO_HIGH",
        rejectionReason: extractRejectionReason(text, pattern)
      }
    }
  }

  // Check for room unavailability
  for (const pattern of noRoomPatterns) {
    if (pattern.test(text)) {
      return {
        callOutcome: "NO_ROOM_AVAILABLE",
        rejectionReason: extractRejectionReason(text, pattern)
      }
    }
  }

  // Check for product unavailability
  for (const pattern of productUnavailablePatterns) {
    if (pattern.test(text)) {
      return {
        callOutcome: "PRODUCT_UNAVAILABLE",
        rejectionReason: extractRejectionReason(text, pattern)
      }
    }
  }

  return {
    callOutcome: null,
    rejectionReason: null
  }
}

/**
 * Extracts a contextual rejection reason from transcript
 */
function extractRejectionReason(text: string, pattern: RegExp): string {
  const match = text.match(pattern)
  if (match) {
    // Try to get surrounding context (50 chars before and after)
    const matchIndex = text.indexOf(match[0])
    const start = Math.max(0, matchIndex - 50)
    const end = Math.min(text.length, matchIndex + match[0].length + 50)
    const context = text.substring(start, end).trim()
    
    // Clean up the context
    return context.length > 200 ? context.substring(0, 200) + '...' : context
  }
  return text.substring(0, 200)
}

/**
 * Analyzes tool call result to determine outcome
 */
export function analyzeToolCallResult(
  toolName: string,
  result: any
): CallMetrics {
  if (!result) {
    return {
      callOutcome: null,
      rejectionReason: null
    }
  }

  // Check for errors
  if (result.error === true || result.error) {
    const errorMessage = result.message || result.error || JSON.stringify(result)
    
    // Check availability tool
    if (toolName === "check_availability") {
      if (errorMessage.toLowerCase().includes("müsait") || 
          errorMessage.toLowerCase().includes("yer") ||
          errorMessage.toLowerCase().includes("dolu")) {
        return {
          callOutcome: "NO_ROOM_AVAILABLE",
          rejectionReason: errorMessage
        }
      }
    }

    // Check reservation creation
    if (toolName === "create_reservation") {
      if (errorMessage.toLowerCase().includes("müsait") ||
          errorMessage.toLowerCase().includes("yer") ||
          errorMessage.toLowerCase().includes("dolu")) {
        return {
          callOutcome: "NO_ROOM_AVAILABLE",
          rejectionReason: errorMessage
        }
      }
      if (errorMessage.toLowerCase().includes("fiyat") ||
          errorMessage.toLowerCase().includes("pahalı")) {
        return {
          callOutcome: "PRICE_TOO_HIGH",
          rejectionReason: errorMessage
        }
      }
    }

    // Check order creation
    if (toolName === "create_order") {
      if (errorMessage.toLowerCase().includes("ürün") ||
          errorMessage.toLowerCase().includes("stok") ||
          errorMessage.toLowerCase().includes("kalmadı") ||
          errorMessage.toLowerCase().includes("yok")) {
        return {
          callOutcome: "PRODUCT_UNAVAILABLE",
          rejectionReason: errorMessage
        }
      }
    }

    return {
      callOutcome: "OTHER",
      rejectionReason: errorMessage
    }
  }

  // Check availability result
  if (toolName === "check_availability" && result.available === false) {
    return {
      callOutcome: "NO_ROOM_AVAILABLE",
      rejectionReason: result.message || "Oda müsait değil"
    }
  }

  return {
    callOutcome: null,
    rejectionReason: null
  }
}

/**
 * Determines if a call resulted in a successful reservation
 */
export async function checkHasReservation(callId: string, prisma: any): Promise<boolean> {
  const reservation = await prisma.reservation.findUnique({
    where: { callId }
  })
  return !!reservation
}

/**
 * Determines if a call resulted in a successful order
 */
export async function checkHasOrder(callId: string, prisma: any): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { callId }
  })
  return !!order
}

