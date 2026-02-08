"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Save, X } from "lucide-react"
import FacilityInfoTab, { FacilityInfo } from "./facility-info-tab"
import RoomTypesTable, { RoomType } from "./room-types-table"
import PricingTab from "./pricing-tab"
import ServicesTab from "./services-tab"
import PoliciesTable from "./policies-table"
import ConceptFeaturesTab from "./concept-features-tab"
import MenusTable, { Menu } from "./menus-table"
import { generatePricingPrompt } from "@/lib/pricing-prompt-generator"

interface Policy {
  id: string
  name: string
  detail: string
}

interface KnowledgeBase {
  id?: string
  name: string
  texts: string[]
  enableAutoRefresh: boolean
  customerId?: string | null
}

interface HotelKnowledgeFormProps {
  knowledgeBase: KnowledgeBase | null
  onClose: () => void
  onSuccess: () => void
  customerId?: string | null
  customerName?: string
}

// Hotel veri yapısı tipleri
// FacilityInfo artık facility-info-tab.tsx'den import ediliyor


interface HotelData {
  facilityInfo: FacilityInfo
  roomTypes: RoomType[]
  pricing: {
    dailyRatesByRoomType?: Record<string, Array<{
      date: string
      availableRooms: string
      ppPrice: string
      single: string
      dbl: string
      triple: string
    }>>
    dailyRates?: any[] // Legacy - migrated to dailyRatesByRoomType
    rules: any
    discounts: any[]
    pricingPrompt: string
  }
  services: {
    free: string[]
    paid: string[]
  }
  policies: Policy[]
  menus: Menu[]
  conceptFeatures: {
    otelinHikayesi: string
    tarihiKulturelYakinlik: string
    binaTarihi: string
    kimlereHitapEder: string
    balayiKonsepti: string
    animasyon: string
    suSporlari: string
    havuzlar: string
    sahil: string
    engellilereHizmetler: string
    aquaparklar: string
    etkinlikler: string
    dogumgunuKonsepti: string
    dugunToplantiKonseptleri: string
  }
}

