import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId, role, id: userId, customerType } = session.user

    if (role === "CUSTOMER" && customerType !== "HOTEL") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const reservations = await prisma.reservation.findMany({
            where: {
                // If CUSTOMER (Hotel), show reservations assigned to them OR reservations from bots they're assigned to
                // If ADMIN, show all in organization
                ...(role === "CUSTOMER" ? {
                    OR: [
                        { customerId: userId },
                        { 
                            call: {
                                bot: {
                                    assignments: {
                                        some: { userId }
                                    }
                                }
                            }
                        }
                    ]
                } : {
                    customer: {
                        organizationId: organizationId
                    }
                })
            },
            select: {
                id: true,
                guestName: true,
                guestPhone: true,
                guestEmail: true,
                checkIn: true,
                checkOut: true,
                numberOfGuests: true,
                numberOfChildren: true,
                numberOfRooms: true,
                roomType: true,
                roomTypeId: true,
                status: true,
                totalPrice: true,
                specialRequests: true,
                createdAt: true,
                callId: true,
                call: {
                    select: {
                        id: true,
                        bot: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        // Ensure totalPrice is a number (Prisma Float can sometimes be serialized as string)
        const formattedReservations = reservations.map((r: any) => ({
            ...r,
            checkIn: r.checkIn?.toISOString(),
            checkOut: r.checkOut?.toISOString(),
            createdAt: r.createdAt?.toISOString(),
            totalPrice: r.totalPrice ? (typeof r.totalPrice === 'string' ? parseFloat(r.totalPrice) : Number(r.totalPrice)) : null,
        }))

        return NextResponse.json({ reservations: formattedReservations })

    } catch (error) {
        console.error("Error fetching reservations:", error)
        return NextResponse.json(
            { error: "Failed to fetch reservations" },
            { status: 500 }
        )
    }
}
