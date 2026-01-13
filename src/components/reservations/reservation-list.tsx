"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Calendar, Phone, User, Home, Clock, Search, CalendarCheck, CalendarX } from "lucide-react"

interface Reservation {
    id: string
    guestName: string
    guestPhone: string | null
    checkIn: string
    checkOut: string
    numberOfGuests: number
    roomType: string | null
    status: string
    createdAt: string
    callId: string
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
    const [reservations] = useState<Reservation[]>(initialReservations)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming")

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Filter reservations by date and search query
    const filteredReservations = useMemo(() => {
        let filtered = reservations.filter((res) => {
            const checkInDate = new Date(res.checkIn)
            checkInDate.setHours(0, 0, 0, 0)

            // Filter by date (upcoming vs past)
            if (activeTab === "upcoming") {
                if (checkInDate < today) return false
            } else {
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

        // Sort: upcoming by checkIn (ascending), past by checkIn (descending)
        return filtered.sort((a, b) => {
            const dateA = new Date(a.checkIn).getTime()
            const dateB = new Date(b.checkIn).getTime()
            return activeTab === "upcoming" ? dateA - dateB : dateB - dateA
        })
    }, [reservations, searchQuery, activeTab, today])

    const upcomingCount = reservations.filter((res) => {
        const checkInDate = new Date(res.checkIn)
        checkInDate.setHours(0, 0, 0, 0)
        return checkInDate >= today
    }).length

    const pastCount = reservations.filter((res) => {
        const checkInDate = new Date(res.checkIn)
        checkInDate.setHours(0, 0, 0, 0)
        return checkInDate < today
    }).length

    const renderReservationCard = (res: Reservation) => {
        const checkInDate = new Date(res.checkIn)
        const checkOutDate = new Date(res.checkOut)
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

        return (
            <Card key={res.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
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
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upcoming" | "past")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
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
            </Tabs>
        </div>
    )
}
