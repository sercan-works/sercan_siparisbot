"use client"

import { useState, useEffect } from "react"
import { DatePreset } from "@/components/reports/date-range-selector"
import DateRangeSelector from "@/components/reports/date-range-selector"
import MetricsDashboard from "@/components/reports/metrics-dashboard"
import MetricsChart from "@/components/reports/metrics-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, FileDown } from "lucide-react"
import { exportToPDF } from "@/lib/pdf-export"

interface AnalyticsData {
  totalCalls: number
  successfulReservations: number
  successfulOrders: number
  priceTooHigh: number
  noRoomAvailable: number
  productUnavailable: number
  conversionRate: number
  customerSatisfactionRate?: number
  happyCalls?: number
  unhappyCalls?: number
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
      customerSatisfactionRate?: number
    }
  }>
}

export default function ReportsPage() {
  const [preset, setPreset] = useState<DatePreset>("week")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        preset: preset
      })

      if (preset === "custom" && startDate && endDate) {
        params.append("startDate", startDate.toISOString().split('T')[0])
        params.append("endDate", endDate.toISOString().split('T')[0])
      }

      const response = await fetch(`/api/reports/analytics?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error("Veri yüklenirken bir hata oluştu")
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (err: any) {
      console.error("Error fetching analytics:", err)
      setError(err.message || "Bir hata oluştu")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [preset, startDate, endDate])

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset)
  }

  const handleDateChange = (newStartDate: Date | null, newEndDate: Date | null) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  const handleExportPDF = () => {
    if (data) {
      exportToPDF(data)
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-gray-500 mt-1">
            Görüşme metrikleri ve analiz raporları
          </p>
        </div>
        {!isLoading && !error && data && data.totalCalls > 0 && (
          <Button
            onClick={handleExportPDF}
            className="flex items-center gap-2"
            variant="outline"
          >
            <FileDown className="h-4 w-4" />
            PDF Olarak İndir
          </Button>
        )}
      </div>

      {/* Date Range Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <DateRangeSelector
            preset={preset}
            startDate={startDate}
            endDate={endDate}
            onPresetChange={handlePresetChange}
            onDateChange={handleDateChange}
          />
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Yükleniyor...</span>
        </div>
      )}

      {/* Data Display */}
      {!isLoading && !error && data && (
        <>
          <MetricsDashboard data={data} isLoading={isLoading} />
          
          <div className="mt-6">
            <MetricsChart 
              dailyBreakdown={data.dailyBreakdown} 
              isLoading={isLoading}
              customerType={data.customerType}
            />
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && data && data.totalCalls === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Seçilen tarih aralığında görüşme bulunamadı
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

