import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { RobotoRegular } from "./fonts/roboto"

// Register Roboto font for Turkish character support
function registerFonts(doc: jsPDF) {
  doc.addFileToVFS("Roboto-Regular.ttf", RobotoRegular)
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal")
  doc.setFont("Roboto", "normal")
}

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
      totalReservationPrice?: number
      totalOrderPrice?: number
      priceTooHigh: number
      noRoomAvailable: number
      productUnavailable: number
      conversionRate: number
    }
  }>
}

function formatPricePdf(value: number | undefined): string {
  if (value == null || value === 0) return "—"
  return `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Helper function to safely add text with Turkish characters
function addText(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  // jsPDF'in Unicode desteğini kullanarak Türkçe karakterleri göster
  doc.text(text, x, y, options)
}

// Helper function to check page break
function checkPageBreak(doc: jsPDF, yPos: number, requiredSpace: number, pageHeight: number, margin: number): number {
  if (yPos + requiredSpace > pageHeight - margin) {
    doc.addPage()
    return margin
  }
  return yPos
}

// Hotel-specific PDF export
function exportHotelPDF(data: AnalyticsData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  })

  // Register Roboto font for Turkish character support
  registerFonts(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // Helper function
  const checkBreak = (space: number) => {
    yPos = checkPageBreak(doc, yPos, space, pageHeight, margin)
  }

  // Header with logo area
  doc.setFillColor(59, 130, 246) // Blue
  doc.rect(0, 0, pageWidth, 40, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("Roboto", "normal")
  addText(doc, "OTEL REZERVASYON RAPORU", pageWidth / 2, 20, { align: "center" })
  
  doc.setFontSize(12)
  doc.setFont("Roboto", "normal")
  addText(doc, "Görüşme Metrikleri ve Analiz Raporu", pageWidth / 2, 28, { align: "center" })
  
  doc.setTextColor(0, 0, 0)
  yPos = 50

  // Date Range
  const startDate = format(new Date(data.dateRange.start), "dd MMMM yyyy", { locale: tr })
  const endDate = format(new Date(data.dateRange.end), "dd MMMM yyyy", { locale: tr })
  doc.setFontSize(10)
  doc.setFont("Roboto", "normal")
  addText(doc, `Rapor Tarih Aralığı: ${startDate} - ${endDate}`, margin, yPos)
  yPos += 8

  // Executive Summary Box
  doc.setFillColor(249, 250, 251)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 35, "F")
  doc.setDrawColor(229, 231, 235)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 35, "S")
  
  yPos += 8
  doc.setFontSize(14)
  doc.setFont("Roboto", "normal")
  addText(doc, "Yönetici Özeti", margin + 5, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setFont("Roboto", "normal")
  const totalSuccessful = data.successfulReservations
  const totalRejections = data.priceTooHigh + data.noRoomAvailable
  const successRate = data.totalCalls > 0 ? ((totalSuccessful / data.totalCalls) * 100).toFixed(1) : "0"
  const rejectionRate = data.totalCalls > 0 ? ((totalRejections / data.totalCalls) * 100).toFixed(1) : "0"

  addText(doc, `• Toplam ${data.totalCalls} görüşme gerçekleşti`, margin + 5, yPos)
  yPos += 6
  addText(doc, `• ${data.successfulReservations} rezervasyon başarıyla tamamlandı (${successRate}% başarı oranı)`, margin + 5, yPos)
  yPos += 6
  addText(doc, `• ${totalRejections} görüşme reddedildi (${rejectionRate}% red oranı)`, margin + 5, yPos)
  yPos += 6
  addText(doc, `• Dönüşüm oranı: %${data.conversionRate.toFixed(1)}`, margin + 5, yPos)
  yPos += 15

  // Detailed Metrics Section
  checkBreak(50)
  doc.setFontSize(16)
  doc.setFont("Roboto", "normal")
  addText(doc, "Detaylı Metrikler", margin, yPos)
  yPos += 10

  // Metrics in two columns
  const leftCol = margin
  const rightCol = pageWidth / 2 + 5
  const colWidth = (pageWidth - 2 * margin - 5) / 2

  // Left column
  doc.setFontSize(11)
  doc.setFont("Roboto", "normal")
  addText(doc, "Başarı Metrikleri", leftCol, yPos)
  yPos += 7

  doc.setFontSize(10)
  doc.setFont("Roboto", "normal")
  addText(doc, `Toplam Arama:`, leftCol, yPos)
  doc.setFont("Roboto", "normal")
  addText(doc, `${data.totalCalls}`, leftCol + 45, yPos)
  yPos += 6

  doc.setFont("Roboto", "normal")
  addText(doc, `Başarılı Rezervasyon:`, leftCol, yPos)
  doc.setFont("Roboto", "normal")
  doc.setTextColor(34, 197, 94) // Green
  addText(doc, `${data.successfulReservations}`, leftCol + 45, yPos)
  doc.setTextColor(0, 0, 0)
  yPos += 6

  doc.setFont("Roboto", "normal")
  addText(doc, `Dönüşüm Oranı:`, leftCol, yPos)
  doc.setFont("Roboto", "normal")
  doc.setTextColor(147, 51, 234) // Purple
  addText(doc, `%${data.conversionRate.toFixed(1)}`, leftCol + 45, yPos)
  doc.setTextColor(0, 0, 0)
  yPos += 10

  // Right column
  yPos = yPos - 19 // Reset to same level
  doc.setFontSize(11)
  doc.setFont("Roboto", "normal")
  addText(doc, "Red Metrikleri", rightCol, yPos)
  yPos += 7

  doc.setFontSize(10)
  doc.setFont("Roboto", "normal")
  addText(doc, `Fiyat Yüksek Bulundu:`, rightCol, yPos)
  doc.setFont("Roboto", "normal")
  doc.setTextColor(249, 115, 22) // Orange
  addText(doc, `${data.priceTooHigh}`, rightCol + 50, yPos)
  doc.setTextColor(0, 0, 0)
  yPos += 6

  doc.setFont("Roboto", "normal")
  addText(doc, `Yer Olmadığı İçin:`, rightCol, yPos)
  doc.setFont("Roboto", "normal")
  doc.setTextColor(239, 68, 68) // Red
  addText(doc, `${data.noRoomAvailable}`, rightCol + 50, yPos)
  doc.setTextColor(0, 0, 0)
  yPos += 6

  doc.setFont("Roboto", "normal")
  addText(doc, `Toplam Red:`, rightCol, yPos)
  doc.setFont("Roboto", "normal")
  addText(doc, `${totalRejections}`, rightCol + 50, yPos)
  yPos += 12

  // Analysis Section
  checkBreak(40)
  doc.setFontSize(16)
  doc.setFont("Roboto", "normal")
  addText(doc, "Analiz ve Yorumlar", margin, yPos)
  yPos += 10

  doc.setFontSize(10)
  doc.setFont("Roboto", "normal")
  
  // Performance analysis
  if (data.conversionRate >= 50) {
    addText(doc, "✓ Mükemmel Performans: Dönüşüm oranınız %50'nin üzerinde. Bot performansı çok iyi.", margin, yPos)
  } else if (data.conversionRate >= 30) {
    addText(doc, "✓ İyi Performans: Dönüşüm oranınız %30-50 arasında. Bot performansı iyi seviyede.", margin, yPos)
  } else {
    addText(doc, "⚠ Geliştirme Gerekiyor: Dönüşüm oranınız %30'un altında. Bot ayarlarını gözden geçirmeniz önerilir.", margin, yPos)
  }
  yPos += 7

  if (data.priceTooHigh > data.totalCalls * 0.2) {
    addText(doc, "⚠ Fiyat Endişesi: Görüşmelerin %20'den fazlası fiyat nedeniyle reddedildi. Fiyatlandırma stratejinizi gözden geçirin.", margin, yPos)
    yPos += 7
  }

  if (data.noRoomAvailable > data.totalCalls * 0.15) {
    addText(doc, "⚠ Kapasite Sorunu: Görüşmelerin %15'inden fazlası yer olmadığı için reddedildi. Kapasite yönetimini optimize edin.", margin, yPos)
    yPos += 7
  }

  yPos += 5

  // Daily Breakdown Table
  checkBreak(30)
  doc.setFontSize(16)
  doc.setFont("Roboto", "normal")
  addText(doc, "Günlük Detay Tablosu", margin, yPos)
  yPos += 10

  // Prepare table data (Hotel: Rezervasyon + Rez. Toplam ₺)
  const tableData = data.dailyBreakdown.map(day => {
    const date = format(new Date(day.date), "dd MMM yyyy", { locale: tr })
    return [
      date,
      day.metrics.totalCalls.toString(),
      day.metrics.successfulReservations.toString(),
      formatPricePdf(day.metrics.totalReservationPrice),
      day.metrics.priceTooHigh.toString(),
      day.metrics.noRoomAvailable.toString(),
      `${day.metrics.conversionRate.toFixed(1)}%`
    ]
  })

  autoTable(doc, {
    startY: yPos,
    head: [["Tarih", "Toplam Arama", "Başarılı Rezervasyon", "Rez. Toplam (₺)", "Fiyat Yüksek", "Yer Yok", "Dönüşüm %"]],
    body: tableData,
    theme: "striped",
    styles: {
      font: "Roboto"
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { halign: "center" },
      2: { halign: "center", textColor: [34, 197, 94] },
      3: { halign: "right", textColor: [34, 197, 94] },
      4: { halign: "center", textColor: [249, 115, 22] },
      5: { halign: "center", textColor: [239, 68, 68] },
      6: { halign: "center", fontStyle: "bold" }
    },
    margin: { left: margin, right: margin }
  })

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("Roboto", "normal")
    doc.setTextColor(128, 128, 128)
    addText(
      doc,
      `Sayfa ${i} / ${totalPages} | Oluşturulma: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: tr })}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    )
    doc.setTextColor(0, 0, 0)
  }

  // Generate filename
  const filename = `otel_rezervasyon_raporu_${data.dateRange.start}_${data.dateRange.end}.pdf`
  doc.save(filename)
}

