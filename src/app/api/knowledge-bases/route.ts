import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRetellClient, callRetellApi } from "@/lib/retell"
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
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ knowledgeBases })
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

    // Create KB in Retell
    // Convert JSON strings to readable text for Retell RAG
    const retellTexts = data.texts.map(text => {
      try {
        // Try to parse JSON and convert to readable format
        const parsed = JSON.parse(text)
        // Convert JSON object to readable text format
        return JSON.stringify(parsed, null, 2)
      } catch {
        // If not JSON, use as-is
        return text
      }
    })

    let retellId: string | null = null
    try {
      // Try using raw API call first (more reliable)
      console.log(`[KB Create] Creating Retell KB with name: ${data.name}, texts count: ${retellTexts.length}`)
      
      try {
        const retellKB = await callRetellApi(
          "POST",
          "/create-knowledge-base",
          {
            knowledge_base_name: data.name,
            texts: retellTexts,
            enable_auto_refresh: data.enableAutoRefresh ?? true,
          },
          organizationId
        ) as any
        
        console.log(`[KB Create] Retell API response:`, JSON.stringify(retellKB, null, 2))
        
        retellId = retellKB.knowledge_base_id || retellKB.id || retellKB.knowledgeBaseId
        if (!retellId) {
          console.error("[KB Create] Retell response structure:", Object.keys(retellKB))
          throw new Error(`Retell KB oluşturuldu ama ID döndürülmedi. Response: ${JSON.stringify(retellKB)}`)
        }
        console.log(`[KB Create] Retell KB oluşturuldu: ${retellId}`)
      } catch (rawApiError: any) {
        // Fallback to SDK if raw API fails
        console.warn("[KB Create] Raw API failed, trying SDK:", rawApiError.message)
        const retellClient = await getRetellClient(organizationId)
        const retellKB = await retellClient.knowledgeBase.create({
          knowledge_base_name: data.name,
          texts: retellTexts,
          enable_auto_refresh: data.enableAutoRefresh ?? true,
        } as any) as any
        
        retellId = retellKB.knowledge_base_id || retellKB.id || retellKB.knowledgeBaseId
        if (!retellId) {
          throw new Error(`Retell KB oluşturuldu ama ID döndürülmedi`)
        }
        console.log(`[KB Create] Retell KB oluşturuldu (SDK): ${retellId}`)
      }
    } catch (retellError: any) {
      console.error("[KB Create] Retell KB oluşturma hatası:", retellError)
      console.error("[KB Create] Error details:", {
        message: retellError.message,
        stack: retellError.stack,
        response: retellError.response,
        status: retellError.status
      })
      
      // Retell hatası olsa bile lokal KB oluşturulabilir (fallback)
      // Geçici ID ile devam et, kullanıcı daha sonra sync yapabilir
      retellId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`
      console.warn(`[KB Create] Retell KB oluşturulamadı, geçici ID kullanılıyor: ${retellId}`)
      console.warn(`[KB Create] Kullanıcı daha sonra sync butonunu kullanarak Retell'e senkronize edebilir`)
    }

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
