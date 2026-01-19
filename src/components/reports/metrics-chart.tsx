"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

interface DailyMetric {
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
}

interface MetricsChartProps {
  dailyBreakdown: DailyMetric[]
  isLoading?: boolean
  customerType?: "HOTEL" | "RESTAURANT" | null
}

export default function MetricsChart({ dailyBreakdown, isLoading, customerType }: MetricsChartProps) {
  const isHotel = customerType === "HOTEL"
  const isRestaurant = customerType === "RESTAURANT"
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Günlük Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (dailyBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Günlük Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Veri bulunamadı
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find max value for scaling
  const maxValue = Math.max(
    ...dailyBreakdown.map(d => {
      const successCount = isHotel 
        ? d.metrics.successfulReservations 
        : isRestaurant 
        ? d.metrics.successfulOrders 
        : d.metrics.successfulReservations + d.metrics.successfulOrders
      return Math.max(d.metrics.totalCalls, successCount)
    })
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Günlük Trend</CardTitle>
        <p className="text-sm text-muted-foreground">
          Seçilen tarih aralığındaki günlük metrikler
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Simple bar chart representation */}
          <div className="space-y-2">
            {dailyBreakdown.map((day) => {
              const date = new Date(day.date)
              const totalHeight = 200
              const callsHeight = (day.metrics.totalCalls / maxValue) * totalHeight
              
              const successCount = isHotel 
                ? day.metrics.successfulReservations 
                : isRestaurant 
                ? day.metrics.successfulOrders 
                : day.metrics.successfulReservations + day.metrics.successfulOrders
              
              const successHeight = (successCount / maxValue) * totalHeight
              
              return (
                <div key={day.date} className="flex items-end gap-2">
                  <div className="w-20 text-xs text-gray-600">
                    {format(date, "dd MMM", { locale: tr })}
                  </div>
                  <div className="flex-1 flex items-end gap-1">
                    {/* Total calls bar */}
                    <div className="flex-1 relative">
                      <div
                        className="bg-blue-200 rounded-t"
                        style={{ height: `${callsHeight}px` }}
                        title={`Toplam: ${day.metrics.totalCalls}`}
                      ></div>
                      <div className="text-xs text-center mt-1 text-gray-600">
                        {day.metrics.totalCalls}
                      </div>
                    </div>
                    
                    {/* Success bar */}
                    <div className="flex-1 relative">
                      <div
                        className="bg-green-500 rounded-t"
                        style={{ height: `${successHeight}px` }}
                        title={`Başarılı: ${successCount}`}
                      ></div>
                      <div className="text-xs text-center mt-1 text-green-600">
                        {successCount}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 justify-center pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 rounded"></div>
              <span className="text-xs text-gray-600">Toplam Arama</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-xs text-gray-600">Başarılı İşlem</span>
            </div>
          </div>

          {/* Detailed table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Tarih</th>
                  <th className="text-right p-2">Toplam</th>
                  {(!customerType || isHotel) && (
                    <th className="text-right p-2">Rezervasyon</th>
                  )}
                  {(!customerType || isRestaurant) && (
                    <th className="text-right p-2">Sipariş</th>
                  )}
                  <th className="text-right p-2">Fiyat Yüksek</th>
                  {(!customerType || isHotel) && (
                    <th className="text-right p-2">Yer Yok</th>
                  )}
                  {(!customerType || isRestaurant) && (
                    <th className="text-right p-2">Ürün Yok</th>
                  )}
                  <th className="text-right p-2">Dönüşüm %</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map((day) => {
                  const date = new Date(day.date)
                  return (
                    <tr key={day.date} className="border-b hover:bg-gray-50">
                      <td className="p-2">{format(date, "dd MMM yyyy", { locale: tr })}</td>
                      <td className="text-right p-2 font-medium">{day.metrics.totalCalls}</td>
                      {(!customerType || isHotel) && (
                        <td className="text-right p-2 text-green-600">{day.metrics.successfulReservations}</td>
                      )}
                      {(!customerType || isRestaurant) && (
                        <td className="text-right p-2 text-blue-600">{day.metrics.successfulOrders}</td>
                      )}
                      <td className="text-right p-2 text-orange-600">{day.metrics.priceTooHigh}</td>
                      {(!customerType || isHotel) && (
                        <td className="text-right p-2 text-red-600">{day.metrics.noRoomAvailable}</td>
                      )}
                      {(!customerType || isRestaurant) && (
                        <td className="text-right p-2 text-yellow-600">{day.metrics.productUnavailable}</td>
                      )}
                      <td className="text-right p-2 font-medium">{day.metrics.conversionRate.toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

