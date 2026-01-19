import jsPDF from "jspdf"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

interface AnalyticsData {
  totalCalls: number
  successfulReservations: number
  successfulOrders: number
  priceTooHigh: number
  noRoomAvailable: number
  productUnavailable: number
  conversionRate: number
  customerType?: "HOTEL" | "RESTAURANT" | null
  dateRange: {
    start: string
    end: string
  }
  dailyBreakdown: Array<{
    date: string
    metrics: {
      totalCalls: number
      successfulReservations: number
      successfulOrders: number
      priceTooHigh: number
      noRoomAvailable: number
      productUnavailable: number
      conversionRate: number
    }
  }>
}

export function exportToPDF(data: AnalyticsData) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const lineHeight = 7
  let yPos = margin

  const isHotel = data.customerType === "HOTEL"
  const isRestaurant = data.customerType === "RESTAURANT"
  const businessType = isHotel ? "Otel" : isRestaurant ? "Restoran" : "İşletme"

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  // Header
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("Raporlama Analizi", pageWidth / 2, yPos, { align: "center" })
  yPos += lineHeight * 1.5

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(
    `${businessType} Görüşme Metrikleri`,
    pageWidth / 2,
    yPos,
    { align: "center" }
  )
  yPos += lineHeight

  // Date Range
  const startDate = format(new Date(data.dateRange.start), "dd MMMM yyyy", { locale: tr })
  const endDate = format(new Date(data.dateRange.end), "dd MMMM yyyy", { locale: tr })
  doc.setFontSize(10)
  doc.text(`Tarih Aralığı: ${startDate} - ${endDate}`, margin, yPos)
  yPos += lineHeight * 1.5

  // Summary Section
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Özet Metrikler", margin, yPos)
  yPos += lineHeight * 1.2

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  // Summary metrics in two columns
  const leftCol = margin
  const rightCol = pageWidth / 2 + 10
  let currentCol = leftCol

  doc.setFont("helvetica", "bold")
  doc.text("Toplam Arama:", currentCol, yPos)
  doc.setFont("helvetica", "normal")
  doc.text(`${data.totalCalls}`, currentCol + 50, yPos)
  yPos += lineHeight

  if (!data.customerType || isHotel) {
    doc.setFont("helvetica", "bold")
    doc.text("Başarılı Rezervasyon:", currentCol, yPos)
    doc.setFont("helvetica", "normal")
    doc.text(`${data.successfulReservations}`, currentCol + 50, yPos)
    yPos += lineHeight
  }

  if (!data.customerType || isRestaurant) {
    doc.setFont("helvetica", "bold")
    doc.text("Başarılı Sipariş:", currentCol, yPos)
    doc.setFont("helvetica", "normal")
    doc.text(`${data.successfulOrders}`, currentCol + 50, yPos)
    yPos += lineHeight
  }

  doc.setFont("helvetica", "bold")
  doc.text("Dönüşüm Oranı:", currentCol, yPos)
  doc.setFont("helvetica", "normal")
  doc.text(`${data.conversionRate.toFixed(1)}%`, currentCol + 50, yPos)
  yPos += lineHeight * 1.5

  // Rejection metrics
  doc.setFont("helvetica", "bold")
  doc.text("Red Metrikleri:", currentCol, yPos)
  yPos += lineHeight

  doc.setFont("helvetica", "normal")
  doc.text(`Fiyat Yüksek Bulundu: ${data.priceTooHigh}`, currentCol, yPos)
  yPos += lineHeight

  if (!data.customerType || isHotel) {
    doc.text(`Yer Olmadığı İçin: ${data.noRoomAvailable}`, currentCol, yPos)
    yPos += lineHeight
  }

  if (!data.customerType || isRestaurant) {
    doc.text(`Ürün Kalmadığı İçin: ${data.productUnavailable}`, currentCol, yPos)
    yPos += lineHeight
  }

  yPos += lineHeight

  // Daily Breakdown Table
  checkPageBreak(lineHeight * 3)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Günlük Detay", margin, yPos)
  yPos += lineHeight * 1.2

  // Table header
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  const tableStartY = yPos
  const colWidths = {
    date: 30,
    total: 20,
    reservation: 25,
    order: 20,
    priceHigh: 25,
    noRoom: 20,
    noProduct: 25,
    conversion: 20
  }

  let xPos = margin
  doc.text("Tarih", xPos, yPos)
  xPos += colWidths.date
  doc.text("Toplam", xPos, yPos)
  xPos += colWidths.total

  if (!data.customerType || isHotel) {
    doc.text("Rezervasyon", xPos, yPos)
    xPos += colWidths.reservation
  }

  if (!data.customerType || isRestaurant) {
    doc.text("Sipariş", xPos, yPos)
    xPos += colWidths.order
  }

  doc.text("Fiyat Yüksek", xPos, yPos)
  xPos += colWidths.priceHigh

  if (!data.customerType || isHotel) {
    doc.text("Yer Yok", xPos, yPos)
    xPos += colWidths.noRoom
  }

  if (!data.customerType || isRestaurant) {
    doc.text("Ürün Yok", xPos, yPos)
    xPos += colWidths.noProduct
  }

  doc.text("Dönüşüm %", xPos, yPos)
  yPos += lineHeight

  // Draw header line
  doc.setLineWidth(0.5)
  doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
  yPos += 2

  // Table rows
  doc.setFont("helvetica", "normal")
  data.dailyBreakdown.forEach((day) => {
    checkPageBreak(lineHeight * 2)

    const date = format(new Date(day.date), "dd MMM yyyy", { locale: tr })
    xPos = margin

    doc.text(date, xPos, yPos)
    xPos += colWidths.date
    doc.text(day.metrics.totalCalls.toString(), xPos, yPos)
    xPos += colWidths.total

    if (!data.customerType || isHotel) {
      doc.text(day.metrics.successfulReservations.toString(), xPos, yPos)
      xPos += colWidths.reservation
    }

    if (!data.customerType || isRestaurant) {
      doc.text(day.metrics.successfulOrders.toString(), xPos, yPos)
      xPos += colWidths.order
    }

    doc.text(day.metrics.priceTooHigh.toString(), xPos, yPos)
    xPos += colWidths.priceHigh

    if (!data.customerType || isHotel) {
      doc.text(day.metrics.noRoomAvailable.toString(), xPos, yPos)
      xPos += colWidths.noRoom
    }

    if (!data.customerType || isRestaurant) {
      doc.text(day.metrics.productUnavailable.toString(), xPos, yPos)
      xPos += colWidths.noProduct
    }

    doc.text(`${day.metrics.conversionRate.toFixed(1)}%`, xPos, yPos)
    yPos += lineHeight

    // Draw row separator
    doc.setLineWidth(0.1)
    doc.line(margin, yPos - 1, pageWidth - margin, yPos - 1)
  })

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(
      `Sayfa ${i} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    )
    doc.text(
      `Oluşturulma Tarihi: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: tr })}`,
      margin,
      pageHeight - 10
    )
  }

  // Generate filename
  const filename = `rapor_${data.dateRange.start}_${data.dateRange.end}.pdf`
  doc.save(filename)
}

