"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

interface DailyMetric {
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
}

function formatPrice(value: number | undefined): string {
  if (value == null || value === 0) return "—"
  return `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
          <CardTitle>Günlük Detay</CardTitle>
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
          <CardTitle>Günlük Detay</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Veri bulunamadı
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Günlük Detay</CardTitle>
        <p className="text-sm text-muted-foreground">
          Seçilen tarih aralığındaki günlük metrikler
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Tarih</th>
                <th className="text-right p-2">Toplam</th>
                {(!customerType || isHotel) && (
                  <th className="text-right p-2">Rezervasyon</th>
                )}
                {(!customerType || isHotel) && (
                  <th className="text-right p-2">Rez. Toplam (₺)</th>
                )}
                {(!customerType || isRestaurant) && (
                  <th className="text-right p-2">Sipariş</th>
                )}
                {(!customerType || isRestaurant) && (
                  <th className="text-right p-2">Sip. Toplam (₺)</th>
                )}
                <th className="text-right p-2">Fiyat Yüksek</th>
                {(!customerType || isHotel) && (
                  <th className="text-right p-2">Yer Yok</th>
                )}
                {(!customerType || isRestaurant) && (
                  <th className="text-right p-2">Ürün Yok</th>
                )}
                <th className="text-right p-2">Dönüşüm %</th>
                <th className="text-right p-2">Mutluluk %</th>
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
                    {(!customerType || isHotel) && (
                      <td className="text-right p-2 font-medium text-green-700">{formatPrice(day.metrics.totalReservationPrice)}</td>
                    )}
                    {(!customerType || isRestaurant) && (
                      <td className="text-right p-2 text-blue-600">{day.metrics.successfulOrders}</td>
                    )}
                    {(!customerType || isRestaurant) && (
                      <td className="text-right p-2 font-medium text-blue-700">{formatPrice(day.metrics.totalOrderPrice)}</td>
                    )}
                    <td className="text-right p-2 text-orange-600">{day.metrics.priceTooHigh}</td>
                    {(!customerType || isHotel) && (
                      <td className="text-right p-2 text-red-600">{day.metrics.noRoomAvailable}</td>
                    )}
                    {(!customerType || isRestaurant) && (
                      <td className="text-right p-2 text-yellow-600">{day.metrics.productUnavailable}</td>
                    )}
                    <td className="text-right p-2 font-medium">{day.metrics.conversionRate.toFixed(1)}%</td>
                    <td className="text-right p-2 font-medium text-green-600">
                      {day.metrics.customerSatisfactionRate !== undefined 
                        ? `${day.metrics.customerSatisfactionRate.toFixed(1)}%`
                        : "-"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
