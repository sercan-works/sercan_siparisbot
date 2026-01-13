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
    // Build where clause - filter by organization through call
    // This is simpler and more reliable than filtering through customer relation
    let where: any = {
      call: {
        organizationId: organizationId
      }
    }

    // For CUSTOMER role, also filter by their assignments
    if (role === "CUSTOMER" && customerType === "RESTAURANT") {
      // Get bot IDs this user is assigned to
      const botAssignments = await prisma.botAssignment.findMany({
        where: { userId },
        select: { botId: true }
      })
      const assignedBotIds = botAssignments.map(a => a.botId)

      // Add filter: orders from assigned bots OR orders assigned to this user
      where = {
        AND: [
          {
            call: {
              organizationId: organizationId
            }
          },
          {
            OR: [
              { customerId: userId },
              {
                call: {
                  botId: { in: assignedBotIds }
                }
              }
            ]
          }
        ]
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
            createdAt: true,
            organizationId: true
          }
        },
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
            organizationId: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    console.log("[orders] Found orders:", {
      count: orders.length,
      orderIds: orders.map(o => o.id),
      customerIds: orders.map(o => o.customerId),
      callOrgIds: orders.map(o => o.call?.organizationId),
      customerOrgIds: orders.map(o => o.customer?.organizationId)
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}
