"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Button } from "../../../../components/ui/button"
import { Badge } from "../../../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs"
import { Input } from "../../../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select"
import { Bell, Check, X, Clock, ChefHat, Eye, Settings, Search, RefreshCw, Package, PackageCheck, MessageCircle } from "lucide-react"
import { getWhatsAppTemplate, replaceOrderTags } from "@/lib/whatsapp-templates"
import WhatsAppTemplateManager from "@/components/whatsapp/whatsapp-template-manager"
import WhatsAppTemplateSelector from "@/components/whatsapp/whatsapp-template-selector"

export const dynamic = "force-dynamic"

type OrderStatus = "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"

interface Order {
  id: string
  customerName: string
  customerPhone: string | null
  items: string
  totalAmount: number | null
  deliveryAddress: string | null
  notes: string | null
  status: OrderStatus
  createdAt: string
  completedAt: string | null
  call: {
    id: string
    retellCallId: string
    transcript: string | null
    recordingUrl: string | null
    createdAt: string
  }
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: "bg-red-500 hover:bg-red-600",
  PREPARING: "bg-yellow-500 hover:bg-yellow-600",
  READY: "bg-blue-500 hover:bg-blue-600",
  COMPLETED: "bg-green-500 hover:bg-green-600",
  CANCELLED: "bg-gray-500 hover:bg-gray-600"
}

const statusIcons: Record<OrderStatus, any> = {
  PENDING: Bell,
  PREPARING: ChefHat,
  READY: Clock,
  COMPLETED: Check,
  CANCELLED: X
}

const REFRESH_INTERVALS = [
  { value: 10000, label: "10 saniye" },
  { value: 15000, label: "15 saniye" },
  { value: 20000, label: "20 saniye" },
  { value: 30000, label: "30 saniye" }
]

