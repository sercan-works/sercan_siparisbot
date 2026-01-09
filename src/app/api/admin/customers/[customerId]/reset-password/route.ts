import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// POST /api/admin/customers/[customerId]/reset-password - Reset customer password
export async function POST(
  req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { newPassword } = body

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Şifre en az 8 karakter olmalıdır" },
        { status: 400 }
      )
    }

    // Check if customer exists in same organization
    const customer = await prisma.user.findFirst({
      where: {
        id: params.customerId,
        organizationId: session.user.organizationId,
        role: "CUSTOMER",
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Müşteri bulunamadı" },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: params.customerId },
      data: { hashedPassword },
    })

    return NextResponse.json({
      message: "Şifre başarıyla sıfırlandı",
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      { error: "Şifre sıfırlama başarısız" },
      { status: 500 }
    )
  }
}