export default function HotelKnowledgeForm({
  knowledgeBase,
  onClose,
  onSuccess,
  customerId,
  customerName
}: HotelKnowledgeFormProps) {
  const [formData, setFormData] = useState({
    name: knowledgeBase?.name || "",
    enableAutoRefresh: knowledgeBase?.enableAutoRefresh || false,
    customerId: knowledgeBase?.customerId || customerId || ""
  })

  const [hotelData, setHotelData] = useState<HotelData>({
    facilityInfo: {
      tesisAdi: "",
      yildizSayisi: "",
      odaSayisi: "",
      engelliOdaSayisi: "",
      denizGolKayakUzaklik: "",
      kurulusSonTadilatTarihi: "",
      konsepti: "",
      subeleri: "",
      webSitesi: "",
      mailAdresi: "",
      faturaAdresi: "",
      konumu: "",
      sezonTarihleri: "",
      havaLimaninaUzaklik: "",
      sehirMerkezineUzaklik: "",
      sertifikalar: "",
      rezervasyonDisiTelefonlar: []
    },
    roomTypes: [],
    pricing: {
      dailyRatesByRoomType: {},
      rules: {
        singleCarpani: "",
        tripleCarpani: "",
        bebekIndirimi: "",
        singleOdaCocukInd: "",
        dblOdaIlkCocukInd: "",
        dblOdaIkinciCocukInd: "",
        dblOdaIlk7_11CocukInd: "",
        realiseDate: "",
        odaTipiBagimsizFiyat: ""
      },
      discounts: [],
      pricingPrompt: ""
    },
    services: {
      free: [],
      paid: []
    },
    policies: [],
    menus: [],
    conceptFeatures: {
      otelinHikayesi: "",
      tarihiKulturelYakinlik: "",
      binaTarihi: "",
      kimlereHitapEder: "",
      balayiKonsepti: "",
      animasyon: "",
      suSporlari: "",
      havuzlar: "",
      sahil: "",
      engellilereHizmetler: "",
      aquaparklar: "",
      etkinlikler: "",
      dogumgunuKonsepti: "",
      dugunToplantiKonseptleri: ""
    }
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("facility-info")

  // Mevcut veriyi yükle
  useEffect(() => {
    if (knowledgeBase?.texts && knowledgeBase.texts.length > 0) {
      try {
        // İlk text chunk'ı JSON olarak parse etmeyi dene
        const parsed = JSON.parse(knowledgeBase.texts[0])
        if (parsed.facilityInfo) {
          // Eski formatı yeni formata dönüştür
          const facilityInfo = parsed.facilityInfo
          if (facilityInfo.kurulusTarihi || facilityInfo.sonTadilatTarihi) {
            // Eski format: ayrı tarihler
            facilityInfo.kurulusSonTadilatTarihi = 
              [facilityInfo.kurulusTarihi, facilityInfo.sonTadilatTarihi]
                .filter(Boolean)
                .join(" - ") || ""
            delete facilityInfo.kurulusTarihi
            delete facilityInfo.sonTadilatTarihi
          }
          // Eski format: rezervasyonDisiAlternatif string -> yeni format: rezervasyonDisiTelefonlar array
          if (facilityInfo.rezervasyonDisiAlternatif && !facilityInfo.rezervasyonDisiTelefonlar) {
            facilityInfo.rezervasyonDisiTelefonlar = []
          }
          if (!facilityInfo.rezervasyonDisiTelefonlar) {
            facilityInfo.rezervasyonDisiTelefonlar = []
          }
          // Eski iletisimBilgisi alanını kaldır
          delete facilityInfo.iletisimBilgisi
          delete facilityInfo.rezervasyonDisiAlternatif
          
          // RoomTypes için customFeatures desteği ekle
          if (parsed.roomTypes && Array.isArray(parsed.roomTypes)) {
            parsed.roomTypes = parsed.roomTypes.map((rt: any) => ({
              ...rt,
              customFeatures: rt.customFeatures || {}
            }))
          }
          
          // Menus için varsayılan değer ekle
          if (!parsed.menus || !Array.isArray(parsed.menus)) {
            parsed.menus = []
          }
          
          // Policies için id ekle (eğer yoksa)
          if (parsed.policies && Array.isArray(parsed.policies)) {
            parsed.policies = parsed.policies.map((p: any, index: number) => ({
              id: p.id || `policy-${Date.now()}-${index}`,
              name: p.name || "",
              detail: p.detail || ""
            }))
          } else {
            parsed.policies = []
          }
          
          // dailyRates -> dailyRatesByRoomType migration
          if (parsed.pricing) {
            if (parsed.pricing.dailyRates && Array.isArray(parsed.pricing.dailyRates) && !parsed.pricing.dailyRatesByRoomType) {
              const roomTypes = parsed.roomTypes || []
              parsed.pricing.dailyRatesByRoomType = {}
              if (roomTypes.length > 0) {
                parsed.pricing.dailyRatesByRoomType[roomTypes[0].id] = parsed.pricing.dailyRates
              } else {
                parsed.pricing.dailyRatesByRoomType["_legacy"] = parsed.pricing.dailyRates
              }
              delete parsed.pricing.dailyRates
            }
            if (!parsed.pricing.dailyRatesByRoomType) {
              parsed.pricing.dailyRatesByRoomType = {}
            }
          }

          // Discounts için eski formatı yeni formata çevir (migration)
          if (parsed.pricing && parsed.pricing.discounts && Array.isArray(parsed.pricing.discounts)) {
            parsed.pricing.discounts = parsed.pricing.discounts.map((discount: any) => {
              // Eğer eski format varsa (satisTarihi ve konaklamaTarihi string olarak)
              if (discount.satisTarihi && !discount.satisTarihiBaslangic) {
                // Eski format: "1.01.2025 31.01.2025" gibi
                const satisParts = discount.satisTarihi.split(' ').filter((p: string) => p.trim())
                discount.satisTarihiBaslangic = satisParts[0] || ""
                discount.satisTarihiBitis = satisParts[1] || ""
                delete discount.satisTarihi
              }
              if (discount.konaklamaTarihi && !discount.konaklamaTarihiBaslangic) {
                // Eski format: "1.01.2025 1.09.2025" gibi
                const konaklamaParts = discount.konaklamaTarihi.split(' ').filter((p: string) => p.trim())
                discount.konaklamaTarihiBaslangic = konaklamaParts[0] || ""
                discount.konaklamaTarihiBitis = konaklamaParts[1] || ""
                delete discount.konaklamaTarihi
              }
              // Yeni alanlar yoksa boş string olarak ekle
              if (!discount.satisTarihiBaslangic) discount.satisTarihiBaslangic = ""
              if (!discount.satisTarihiBitis) discount.satisTarihiBitis = ""
              if (!discount.konaklamaTarihiBaslangic) discount.konaklamaTarihiBaslangic = ""
              if (!discount.konaklamaTarihiBitis) discount.konaklamaTarihiBitis = ""
              return discount
            })
          }
          
          // PricingPrompt için: eğer yoksa veya boşsa otomatik oluştur
          if (!parsed.pricing || !parsed.pricing.pricingPrompt || parsed.pricing.pricingPrompt.trim() === "") {
            if (!parsed.pricing) {
              parsed.pricing = {
                dailyRatesByRoomType: {},
                rules: {
                  singleCarpani: "",
                  tripleCarpani: "",
                  bebekIndirimi: "",
                  singleOdaCocukInd: "",
                  dblOdaIlkCocukInd: "",
                  dblOdaIkinciCocukInd: "",
                  dblOdaIlk7_11CocukInd: "",
                  realiseDate: "",
                  odaTipiBagimsizFiyat: ""
                },
                discounts: [],
                pricingPrompt: ""
              }
            }
            // Otomatik prompt oluştur
            parsed.pricing.pricingPrompt = generatePricingPrompt(parsed.pricing)
          }
          
          setHotelData({ ...parsed, facilityInfo })
        }
      } catch (e) {
        // JSON değilse, eski format - boş bırak
        console.log("Existing data is not in new format")
      }
    }
  }, [knowledgeBase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.customerId) {
        throw new Error("Lütfen bir firma seçin")
      }

      // Hotel verisini JSON formatına serialize et
      const serializedData = JSON.stringify(hotelData)
      
      // texts array'ine tek bir JSON string olarak ekle
      const texts = [serializedData]

      const payload = {
        name: formData.name,
        texts,
        enableAutoRefresh: formData.enableAutoRefresh,
        customerId: formData.customerId
      }

      const url = knowledgeBase?.id
        ? `/api/knowledge-bases/${knowledgeBase.id}`
        : "/api/knowledge-bases"

      const response = await fetch(url, {
        method: knowledgeBase?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const responseData = await response.json()

      if (!response.ok) {
        const errorMsg = responseData.error || "Failed to save knowledge base"
        const details = responseData.details ? `: ${responseData.details}` : ""
        throw new Error(`${errorMsg}${details}`)
      }

      onSuccess()
    } catch (err: any) {
      console.error("[HotelKnowledgeForm] Submit error:", err)
      setError(err.message || "Bir hata oluştu. Lütfen tekrar deneyin.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-gray-200 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {knowledgeBase ? "Otel Bilgi Bankası Düzenle" : "Otel Bilgi Bankası Oluştur"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Otel bilgilerinizi tablo yapısında girin
            </p>
            {customerName && (
              <p className="text-xs text-gray-500 mt-1">
                Firma: <span className="font-medium text-gray-700">{customerName}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Name */}
          <div className="p-6 border-b space-y-4">
            <div>
              <Label htmlFor="name">
                Bilgi Bankası Adı <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Otel Bilgileri"
                className="mt-1"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Tabs Content - Bu kısım HotelTabs komponenti ile doldurulacak */}
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-7 mb-6">
                <TabsTrigger value="facility-info">İşletme Kimliği</TabsTrigger>
                <TabsTrigger value="room-types">Oda Tipleri</TabsTrigger>
                <TabsTrigger value="pricing">Fiyatlandırma</TabsTrigger>
                <TabsTrigger value="services">Hizmetler</TabsTrigger>
                <TabsTrigger value="policies">Politikalar</TabsTrigger>
                <TabsTrigger value="menus">Menüler</TabsTrigger>
                <TabsTrigger value="concept">Konsept & Özellikler</TabsTrigger>
              </TabsList>

              <TabsContent value="facility-info" className="mt-0">
                <FacilityInfoTab
                  facilityInfo={hotelData.facilityInfo}
                  onChange={(facilityInfo) =>
                    setHotelData({ ...hotelData, facilityInfo })
                  }
                />
              </TabsContent>

              <TabsContent value="room-types" className="mt-0">
                <RoomTypesTable
                  roomTypes={hotelData.roomTypes}
                  onChange={(roomTypes) =>
                    setHotelData({ ...hotelData, roomTypes })
                  }
                />
              </TabsContent>

              <TabsContent value="pricing" className="mt-0">
                <PricingTab
                  pricing={hotelData.pricing}
                  roomTypes={hotelData.roomTypes}
                  onChange={(pricing) =>
                    setHotelData({ ...hotelData, pricing })
                  }
                />
              </TabsContent>

              <TabsContent value="services" className="mt-0">
                <ServicesTab
                  services={hotelData.services}
                  onChange={(services) =>
                    setHotelData({ ...hotelData, services })
                  }
                />
              </TabsContent>

              <TabsContent value="policies" className="mt-0">
                <PoliciesTable
                  policies={hotelData.policies}
                  onChange={(policies) =>
                    setHotelData({ ...hotelData, policies })
                  }
                />
              </TabsContent>

              <TabsContent value="menus" className="mt-0">
                <MenusTable
                  menus={hotelData.menus || []}
                  onChange={(menus) =>
                    setHotelData({ ...hotelData, menus })
                  }
                />
              </TabsContent>

              <TabsContent value="concept" className="mt-0">
                <ConceptFeaturesTab
                  conceptFeatures={hotelData.conceptFeatures}
                  onChange={(conceptFeatures) =>
                    setHotelData({ ...hotelData, conceptFeatures })
                  }
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2">Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {knowledgeBase ? "Güncelle" : "Oluştur"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

