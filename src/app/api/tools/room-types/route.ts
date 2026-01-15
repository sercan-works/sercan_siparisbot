import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const botId = searchParams.get("botId")
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

      // Get all active room types for this customer
      const roomTypes = await prisma.roomType.findMany({
        where: {
          organizationId,
          customerId,
          isActive: true
        },
        orderBy: {
          name: "asc"
        }
      })

      // Calculate current availability for each room type
      const now = new Date()
      const roomTypesWithAvailability = await Promise.all(
        roomTypes.map(async (roomType) => {
          // Count active reservations (CONFIRMED or CHECKED_IN) that overlap with future dates
          const activeReservations = await prisma.reservation.count({
            where: {
              roomTypeId: roomType.id,
              status: { in: ["CONFIRMED", "CHECKED_IN"] },
              checkOut: { gte: now } // Only future reservations
            }
          })

          const availableRooms = Math.max(0, roomType.totalRooms - activeReservations)

          return {
            id: roomType.id,
            name: roomType.name,
            description: roomType.description || "",
            totalRooms: roomType.totalRooms,
            availableRooms,
            bookedRooms: activeReservations,
            maxGuests: roomType.maxGuests,
            pricePerNight: roomType.pricePerNight,
            features: roomType.features || []
          }
        })
      )

      return NextResponse.json({
        success: true,
        roomTypes: roomTypesWithAvailability,
        totalRoomTypes: roomTypesWithAvailability.length
      })
    }

    // For external calls, require session
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId, customerType } = session.user

    // Only HOTEL customers can access room types
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

    // Get all active room types for this customer
    const roomTypes = await prisma.roomType.findMany({
      where: {
        organizationId,
        customerId,
        isActive: true
      },
      orderBy: {
        name: "asc"
      }
    })

    // Calculate current availability for each room type
    const now = new Date()
    const roomTypesWithAvailability = await Promise.all(
      roomTypes.map(async (roomType) => {
        // Count active reservations (CONFIRMED or CHECKED_IN) that overlap with future dates
        const activeReservations = await prisma.reservation.count({
          where: {
            roomTypeId: roomType.id,
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
            checkOut: { gte: now } // Only future reservations
          }
        })

        const availableRooms = Math.max(0, roomType.totalRooms - activeReservations)

        return {
          id: roomType.id,
          name: roomType.name,
          description: roomType.description || "",
          totalRooms: roomType.totalRooms,
          availableRooms,
          bookedRooms: activeReservations,
          maxGuests: roomType.maxGuests,
          pricePerNight: roomType.pricePerNight,
          features: roomType.features || []
        }
      })
    )

    return NextResponse.json({
      success: true,
      roomTypes: roomTypesWithAvailability,
      totalRoomTypes: roomTypesWithAvailability.length
    })

  } catch (error: any) {
    console.error("[get_room_types] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch room types", details: error.message },
      { status: 500 }
    )
  }
}

