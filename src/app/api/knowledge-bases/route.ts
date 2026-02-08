import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"


export const dynamic = "force-dynamic"

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  texts: z.array(z.string()).min(1, "At least one text chunk is required"),
  enableAutoRefresh: z.boolean().optional().default(true),
  customerId: z.string().cuid().optional(), // Required for admins, ignored/overridden for customers
})

// GET /api/knowledge-bases - List knowledge bases (tenant-scoped)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    const searchCustomerId = req.nextUrl.searchParams.get("customerId")
    const where: any = { organizationId }
    if (role === "CUSTOMER") {
      where.customerId = userId
    } else if (searchCustomerId) {
      where.customerId = searchCustomerId
    }

    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            customerType: true,
          }
        },
        _count: {
          select: { bots: true }
        },
        bots: {
          take: 1,
          include: {
            bot: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    // Map to include assignedBot (1 KB → 1 agent)
    const knowledgeBasesWithAssignedBot = knowledgeBases.map((kb) => {
      const { bots, ...rest } = kb
      const assignedBot = bots[0]?.bot ?? null
      return { ...rest, assignedBot }
    })

    return NextResponse.json({ knowledgeBases: knowledgeBasesWithAssignedBot })
  } catch (error) {
    console.error("Error fetching knowledge bases:", error)
    return NextResponse.json(
      { error: "Failed to fetch knowledge bases" },
      { status: 500 }
    )
  }
}

// POST /api/knowledge-bases - Create new knowledge base
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    const body = await req.json()
    const data = createKnowledgeBaseSchema.parse(body)

    // Determine target customer
    let targetCustomerId: string
    if (role === "CUSTOMER") {
      targetCustomerId = userId
    } else {
      if (!data.customerId) {
        return NextResponse.json(
          { error: "customerId is required" },
          { status: 400 }
        )
      }
      const targetCustomer = await prisma.user.findFirst({
        where: {
          id: data.customerId,
          organizationId,
          role: "CUSTOMER"
        },
        select: { id: true }
      })

      if (!targetCustomer) {
        return NextResponse.json(
          { error: "Customer not found for this organization" },
          { status: 404 }
        )
      }
      targetCustomerId = targetCustomer.id
    }

    // Retell KB oluşturulmayacak, sadece lokal kayıt yapılacak
    // Geçici ID kullan (Retell'e senkronize edilmemiş KB'ler için)
    const retellId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`
    console.log(`[KB Create] Lokal KB oluşturuluyor (Retell'e senkronize edilmeyecek): ${retellId}`)

    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        organizationId,
        retellKnowledgeBaseId: retellId,
        name: data.name,
        texts: data.texts,
        enableAutoRefresh: data.enableAutoRefresh,
        customerId: targetCustomerId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            customerType: true,
          }
        },
        _count: {
          select: { bots: true }
        }
      }
    })

    return NextResponse.json({ knowledgeBase }, { status: 201 })
  } catch (error) {
    console.error("Error creating knowledge base:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create knowledge base" },
      { status: 500 }
    )
  }
}
