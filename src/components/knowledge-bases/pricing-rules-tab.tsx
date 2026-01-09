"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PricingRules {
  singleCarpani: string
  tripleCarpani: string
  bebekIndirimi: string
  singleOdaCocukInd: string
  dblOdaIlkCocukInd: string
  dblOdaIkinciCocukInd: string
  dblOdaIlk7_11CocukInd: string
  realiseDate: string
  odaTipiBagimsizFiyat: string
}

interface PricingRulesTabProps {
  rules: PricingRules
  onChange: (rules: PricingRules) => void
}

export default function PricingRulesTab({
  rules,
  onChange
}: PricingRulesTabProps) {
  const updateField = (field: keyof PricingRules, value: string) => {
    onChange({
      ...rules,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Fiyat Kuralları</h3>
        <p className="text-sm text-gray-500 mb-6">
          Çarpanlar, indirimler ve özel fiyatlandırma kurallarını belirleyin
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Single Çarpanı */}
        <div>
          <Label htmlFor="singleCarpani">Single Çarpanı</Label>
          <Input
            id="singleCarpani"
            type="number"
            step="0.1"
            value={rules.singleCarpani}
            onChange={(e) => updateField("singleCarpani", e.target.value)}
            placeholder="Örn: 1.7"
            className="mt-1"
          />
        </div>

        {/* Triple Çarpanı */}
        <div>
          <Label htmlFor="tripleCarpani">Triple Çarpanı</Label>
          <Input
            id="tripleCarpani"
            type="number"
            step="0.1"
            value={rules.tripleCarpani}
            onChange={(e) => updateField("tripleCarpani", e.target.value)}
            placeholder="Örn: 2.7"
            className="mt-1"
          />
        </div>

        {/* 0-2,99 Bebek İndirimi */}
        <div>
          <Label htmlFor="bebekIndirimi">0-2,99 Bebek İndirimi (%)</Label>
          <Input
            id="bebekIndirimi"
            type="number"
            value={rules.bebekIndirimi}
            onChange={(e) => updateField("bebekIndirimi", e.target.value)}
            placeholder="Örn: 100"
            className="mt-1"
          />
        </div>

        {/* Single Odada Çocuk (3-11,99) İndirimi */}
        <div>
          <Label htmlFor="singleOdaCocukInd">Single Odada Çocuk (3-11,99) İndirimi (%)</Label>
          <Input
            id="singleOdaCocukInd"
            type="number"
            value={rules.singleOdaCocukInd}
            onChange={(e) => updateField("singleOdaCocukInd", e.target.value)}
            placeholder="Örn: 70"
            className="mt-1"
          />
        </div>

        {/* Dbl Odada İlk 0-6,99 Çocuk İndirimi */}
        <div>
          <Label htmlFor="dblOdaIlkCocukInd">Dbl Odada İlk 0-6,99 Çocuk İndirimi (%)</Label>
          <Input
            id="dblOdaIlkCocukInd"
            type="number"
            value={rules.dblOdaIlkCocukInd}
            onChange={(e) => updateField("dblOdaIlkCocukInd", e.target.value)}
            placeholder="Örn: 100"
            className="mt-1"
          />
        </div>

        {/* Dbl Odada İkinci 3-6,99 Çocuk İndirimi */}
        <div>
          <Label htmlFor="dblOdaIkinciCocukInd">Dbl Odada İkinci 3-6,99 Çocuk İndirimi (%)</Label>
          <Input
            id="dblOdaIkinciCocukInd"
            type="number"
            value={rules.dblOdaIkinciCocukInd}
            onChange={(e) => updateField("dblOdaIkinciCocukInd", e.target.value)}
            placeholder="Örn: 50"
            className="mt-1"
          />
        </div>

        {/* Dbl Odada İlk 7-11,99 Çocuk İndirimi */}
        <div>
          <Label htmlFor="dblOdaIlk7_11CocukInd">Dbl Odada İlk 7-11,99 Çocuk İndirimi (%)</Label>
          <Input
            id="dblOdaIlk7_11CocukInd"
            type="number"
            value={rules.dblOdaIlk7_11CocukInd}
            onChange={(e) => updateField("dblOdaIlk7_11CocukInd", e.target.value)}
            placeholder="Örn: 50"
            className="mt-1"
          />
        </div>

        {/* Realise Date */}
        <div>
          <Label htmlFor="realiseDate">Realise Date</Label>
          <Input
            id="realiseDate"
            type="number"
            value={rules.realiseDate}
            onChange={(e) => updateField("realiseDate", e.target.value)}
            placeholder="Örn: 3"
            className="mt-1"
          />
        </div>

        {/* İşaretlenen Oda Tiplerine Kişi Sayısından Bağımsız Oda Fiyatı */}
        <div className="md:col-span-2">
          <Label htmlFor="odaTipiBagimsizFiyat">
            İşaretlenen Oda Tiplerine Kişi Sayısından Bağımsız Oda Fiyatı
          </Label>
          <Input
            id="odaTipiBagimsizFiyat"
            value={rules.odaTipiBagimsizFiyat}
            onChange={(e) => updateField("odaTipiBagimsizFiyat", e.target.value)}
            placeholder="Örn: Suit"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  )
}

