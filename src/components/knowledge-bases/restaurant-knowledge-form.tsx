"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X } from "lucide-react"
import RestaurantFacilityInfoTab, { RestaurantFacilityInfo } from "./restaurant-facility-info-tab"
import RestaurantMenusTab, { RestaurantMenus } from "./restaurant-menus-tab"
import RestaurantCampaignsTable, { Campaign } from "./restaurant-campaigns-table"
import RestaurantOtherTab, { RestaurantOther } from "./restaurant-other-tab"

interface KnowledgeBase {
  id?: string
  name: string
  texts: string[]
  enableAutoRefresh: boolean
  customerId?: string | null
}

interface RestaurantKnowledgeFormProps {
  knowledgeBase: KnowledgeBase | null
  onClose: () => void
  onSuccess: () => void
  customerId?: string | null
  customerName?: string
}

interface RestaurantData {
  type: "RESTAURANT"
  facilityInfo: RestaurantFacilityInfo
  menus: RestaurantMenus
  campaigns: Campaign[]
  other: RestaurantOther
}

export default function RestaurantKnowledgeForm({
  knowledgeBase,
  onClose,
  onSuccess,
  customerId,
  customerName
}: RestaurantKnowledgeFormProps) {
  const [formData, setFormData] = useState({
    name: knowledgeBase?.name || "",
    enableAutoRefresh: knowledgeBase?.enableAutoRefresh || false,
    customerId: knowledgeBase?.customerId || customerId || ""
  })

  const [restaurantData, setRestaurantData] = useState<RestaurantData>({
    type: "RESTAURANT",
    facilityInfo: {
      isletmeAdi: "",
      adresi: "",
      telefonNumarasi: "",
      subeleri: "",
      webSitesi: "",
      mailAdresi: "",
      kurulusTarihi: "",
      faturaAdresi: "",
      konumu: "",
      calismaGunleri: "",
      calismaSaatleri: "",
      paketSiparisUzaklik: "",
      ortalamaTeslimatSuresi: "",
      paketSiparisDisiTelefonlar: []
    },
    menus: {
      yiyecek: [],
      icecek: [],
      tatli: [],
      diyet: [],
      minimumTutar: ""
    },
    campaigns: [],
    other: {
      odemeYontemleri: "",
      specialUrunler: "",
      sertifikalar: "",
      vizyonMisyon: "",
      kurulusHikayesi: "",
      rezervasyonAliniyorMu: "",
      hijyenGuvenlik: ""
    }
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("facility-info")

  // Mevcut veriyi yükle
  useEffect(() => {
    if (knowledgeBase?.texts && knowledgeBase.texts.length > 0) {
      try {
        const parsed = JSON.parse(knowledgeBase.texts[0])
        if (parsed.type === "RESTAURANT" && parsed.facilityInfo) {
          setRestaurantData(parsed)
        }
      } catch (e) {
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

      // Restaurant verisini JSON formatına serialize et
      const serializedData = JSON.stringify(restaurantData)
      
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
      console.error("[RestaurantKnowledgeForm] Submit error:", err)
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
              {knowledgeBase ? "Restoran Bilgi Bankası Düzenle" : "Restoran Bilgi Bankası Oluştur"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Restoran bilgilerinizi tablo yapısında girin
            </p>
            {customerName && (
              <p className="text-xs text-gray-500 mt-1">
                Firma: <span className="font-medium text-gray-700">{customerName}</span>
              </p>
            )}
          </div>
          <button
            type="button"
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
                placeholder="Örn: Restoran Bilgileri"
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

          {/* Tabs Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="facility-info">İşletme Kimliği</TabsTrigger>
                <TabsTrigger value="menus">Menüler</TabsTrigger>
                <TabsTrigger value="campaigns">Kampanyalar</TabsTrigger>
                <TabsTrigger value="other">Diğer</TabsTrigger>
              </TabsList>

              <TabsContent value="facility-info" className="mt-0">
                <RestaurantFacilityInfoTab
                  facilityInfo={restaurantData.facilityInfo}
                  onChange={(facilityInfo) =>
                    setRestaurantData({ ...restaurantData, facilityInfo })
                  }
                />
              </TabsContent>

              <TabsContent value="menus" className="mt-0">
                <RestaurantMenusTab
                  menus={restaurantData.menus}
                  onChange={(menus) =>
                    setRestaurantData({ ...restaurantData, menus })
                  }
                />
              </TabsContent>

              <TabsContent value="campaigns" className="mt-0">
                <RestaurantCampaignsTable
                  campaigns={restaurantData.campaigns}
                  onChange={(campaigns) =>
                    setRestaurantData({ ...restaurantData, campaigns })
                  }
                />
              </TabsContent>

              <TabsContent value="other" className="mt-0">
                <RestaurantOtherTab
                  other={restaurantData.other}
                  onChange={(other) =>
                    setRestaurantData({ ...restaurantData, other })
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

