import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, isWeekend, getDay } from "date-fns"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const dateStr = searchParams.get("date") || format(new Date(), "yyyy-MM-dd")

    // Default to current month view
    const startDate = startOfMonth(new Date(dateStr))
    const endDate = endOfMonth(new Date(dateStr))

    try {
        // Fetch Rooms with Availability and Rules
        const rooms = await prisma.roomType.findMany({
            where: {
                organizationId: session.user.organizationId,
                customerId: session.user.role === "CUSTOMER" ? session.user.id : undefined,
                isActive: true
            },
            include: {
                availability: {
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                },
                priceRules: {
                    where: {
                        isActive: true,
                        OR: [
                            { startDate: null, endDate: null }, // Continuous rules (e.g. weekend)
                            {
                                startDate: { lte: endDate },
                                endDate: { gte: startDate }
                            }
                        ]
                    }
                }
            }
        })

        // Generate Calendar Grid
        const days = eachDayOfInterval({ start: startDate, end: endDate })

        const grid = rooms.map(room => {
            const dailyData = days.map(day => {
                const dateKey = format(day, "yyyy-MM-dd")

                // 1. Check Manual Availability/Override
                const availability = room.availability.find(a =>
                    format(a.date, "yyyy-MM-dd") === dateKey
                )

                // 2. Calculate Price
                let finalPrice = availability?.priceOverride ?? room.pricePerNight
                let activeRuleName = null

                if (!availability?.priceOverride) {
                    // Apply Rules (Highest priority first? simplistically last applied wins or we sort)
                    // Let's sort rules by priority descending (if we had priority field, for now we assume order)
                    // Actually schema has priority.
                    const relevantRules = room.priceRules.filter(rule => {
                        // Check Date Range
                        if (rule.startDate && rule.endDate) {
                            if (day < rule.startDate || day > rule.endDate) return false
                        }

                        // Check Day of Week
                        if (rule.daysOfWeek.length > 0) {
                            const dayOfWeek = getDay(day) // 0=Sun, 1=Mon
                            if (!rule.daysOfWeek.includes(dayOfWeek)) return false
                        }

                        return true
                    }).sort((a, b) => a.priority - b.priority)

                    // Apply rules
                    for (const rule of relevantRules) {
                        activeRuleName = rule.name
                        if (rule.priceAdjustmentType === "FIXED_PRICE") {
                            finalPrice = rule.adjustmentValue
                        } else if (rule.priceAdjustmentType === "FIXED_AMOUNT") {
                            finalPrice += rule.adjustmentValue
                        } else if (rule.priceAdjustmentType === "PERCENTAGE") {
                            finalPrice += (finalPrice * rule.adjustmentValue / 100)
                        }
                    }
                }

                return {
                    date: dateKey,
                    isBlocked: availability?.isBlocked ?? false,
                    price: finalPrice,
                    stock: room.totalRooms, // Simplified stock tracking for now
                    ruleName: activeRuleName
                }
            })

            return {
                id: room.id,
                name: room.name,
                data: dailyData
            }
        })

        return NextResponse.json({ grid })
    } catch (error) {
        console.error("Error fetching calendar:", error)
        return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 })
    }
}
