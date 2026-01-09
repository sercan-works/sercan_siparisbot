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

export interface FacilityInfo {
  tesisAdi: string
  yildizSayisi: string
  odaSayisi: string
  engelliOdaSayisi: string
  denizGolKayakUzaklik: string
  kurulusSonTadilatTarihi: string // Birleştirilmiş alan
  konsepti: string
  subeleri: string
  webSitesi: string
  mailAdresi: string
  faturaAdresi: string
  konumu: string
  sezonTarihleri: string
  havaLimaninaUzaklik: string
  sehirMerkezineUzaklik: string
  sertifikalar: string
  rezervasyonDisiTelefonlar: AlternativeContact[] // Dinamik telefon bilgileri
}

interface FacilityInfoTabProps {
  facilityInfo: FacilityInfo
  onChange: (facilityInfo: FacilityInfo) => void
}

export default function FacilityInfoTab({
  facilityInfo,
  onChange
}: FacilityInfoTabProps) {
  const updateField = (field: keyof FacilityInfo, value: string | AlternativeContact[]) => {
    onChange({
      ...facilityInfo,
      [field]: value
    } as FacilityInfo)
  }

  const addAlternativeContact = () => {
    const newContact: AlternativeContact = {
      id: Date.now().toString(),
      phone: "",
      description: ""
    }
    updateField("rezervasyonDisiTelefonlar", [...facilityInfo.rezervasyonDisiTelefonlar, newContact])
  }

  const removeAlternativeContact = (id: string) => {
    updateField("rezervasyonDisiTelefonlar", 
      facilityInfo.rezervasyonDisiTelefonlar.filter(c => c.id !== id)
    )
  }

  const updateAlternativeContact = (id: string, field: keyof AlternativeContact, value: string) => {
    updateField("rezervasyonDisiTelefonlar",
      facilityInfo.rezervasyonDisiTelefonlar.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      )
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tesis Adı */}
        <div>
          <Label htmlFor="tesisAdi">
            Tesis Adı <span className="text-red-500">*</span>
          </Label>
          <Input
            id="tesisAdi"
            value={facilityInfo.tesisAdi}
            onChange={(e) => updateField("tesisAdi", e.target.value)}
            placeholder="Örn: Grand Hotel"
            className="mt-1"
          />
        </div>

        {/* Yıldız Sayısı */}
        <div>
          <Label htmlFor="yildizSayisi">Yıldız Sayısı</Label>
          <Input
            id="yildizSayisi"
            type="number"
            min="1"
            max="5"
            value={facilityInfo.yildizSayisi}
            onChange={(e) => updateField("yildizSayisi", e.target.value)}
            placeholder="1-5"
            className="mt-1"
          />
        </div>

        {/* Oda Sayısı */}
        <div>
          <Label htmlFor="odaSayisi">Oda Sayısı</Label>
          <Input
            id="odaSayisi"
            type="number"
            value={facilityInfo.odaSayisi}
            onChange={(e) => updateField("odaSayisi", e.target.value)}
            placeholder="Örn: 100"
            className="mt-1"
          />
        </div>

        {/* Engelli Oda Sayısı */}
        <div>
          <Label htmlFor="engelliOdaSayisi">Engelli Oda Sayısı</Label>
          <Input
            id="engelliOdaSayisi"
            type="number"
            value={facilityInfo.engelliOdaSayisi}
            onChange={(e) => updateField("engelliOdaSayisi", e.target.value)}
            placeholder="Örn: 5"
            className="mt-1"
          />
        </div>

        {/* Deniz - Göl - Kayak Alanı Uzaklığı */}
        <div>
          <Label htmlFor="denizGolKayakUzaklik">Deniz - Göl - Kayak Alanı Uzaklığı</Label>
          <Input
            id="denizGolKayakUzaklik"
            value={facilityInfo.denizGolKayakUzaklik}
            onChange={(e) => updateField("denizGolKayakUzaklik", e.target.value)}
            placeholder="Örn: 50m denize"
            className="mt-1"
          />
        </div>

        {/* Kuruluş Tarihi - Son Tadilat Tarihi */}
        <div>
          <Label htmlFor="kurulusSonTadilatTarihi">Kuruluş Tarihi - Son Tadilat Tarihi</Label>
          <Input
            id="kurulusSonTadilatTarihi"
            value={facilityInfo.kurulusSonTadilatTarihi}
            onChange={(e) => updateField("kurulusSonTadilatTarihi", e.target.value)}
            placeholder="Örn: 2010 - 2023"
            className="mt-1"
          />
        </div>

        {/* Konsepti */}
        <div>
          <Label htmlFor="konsepti">Konsepti</Label>
          <Input
            id="konsepti"
            value={facilityInfo.konsepti}
            onChange={(e) => updateField("konsepti", e.target.value)}
            placeholder="Örn: Butik Otel, Resort"
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

        {/* Hava Limanına Uzaklık */}
        <div>
          <Label htmlFor="havaLimaninaUzaklik">Hava Limanına Uzaklık</Label>
          <Input
            id="havaLimaninaUzaklik"
            value={facilityInfo.havaLimaninaUzaklik}
            onChange={(e) => updateField("havaLimaninaUzaklik", e.target.value)}
            placeholder="Örn: 25 km"
            className="mt-1"
          />
        </div>

        {/* Şehir Merkezine Uzaklık */}
        <div>
          <Label htmlFor="sehirMerkezineUzaklik">Şehir Merkezine Uzaklık</Label>
          <Input
            id="sehirMerkezineUzaklik"
            value={facilityInfo.sehirMerkezineUzaklik}
            onChange={(e) => updateField("sehirMerkezineUzaklik", e.target.value)}
            placeholder="Örn: 10 km"
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

        {/* Sezon Tarihleri */}
        <div>
          <Label htmlFor="sezonTarihleri">Sezon Tarihleri</Label>
          <Input
            id="sezonTarihleri"
            value={facilityInfo.sezonTarihleri}
            onChange={(e) => updateField("sezonTarihleri", e.target.value)}
            placeholder="Örn: 1 Haziran - 30 Eylül"
            className="mt-1"
          />
        </div>

        {/* Sertifikalar */}
        <div>
          <Label htmlFor="sertifikalar">Sertifikalar</Label>
          <Textarea
            id="sertifikalar"
            value={facilityInfo.sertifikalar}
            onChange={(e) => updateField("sertifikalar", e.target.value)}
            placeholder="Sertifika bilgileri"
            className="mt-1"
            rows={2}
          />
        </div>

        {/* Rezervasyon Dışı Konular İçin Alternatif İletişim Bilgileri */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Rezervasyon Dışı Konular İçin Alternatif İletişim Bilgisi</Label>
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
          
          {facilityInfo.rezervasyonDisiTelefonlar.length === 0 ? (
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
              {facilityInfo.rezervasyonDisiTelefonlar.map((contact) => (
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

