import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// PATCH /api/orders/[orderId] - Update order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: userId, role, organizationId } = session.user
  const { orderId } = params

  try {
    const body = await req.json()
    const { status } = body

    // Verify order belongs to user (same logic as GET /api/orders)
    const where: any = {
      id: orderId,
      // If CUSTOMER (Restaurant), allow orders assigned to them OR orders from bots they're assigned to
      // If ADMIN, allow all orders in organization
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

    const order = await prisma.order.findFirst({
      where
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === "COMPLETED" && { completedAt: new Date() })
      },
      include: {
        call: {
          select: {
            id: true,
            retellCallId: true,
            transcript: true,
            recordingUrl: true,
            createdAt: true
          }
        }
      }
    })

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}
