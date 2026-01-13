import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// PATCH /api/reservations/[reservationId] - Update reservation status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { reservationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: userId, role, organizationId } = session.user
  const { reservationId } = params

  try {
    const body = await req.json()
    const { status } = body

    // Verify reservation belongs to user or user has access through bot assignment
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
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
      }
    })

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status,
        ...(status === "CONFIRMED" && { confirmedAt: new Date() })
      },
      include: {
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
      }
    })

    return NextResponse.json({ reservation: updatedReservation })
  } catch (error) {
    console.error("Error updating reservation:", error)
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 }
    )
  }
}

