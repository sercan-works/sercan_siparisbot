import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import ReservationList from "@/components/reservations/reservation-list"

export const dynamic = "force-dynamic"

async function getReservations() {
    const session = await getServerSession(authOptions)
    // We can call the API internally or use Prisma directly since this is a server component.
    // Making it self-contained is better for reusability but direct DB is faster.
    // Let's rely on the API Route we just built to keep logic in one place?
    // Actually, calling own API in Server Component needs absolute URL.
    // Better to just query Prisma directly here for simplicity and perf.

    // BUT, the API route handles filtering logic. I'll duplicate minimal logic here.
    const { prisma } = require("@/lib/prisma") // lazy load

    if (!session?.user) return []

    const reservations = await prisma.reservation.findMany({
        where: {
            OR: [
                { customerId: session.user.id },
                { 
                    call: {
                        bot: {
                            assignments: {
                                some: { userId: session.user.id }
                            }
                        }
                    }
                }
            ]
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
            confirmedAt: true,
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

    // Convert dates to strings for serialization and ensure totalPrice is a number
    return reservations.map((r: any) => ({
        ...r,
        checkIn: r.checkIn?.toISOString(),
        checkOut: r.checkOut?.toISOString(),
        createdAt: r.createdAt?.toISOString(),
        confirmedAt: r.confirmedAt?.toISOString() || null,
        // Ensure totalPrice is a number (Prisma Float can sometimes be serialized as string)
        totalPrice: r.totalPrice ? (typeof r.totalPrice === 'string' ? parseFloat(r.totalPrice) : Number(r.totalPrice)) : null,
    }))
}

export default async function ReservationsPage() {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "CUSTOMER" || session.user.customerType !== "HOTEL") {
        redirect("/customer/dashboard")
    }

    const reservations = await getReservations()

    const upcomingCount = reservations.filter((r: any) => {
        if (r.status === "CANCELLED") return false
        const checkIn = new Date(r.checkIn || "")
        checkIn.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return checkIn >= today
    }).length

    const pastCount = reservations.filter((r: any) => {
        if (r.status === "CANCELLED") return false
        const checkIn = new Date(r.checkIn || "")
        checkIn.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return checkIn < today
    }).length

    const cancelledCount = reservations.filter((r: any) => r.status === "CANCELLED").length

    return (
        <div className="p-6 sm:p-8 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Rezervasyonlar</h1>
                    <p className="text-gray-500 mt-1">Botunuz üzerinden alınan rezervasyon talepleri.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium text-sm border border-blue-200">
                        Toplam: {reservations.length}
                    </div>
                    <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-medium text-sm border border-green-200">
                        Gelecek: {upcomingCount}
                    </div>
                    <div className="bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm border border-gray-200">
                        Geçmiş: {pastCount}
                    </div>
                </div>
            </div>

            <ReservationList initialReservations={reservations} />
        </div>
    )
}
