import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveDailyRates } from "@/lib/pricing-helpers"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const botId = searchParams.get("botId")
    const date = searchParams.get("date")
    const roomType = searchParams.get("roomType")
    const internalCall = req.headers.get("x-internal-call") === "true"

    // For internal calls (from tool-call route), skip session check and use botId
    if (internalCall && botId) {
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        select: { organizationId: true }
      })

      if (!bot) {
        return NextResponse.json({ error: "Bot not found" }, { status: 404 })
      }

      const organizationId = bot.organizationId

      // Find bot-assigned user
      const botAssignment = await prisma.botAssignment.findFirst({
        where: { botId },
        include: { user: true }
      })

      const customerId = botAssignment?.user?.id

      if (!customerId) {
        return NextResponse.json(
          { error: "No customer assigned to this bot" },
          { status: 404 }
        )
      }

      // Find hotel knowledge base for this customer
      const knowledgeBase = await prisma.knowledgeBase.findFirst({
        where: {
          organizationId,
          customerId,
          customer: {
            customerType: "HOTEL"
          }
        }
      })

      if (!knowledgeBase || !knowledgeBase.texts || knowledgeBase.texts.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No pricing information found",
          data: {
            dailyRates: [],
            rules: {},
            discounts: []
          }
        })
      }

      // Parse hotel data from KB JSON
      let hotelData: any
      try {
        hotelData = JSON.parse(knowledgeBase.texts[0])
      } catch (parseError) {
        console.error("[get_pricing_info] Failed to parse KB JSON:", parseError)
        return NextResponse.json(
          { error: "Failed to parse pricing data" },
          { status: 500 }
        )
      }

      const pricingData = hotelData.pricing || {}
      const roomTypes = hotelData.roomTypes || []
      const dailyRates = resolveDailyRates(pricingData, {
        roomType: roomType || undefined,
        roomTypes,
        date: date || undefined
      })

      return NextResponse.json({
        success: true,
        date: date || null,
        roomType: roomType || null,
        data: {
          dailyRates,
          rules: pricingData.rules || {},
          discounts: pricingData.discounts || []
        }
      })
    }

    // For external calls, require session
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId, customerType } = session.user

    // Only HOTEL customers can access pricing info
    if (customerType !== "HOTEL") {
      return NextResponse.json(
        { error: "This endpoint is only available for HOTEL customers" },
        { status: 403 }
      )
    }

    // Find assigned user (customer) - priority: bot-assigned user, then current user
    let customerId = session.user.id
    
    if (botId) {
      const botAssignment = await prisma.botAssignment.findFirst({
        where: { botId },
        include: { user: true }
      })
      
      if (botAssignment?.user) {
        customerId = botAssignment.user.id
      }
    }

    // Find hotel knowledge base for this customer
    const knowledgeBase = await prisma.knowledgeBase.findFirst({
      where: {
        organizationId,
        customerId,
        customer: {
          customerType: "HOTEL"
        }
      }
    })

    if (!knowledgeBase || !knowledgeBase.texts || knowledgeBase.texts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pricing information found",
        data: {
          dailyRates: [],
          rules: {},
          discounts: []
        }
      })
    }

    // Parse hotel data from KB JSON
    let hotelData: any
    try {
      hotelData = JSON.parse(knowledgeBase.texts[0])
    } catch (parseError) {
      console.error("[get_pricing_info] Failed to parse KB JSON:", parseError)
      return NextResponse.json(
        { error: "Failed to parse pricing data" },
        { status: 500 }
      )
    }

    const pricingData = hotelData.pricing || {}
    const roomTypes = hotelData.roomTypes || []
    const dailyRates = resolveDailyRates(pricingData, {
      roomType: searchParams.get("roomType") || undefined,
      roomTypes,
      date: searchParams.get("date") || undefined
    })

    return NextResponse.json({
      success: true,
      date: searchParams.get("date") || null,
      roomType: searchParams.get("roomType") || null,
      data: {
        dailyRates,
        rules: pricingData.rules || {},
        discounts: pricingData.discounts || []
      }
    })

  } catch (error: any) {
    console.error("[get_pricing_info] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch pricing information", details: error.message },
      { status: 500 }
    )
  }
}

