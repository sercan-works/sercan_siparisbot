"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export interface RestaurantOther {
  odemeYontemleri: string
  specialUrunler: string
  sertifikalar: string
  vizyonMisyon: string
  kurulusHikayesi: string
  rezervasyonAliniyorMu: string
  hijyenGuvenlik: string
}

interface RestaurantOtherTabProps {
  other: RestaurantOther
  onChange: (other: RestaurantOther) => void
}

export default function RestaurantOtherTab({
  other,
  onChange
}: RestaurantOtherTabProps) {
  const updateField = (field: keyof RestaurantOther, value: string) => {
    onChange({
      ...other,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ödeme Yöntemleri */}
        <div>
          <Label htmlFor="odemeYontemleri">Ödeme Yöntemleri</Label>
          <Textarea
            id="odemeYontemleri"
            value={other.odemeYontemleri}
            onChange={(e) => updateField("odemeYontemleri", e.target.value)}
            placeholder="Kabul edilen ödeme yöntemleri"
            className="mt-1"
            rows={3}
          />
        </div>

        {/* Special Ürünler */}
        <div>
          <Label htmlFor="specialUrunler">Special Ürünler</Label>
          <Textarea
            id="specialUrunler"
            value={other.specialUrunler}
            onChange={(e) => updateField("specialUrunler", e.target.value)}
            placeholder="Özel ürünler ve özellikleri"
            className="mt-1"
            rows={3}
          />
        </div>

        {/* Sertifikalar */}
        <div>
          <Label htmlFor="sertifikalar">Sertifikalar</Label>
          <Textarea
            id="sertifikalar"
            value={other.sertifikalar}
            onChange={(e) => updateField("sertifikalar", e.target.value)}
            placeholder="Sertifika bilgileri"
            className="mt-1"
            rows={3}
          />
        </div>

        {/* Vizyon-Misyon */}
        <div>
          <Label htmlFor="vizyonMisyon">Vizyon-Misyon</Label>
          <Textarea
            id="vizyonMisyon"
            value={other.vizyonMisyon}
            onChange={(e) => updateField("vizyonMisyon", e.target.value)}
            placeholder="Vizyon ve misyon bilgileri"
            className="mt-1"
            rows={3}
          />
        </div>

        {/* Kuruluş Hikayesi */}
        <div>
          <Label htmlFor="kurulusHikayesi">Kuruluş Hikayesi</Label>
          <Textarea
            id="kurulusHikayesi"
            value={other.kurulusHikayesi}
            onChange={(e) => updateField("kurulusHikayesi", e.target.value)}
            placeholder="İşletmenin kuruluş hikayesi"
            className="mt-1"
            rows={3}
          />
        </div>

        {/* Rezervasyon Alınıyor mu? */}
        <div>
          <Label htmlFor="rezervasyonAliniyorMu">Rezervasyon Alınıyor mu?</Label>
          <Textarea
            id="rezervasyonAliniyorMu"
            value={other.rezervasyonAliniyorMu}
            onChange={(e) => updateField("rezervasyonAliniyorMu", e.target.value)}
            placeholder="Rezervasyon bilgileri"
            className="mt-1"
            rows={3}
          />
        </div>

        {/* Hijyen ve Güvenlik Önlemleri */}
        <div className="md:col-span-2">
          <Label htmlFor="hijyenGuvenlik">Hijyen ve Güvenlik Önlemleri</Label>
          <Textarea
            id="hijyenGuvenlik"
            value={other.hijyenGuvenlik}
            onChange={(e) => updateField("hijyenGuvenlik", e.target.value)}
            placeholder="Hijyen ve güvenlik önlemleri"
            className="mt-1"
            rows={4}
          />
        </div>
      </div>
    </div>
  )
}

