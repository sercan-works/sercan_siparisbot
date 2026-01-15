import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const botId = searchParams.get("botId")
    const section = searchParams.get("section") || "all"
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
          message: "No hotel information found",
          data: {}
        })
      }

      // Parse hotel data from KB JSON
      let hotelData: any
      try {
        hotelData = JSON.parse(knowledgeBase.texts[0])
      } catch (parseError) {
        console.error("[get_hotel_info] Failed to parse KB JSON:", parseError)
        return NextResponse.json(
          { error: "Failed to parse hotel data" },
          { status: 500 }
        )
      }

      // Return requested section or all data
      let responseData: any = {}

      if (section === "all" || section === "facility") {
        responseData.facilityInfo = hotelData.facilityInfo || {}
      }

      if (section === "all" || section === "services") {
        responseData.services = hotelData.services || { free: [], paid: [] }
      }

      if (section === "all" || section === "policies") {
        responseData.policies = hotelData.policies || []
      }

      if (section === "all" || section === "concept") {
        responseData.conceptFeatures = hotelData.conceptFeatures || {}
      }

      if (section === "all" || section === "menus") {
        responseData.menus = hotelData.menus || []
      }

      return NextResponse.json({
        success: true,
        section: section === "all" ? "all" : section,
        data: responseData
      })
    }

    // For external calls, require session
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId, customerType } = session.user

    // Only HOTEL customers can access hotel info
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
        message: "No hotel information found",
        data: {}
      })
    }

    // Parse hotel data from KB JSON
    let hotelData: any
    try {
      hotelData = JSON.parse(knowledgeBase.texts[0])
    } catch (parseError) {
      console.error("[get_hotel_info] Failed to parse KB JSON:", parseError)
      return NextResponse.json(
        { error: "Failed to parse hotel data" },
        { status: 500 }
      )
    }

    // Return requested section or all data
    let responseData: any = {}

    if (section === "all" || section === "facility") {
      responseData.facilityInfo = hotelData.facilityInfo || {}
    }

    if (section === "all" || section === "services") {
      responseData.services = hotelData.services || { free: [], paid: [] }
    }

    if (section === "all" || section === "policies") {
      responseData.policies = hotelData.policies || []
    }

    if (section === "all" || section === "concept") {
      responseData.conceptFeatures = hotelData.conceptFeatures || {}
    }

    if (section === "all" || section === "menus") {
      responseData.menus = hotelData.menus || []
    }

    return NextResponse.json({
      success: true,
      section: section === "all" ? "all" : section,
      data: responseData
    })

  } catch (error: any) {
    console.error("[get_hotel_info] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch hotel information", details: error.message },
      { status: 500 }
    )
  }
}

