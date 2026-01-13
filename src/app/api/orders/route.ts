import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"


export const dynamic = "force-dynamic"

// GET /api/orders - Get orders for customer
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: userId, role, organizationId, customerType } = session.user
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  try {
    // Build where clause based on role
    // If CUSTOMER (Restaurant), show orders assigned to them OR orders from bots they're assigned to
    // If ADMIN, show all orders in organization
    const where: any = role === "CUSTOMER" && customerType === "RESTAURANT" ? {
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
    }

    if (status) {
      where.status = status
    }

    console.log("[orders] Fetching orders with filter:", {
      userId,
      role,
      organizationId,
      customerType,
      status,
      whereClause: JSON.stringify(where, null, 2)
    })

    const orders = await prisma.order.findMany({
      where,
      include: {
        call: {
          select: {
            id: true,
            retellCallId: true,
            transcript: true,
            recordingUrl: true,
            createdAt: true
          }
        },
        customer: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    console.log("[orders] Found orders:", orders.length)

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}
