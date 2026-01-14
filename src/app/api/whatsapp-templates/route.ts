import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/whatsapp-templates - Get WhatsApp templates
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        whatsappTemplates: true,
      }
    })

    // Default templates
    const defaultTemplates = {
      hotel: {
        confirmation: "Rezervasyon Bilgileri: Müşteri Adı: {guestName}  Rezervasyon Detayları: • Giriş: {checkIn} • Çıkış: {checkOut} • Gece Sayısı: {nights} gece • Oda Tipi: {roomType} • Kişi Sayısı: {numberOfGuests} kişi . Rezervasyon Kodu: {reservationCode} . İyi günler dileriz.",
        information: "Rezervasyon Bilgileri: Müşteri Adı: {guestName}  Rezervasyon Detayları: • Giriş: {checkIn} • Çıkış: {checkOut} • Gece Sayısı: {nights} gece • Oda Tipi: {roomType} • Kişi Sayısı: {numberOfGuests} kişi . Rezervasyon Kodu: {reservationCode} . İyi günler dileriz.",
        cancellation: "Sayın {guestName}, {reservationCode} kodlu rezervasyonunuz iptal edilmiştir. İyi günler dileriz."
      },
      restaurant: {
        confirmation: "Sipariş Bilgileri: Müşteri Adı: {customerName}  Sipariş Detayları: {items} . Sipariş Kodu: {orderCode} . İyi günler dileriz.",
        information: "Sipariş Bilgileri: Müşteri Adı: {customerName}  Sipariş Detayları: {items} . Sipariş Kodu: {orderCode} . İyi günler dileriz.",
        cancellation: "Sayın {customerName}, {orderCode} kodlu siparişiniz iptal edilmiştir. İyi günler dileriz."
      }
    }

    const templates = organization?.whatsappTemplates 
      ? (typeof organization.whatsappTemplates === 'string' 
          ? JSON.parse(organization.whatsappTemplates) 
          : organization.whatsappTemplates)
      : defaultTemplates

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Error fetching WhatsApp templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }
}

// PUT /api/whatsapp-templates - Update WhatsApp templates
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const body = await req.json()
    const { templates } = body

    if (!templates) {
      return NextResponse.json(
        { error: "Templates are required" },
        { status: 400 }
      )
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        whatsappTemplates: templates
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating WhatsApp templates:", error)
    return NextResponse.json(
      { error: "Failed to update templates" },
      { status: 500 }
    )
  }
}