// Restaurant-specific PDF export
function exportRestaurantPDF(data: AnalyticsData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  })

  // Register Roboto font for Turkish character support
  registerFonts(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // Helper function
  const checkBreak = (space: number) => {
    yPos = checkPageBreak(doc, yPos, space, pageHeight, margin)
  }

  // Header with logo area
  doc.setFillColor(34, 197, 94) // Green
  doc.rect(0, 0, pageWidth, 40, "F")
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("Roboto", "normal")
  addText(doc, "RESTORAN SİPARİŞ RAPORU", pageWidth / 2, 20, { align: "center" })
  
  doc.setFontSize(12)
  doc.setFont("Roboto", "normal")
  addText(doc, "Görüşme Metrikleri ve Analiz Raporu", pageWidth / 2, 28, { align: "center" })
  
  doc.setTextColor(0, 0, 0)
  yPos = 50

  // Date Range
  const startDate = format(new Date(data.dateRange.start), "dd MMMM yyyy", { locale: tr })
  const endDate = format(new Date(data.dateRange.end), "dd MMMM yyyy", { locale: tr })
  doc.setFontSize(10)
  doc.setFont("Roboto", "normal")
  addText(doc, `Rapor Tarih Aralığı: ${startDate} - ${endDate}`, margin, yPos)
  yPos += 8

  // Executive Summary Box
  doc.setFillColor(249, 250, 251)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 35, "F")
  doc.setDrawColor(229, 231, 235)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 35, "S")
  
  yPos += 8
  doc.setFontSize(14)
  doc.setFont("Roboto", "normal")
  addText(doc, "Yönetici Özeti", margin + 5, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setFont("Roboto", "normal")
  const totalSuccessful = data.successfulOrders
  const totalRejections = data.priceTooHigh + data.productUnavailable
  const successRate = data.totalCalls > 0 ? ((totalSuccessful / data.totalCalls) * 100).toFixed(1) : "0"
  const rejectionRate = data.totalCalls > 0 ? ((totalRejections / data.totalCalls) * 100).toFixed(1) : "0"

  addText(doc, `• Toplam ${data.totalCalls} görüşme gerçekleşti`, margin + 5, yPos)
  yPos += 6
  addText(doc, `• ${data.successfulOrders} sipariş başarıyla tamamlandı (${successRate}% başarı oranı)`, margin + 5, yPos)
  yPos += 6
  addText(doc, `• ${totalRejections} görüşme reddedildi (${rejectionRate}% red oranı)`, margin + 5, yPos)
  yPos += 6
  addText(doc, `• Dönüşüm oranı: %${data.conversionRate.toFixed(1)}`, margin + 5, yPos)
  yPos += 15

  // Detailed Metrics Section
  checkBreak(50)
  doc.setFontSize(16)
  doc.setFont("Roboto", "normal")
  addText(doc, "Detaylı Metrikler", margin, yPos)
  yPos += 10

  // Metrics in two columns
  const leftCol = margin
  const rightCol = pageWidth / 2 + 5

  // Left column
  doc.setFontSize(11)
  doc.setFont("Roboto", "normal")
  addText(doc, "Başarı Metrikleri", leftCol, yPos)
  yPos += 7

  doc.setFontSize(10)
  doc.setFont("Roboto", "normal")
  addText(doc, `Toplam Arama:`, leftCol, yPos)
  doc.setFont("Roboto", "normal")
  addText(doc, `${data.totalCalls}`, leftCol + 45, yPos)
  yPos += 6

  doc.setFont("Roboto", "normal")
  addText(doc, `Başarılı Sipariş:`, leftCol, yPos)
  doc.setFont("Roboto", "normal")
  doc.setTextColor(34, 197, 94) // Green
  addText(doc, `${data.successfulOrders}`, leftCol + 45, yPos)
  doc.setTextColor(0, 0, 0)
  yPos += 6

  doc.setFont("Roboto", "normal")
  addText(doc, `Dönüşüm Oranı:`, leftCol, yPos)
  doc.setFont("Roboto", "normal")
  doc.setTextColor(147, 51, 234) // Purple
  addText(doc, `%${data.conversionRate.toFixed(1)}`, leftCol + 45, yPos)
  doc.setTextColor(0, 0, 0)
  yPos += 10

  // Right column
  yPos = yPos - 19 // Reset to same level
  doc.setFontSize(11)
  doc.setFont("Roboto", "normal")
  addText(doc, "Red Metrikleri", rightCol, yPos)
  yPos += 7

  doc.setFontSize(10)
  doc.setFont("Roboto", "normal")
  addText(doc, `Fiyat Yüksek Bulundu:`, rightCol, yPos)
  doc.setFont("Roboto", "normal")
  doc.setTextColor(249, 115, 22) // Orange
  addText(doc, `${data.priceTooHigh}`, rightCol + 50, yPos)
  doc.setTextColor(0, 0, 0)
  yPos += 6

  doc.setFont("Roboto", "normal")
  addText(doc, `Ürün Kalmadığı İçin:`, rightCol, yPos)
  doc.setFont("Roboto", "normal")
  doc.setTextColor(234, 179, 8) // Yellow
  addText(doc, `${data.productUnavailable}`, rightCol + 50, yPos)
  doc.setTextColor(0, 0, 0)
  yPos += 6

  doc.setFont("Roboto", "normal")
  addText(doc, `Toplam Red:`, rightCol, yPos)
  doc.setFont("Roboto", "normal")
  addText(doc, `${totalRejections}`, rightCol + 50, yPos)
  yPos += 12

  // Analysis Section
  checkBreak(40)
  doc.setFontSize(16)
  doc.setFont("Roboto", "normal")
  addText(doc, "Analiz ve Yorumlar", margin, yPos)
  yPos += 10

  doc.setFontSize(10)
  doc.setFont("Roboto", "normal")
  
  // Performance analysis
  if (data.conversionRate >= 50) {
    addText(doc, "✓ Mükemmel Performans: Dönüşüm oranınız %50'nin üzerinde. Bot performansı çok iyi.", margin, yPos)
  } else if (data.conversionRate >= 30) {
    addText(doc, "✓ İyi Performans: Dönüşüm oranınız %30-50 arasında. Bot performansı iyi seviyede.", margin, yPos)
  } else {
    addText(doc, "⚠ Geliştirme Gerekiyor: Dönüşüm oranınız %30'un altında. Bot ayarlarını gözden geçirmeniz önerilir.", margin, yPos)
  }
  yPos += 7

  if (data.priceTooHigh > data.totalCalls * 0.2) {
    addText(doc, "⚠ Fiyat Endişesi: Görüşmelerin %20'den fazlası fiyat nedeniyle reddedildi. Fiyatlandırma stratejinizi gözden geçirin.", margin, yPos)
    yPos += 7
  }

  if (data.productUnavailable > data.totalCalls * 0.15) {
    addText(doc, "⚠ Stok Sorunu: Görüşmelerin %15'inden fazlası ürün olmadığı için reddedildi. Stok yönetimini optimize edin.", margin, yPos)
    yPos += 7
  }

  yPos += 5

  // Daily Breakdown Table
  checkBreak(30)
  doc.setFontSize(16)
  doc.setFont("Roboto", "normal")
  addText(doc, "Günlük Detay Tablosu", margin, yPos)
  yPos += 10

  // Prepare table data (Restaurant: Sipariş + Sip. Toplam ₺)
  const tableData = data.dailyBreakdown.map(day => {
    const date = format(new Date(day.date), "dd MMM yyyy", { locale: tr })
    return [
      date,
      day.metrics.totalCalls.toString(),
      day.metrics.successfulOrders.toString(),
      formatPricePdf(day.metrics.totalOrderPrice),
      day.metrics.priceTooHigh.toString(),
      day.metrics.productUnavailable.toString(),
      `${day.metrics.conversionRate.toFixed(1)}%`
    ]
  })

  autoTable(doc, {
    startY: yPos,
    head: [["Tarih", "Toplam Arama", "Başarılı Sipariş", "Sip. Toplam (₺)", "Fiyat Yüksek", "Ürün Yok", "Dönüşüm %"]],
    body: tableData,
    theme: "striped",
    styles: {
      font: "Roboto"
    },
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { halign: "center" },
      2: { halign: "center", textColor: [34, 197, 94] },
      3: { halign: "right", textColor: [34, 197, 94] },
      4: { halign: "center", textColor: [249, 115, 22] },
      5: { halign: "center", textColor: [234, 179, 8] },
      6: { halign: "center", fontStyle: "bold" }
    },
    margin: { left: margin, right: margin }
  })

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("Roboto", "normal")
    doc.setTextColor(128, 128, 128)
    addText(
      doc,
      `Sayfa ${i} / ${totalPages} | Oluşturulma: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: tr })}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    )
    doc.setTextColor(0, 0, 0)
  }

  // Generate filename
  const filename = `restoran_siparis_raporu_${data.dateRange.start}_${data.dateRange.end}.pdf`
  doc.save(filename)
}

// Main export function - routes to appropriate PDF based on customer type
export function exportToPDF(data: AnalyticsData) {
  const isHotel = data.customerType === "HOTEL"
  const isRestaurant = data.customerType === "RESTAURANT"

  if (isHotel) {
    exportHotelPDF(data)
  } else if (isRestaurant) {
    exportRestaurantPDF(data)
  } else {
    // Default: Use hotel format if customer type is not set
    exportHotelPDF(data)
  }
}
