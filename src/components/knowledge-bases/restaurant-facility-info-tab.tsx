"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Phone } from "lucide-react"

export interface AlternativeContact {
  id: string
  phone: string
  description?: string
}

export interface RestaurantFacilityInfo {
  isletmeAdi: string
  adresi: string
  telefonNumarasi: string
  subeleri: string
  webSitesi: string
  mailAdresi: string
  kurulusTarihi: string
  faturaAdresi: string
  konumu: string
  calismaGunleri: string
  calismaSaatleri: string
  paketSiparisUzaklik: string
  ortalamaTeslimatSuresi: string
  paketSiparisDisiTelefonlar: AlternativeContact[]
}

interface RestaurantFacilityInfoTabProps {
  facilityInfo: RestaurantFacilityInfo
  onChange: (facilityInfo: RestaurantFacilityInfo) => void
}

export default function RestaurantFacilityInfoTab({
  facilityInfo,
  onChange
}: RestaurantFacilityInfoTabProps) {
  const updateField = (field: keyof RestaurantFacilityInfo, value: string | AlternativeContact[]) => {
    onChange({
      ...facilityInfo,
      [field]: value
    } as RestaurantFacilityInfo)
  }

  const addAlternativeContact = () => {
    const newContact: AlternativeContact = {
      id: Date.now().toString(),
      phone: "",
      description: ""
    }
    updateField("paketSiparisDisiTelefonlar", [...facilityInfo.paketSiparisDisiTelefonlar, newContact])
  }

  const removeAlternativeContact = (id: string) => {
    updateField("paketSiparisDisiTelefonlar", 
      facilityInfo.paketSiparisDisiTelefonlar.filter(c => c.id !== id)
    )
  }

  const updateAlternativeContact = (id: string, field: keyof AlternativeContact, value: string) => {
    updateField("paketSiparisDisiTelefonlar",
      facilityInfo.paketSiparisDisiTelefonlar.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      )
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* İşletme Adı */}
        <div>
          <Label htmlFor="isletmeAdi">
            İşletme Adı <span className="text-red-500">*</span>
          </Label>
          <Input
            id="isletmeAdi"
            value={facilityInfo.isletmeAdi}
            onChange={(e) => updateField("isletmeAdi", e.target.value)}
            placeholder="Örn: Lezzet Durağı"
            className="mt-1"
          />
        </div>

        {/* Adresi */}
        <div>
          <Label htmlFor="adresi">Adresi</Label>
          <Input
            id="adresi"
            value={facilityInfo.adresi}
            onChange={(e) => updateField("adresi", e.target.value)}
            placeholder="İşletme adresi"
            className="mt-1"
          />
        </div>

        {/* Telefon Numarası */}
        <div>
          <Label htmlFor="telefonNumarasi">Telefon Numarası</Label>
          <Input
            id="telefonNumarasi"
            type="tel"
            value={facilityInfo.telefonNumarasi}
            onChange={(e) => updateField("telefonNumarasi", e.target.value)}
            placeholder="Örn: +90 555 123 45 67"
            className="mt-1"
          />
        </div>

        {/* Şubeleri */}
        <div>
          <Label htmlFor="subeleri">Şubeleri</Label>
          <Input
            id="subeleri"
            value={facilityInfo.subeleri}
            onChange={(e) => updateField("subeleri", e.target.value)}
            placeholder="Şube bilgileri"
            className="mt-1"
          />
        </div>

        {/* Web Sitesi */}
        <div>
          <Label htmlFor="webSitesi">Web Sitesi</Label>
          <Input
            id="webSitesi"
            type="url"
            value={facilityInfo.webSitesi}
            onChange={(e) => updateField("webSitesi", e.target.value)}
            placeholder="https://example.com"
            className="mt-1"
          />
        </div>

        {/* Mail Adresi */}
        <div>
          <Label htmlFor="mailAdresi">Mail Adresi</Label>
          <Input
            id="mailAdresi"
            type="email"
            value={facilityInfo.mailAdresi}
            onChange={(e) => updateField("mailAdresi", e.target.value)}
            placeholder="info@example.com"
            className="mt-1"
          />
        </div>

        {/* Kuruluş Tarihi */}
        <div>
          <Label htmlFor="kurulusTarihi">Kuruluş Tarihi</Label>
          <Input
            id="kurulusTarihi"
            value={facilityInfo.kurulusTarihi}
            onChange={(e) => updateField("kurulusTarihi", e.target.value)}
            placeholder="Örn: 2010"
            className="mt-1"
          />
        </div>

        {/* Çalışma Günleri */}
        <div>
          <Label htmlFor="calismaGunleri">Çalışma Günleri</Label>
          <Input
            id="calismaGunleri"
            value={facilityInfo.calismaGunleri}
            onChange={(e) => updateField("calismaGunleri", e.target.value)}
            placeholder="Örn: Pazartesi - Pazar"
            className="mt-1"
          />
        </div>

        {/* Çalışma Saatleri */}
        <div>
          <Label htmlFor="calismaSaatleri">Çalışma Saatleri</Label>
          <Input
            id="calismaSaatleri"
            value={facilityInfo.calismaSaatleri}
            onChange={(e) => updateField("calismaSaatleri", e.target.value)}
            placeholder="Örn: 09:00 - 22:00"
            className="mt-1"
          />
        </div>

        {/* Paket Siparişi Alınabilecek Uzaklık */}
        <div>
          <Label htmlFor="paketSiparisUzaklik">Paket Siparişi Alınabilecek Uzaklık</Label>
          <Input
            id="paketSiparisUzaklik"
            value={facilityInfo.paketSiparisUzaklik}
            onChange={(e) => updateField("paketSiparisUzaklik", e.target.value)}
            placeholder="Örn: 10 km"
            className="mt-1"
          />
        </div>

        {/* Ortalama Sipariş Teslimat Süresi */}
        <div>
          <Label htmlFor="ortalamaTeslimatSuresi">Ortalama Sipariş Teslimat Süresi</Label>
          <Input
            id="ortalamaTeslimatSuresi"
            value={facilityInfo.ortalamaTeslimatSuresi}
            onChange={(e) => updateField("ortalamaTeslimatSuresi", e.target.value)}
            placeholder="Örn: 30 dakika"
            className="mt-1"
          />
        </div>
      </div>

      {/* Geniş Alanlar - Tek Sütun */}
      <div className="space-y-4">
        {/* Fatura Adresi */}
        <div>
          <Label htmlFor="faturaAdresi">Fatura Adresi</Label>
          <Textarea
            id="faturaAdresi"
            value={facilityInfo.faturaAdresi}
            onChange={(e) => updateField("faturaAdresi", e.target.value)}
            placeholder="Fatura adresi bilgileri"
            className="mt-1"
            rows={2}
          />
        </div>

        {/* Konumu */}
        <div>
          <Label htmlFor="konumu">Konumu</Label>
          <Textarea
            id="konumu"
            value={facilityInfo.konumu}
            onChange={(e) => updateField("konumu", e.target.value)}
            placeholder="Konum bilgileri ve adres"
            className="mt-1"
            rows={2}
          />
        </div>

        {/* Paket Siparişi Dışı Konular İçin Alternatif İletişim Bilgileri */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Paket Siparişi Dışı Konular İçin Alternatif İletişim Bilgisi</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAlternativeContact}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Telefon Ekle
            </Button>
          </div>
          
          {facilityInfo.paketSiparisDisiTelefonlar.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed rounded-lg bg-gray-50">
              <Phone className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-3">Henüz telefon bilgisi eklenmemiş</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAlternativeContact}
              >
                <Plus size={16} className="mr-2" />
                İlk Telefonu Ekle
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {facilityInfo.paketSiparisDisiTelefonlar.map((contact) => (
                <div key={contact.id} className="flex gap-3 items-start p-4 border rounded-lg bg-white">
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label htmlFor={`phone-${contact.id}`} className="text-sm">
                        Telefon Numarası <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`phone-${contact.id}`}
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => updateAlternativeContact(contact.id, "phone", e.target.value)}
                        placeholder="Örn: +90 555 123 45 67"
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`desc-${contact.id}`} className="text-sm">
                        Açıklama (Opsiyonel)
                      </Label>
                      <Input
                        id={`desc-${contact.id}`}
                        value={contact.description || ""}
                        onChange={(e) => updateAlternativeContact(contact.id, "description", e.target.value)}
                        placeholder="Örn: Acil durumlar için"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAlternativeContact(contact.id)}
                    className="text-red-600 hover:text-red-700 mt-6"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAlternativeContact}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Telefon Ekle
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

