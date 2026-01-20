"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Calendar, Phone, User, Home, Clock, Search, CalendarCheck, CalendarX, X, RotateCcw, DollarSign, MessageCircle, Settings } from "lucide-react"
import { getWhatsAppTemplate, replaceReservationTags } from "@/lib/whatsapp-templates"
import WhatsAppTemplateManager from "@/components/whatsapp/whatsapp-template-manager"
import WhatsAppTemplateSelector from "@/components/whatsapp/whatsapp-template-selector"

interface Reservation {
    id: string
    guestName: string
    guestPhone: string | null
    checkIn: string
    checkOut: string
    numberOfGuests: number
    numberOfChildren?: number | null
    numberOfRooms?: number
    roomType: string | null
    status: string
    createdAt: string
    callId: string
    totalPrice?: number | null
    specialRequests?: string | null
    call?: {
        id: string
        bot?: {
            id: string
            name: string
        }
    }
}

interface ReservationListProps {
    initialReservations: Reservation[]
}

export default function ReservationList({ initialReservations }: ReservationListProps) {
    const [reservations, setReservations] = useState<Reservation[]>(initialReservations)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming")
    const [templateManagerOpen, setTemplateManagerOpen] = useState(false)
    const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false)
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Update reservation status
    const updateReservationStatus = async (reservationId: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/reservations/${reservationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            })

            if (response.ok) {
                const data = await response.json()
                // Update local state
                setReservations(prev => 
                    prev.map(res => res.id === reservationId ? { ...res, status: newStatus } : res)
                )
            }
        } catch (error) {
            console.error("Error updating reservation:", error)
        }
    }

    // Filter reservations by date and search query
    const filteredReservations = useMemo(() => {
        let filtered = reservations.filter((res) => {
            // Filter by status (cancelled tab)
            if (activeTab === "cancelled") {
                return res.status === "CANCELLED"
            }

            // Skip cancelled reservations in other tabs
            if (res.status === "CANCELLED") return false

            const checkInDate = new Date(res.checkIn)
            checkInDate.setHours(0, 0, 0, 0)

            // Filter by date (upcoming vs past)
            if (activeTab === "upcoming") {
                if (checkInDate < today) return false
            } else if (activeTab === "past") {
                if (checkInDate >= today) return false
            }

            // Filter by search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase()
                return (
                    res.guestName?.toLowerCase().includes(query) ||
                    res.guestPhone?.toLowerCase().includes(query) ||
                    res.roomType?.toLowerCase().includes(query) ||
                    res.id.toLowerCase().includes(query) ||
                    res.call?.bot?.name?.toLowerCase().includes(query)
                )
            }

            return true
        })

        // Sort: by createdAt (descending) - most recent reservations first
        return filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime()
            const dateB = new Date(b.createdAt).getTime()
            return dateB - dateA // Descending: newest first
        })
    }, [reservations, searchQuery, activeTab, today])

    const upcomingCount = reservations.filter((res) => {
        if (res.status === "CANCELLED") return false
        const checkInDate = new Date(res.checkIn)
        checkInDate.setHours(0, 0, 0, 0)
        return checkInDate >= today
    }).length

    const pastCount = reservations.filter((res) => {
        if (res.status === "CANCELLED") return false
        const checkInDate = new Date(res.checkIn)
        checkInDate.setHours(0, 0, 0, 0)
        return checkInDate < today
    }).length

    const cancelledCount = reservations.filter((res) => res.status === "CANCELLED").length

    // WhatsApp mesajı oluştur
    const createWhatsAppMessage = async (res: Reservation, templateType: "confirmation" | "information" | "cancellation" = "information") => {
        const template = await getWhatsAppTemplate("HOTEL", templateType)
        
        const reservationData = {
            guestName: res.guestName,
            guestPhone: res.guestPhone,
            checkIn: res.checkIn,
            checkOut: res.checkOut,
            numberOfGuests: res.numberOfGuests,
            numberOfChildren: res.numberOfChildren,
            numberOfRooms: res.numberOfRooms || 1,
            roomType: res.roomType,
            totalPrice: res.totalPrice,
            specialRequests: res.specialRequests,
            reservationCode: `#${res.id.slice(-6).toUpperCase()}`
        }
        
        return replaceReservationTags(template, reservationData)
    }

    // WhatsApp URL oluştur
    const getWhatsAppUrl = (phoneNumber: string, message: string) => {
        // Telefon numarasını temizle (boşluklar, tireler, parantezler)
        const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '')
        // Türkiye için +90 ekle (yoksa)
        const formattedPhone = cleanPhone.startsWith('90') ? `+${cleanPhone}` : cleanPhone.startsWith('+90') ? cleanPhone : `+90${cleanPhone}`
        return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    }

    const renderReservationCard = (res: Reservation) => {
        const checkInDate = new Date(res.checkIn)
        const checkOutDate = new Date(res.checkOut)
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Ensure totalPrice is a number (handle string conversion from JSON)
        const totalPrice = typeof res.totalPrice === 'string' ? parseFloat(res.totalPrice) : (res.totalPrice || 0)

        return (
            <Card key={res.id} className={`overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 ${
                res.status === "CANCELLED" ? "border-l-red-500 opacity-75" : "border-l-blue-500"
            }`}>
                <CardContent className="p-0">
                    <div className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            {/* Left Section - Guest Info */}
                            <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge 
                                                variant={res.status === "PENDING" ? "secondary" : res.status === "CONFIRMED" ? "default" : "outline"}
                                                className="uppercase text-xs font-semibold"
                                            >
                                                {res.status === "PENDING" ? "Beklemede" : 
                                                 res.status === "CONFIRMED" ? "Onaylandı" :
                                                 res.status === "CANCELLED" ? "İptal Edildi" : res.status}
                                            </Badge>
                                            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                                                #{res.id.slice(-6).toUpperCase()}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            {res.guestName}
                                        </h3>
                                        {res.guestPhone && (
                                            <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                {res.guestPhone}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(res.createdAt), "dd MMM yyyy, HH:mm", { locale: tr })}
                                        </div>
                                    </div>
                                </div>

                                {/* Room & Dates Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Home className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium text-gray-900">{res.roomType || "Belirtilmemiş"}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 ml-6">
                                            {res.numberOfGuests} {res.numberOfGuests === 1 ? "Kişi" : "Kişi"}
                                            {res.numberOfChildren && res.numberOfChildren > 0 && ` (${res.numberOfChildren} ${res.numberOfChildren === 1 ? "Çocuk" : "Çocuk"})`}
                                            {res.numberOfRooms && res.numberOfRooms > 1 && ` • ${res.numberOfRooms} Oda`}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 px-3 py-2 rounded-lg">
                                            <Calendar className="w-4 h-4" />
                                            <div>
                                                <div>{format(checkInDate, "dd MMM yyyy", { locale: tr })}</div>
                                                <div className="text-xs text-blue-500">→ {format(checkOutDate, "dd MMM yyyy", { locale: tr })}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 ml-6">
                                            {nights} {nights === 1 ? "Gece" : "Gece"}
                                        </div>
                                    </div>
                                </div>

                                {/* Price Info */}
                                <div className="pt-2 border-t border-gray-100">
                                    {totalPrice && totalPrice > 0 ? (
                                        <div className="flex items-center justify-between bg-green-50 px-4 py-3 rounded-lg border border-green-100">
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <span className="font-medium">Toplam Fiyat:</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-green-700">
                                                    {totalPrice.toLocaleString('tr-TR', { 
                                                        minimumFractionDigits: 2, 
                                                        maximumFractionDigits: 2 
                                                    })} ₺
                                                </div>
                                                {nights > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {Math.round(totalPrice / nights).toLocaleString('tr-TR')} ₺ / gece
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            <span>Fiyat bilgisi belirtilmemiş</span>
                                        </div>
                                    )}
                                </div>

                                {/* Special Requests */}
                                {res.specialRequests && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium text-gray-700">Özel İstekler: </span>
                                            {res.specialRequests}
                                        </p>
                                    </div>
                                )}

                                {/* Bot Info */}
                                {res.call?.bot?.name && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-500">
                                            Bot: <span className="font-medium">{res.call.bot.name}</span>
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="pt-2 border-t border-gray-100">
                                    <div className="flex flex-col gap-2">
                                        {res.guestPhone && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedReservation(res)
                                                    setTemplateSelectorOpen(true)
                                                }}
                                                className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                            >
                                                <MessageCircle className="w-4 h-4 mr-2" />
                                                WhatsApp ile Gönder
                                            </Button>
                                        )}
                                        <div className="flex gap-2">
                                            {res.status !== "CANCELLED" && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => updateReservationStatus(res.id, "CANCELLED")}
                                                    className="flex-1"
                                                >
                                                    <X className="w-4 h-4 mr-2" />
                                                    İptal Et
                                                </Button>
                                            )}
                                            {res.status === "CANCELLED" && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => updateReservationStatus(res.id, "PENDING")}
                                                    className="flex-1"
                                                >
                                                    <RotateCcw className="w-4 h-4 mr-2" />
                                                    Tekrar Aktif Et
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Template Manager Button */}
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplateManagerOpen(true)}
                    className="flex items-center gap-2"
                >
                    <Settings className="w-4 h-4" />
                    WhatsApp Şablonlarını Yönet
                </Button>
            </div>

            {/* WhatsApp Template Manager */}
            <WhatsAppTemplateManager
                isOpen={templateManagerOpen}
                onClose={() => setTemplateManagerOpen(false)}
                customerType="HOTEL"
            />

            {/* WhatsApp Template Selector */}
            <WhatsAppTemplateSelector
                isOpen={templateSelectorOpen}
                onClose={() => {
                    setTemplateSelectorOpen(false)
                    setSelectedReservation(null)
                }}
                onSelect={async (templateType) => {
                    if (selectedReservation && selectedReservation.guestPhone) {
                        const message = await createWhatsAppMessage(selectedReservation, templateType)
                        const url = getWhatsAppUrl(selectedReservation.guestPhone, message)
                        window.open(url, '_blank')
                    }
                }}
                customerType="HOTEL"
                status={selectedReservation?.status}
            />

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                    placeholder="Müşteri adı, telefon, oda tipi veya rezervasyon kodu ile ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 text-base"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upcoming" | "past" | "cancelled")} className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-2xl">
                    <TabsTrigger value="upcoming" className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4" />
                        Gelecek Rezervasyonlar
                        {upcomingCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {upcomingCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="past" className="flex items-center gap-2">
                        <CalendarX className="w-4 h-4" />
                        Geçmiş Rezervasyonlar
                        {pastCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {pastCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="cancelled" className="flex items-center gap-2">
                        <X className="w-4 h-4" />
                        İptal Edilenler
                        {cancelledCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {cancelledCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="mt-6">
                    {filteredReservations.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <CalendarCheck className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {searchQuery ? "Arama sonucu bulunamadı" : "Henüz Gelecek Rezervasyon Yok"}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {searchQuery 
                                    ? "Farklı bir arama terimi deneyin."
                                    : "Gelecek tarihli rezervasyonlar burada listelenecektir."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-600 mb-4">
                                {filteredReservations.length} {filteredReservations.length === 1 ? "rezervasyon bulundu" : "rezervasyon bulundu"}
                            </div>
                            {filteredReservations.map(renderReservationCard)}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="past" className="mt-6">
                    {filteredReservations.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <CalendarX className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {searchQuery ? "Arama sonucu bulunamadı" : "Henüz Geçmiş Rezervasyon Yok"}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {searchQuery 
                                    ? "Farklı bir arama terimi deneyin."
                                    : "Geçmiş rezervasyonlar burada listelenecektir."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-600 mb-4">
                                {filteredReservations.length} {filteredReservations.length === 1 ? "rezervasyon bulundu" : "rezervasyon bulundu"}
                            </div>
                            {filteredReservations.map(renderReservationCard)}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="cancelled" className="mt-6">
                    {filteredReservations.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <X className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {searchQuery ? "Arama sonucu bulunamadı" : "İptal Edilen Rezervasyon Yok"}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {searchQuery 
                                    ? "Farklı bir arama terimi deneyin."
                                    : "İptal edilen rezervasyonlar burada listelenecektir."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-600 mb-4">
                                {filteredReservations.length} {filteredReservations.length === 1 ? "rezervasyon bulundu" : "rezervasyon bulundu"}
                            </div>
                            {filteredReservations.map(renderReservationCard)}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
