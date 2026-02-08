import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { eachDayOfInterval, format, startOfDay, endOfDay } from "date-fns"

export const dynamic = "force-dynamic"

type DatePreset = "today" | "week" | "month" | "custom"

interface DateRange {
  start: Date
  end: Date
}

function getDateRange(preset: DatePreset | null, startDate?: string, endDate?: string): DateRange {
  const now = new Date()
  const today = startOfDay(now)
  
  switch (preset) {
    case "today":
      return {
        start: today,
        end: endOfDay(now)
      }
    case "week":
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - 7)
      return {
        start: weekStart,
        end: endOfDay(now)
      }
    case "month":
      const monthStart = new Date(today)
      monthStart.setMonth(monthStart.getMonth() - 1)
      return {
        start: monthStart,
        end: endOfDay(now)
      }
    case "custom":
      if (startDate && endDate) {
        return {
          start: startOfDay(new Date(startDate)),
          end: endOfDay(new Date(endDate))
        }
      }
      // Fallback to week if custom dates not provided
      const fallbackStart = new Date(today)
      fallbackStart.setDate(fallbackStart.getDate() - 7)
      return {
        start: fallbackStart,
        end: endOfDay(now)
      }
    default:
      // Default to week
      const defaultStart = new Date(today)
      defaultStart.setDate(defaultStart.getDate() - 7)
      return {
        start: defaultStart,
        end: endOfDay(now)
      }
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId, role, id: userId, customerType } = session.user
    const { searchParams } = new URL(req.url)
    
    const preset = searchParams.get("preset") as DatePreset | null
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    
    const dateRange = getDateRange(preset, startDate || undefined, endDate || undefined)

    // Build where clause based on user role
    const whereClause: any = {
      organizationId,
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    }

    // For CUSTOMER role, filter by their calls or assigned bots
    if (role === "CUSTOMER") {
      whereClause.OR = [
        { initiatedById: userId },
        { bot: { assignments: { some: { userId } } } }
      ]
    }

    // Get all calls in date range
    const calls = await prisma.call.findMany({
      where: whereClause,
      include: {
        analytics: true,
        reservation: true,
        order: true
      }
    })

    // Calculate metrics
    const totalCalls = calls.length
    const successfulReservations = calls.filter(call => call.reservation !== null).length
    const successfulOrders = calls.filter(call => call.order !== null).length
    
    // Count outcomes from analytics
    const priceTooHigh = calls.filter(call => 
      call.analytics?.callOutcome === "PRICE_TOO_HIGH"
    ).length
    
    const noRoomAvailable = calls.filter(call => 
      call.analytics?.callOutcome === "NO_ROOM_AVAILABLE"
    ).length
    
    const productUnavailable = calls.filter(call => 
      call.analytics?.callOutcome === "PRODUCT_UNAVAILABLE"
    ).length

    // Calculate conversion rate
    const totalSuccessful = successfulReservations + successfulOrders
    const conversionRate = totalCalls > 0 ? (totalSuccessful / totalCalls) * 100 : 0

    // Calculate customer satisfaction (happiness) rate
    // Positive sentiment OR successful reservation/order = happy
    // Negative sentiment OR rejection = unhappy
    // Neutral sentiment = neutral (counted as neither happy nor unhappy)
    const happyCalls = calls.filter(call => {
      const sentiment = call.analytics?.sentiment?.toLowerCase()
      const hasSuccess = call.reservation !== null || call.order !== null
      const hasRejection = call.analytics?.callOutcome && 
        ["PRICE_TOO_HIGH", "NO_ROOM_AVAILABLE", "PRODUCT_UNAVAILABLE", "OTHER_REJECTION"].includes(call.analytics.callOutcome)
      
      // Happy if: positive sentiment OR (successful AND not rejected)
      if (sentiment === "positive" || (hasSuccess && !hasRejection)) {
        return true
      }
      // Also happy if successful and no negative sentiment
      if (hasSuccess && sentiment !== "negative") {
        return true
      }
      return false
    }).length

    const unhappyCalls = calls.filter(call => {
      const sentiment = call.analytics?.sentiment?.toLowerCase()
      const hasRejection = call.analytics?.callOutcome && 
        ["PRICE_TOO_HIGH", "NO_ROOM_AVAILABLE", "PRODUCT_UNAVAILABLE", "OTHER_REJECTION"].includes(call.analytics.callOutcome)
      
      // Unhappy if: negative sentiment OR rejected
      return sentiment === "negative" || hasRejection
    }).length

    // Customer satisfaction rate = (happy calls / total calls) * 100
    const customerSatisfactionRate = totalCalls > 0 ? (happyCalls / totalCalls) * 100 : 0

    // Daily breakdown
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
    const dailyBreakdown = days.map(day => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      
      const dayCalls = calls.filter(call => {
        const callDate = new Date(call.createdAt)
        return callDate >= dayStart && callDate <= dayEnd
      })
      
      const dayReservations = dayCalls.filter(call => call.reservation !== null).length
      const dayOrders = dayCalls.filter(call => call.order !== null).length
      const dayPriceTooHigh = dayCalls.filter(call =>
        call.analytics?.callOutcome === "PRICE_TOO_HIGH"
      ).length
      const dayNoRoom = dayCalls.filter(call =>
        call.analytics?.callOutcome === "NO_ROOM_AVAILABLE"
      ).length
      const dayProductUnavailable = dayCalls.filter(call =>
        call.analytics?.callOutcome === "PRODUCT_UNAVAILABLE"
      ).length

      // Toplam fiyatlar: o gün yapılan rezervasyonların ve alınan siparişlerin toplamı
      const totalReservationPrice = dayCalls
        .filter(call => call.reservation != null)
        .reduce((sum, call) => sum + (call.reservation?.totalPrice ?? 0), 0)
      const totalOrderPrice = dayCalls
        .filter(call => call.order != null)
        .reduce((sum, call) => sum + (call.order?.totalAmount ?? 0), 0)

      // Calculate daily customer satisfaction
      const dayHappyCalls = dayCalls.filter(call => {
        const sentiment = call.analytics?.sentiment?.toLowerCase()
        const hasSuccess = call.reservation !== null || call.order !== null
        const hasRejection = call.analytics?.callOutcome && 
          ["PRICE_TOO_HIGH", "NO_ROOM_AVAILABLE", "PRODUCT_UNAVAILABLE", "OTHER_REJECTION"].includes(call.analytics.callOutcome)
        
        if (sentiment === "positive" || (hasSuccess && !hasRejection)) {
          return true
        }
        if (hasSuccess && sentiment !== "negative") {
          return true
        }
        return false
      }).length
      
      return {
        date: format(day, "yyyy-MM-dd"),
        metrics: {
          totalCalls: dayCalls.length,
          successfulReservations: dayReservations,
          successfulOrders: dayOrders,
          totalReservationPrice: Math.round(totalReservationPrice * 100) / 100,
          totalOrderPrice: Math.round(totalOrderPrice * 100) / 100,
          priceTooHigh: dayPriceTooHigh,
          noRoomAvailable: dayNoRoom,
          productUnavailable: dayProductUnavailable,
          conversionRate: dayCalls.length > 0 
            ? ((dayReservations + dayOrders) / dayCalls.length) * 100 
            : 0,
          customerSatisfactionRate: dayCalls.length > 0
            ? (dayHappyCalls / dayCalls.length) * 100
            : 0
        }
      }
    })

    return NextResponse.json({
      totalCalls,
      successfulReservations,
      successfulOrders,
      priceTooHigh,
      noRoomAvailable,
      productUnavailable,
      conversionRate: Math.round(conversionRate * 100) / 100,
      customerSatisfactionRate: Math.round(customerSatisfactionRate * 100) / 100,
      happyCalls,
      unhappyCalls,
      customerType: customerType || null,
      dateRange: {
        start: format(dateRange.start, "yyyy-MM-dd"),
        end: format(dateRange.end, "yyyy-MM-dd")
      },
      dailyBreakdown
    })

  } catch (error: any) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error.message },
      { status: 500 }
    )
  }
}

