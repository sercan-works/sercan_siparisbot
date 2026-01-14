import { format } from "date-fns"
import { tr } from "date-fns/locale"

// Reservation data type
interface ReservationData {
  guestName: string
  guestPhone?: string | null
  checkIn: string | Date
  checkOut: string | Date
  numberOfGuests: number
  numberOfChildren?: number | null
  numberOfRooms?: number
  roomType: string | null
  totalPrice?: number | null
  specialRequests?: string | null
  reservationCode: string
}

// Order data type
interface OrderData {
  customerName: string
  customerPhone?: string | null
  items: string
  deliveryAddress?: string | null
  notes?: string | null
  totalAmount?: number | null
  orderCode: string
  orderDate: string | Date
}

// Replace tags in template
export function replaceReservationTags(template: string, data: ReservationData): string {
  const checkInDate = new Date(data.checkIn)
  const checkOutDate = new Date(data.checkOut)
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  
  const totalPrice = typeof data.totalPrice === 'string' ? parseFloat(data.totalPrice) : (data.totalPrice || 0)
  const pricePerNight = nights > 0 && totalPrice > 0 ? Math.round(totalPrice / nights) : 0

  let message = template
    .replace(/{guestName}/g, data.guestName || "")
    .replace(/{guestPhone}/g, data.guestPhone || "Belirtilmemiş")
    .replace(/{checkIn}/g, format(checkInDate, "dd MMMM yyyy", { locale: tr }))
    .replace(/{checkOut}/g, format(checkOutDate, "dd MMMM yyyy", { locale: tr }))
    .replace(/{nights}/g, nights.toString())
    .replace(/{roomType}/g, data.roomType || "Belirtilmemiş")
    .replace(/{numberOfGuests}/g, data.numberOfGuests.toString())
    .replace(/{numberOfChildren}/g, (data.numberOfChildren && data.numberOfChildren > 0) ? data.numberOfChildren.toString() : "0")
    .replace(/{numberOfRooms}/g, (data.numberOfRooms || 1).toString())
    .replace(/{totalPrice}/g, totalPrice > 0 ? totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Belirtilmemiş")
    .replace(/{pricePerNight}/g, pricePerNight > 0 ? pricePerNight.toLocaleString('tr-TR') : "Belirtilmemiş")
    .replace(/{reservationCode}/g, data.reservationCode)
    .replace(/{specialRequests}/g, data.specialRequests || "Yok")

  return message
}

export function replaceOrderTags(template: string, data: OrderData): string {
  const orderDate = new Date(data.orderDate)
  
  const totalAmount = typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount) : (data.totalAmount || 0)

  let message = template
    .replace(/{customerName}/g, data.customerName || "")
    .replace(/{customerPhone}/g, data.customerPhone || "Belirtilmemiş")
    .replace(/{items}/g, data.items || "")
    .replace(/{deliveryAddress}/g, data.deliveryAddress || "Belirtilmemiş")
    .replace(/{notes}/g, data.notes || "Yok")
    .replace(/{totalAmount}/g, totalAmount > 0 ? totalAmount.toFixed(2) : "Belirtilmemiş")
    .replace(/{orderCode}/g, data.orderCode)
    .replace(/{orderDate}/g, format(orderDate, "dd MMMM yyyy, HH:mm", { locale: tr }))

  return message
}

// Get template from API
export async function getWhatsAppTemplate(
  customerType: "HOTEL" | "RESTAURANT",
  templateType: "confirmation" | "information" | "cancellation"
): Promise<string> {
  try {
    const response = await fetch("/api/whatsapp-templates")
    if (response.ok) {
      const data = await response.json()
      const category = customerType === "HOTEL" ? "hotel" : "restaurant"
      return data.templates[category][templateType] || ""
    }
  } catch (error) {
    console.error("Error fetching WhatsApp template:", error)
  }
  
  // Return default template if API fails
  return getDefaultTemplate(customerType, templateType)
}

function getDefaultTemplate(
  customerType: "HOTEL" | "RESTAURANT",
  templateType: "confirmation" | "information" | "cancellation"
): string {
  if (customerType === "HOTEL") {
    switch (templateType) {
      case "confirmation":
      case "information":
        return "Rezervasyon Bilgileri: Müşteri Adı: {guestName}  Rezervasyon Detayları: • Giriş: {checkIn} • Çıkış: {checkOut} • Gece Sayısı: {nights} gece • Oda Tipi: {roomType} • Kişi Sayısı: {numberOfGuests} kişi . Rezervasyon Kodu: {reservationCode} . İyi günler dileriz."
      case "cancellation":
        return "Sayın {guestName}, {reservationCode} kodlu rezervasyonunuz iptal edilmiştir. İyi günler dileriz."
    }
  } else {
    switch (templateType) {
      case "confirmation":
      case "information":
        return "Sipariş Bilgileri: Müşteri Adı: {customerName}  Sipariş Detayları: {items} . Sipariş Kodu: {orderCode} . İyi günler dileriz."
      case "cancellation":
        return "Sayın {customerName}, {orderCode} kodlu siparişiniz iptal edilmiştir. İyi günler dileriz."
    }
  }
}

