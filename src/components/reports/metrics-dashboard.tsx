"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, CalendarCheck, ShoppingCart, DollarSign, XCircle, Package, TrendingUp, Smile } from "lucide-react"

interface MetricsData {
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
}

interface MetricsDashboardProps {
  data: MetricsData
  isLoading?: boolean
}

export default function MetricsDashboard({ data, isLoading }: MetricsDashboardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(7)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const isHotel = data.customerType === "HOTEL"
  const isRestaurant = data.customerType === "RESTAURANT"
  
  const totalSuccessful = isHotel 
    ? data.successfulReservations 
    : isRestaurant 
    ? data.successfulOrders 
    : data.successfulReservations + data.successfulOrders
  
  const totalRejections = data.priceTooHigh + 
    (isHotel ? data.noRoomAvailable : 0) + 
    (isRestaurant ? data.productUnavailable : 0)

  return (
    <div className="space-y-6">
      {/* Main Metrics Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isHotel || isRestaurant ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} xl:grid-cols-5 gap-4`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Arama</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Seçilen tarih aralığındaki toplam görüşme sayısı
            </p>
          </CardContent>
        </Card>

        {/* Show reservation card only for HOTEL or if customerType is not set */}
        {(!data.customerType || isHotel) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Başarılı Rezervasyon</CardTitle>
              <CalendarCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.successfulReservations}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Rezervasyon yapan arayan sayısı
              </p>
            </CardContent>
          </Card>
        )}

        {/* Show order card only for RESTAURANT or if customerType is not set */}
        {(!data.customerType || isRestaurant) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Başarılı Sipariş</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{data.successfulOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Sipariş veren arayan sayısı
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dönüşüm Oranı</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{data.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Başarılı işlem / Toplam arama
            </p>
          </CardContent>
        </Card>

        {/* Customer Satisfaction Rate */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Müşteri Mutluluk Oranı</CardTitle>
            <Smile className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.customerSatisfactionRate !== undefined 
                ? `${data.customerSatisfactionRate.toFixed(1)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.happyCalls !== undefined && data.totalCalls > 0
                ? `${data.happyCalls} mutlu / ${data.totalCalls} toplam`
                : "Mutlu müşteri oranı"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rejection Metrics */}
      <div className={`grid grid-cols-1 ${isHotel || isRestaurant ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fiyat Yüksek Bulundu</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.priceTooHigh}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Fiyatı yüksek bulan arayan sayısı
            </p>
          </CardContent>
        </Card>

        {/* Show "Yer Olmadığı İçin" only for HOTEL or if customerType is not set */}
        {(!data.customerType || isHotel) && (
          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Yer Olmadığı İçin</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.noRoomAvailable}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Yer olmadığı için rezervasyon yapamayan sayısı
              </p>
            </CardContent>
          </Card>
        )}

        {/* Show "Ürün Kalmadığı İçin" only for RESTAURANT or if customerType is not set */}
        {(!data.customerType || isRestaurant) && (
          <Card className="border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ürün Kalmadığı İçin</CardTitle>
              <Package className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{data.productUnavailable}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ürün kalmadığı için sipariş veremeyen sayısı
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="text-lg">Özet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Toplam Başarılı</p>
              <p className="text-2xl font-bold text-green-600">{totalSuccessful}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Toplam Red</p>
              <p className="text-2xl font-bold text-red-600">{totalRejections}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Başarı Oranı</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.totalCalls > 0 
                  ? ((totalSuccessful / data.totalCalls) * 100).toFixed(1) 
                  : "0"}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Red Oranı</p>
              <p className="text-2xl font-bold text-orange-600">
                {data.totalCalls > 0 
                  ? ((totalRejections / data.totalCalls) * 100).toFixed(1) 
                  : "0"}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Mutluluk Oranı</p>
              <p className="text-2xl font-bold text-emerald-600">
                {data.customerSatisfactionRate !== undefined
                  ? `${data.customerSatisfactionRate.toFixed(1)}`
                  : data.totalCalls > 0 
                    ? ((totalSuccessful / data.totalCalls) * 100).toFixed(1)
                    : "0"}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

