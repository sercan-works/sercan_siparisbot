"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, CheckCircle, Info, XCircle } from "lucide-react"

interface WhatsAppTemplateSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (templateType: "confirmation" | "information" | "cancellation") => void
  customerType: "HOTEL" | "RESTAURANT"
  status?: string
}

const templateIcons = {
  confirmation: CheckCircle,
  information: Info,
  cancellation: XCircle
}

const templateLabels = {
  hotel: {
    confirmation: "Rezervasyon Onayı",
    information: "Rezervasyon Bilgisi",
    cancellation: "Rezervasyon İptali"
  },
  restaurant: {
    confirmation: "Sipariş Onayı",
    information: "Sipariş Bilgisi",
    cancellation: "Sipariş İptali"
  }
}

const templateDescriptions = {
  hotel: {
    confirmation: "Rezervasyon onay mesajı gönder",
    information: "Rezervasyon detaylarını içeren bilgi mesajı gönder",
    cancellation: "Rezervasyon iptal mesajı gönder"
  },
  restaurant: {
    confirmation: "Sipariş onay mesajı gönder",
    information: "Sipariş detaylarını içeren bilgi mesajı gönder",
    cancellation: "Sipariş iptal mesajı gönder"
  }
}

export default function WhatsAppTemplateSelector({
  isOpen,
  onClose,
  onSelect,
  customerType,
  status
}: WhatsAppTemplateSelectorProps) {
  const labels = templateLabels[customerType === "HOTEL" ? "hotel" : "restaurant"]
  const descriptions = templateDescriptions[customerType === "HOTEL" ? "hotel" : "restaurant"]

  // Eğer status CANCELLED ise, sadece cancellation şablonunu göster
  const availableTemplates: Array<"confirmation" | "information" | "cancellation"> = 
    status === "CANCELLED" 
      ? ["cancellation"]
      : ["confirmation", "information", "cancellation"]

  const handleSelect = (templateType: "confirmation" | "information" | "cancellation") => {
    onSelect(templateType)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Mesaj Şablonu Seçin
          </DialogTitle>
          <DialogDescription>
            Göndermek istediğiniz mesaj tipini seçin
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {availableTemplates.map((templateType) => {
            const Icon = templateIcons[templateType]
            return (
              <Card
                key={templateType}
                className="cursor-pointer hover:bg-gray-50 transition-colors border-2 hover:border-primary"
                onClick={() => handleSelect(templateType)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{labels[templateType]}</CardTitle>
                      <CardDescription>{descriptions[templateType]}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

