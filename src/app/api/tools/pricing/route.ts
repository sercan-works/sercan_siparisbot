import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const botId = searchParams.get("botId")
    const date = searchParams.get("date")
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

      // If specific date requested, filter daily rates
      let dailyRates = pricingData.dailyRates || []
      if (date) {
        dailyRates = dailyRates.filter((rate: any) => rate.date === date)
      }

      return NextResponse.json({
        success: true,
        date: date || null,
        data: {
          dailyRates: dailyRates,
          rules: pricingData.rules || {},
          discounts: pricingData.discounts || []
        }
      })
    }

    // For external calls, require session
    const session = await getServerSession()
    
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

    // If specific date requested, filter daily rates
    let dailyRates = pricingData.dailyRates || []
    if (date) {
      dailyRates = dailyRates.filter((rate: any) => rate.date === date)
    }

    return NextResponse.json({
      success: true,
      date: date || null,
      data: {
        dailyRates: dailyRates,
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

