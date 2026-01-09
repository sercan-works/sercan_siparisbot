import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation
const ruleSchema = z.object({
    roomTypeId: z.string(),
    name: z.string().min(2),
    startDate: z.string().optional().nullable(), // ISO string
    endDate: z.string().optional().nullable(),
    daysOfWeek: z.array(z.number()).optional(), // [0, 6] for weekends
    priceAdjustmentType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FIXED_PRICE"]),
    adjustmentValue: z.number(),
    priority: z.number().default(1)
})

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        const data = ruleSchema.parse(body)

        // Verify ownership
        const room = await prisma.roomType.findUnique({
            where: { id: data.roomTypeId }
        })

        if (!room || (session.user.role === "CUSTOMER" && room.customerId !== session.user.id)) {
            return NextResponse.json({ error: "Unauthorized room access" }, { status: 403 })
        }

        const rule = await prisma.roomPriceRule.create({
            data: {
                roomTypeId: data.roomTypeId,
                name: data.name,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                daysOfWeek: data.daysOfWeek || [],
                priceAdjustmentType: data.priceAdjustmentType,
                adjustmentValue: data.adjustmentValue,
                priority: data.priority
            }
        })

        return NextResponse.json({ rule }, { status: 201 })
    } catch (error) {
        console.error("Error creating rule:", error)
        return NextResponse.json({ error: "Failed to create rule" }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const roomTypeId = searchParams.get("roomTypeId")

    if (!roomTypeId) {
        return NextResponse.json({ error: "RoomTypeId required" }, { status: 400 })
    }

    try {
        const rules = await prisma.roomPriceRule.findMany({
            where: { roomTypeId, isActive: true },
            orderBy: { priority: 'asc' }
        })
        return NextResponse.json({ rules })
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 })
    }
}
