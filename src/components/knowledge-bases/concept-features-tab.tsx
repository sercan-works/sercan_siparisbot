"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ConceptFeatures {
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

interface ConceptFeaturesTabProps {
  conceptFeatures: ConceptFeatures
  onChange: (conceptFeatures: ConceptFeatures) => void
}

const conceptFields: Array<{ key: keyof ConceptFeatures; label: string }> = [
  { key: "otelinHikayesi", label: "Otelin Hikayesi" },
  { key: "tarihiKulturelYakinlik", label: "Tarihi ve Kültürel Alanlara Yakınlığı" },
  { key: "binaTarihi", label: "Bina Tarihi ve Tasarım Özellikleri" },
  { key: "kimlereHitapEder", label: "Kimlere Hitap Eder" },
  { key: "balayiKonsepti", label: "Balayı Konsepti" },
  { key: "animasyon", label: "Animasyon" },
  { key: "suSporlari", label: "Su Sporları" },
  { key: "havuzlar", label: "Havuzlar ve Özellikleri" },
  { key: "sahil", label: "Sahil ve Özellikleri" },
  { key: "engellilereHizmetler", label: "Engellilere Yönelik Hizmetler" },
  { key: "aquaparklar", label: "Aquaparklar" },
  { key: "etkinlikler", label: "Etkinlikler" },
  { key: "dogumgunuKonsepti", label: "Doğumgünü Konsepti" },
  { key: "dugunToplantiKonseptleri", label: "Düğün ve Toplantı Konseptleri" }
]

export default function ConceptFeaturesTab({
  conceptFeatures,
  onChange
}: ConceptFeaturesTabProps) {
  const updateField = (field: keyof ConceptFeatures, value: string) => {
    onChange({
      ...conceptFeatures,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Konsept ve Özellikler</h3>
        <p className="text-sm text-gray-500 mb-6">
          Otelin konsepti, özellikleri ve hitap ettiği kitle hakkında bilgiler
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {conceptFields.map((field) => (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}</Label>
            <Textarea
              id={field.key}
              value={conceptFeatures[field.key]}
              onChange={(e) => updateField(field.key, e.target.value)}
              placeholder={`${field.label} hakkında bilgi girin`}
              className="mt-1"
              rows={3}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

