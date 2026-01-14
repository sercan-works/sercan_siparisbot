"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Save, MessageCircle, Hotel, UtensilsCrossed } from "lucide-react"
import { useSession } from "next-auth/react"

interface WhatsAppTemplates {
  hotel: {
    confirmation: string
    information: string
    cancellation: string
  }
  restaurant: {
    confirmation: string
    information: string
    cancellation: string
  }
}

interface WhatsAppTemplateManagerProps {
  isOpen: boolean
  onClose: () => void
  customerType: "HOTEL" | "RESTAURANT"
}

// Tag definitions
const HOTEL_TAGS = [
  { tag: "{guestName}", label: "Müşteri Adı", description: "Rezervasyon yapan misafirin adı" },
  { tag: "{guestPhone}", label: "Telefon", description: "Misafirin telefon numarası" },
  { tag: "{checkIn}", label: "Giriş Tarihi", description: "Giriş tarihi (örn: 20 Ocak 2026)" },
  { tag: "{checkOut}", label: "Çıkış Tarihi", description: "Çıkış tarihi (örn: 23 Ocak 2026)" },
  { tag: "{nights}", label: "Gece Sayısı", description: "Kalınacak gece sayısı" },
  { tag: "{roomType}", label: "Oda Tipi", description: "Rezervasyon yapılan oda tipi" },
  { tag: "{numberOfGuests}", label: "Kişi Sayısı", description: "Toplam misafir sayısı" },
  { tag: "{numberOfChildren}", label: "Çocuk Sayısı", description: "Çocuk sayısı" },
  { tag: "{numberOfRooms}", label: "Oda Sayısı", description: "Rezervasyon yapılan oda sayısı" },
  { tag: "{totalPrice}", label: "Toplam Fiyat", description: "Rezervasyonun toplam fiyatı" },
  { tag: "{pricePerNight}", label: "Gece Başı Fiyat", description: "Bir gecelik fiyat" },
  { tag: "{reservationCode}", label: "Rezervasyon Kodu", description: "Rezervasyon onay kodu" },
  { tag: "{specialRequests}", label: "Özel İstekler", description: "Misafirin özel istekleri" },
]

const RESTAURANT_TAGS = [
  { tag: "{customerName}", label: "Müşteri Adı", description: "Sipariş veren müşterinin adı" },
  { tag: "{customerPhone}", label: "Telefon", description: "Müşterinin telefon numarası" },
  { tag: "{items}", label: "Sipariş İçeriği", description: "Sipariş detayları" },
  { tag: "{deliveryAddress}", label: "Teslimat Adresi", description: "Siparişin teslim edileceği adres" },
  { tag: "{notes}", label: "Notlar", description: "Sipariş ile ilgili özel notlar" },
  { tag: "{totalAmount}", label: "Toplam Tutar", description: "Siparişin toplam tutarı" },
  { tag: "{orderCode}", label: "Sipariş Kodu", description: "Sipariş onay kodu" },
  { tag: "{orderDate}", label: "Sipariş Tarihi", description: "Siparişin verildiği tarih ve saat" },
]

export default function WhatsAppTemplateManager({
  isOpen,
  onClose,
  customerType
}: WhatsAppTemplateManagerProps) {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<WhatsAppTemplates | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"confirmation" | "information" | "cancellation">("confirmation")

  const tags = customerType === "HOTEL" ? HOTEL_TAGS : RESTAURANT_TAGS
  const templateLabels = customerType === "HOTEL" 
    ? {
        confirmation: "Rezervasyon Onayı",
        information: "Rezervasyon Bilgisi",
        cancellation: "Rezervasyon İptali"
      }
    : {
        confirmation: "Sipariş Onayı",
        information: "Sipariş Bilgisi",
        cancellation: "Sipariş İptali"
      }

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/whatsapp-templates")
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error("Error loading templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!templates) return

    try {
      setSaving(true)
      const response = await fetch("/api/whatsapp-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates })
      })

      if (response.ok) {
        onClose()
      } else {
        alert("Şablonlar kaydedilirken bir hata oluştu")
      }
    } catch (error) {
      console.error("Error saving templates:", error)
      alert("Şablonlar kaydedilirken bir hata oluştu")
    } finally {
      setSaving(false)
    }
  }

  const handleTemplateChange = (value: string) => {
    if (!templates) return

    const category = customerType === "HOTEL" ? "hotel" : "restaurant"
    setTemplates({
      ...templates,
      [category]: {
        ...templates[category],
        [activeTab]: value
      }
    })
  }

  const insertTag = (tag: string) => {
    if (!templates) return

    const category = customerType === "HOTEL" ? "hotel" : "restaurant"
    const currentTemplate = templates[category][activeTab]
    const textarea = document.getElementById(`template-${activeTab}`) as HTMLTextAreaElement
    
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = currentTemplate.substring(0, start) + tag + currentTemplate.substring(end)
      handleTemplateChange(newText)
      
      // Focus back to textarea
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + tag.length, start + tag.length)
      }, 0)
    }
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <p>Yükleniyor...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!templates) {
    return null
  }

  const currentTemplate = customerType === "HOTEL" 
    ? templates.hotel[activeTab]
    : templates.restaurant[activeTab]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Mesaj Şablonları
          </DialogTitle>
          <DialogDescription>
            {customerType === "HOTEL" 
              ? "Rezervasyon mesajlarınız için özel şablonlar oluşturun. Tag'leri tıklayarak ekleyebilirsiniz."
              : "Sipariş mesajlarınız için özel şablonlar oluşturun. Tag'leri tıklayarak ekleyebilirsiniz."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Type Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="confirmation">
                {templateLabels.confirmation}
              </TabsTrigger>
              <TabsTrigger value="information">
                {templateLabels.information}
              </TabsTrigger>
              <TabsTrigger value="cancellation">
                {templateLabels.cancellation}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-4">
              {/* Available Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Kullanılabilir Tag'ler</CardTitle>
                  <CardDescription>
                    Tag'leri tıklayarak şablona ekleyebilirsiniz
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tagInfo) => (
                      <Badge
                        key={tagInfo.tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => insertTag(tagInfo.tag)}
                        title={tagInfo.description}
                      >
                        {tagInfo.tag} - {tagInfo.label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Template Editor */}
              <div className="space-y-2">
                <Label htmlFor={`template-${activeTab}`}>
                  {templateLabels[activeTab]} Şablonu
                </Label>
                <Textarea
                  id={`template-${activeTab}`}
                  value={currentTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Şablon metninizi buraya yazın..."
                />
                <p className="text-xs text-gray-500">
                  Tag'ler otomatik olarak gerçek değerlerle değiştirilecektir
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

