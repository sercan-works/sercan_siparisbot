import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateKnowledgeBaseDailyRatesAvailability } from "@/lib/knowledge-base-updater"

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
      },
      include: {
        customer: {
          select: {
            organizationId: true
          }
        }
      }
    })

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
    }

    const oldStatus = reservation.status
    const newStatus = status

    // Update reservation and room count in transaction
    const updatedReservation = await prisma.$transaction(async (tx) => {
      // Update reservation status
      const updated = await tx.reservation.update({
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

      // Update room count if roomTypeId exists
      if (reservation.roomTypeId) {
        // Get current room type
        const roomType = await tx.roomType.findUnique({
          where: { id: reservation.roomTypeId }
        })

        if (roomType) {
          let newTotalRooms = roomType.totalRooms

          // Status transition: PENDING/CONFIRMED/CHECKED_IN/CHECKED_OUT -> CANCELLED: Increase count
          if (oldStatus !== "CANCELLED" && newStatus === "CANCELLED") {
            newTotalRooms = roomType.totalRooms + 1
            await tx.roomType.update({
              where: { id: reservation.roomTypeId },
              data: { totalRooms: newTotalRooms }
            })
            console.log("[reservation status] Increased room count:", { roomTypeId: reservation.roomTypeId, oldCount: roomType.totalRooms, newCount: newTotalRooms })
          }
          // Status transition: CANCELLED -> PENDING/CONFIRMED/CHECKED_IN/CHECKED_OUT: Decrease count
          else if (oldStatus === "CANCELLED" && newStatus !== "CANCELLED") {
            newTotalRooms = Math.max(0, roomType.totalRooms - 1)
            await tx.roomType.update({
              where: { id: reservation.roomTypeId },
              data: { totalRooms: newTotalRooms }
            })
            console.log("[reservation status] Decreased room count:", { roomTypeId: reservation.roomTypeId, oldCount: roomType.totalRooms, newCount: newTotalRooms })
          }
        }
      }

      return updated
    })

    // Update knowledge base daily rates availability asynchronously if status changed
    // Only update if status transition involves CANCELLED status
    if ((oldStatus !== "CANCELLED" && newStatus === "CANCELLED") || (oldStatus === "CANCELLED" && newStatus !== "CANCELLED")) {
      const customerOrgId = reservation.customer?.organizationId || organizationId
      
      // Determine delta: -1 to increase (cancelling reservation), 1 to decrease (confirming reservation)
      const delta = oldStatus !== "CANCELLED" && newStatus === "CANCELLED" ? -1 : 1
      
      updateKnowledgeBaseDailyRatesAvailability(
        customerOrgId,
        reservation.customerId,
        reservation.checkIn,
        reservation.checkOut,
        delta,
        reservation.roomType || undefined
      ).catch((err) => {
        console.error("[reservation status] Failed to update knowledge base daily rates:", err)
        // Don't fail status update if KB update fails
      })
    }

    return NextResponse.json({ reservation: updatedReservation })
  } catch (error) {
    console.error("Error updating reservation:", error)
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 }
    )
  }
}