export default function LiveOrdersPage() {
  const router = useRouter()
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [previousOrderIds, setPreviousOrderIds] = useState<Set<string>>(new Set())
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"pending" | "preparing" | "completed">("pending")
  const [hasPlayedInitialSound, setHasPlayedInitialSound] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [refreshInterval, setRefreshInterval] = useState(10000)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [settings, setSettings] = useState({
    soundEnabled: true,
    soundVolume: 70,
    showDesktopNotifications: true
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false)
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("orderNotificationSettings")
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings(parsed)
      if (parsed.refreshInterval) {
        setRefreshInterval(parsed.refreshInterval)
      }
      if (parsed.autoRefresh !== undefined) {
        setAutoRefresh(parsed.autoRefresh)
      }
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("orderNotificationSettings", JSON.stringify({
      ...settings,
      refreshInterval,
      autoRefresh
    }))
  }, [settings, refreshInterval, autoRefresh])

  // Fetch orders
  const fetchOrders = async (statusFilter?: OrderStatus) => {
    try {
      const url = statusFilter 
        ? `/api/orders?status=${statusFilter}`
        : "/api/orders"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const newOrders = data.orders || []

        // Detect new orders - only show notification if we're on pending tab and there are actually new pending orders
        const currentOrderIds = new Set<string>(newOrders.map((o: Order) => o.id))
        const newlyAdded = newOrders.filter((o: Order) => !previousOrderIds.has(o.id))
        
        // Check if there are pending orders (for initial page load)
        const pendingOrders = newOrders.filter((o: Order) => o.status === "PENDING")
        
        // Play sound on initial page load if there are pending orders
        if (
          !hasPlayedInitialSound &&
          activeTab === "pending" &&
          pendingOrders.length > 0 &&
          previousOrderIds.size === 0
        ) {
          if (settings.soundEnabled && audioRef.current) {
            audioRef.current.volume = settings.soundVolume / 100
            audioRef.current.play().catch(() => {})
          }
          setHasPlayedInitialSound(true)
        }
        
        // Only show notification if:
        // 1. We're on the pending tab
        // 2. There are new orders
        // 3. Previous orders existed (not first load)
        // 4. New orders are actually pending (not completed)
        if (
          activeTab === "pending" &&
          newlyAdded.length > 0 && 
          previousOrderIds.size > 0 &&
          newlyAdded.some((o: Order) => o.status !== "COMPLETED" && o.status !== "CANCELLED")
        ) {
          // Sound notification
          if (settings.soundEnabled && audioRef.current) {
            audioRef.current.volume = settings.soundVolume / 100
            audioRef.current.play().catch(() => {})
          }

          // Desktop notification
          if (settings.showDesktopNotifications && "Notification" in window && Notification.permission === "granted") {
            new Notification("Yeni Sipariş!", {
              body: `${newlyAdded.length} yeni sipariş geldi!`,
              icon: "/favicon.ico",
              tag: "new-order"
            })
          }

          // Mark new orders for animation
          setNewOrderIds(new Set(newlyAdded.map((o: Order) => o.id)))
          // Remove animation after 3 seconds
          setTimeout(() => {
            setNewOrderIds(new Set())
          }, 3000)
        }

        setAllOrders(newOrders)
        setPreviousOrderIds(currentOrderIds)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  // Reset previous order IDs when tab changes to avoid false notifications
  useEffect(() => {
    setPreviousOrderIds(new Set())
    setNewOrderIds(new Set())
  }, [activeTab])

  // Reset initial sound flag when page is refreshed/reloaded
  useEffect(() => {
    const handleBeforeUnload = () => {
      setHasPlayedInitialSound(false)
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  // Auto-refresh with configurable interval
  useEffect(() => {
    if (activeTab === "pending") {
      fetchOrders("PENDING")
    } else if (activeTab === "preparing") {
      fetchOrders("PREPARING")
    } else {
      fetchOrders("COMPLETED")
    }

    if (autoRefresh) {
      const interval = setInterval(() => {
        if (activeTab === "pending") {
          fetchOrders("PENDING")
        } else if (activeTab === "preparing") {
          fetchOrders("PREPARING")
        } else {
          fetchOrders("COMPLETED")
        }
      }, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [activeTab, autoRefresh, refreshInterval])

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    const statusFiltered = allOrders.filter(order => {
      if (activeTab === "pending") {
        return order.status === "PENDING"
      } else if (activeTab === "preparing") {
        return order.status === "PREPARING" || order.status === "READY"
      } else {
        return order.status === "COMPLETED"
      }
    })

    if (!searchQuery.trim()) {
      return statusFiltered
    }

    const query = searchQuery.toLowerCase()
    return statusFiltered.filter(order =>
      order.customerName?.toLowerCase().includes(query) ||
      order.customerPhone?.toLowerCase().includes(query) ||
      order.items?.toLowerCase().includes(query) ||
      order.deliveryAddress?.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query)
    )
  }, [allOrders, activeTab, searchQuery])

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        // Refresh orders
        if (activeTab === "pending") {
          fetchOrders("PENDING")
        } else {
          fetchOrders("COMPLETED")
        }
      }
    } catch (error) {
      console.error("Error updating order:", error)
    }
  }

  const formatTime = (dateString: string) => {
    // Ensure dateString is treated as UTC if it doesn't have timezone info
    const date = new Date(dateString)
    // Use Istanbul timezone (UTC+3) for Turkish locale
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul"
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Istanbul"
    })
  }

  const getTimeSince = (dateString: string) => {
    const now = new Date()
    const created = new Date(dateString)
    
    // Calculate difference in milliseconds
    const diffMs = now.getTime() - created.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return "Az önce"
    if (diffMinutes === 1) return "1 dakika önce"
    if (diffMinutes < 60) return `${diffMinutes} dakika önce`
    if (diffHours === 1) return "1 saat önce"
    if (diffHours < 24) return `${diffHours} saat önce`
    if (diffDays === 1) return "1 gün önce"
    return `${diffDays} gün önce`
  }

  // WhatsApp mesajı oluştur
  const createWhatsAppMessage = async (order: Order, templateType: "confirmation" | "information" | "cancellation" = "information") => {
    const template = await getWhatsAppTemplate("RESTAURANT", templateType)
    
    const orderData = {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items,
      deliveryAddress: order.deliveryAddress,
      notes: order.notes,
      totalAmount: order.totalAmount,
      orderCode: `#${order.id.slice(-6).toUpperCase()}`,
      orderDate: order.createdAt
    }
    
    return replaceOrderTags(template, orderData)
  }

  // WhatsApp URL oluştur
  const getWhatsAppUrl = (phoneNumber: string, message: string) => {
    // Telefon numarasını temizle (boşluklar, tireler, parantezler)
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '')
    // Türkiye için +90 ekle (yoksa)
    const formattedPhone = cleanPhone.startsWith('90') ? `+${cleanPhone}` : cleanPhone.startsWith('+90') ? cleanPhone : `+90${cleanPhone}`
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
  }

  const pendingOrders = allOrders.filter(o => o.status === "PENDING")
  const preparingOrders = allOrders.filter(o => o.status === "PREPARING" || o.status === "READY")
  const completedOrders = allOrders.filter(o => o.status === "COMPLETED")

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 px-4">
      {/* Hidden audio element for notification sound */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* WhatsApp Template Manager */}
      <WhatsAppTemplateManager
        isOpen={templateManagerOpen}
        onClose={() => setTemplateManagerOpen(false)}
        customerType="RESTAURANT"
      />

      {/* WhatsApp Template Selector */}
      <WhatsAppTemplateSelector
        isOpen={templateSelectorOpen}
        onClose={() => {
          setTemplateSelectorOpen(false)
          setSelectedOrder(null)
        }}
        onSelect={async (templateType) => {
          if (selectedOrder && selectedOrder.customerPhone) {
            const message = await createWhatsAppMessage(selectedOrder, templateType)
            const url = getWhatsAppUrl(selectedOrder.customerPhone, message)
            window.open(url, '_blank')
          }
        }}
        customerType="RESTAURANT"
        status={selectedOrder?.status}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Siparişler</h1>
          <p className="text-gray-600 mt-1">
            {autoRefresh ? (
              <span>Otomatik yenileme: {REFRESH_INTERVALS.find(i => i.value === refreshInterval)?.label || `${refreshInterval / 1000} saniye`}</span>
            ) : (
              <span>Otomatik yenileme kapalı</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateManagerOpen(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            WhatsApp Şablonları
          </Button>
          <div className="flex items-center gap-2">
            <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFRESH_INTERVALS.map(interval => (
                  <SelectItem key={interval.value} value={interval.value.toString()}>
                    {interval.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Aktif" : "Pasif"}
            </Button>
          </div>
          <Button onClick={() => {
            if (activeTab === "pending") {
              fetchOrders("PENDING")
            } else if (activeTab === "preparing") {
              fetchOrders("PREPARING")
            } else {
              fetchOrders("COMPLETED")
            }
          }} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button
            onClick={() => router.push("/customer/settings")}
            variant="outline"
            size="icon"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Müşteri adı, telefon, sipariş içeriği veya adres ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 text-base"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "preparing" | "completed")} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-6">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Bekleyen Siparişler
            {pendingOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preparing" className="flex items-center gap-2">
            <ChefHat className="w-4 h-4" />
            Hazırlanan Siparişler
            {preparingOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {preparingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4" />
            Tamamlanan Siparişler
            {completedOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {completedOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-0">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 font-semibold">
                  {searchQuery ? "Arama sonucu bulunamadı" : "Bekleyen sipariş yok"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {searchQuery 
                    ? "Farklı bir arama terimi deneyin."
                    : "Yeni siparişler geldiğinde burada görünecek"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 mb-4">
              <div className="text-sm text-gray-600">
                {filteredOrders.length} {filteredOrders.length === 1 ? "sipariş bulundu" : "sipariş bulundu"}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map((order) => {
                  const StatusIcon = statusIcons[order.status]
                  const isNew = newOrderIds.has(order.id)
                  return (
                    <Card
                      key={order.id}
                      className={`relative border-2 transition-all duration-300 ${
                        isNew 
                          ? "border-green-500 shadow-lg animate-pulse" 
                          : order.status === "PENDING" 
                            ? "border-red-500 shadow-md hover:shadow-lg" 
                            : "border-yellow-500 shadow-md hover:shadow-lg"
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{order.customerName}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatTime(order.createdAt)} - {getTimeSince(order.createdAt)}
                            </p>
                            {order.customerPhone && (
                              <p className="text-sm text-gray-600 mt-1">
                                📞 {order.customerPhone}
                              </p>
                            )}
                          </div>
                          <Badge className={statusColors[order.status]}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {order.status === "PENDING" ? "Beklemede" :
                             order.status === "PREPARING" ? "Hazırlanıyor" :
                             order.status === "READY" ? "Hazır" : order.status}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Sipariş Detayları */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Sipariş:</h4>
                          <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {order.items}
                          </p>
                        </div>

                        {/* Teslimat Adresi */}
                        {order.deliveryAddress && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Adres:</h4>
                            <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
                          </div>
                        )}

                        {/* Notlar */}
                        {order.notes && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Notlar:</h4>
                            <p className="text-sm text-gray-700">{order.notes}</p>
                          </div>
                        )}

                        {/* Tutar */}
                        {order.totalAmount && (
                          <div className="pt-2 border-t">
                            <p className="text-lg font-bold">
                              Toplam: {order.totalAmount.toFixed(2)} TL
                            </p>
                          </div>
                        )}

                        {/* Aksiyon Butonları */}
                        <div className="space-y-2 pt-2">
                          {order.customerPhone && (
                            <Button
                              variant="outline"
                              className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                              onClick={() => {
                                setSelectedOrder(order)
                                setTemplateSelectorOpen(true)
                              }}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              WhatsApp ile Gönder
                            </Button>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => router.push(`/customer/orders/${order.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Detay
                            </Button>
                            {order.status === "PENDING" && (
                              <Button
                                variant="default"
                                onClick={() => {
                                  updateOrderStatus(order.id, "PREPARING")
                                  // Switch to preparing tab after moving order
                                  setTimeout(() => setActiveTab("preparing"), 500)
                                }}
                              >
                                <ChefHat className="h-4 w-4 mr-2" />
                                Hazırla
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Transcript Link */}
                        {order.call.transcript && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                              Görüşme Kaydı
                            </summary>
                            <p className="mt-2 text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                              {order.call.transcript}
                            </p>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preparing" className="mt-0">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 font-semibold">
                  {searchQuery ? "Arama sonucu bulunamadı" : "Hazırlanan sipariş yok"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {searchQuery 
                    ? "Farklı bir arama terimi deneyin."
                    : "Hazırlanan siparişler burada görünecek"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 mb-4">
              <div className="text-sm text-gray-600">
                {filteredOrders.length} {filteredOrders.length === 1 ? "sipariş bulundu" : "sipariş bulundu"}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map((order) => {
                  const StatusIcon = statusIcons[order.status]
                  return (
                    <Card
                      key={order.id}
                      className={`relative border-2 transition-all duration-300 ${
                        order.status === "PREPARING" 
                          ? "border-yellow-500 shadow-md hover:shadow-lg" 
                          : "border-blue-500 shadow-md hover:shadow-lg"
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{order.customerName}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatTime(order.createdAt)} - {getTimeSince(order.createdAt)}
                            </p>
                            {order.customerPhone && (
                              <p className="text-sm text-gray-600 mt-1">
                                📞 {order.customerPhone}
                              </p>
                            )}
                          </div>
                          <Badge className={statusColors[order.status]}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {order.status === "PREPARING" ? "Hazırlanıyor" : "Hazır"}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Sipariş Detayları */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Sipariş:</h4>
                          <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {order.items}
                          </p>
                        </div>

                        {/* Teslimat Adresi */}
                        {order.deliveryAddress && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Adres:</h4>
                            <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
                          </div>
                        )}

                        {/* Notlar */}
                        {order.notes && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Notlar:</h4>
                            <p className="text-sm text-gray-700">{order.notes}</p>
                          </div>
                        )}

                        {/* Tutar */}
                        {order.totalAmount && (
                          <div className="pt-2 border-t">
                            <p className="text-lg font-bold">
                              Toplam: {order.totalAmount.toFixed(2)} TL
                            </p>
                          </div>
                        )}

                        {/* Aksiyon Butonları */}
                        <div className="space-y-2 pt-2">
                          {order.customerPhone && (
                            <Button
                              variant="outline"
                              className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                              onClick={() => {
                                setSelectedOrder(order)
                                setTemplateSelectorOpen(true)
                              }}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              WhatsApp ile Gönder
                            </Button>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => router.push(`/customer/orders/${order.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Detay
                            </Button>
                            {order.status === "PREPARING" && (
                              <Button
                                variant="default"
                                onClick={() => updateOrderStatus(order.id, "READY")}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Hazır İşaretle
                              </Button>
                            )}
                          </div>
                          {(order.status === "PREPARING" || order.status === "READY") && (
                            <Button
                              className="w-full"
                              variant="default"
                              onClick={() => {
                                updateOrderStatus(order.id, "COMPLETED")
                                // Switch to completed tab after completing order
                                setTimeout(() => setActiveTab("completed"), 500)
                              }}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Tamamlandı
                            </Button>
                          )}
                        </div>

                        {/* Transcript Link */}
                        {order.call.transcript && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                              Görüşme Kaydı
                            </summary>
                            <p className="mt-2 text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                              {order.call.transcript}
                            </p>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <PackageCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 font-semibold">
                  {searchQuery ? "Arama sonucu bulunamadı" : "Tamamlanan sipariş yok"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {searchQuery 
                    ? "Farklı bir arama terimi deneyin."
                    : "Tamamlanan siparişler burada görünecek"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 mb-4">
              <div className="text-sm text-gray-600">
                {filteredOrders.length} {filteredOrders.length === 1 ? "sipariş bulundu" : "sipariş bulundu"}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map((order) => {
                  const StatusIcon = statusIcons[order.status]
                  return (
                    <Card
                      key={order.id}
                      className="relative border-2 border-green-500 shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{order.customerName}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                            </p>
                            {order.completedAt && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Tamamlandı: {formatDate(order.completedAt)} {formatTime(order.completedAt)}
                              </p>
                            )}
                            {order.customerPhone && (
                              <p className="text-sm text-gray-600 mt-1">
                                📞 {order.customerPhone}
                              </p>
                            )}
                          </div>
                          <Badge className={statusColors[order.status]}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            Tamamlandı
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Sipariş Detayları */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Sipariş:</h4>
                          <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {order.items}
                          </p>
                        </div>

                        {/* Teslimat Adresi */}
                        {order.deliveryAddress && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Adres:</h4>
                            <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
                          </div>
                        )}

                        {/* Tutar */}
                        {order.totalAmount && (
                          <div className="pt-2 border-t">
                            <p className="text-lg font-bold text-green-600">
                              Toplam: {order.totalAmount.toFixed(2)} TL
                            </p>
                          </div>
                        )}

                        {/* Aksiyon Butonları */}
                        <div className="space-y-2">
                          {order.customerPhone && (
                            <Button
                              variant="outline"
                              className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                              onClick={() => {
                                setSelectedOrder(order)
                                setTemplateSelectorOpen(true)
                              }}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              WhatsApp ile Gönder
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push(`/customer/orders/${order.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Detayları Görüntüle
                          </Button>
                        </div>

                        {/* Transcript Link */}
                        {order.call.transcript && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                              Görüşme Kaydı
                            </summary>
                            <p className="mt-2 text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                              {order.call.transcript}
                            </p>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
