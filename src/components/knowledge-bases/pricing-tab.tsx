"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import DailyRatesTab from "./daily-rates-tab"
import PricingRulesTab from "./pricing-rules-tab"
import DiscountsTable from "./discounts-table"
import PricingPromptTab from "./pricing-prompt-tab"
import type { RoomType } from "./room-types-table"

export interface DailyRate {
  date: string
  availableRooms: string
  ppPrice: string
  single: string
  dbl: string
  triple: string
}

interface PricingData {
  dailyRatesByRoomType?: Record<string, DailyRate[]>
  rules: {
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
  discounts: Array<{
    id: string
    aksiyonAdi: string
    indirimOrani: string
    satisTarihiBaslangic: string
    satisTarihiBitis: string
    konaklamaTarihiBaslangic: string
    konaklamaTarihiBitis: string
    odaTipi: string
  }>
  pricingPrompt: string
}

interface PricingTabProps {
  pricing: PricingData
  roomTypes: RoomType[]
  onChange: (pricing: PricingData) => void
}

export default function PricingTab({
  pricing,
  roomTypes = [],
  onChange
}: PricingTabProps) {
  const dailyRatesByRoomType = pricing.dailyRatesByRoomType || {}

  return (
    <Tabs defaultValue="daily-rates" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="daily-rates">Günlük Fiyatlar</TabsTrigger>
        <TabsTrigger value="rules">Fiyat Kuralları</TabsTrigger>
        <TabsTrigger value="discounts">İndirimler</TabsTrigger>
        <TabsTrigger value="pricing-prompt">Fiyat Hesaplama Prompt</TabsTrigger>
      </TabsList>

      <TabsContent value="daily-rates" className="mt-0">
        <DailyRatesTab
          roomTypes={roomTypes}
          dailyRatesByRoomType={dailyRatesByRoomType}
          onChange={(dailyRatesByRoomType) =>
            onChange({ ...pricing, dailyRatesByRoomType })
          }
        />
      </TabsContent>

      <TabsContent value="rules" className="mt-0">
        <PricingRulesTab
          rules={pricing.rules}
          onChange={(rules) =>
            onChange({ ...pricing, rules })
          }
        />
      </TabsContent>

      <TabsContent value="discounts" className="mt-0">
        <DiscountsTable
          discounts={pricing.discounts}
          onChange={(discounts) =>
            onChange({ ...pricing, discounts })
          }
        />
      </TabsContent>

      <TabsContent value="pricing-prompt" className="mt-0">
        <PricingPromptTab
          pricingPrompt={pricing.pricingPrompt || ""}
          onChange={(pricingPrompt) =>
            onChange({ ...pricing, pricingPrompt })
          }
        />
      </TabsContent>
    </Tabs>
  )
}

