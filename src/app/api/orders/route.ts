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

  const { organizationId, role, id: userId, customerType } = session.user
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  if (role === "CUSTOMER" && customerType !== "RESTAURANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const where: any = {
      // If CUSTOMER (Restaurant), show orders assigned to them OR orders from bots they're assigned to
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
    }

    if (status) {
      where.status = status
    }

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

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}
