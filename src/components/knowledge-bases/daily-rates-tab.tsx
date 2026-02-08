"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Copy, Trash2, CheckSquare, Square } from "lucide-react"
import type { RoomType } from "./room-types-table"

interface DailyRate {
  date: string
  availableRooms: string
  ppPrice: string
  single: string
  dbl: string
  triple: string
}

interface DailyRatesTabProps {
  roomTypes: RoomType[]
  dailyRatesByRoomType: Record<string, DailyRate[]>
  onChange: (dailyRatesByRoomType: Record<string, DailyRate[]>) => void
}

export default function DailyRatesTab({
  roomTypes,
  dailyRatesByRoomType,
  onChange
}: DailyRatesTabProps) {
  const defaultRoomTypeId = roomTypes.length > 0
    ? roomTypes[0].id
    : dailyRatesByRoomType["_legacy"]
      ? "_legacy"
      : ""
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(defaultRoomTypeId)

  // roomTypes değiştiğinde selectedRoomTypeId'yi güncelle
  useEffect(() => {
    if (roomTypes.length > 0) {
      const found = roomTypes.find(rt => rt.id === selectedRoomTypeId)
      if (!found) {
        setSelectedRoomTypeId(roomTypes[0].id)
      }
    } else if (Object.keys(dailyRatesByRoomType).includes("_legacy")) {
      setSelectedRoomTypeId("_legacy")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomTypes.length, roomTypes[0]?.id])

  const effectiveRoomTypeId = selectedRoomTypeId || defaultRoomTypeId
  const dailyRates = (effectiveRoomTypeId ? dailyRatesByRoomType[effectiveRoomTypeId] : []) || []

  const handleDailyRatesChange = (newRates: DailyRate[]) => {
    if (!effectiveRoomTypeId) return
    onChange({
      ...dailyRatesByRoomType,
      [effectiveRoomTypeId]: newRates
    })
  }
  // Türkçe ay isimleri
  const turkishMonths = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ]

  // Mevcut ayı al veya bugünün ayını kullan
  const getCurrentMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth())
  const [sourceRowIndex, setSourceRowIndex] = useState<number | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  // Ay ve yıl değerlerini parse et
  const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number)
  
  // Yıl listesi oluştur (mevcut yıldan 5 yıl öncesi ve 5 yıl sonrası)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  // Ayın tüm günlerini oluştur
  const generateMonthDays = (year: number, month: number): DailyRate[] => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const days: DailyRate[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      const dateKey = formatDateForKey(date)
      
      // Mevcut veriden bu tarih için kayıt var mı kontrol et
      const existingRate = dailyRates.find(rate => rate.date === dateKey)
      
      days.push(
        existingRate || {
          date: dateKey,
          availableRooms: "",
          ppPrice: "",
          single: "",
          dbl: "",
          triple: ""
        }
      )
    }

    return days
  }

  // Tarihi YYYY-MM-DD formatına çevir
  const formatDateForKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Seçilen ayın günlerini hesapla
  const monthDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    return generateMonthDays(year, month)
  }, [selectedMonth, dailyRates])

  // Bir satırın boş olup olmadığını kontrol et
  const isRowEmpty = (rate: DailyRate): boolean => {
    return !rate.availableRooms && !rate.ppPrice && !rate.single && !rate.dbl && !rate.triple
  }

  // Satır güncelle
  const updateDailyRate = (index: number, field: keyof DailyRate, value: string) => {
    const updated = [...monthDays]
    updated[index] = { ...updated[index], [field]: value }
    
    // Güncellenmiş veriyi dailyRates'e kaydet
    const [year, month] = selectedMonth.split('-').map(Number)
    const otherMonthRates = dailyRates.filter(rate => {
      const rateDate = new Date(rate.date)
      const rateYear = rateDate.getFullYear()
      const rateMonth = rateDate.getMonth() + 1
      return !(rateYear === year && rateMonth === month)
    })

    // Güncellenmiş ayın günlerini ekle
    const updatedMonthRates = updated.filter(day => 
      day.availableRooms || day.ppPrice || day.single || day.dbl || day.triple || day.date
    )

    handleDailyRatesChange([...otherMonthRates, ...updatedMonthRates])
  }

  // Kaynak satırı seç
  const handleSetSourceRow = (index: number) => {
    setSourceRowIndex(index === sourceRowIndex ? null : index)
  }

  // Tüm satırlara uygula
  const handleApplyToAll = () => {
    if (sourceRowIndex === null) return

    const sourceRate = monthDays[sourceRowIndex]
    const updated = monthDays.map((rate, index) => {
      if (index === sourceRowIndex) return rate // Kaynak satırı değiştirme
      return {
        ...rate,
        availableRooms: sourceRate.availableRooms,
        ppPrice: sourceRate.ppPrice,
        single: sourceRate.single,
        dbl: sourceRate.dbl,
        triple: sourceRate.triple
      }
    })

    // Güncellenmiş veriyi kaydet
    const [year, month] = selectedMonth.split('-').map(Number)
    const otherMonthRates = dailyRates.filter(rate => {
      const rateDate = new Date(rate.date)
      const rateYear = rateDate.getFullYear()
      const rateMonth = rateDate.getMonth() + 1
      return !(rateYear === year && rateMonth === month)
    })

    const updatedMonthRates = updated.filter(day => 
      day.availableRooms || day.ppPrice || day.single || day.dbl || day.triple || day.date
    )

    handleDailyRatesChange([...otherMonthRates, ...updatedMonthRates])
  }

  // Seçili satırlara uygula
  const handleApplyToSelected = () => {
    if (sourceRowIndex === null || selectedRows.size === 0) return

    const sourceRate = monthDays[sourceRowIndex]
    const updated = monthDays.map((rate, index) => {
      if (index === sourceRowIndex) return rate // Kaynak satırı değiştirme
      if (!selectedRows.has(index)) return rate // Seçili değilse değiştirme
      
      return {
        ...rate,
        availableRooms: sourceRate.availableRooms,
        ppPrice: sourceRate.ppPrice,
        single: sourceRate.single,
        dbl: sourceRate.dbl,
        triple: sourceRate.triple
      }
    })

    // Güncellenmiş veriyi kaydet
    const [year, month] = selectedMonth.split('-').map(Number)
    const otherMonthRates = dailyRates.filter(rate => {
      const rateDate = new Date(rate.date)
      const rateYear = rateDate.getFullYear()
      const rateMonth = rateDate.getMonth() + 1
      return !(rateYear === year && rateMonth === month)
    })

    const updatedMonthRates = updated.filter(day => 
      day.availableRooms || day.ppPrice || day.single || day.dbl || day.triple || day.date
    )

    handleDailyRatesChange([...otherMonthRates, ...updatedMonthRates])
    setSelectedRows(new Set()) // Seçimi temizle
  }

  // Satır seçimi
  const handleToggleRow = (index: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedRows(newSelected)
  }

  // Tümünü seç/seçimi kaldır
  const handleSelectAll = () => {
    if (selectedRows.size === monthDays.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(monthDays.map((_, i) => i)))
    }
  }

  // Satır sil
  const removeDailyRate = (index: number) => {
    const updated = monthDays.filter((_, i) => i !== index)
    
    const [year, month] = selectedMonth.split('-').map(Number)
    const otherMonthRates = dailyRates.filter(rate => {
      const rateDate = new Date(rate.date)
      const rateYear = rateDate.getFullYear()
      const rateMonth = rateDate.getMonth() + 1
      return !(rateYear === year && rateMonth === month)
    })

    const updatedMonthRates = updated.filter(day => 
      day.availableRooms || day.ppPrice || day.single || day.dbl || day.triple || day.date
    )

    handleDailyRatesChange([...otherMonthRates, ...updatedMonthRates])
  }

  // Tarih formatını görüntüleme için düzenle
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr)
    const day = date.getDate()
    const weekdays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
    const weekday = weekdays[date.getDay()]
    return `${day} ${weekday}`
  }

  // Hafta sonu kontrolü
  const isWeekend = (dateStr: string): boolean => {
    const date = new Date(dateStr)
    const day = date.getDay()
    return day === 0 || day === 6 // Pazar veya Cumartesi
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Günlük Oda Fiyatları ve Müsaitlik</h3>
          <p className="text-sm text-gray-500 mt-1">
            Oda tipi seçin, ardından ay seçerek o ayın tüm günleri için fiyat bilgilerini girin
          </p>
        </div>
      </div>

      {roomTypes.length === 0 && !dailyRatesByRoomType["_legacy"] ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
          <p className="text-gray-500 mb-2">Önce Oda Tipleri sekmesinden oda tipi ekleyin</p>
          <p className="text-sm text-gray-400">Oda tipleri tanımlandıktan sonra her oda tipi için ayrı fiyat tabloları oluşturabilirsiniz.</p>
        </div>
      ) : (
        <>
      {/* Oda Tipi ve Ay Seçici */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label>Oda Tipi:</Label>
          <select
            value={effectiveRoomTypeId}
            onChange={(e) => setSelectedRoomTypeId(e.target.value)}
            className="border rounded-md px-3 py-2 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name || "İsimsiz Oda"}
              </option>
            ))}
            {dailyRatesByRoomType["_legacy"] && (
              <option value="_legacy">Eski Veri (Oda tipi atanmamış)</option>
            )}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label>Ay Seçin:</Label>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonthNum}
              onChange={(e) => {
                const month = parseInt(e.target.value)
                setSelectedMonth(`${selectedYear}-${String(month).padStart(2, '0')}`)
              }}
              className="border rounded-md px-3 py-2 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {turkishMonths.map((month, index) => (
                <option key={index + 1} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => {
                const year = parseInt(e.target.value)
                setSelectedMonth(`${year}-${String(selectedMonthNum).padStart(2, '0')}`)
              }}
              className="border rounded-md px-3 py-2 min-w-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toplu İşlem Butonları */}
        {sourceRowIndex !== null && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleApplyToAll}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Copy size={14} className="mr-2" />
              Tüm Satırlara Uygula
            </Button>
            {selectedRows.size > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyToSelected}
              >
                <Copy size={14} className="mr-2" />
                Seçili Satırlara Uygula ({selectedRows.size})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tablo */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Tümünü Seç"
                >
                  {selectedRows.size === monthDays.length ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </TableHead>
              <TableHead className="min-w-[150px]">Tarih</TableHead>
              <TableHead className="min-w-[120px]">Satışa Açık Oda</TableHead>
              <TableHead className="min-w-[120px]">PP (Kişi Başı)</TableHead>
              <TableHead className="min-w-[100px]">Single</TableHead>
              <TableHead className="min-w-[100px]">Dbl</TableHead>
              <TableHead className="min-w-[100px]">Triple</TableHead>
              <TableHead className="min-w-[100px]">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthDays.map((rate, index) => (
              <TableRow 
                key={rate.date}
                className={`
                  ${sourceRowIndex === index ? 'bg-blue-50 border-blue-200' : ''}
                  ${isWeekend(rate.date) ? 'bg-gray-50' : ''}
                `}
              >
                <TableCell>
                  <button
                    type="button"
                    onClick={() => handleToggleRow(index)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {selectedRows.has(index) ? (
                      <CheckSquare size={16} className="text-blue-600" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{formatDateDisplay(rate.date)}</span>
                    <span className="text-xs text-gray-500">{rate.date}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={rate.availableRooms}
                    onChange={(e) => updateDailyRate(index, "availableRooms", e.target.value)}
                    placeholder="Oda sayısı"
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={rate.ppPrice}
                    onChange={(e) => updateDailyRate(index, "ppPrice", e.target.value)}
                    placeholder="₺"
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={rate.single}
                    onChange={(e) => updateDailyRate(index, "single", e.target.value)}
                    placeholder="₺"
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={rate.dbl}
                    onChange={(e) => updateDailyRate(index, "dbl", e.target.value)}
                    placeholder="₺"
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={rate.triple}
                    onChange={(e) => updateDailyRate(index, "triple", e.target.value)}
                    placeholder="₺"
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={sourceRowIndex === index ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleSetSourceRow(index)}
                      className={sourceRowIndex === index ? "bg-blue-600 hover:bg-blue-700" : ""}
                      title="Bu satırdan kopyala"
                    >
                      <Copy size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeDailyRate(index)
                      }}
                      className="text-red-600 hover:text-red-700"
                      title="Sil"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {monthDays.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500">Lütfen bir ay seçin</p>
        </div>
      )}
        </>
      )}
    </div>
  )
}
