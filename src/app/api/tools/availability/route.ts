import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Schema for the tool arguments
const availabilityCheckSchema = z.object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
    guests: z.number().min(1).default(1),
    roomType: z.string().optional() // Optional room type name preference
})

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const botId = searchParams.get("botId")
        const internalCall = req.headers.get("x-internal-call") === "true"
        
        const body = await req.json()
        const { checkIn, checkOut, guests, roomType } = availabilityCheckSchema.parse(body)

        // Get organizationId and customerId
        let organizationId: string | undefined
        let customerId: string | undefined

        // For internal calls (from tool-call route), use botId
        if (internalCall && botId) {
            const bot = await prisma.bot.findUnique({
                where: { id: botId },
                select: { organizationId: true }
            })

            if (!bot) {
                return NextResponse.json({ error: "Bot not found" }, { status: 404 })
            }

            organizationId = bot.organizationId

            // Find bot-assigned user
            const botAssignment = await prisma.botAssignment.findFirst({
                where: { botId },
                include: { user: true }
            })

            customerId = botAssignment?.user?.id

            if (!customerId) {
                // Fallback: Find first HOTEL customer in organization
                const hotelCustomer = await prisma.user.findFirst({
                    where: {
                        organizationId,
                        customerType: "HOTEL"
                    }
                })
                customerId = hotelCustomer?.id || undefined
            }

            if (!customerId) {
                return NextResponse.json(
                    { error: "No customer assigned to this bot" },
                    { status: 404 }
                )
            }
        } else {
            // For external calls, require session (not implemented yet for availability)
            return NextResponse.json(
                { error: "This endpoint requires internal call context" },
                { status: 403 }
            )
        }

        // Helper to check availability for a specific range
        const checkRange = async (start: Date, end: Date) => {
            // 1. Find rooms matching guest capacity, organizationId, and customerId
            const roomTypes = await prisma.roomType.findMany({
                where: {
                    organizationId: organizationId!,
                    customerId: customerId!,
                    isActive: true,
                    maxGuests: { gte: guests },
                    name: roomType ? { contains: roomType, mode: "insensitive" } : undefined
                }
            })

            if (roomTypes.length === 0) return { available: false, rooms: [] }

            const validRooms = []

            for (const room of roomTypes) {
                // Check blocked dates
                const blocked = await prisma.roomAvailability.count({
                    where: {
                        roomTypeId: room.id,
                        isBlocked: true,
                        date: { gte: start, lt: end }
                    }
                })
                if (blocked > 0) continue

                // Check reservations
                const bookings = await prisma.reservation.count({
                    where: {
                        roomTypeId: room.id,
                        status: { in: ["CONFIRMED", "CHECKED_IN"] },
                        OR: [
                            { checkIn: { lte: end, gte: start } },
                            { checkOut: { lte: end, gte: start } },
                            { checkIn: { lte: start }, checkOut: { gte: end } }
                        ]
                    }
                })

                if (room.totalRooms - bookings > 0) {
                    validRooms.push({
                        name: room.name,
                        price: room.pricePerNight,
                        count: room.totalRooms - bookings
                    })
                }
            }

            return { available: validRooms.length > 0, rooms: validRooms }
        }

        const startDate = new Date(checkIn)
        const endDate = new Date(checkOut)

        // Check requested dates
        const primaryResult = await checkRange(startDate, endDate)

        if (primaryResult.available) {
            const lowestPrice = Math.min(...primaryResult.rooms.map(r => r.price))
            return NextResponse.json({
                available: true,
                rooms: primaryResult.rooms,
                lowestPrice,
                message: `Evet, ${checkIn} girişli ${primaryResult.rooms.length} farklı oda tipimiz müsait. Fiyatlarımız gecelik ${lowestPrice} TL'den başlıyor.`
            })
        }

        // If not available, check alternatives (+/- 3 days)
        const alternatives = []
        // Check 3 days before and 3 days after
        for (let i = -3; i <= 3; i++) {
            if (i === 0) continue // Skip original date (already checked)

            const altStart = new Date(startDate)
            altStart.setDate(altStart.getDate() + i)

            const altEnd = new Date(endDate)
            altEnd.setDate(altEnd.getDate() + i)

            // Skip past dates
            if (altStart < new Date()) continue

            const result = await checkRange(altStart, altEnd)
            if (result.available) {
                alternatives.push({
                    date: altStart.toISOString().split('T')[0],
                    rooms: result.rooms.map(r => r.name).join(", ")
                })
            }

            if (alternatives.length >= 3) break // Limit to 3 suggestions
        }

        let message = `Maalesef ${checkIn} - ${checkOut} tarihleri arasında istediğiniz kriterde boş odamız kalmadı.`

        if (alternatives.length > 0) {
            const altText = alternatives.map(a => `${a.date} (${a.rooms})`).join(", ")
            message += ` Ancak şu tarihlerde müsaitliğimiz var: ${altText}. Bu tarihlerden birini düşünür müsünüz?`
        } else {
            message += " Yakın tarihlerde de ne yazık ki doluyuz."
        }

        return NextResponse.json({
            available: false,
            alternatives,
            message
        })

    } catch (error: any) {
        console.error("[availability] Error:", error)
        console.error("[availability] Error details:", error.message, error.stack)
        return NextResponse.json(
            { 
                error: "Failed to check availability",
                details: error.message || String(error)
            },
            { status: 500 }
        )
    }
}
