"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle } from "lucide-react"

interface PricingPromptTabProps {
  pricingPrompt: string
  onChange: (pricingPrompt: string) => void
}

export default function PricingPromptTab({
  pricingPrompt,
  onChange
}: PricingPromptTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Fiyat Hesaplama Prompt</h3>
        <p className="text-sm text-gray-500 mt-1">
          Bot'un fiyat hesaplaması yaparken kullanacağı talimatları buradan düzenleyebilirsiniz.
        </p>
      </div>

      {/* Uyarı Mesajı */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900 mb-1">
            ⚠️ ÖNEMLİ
          </p>
          <p className="text-sm text-amber-800">
            Bu prompt'ta yapılan değişiklikler fiyat hesaplama sonuçlarını etkileyebilir. Prompt'u değiştirdikten sonra mutlaka test ediniz ve bot'un doğru fiyat hesapladığından emin olunuz.
          </p>
        </div>
      </div>

      {/* Textarea */}
      <div>
        <Label htmlFor="pricing-prompt">
          Prompt Metni
        </Label>
        <Textarea
          id="pricing-prompt"
          value={pricingPrompt}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Fiyat hesaplama prompt'u buraya yazılacak..."
          className="mt-2 min-h-[500px] font-mono text-sm"
          rows={25}
        />
        <p className="text-xs text-gray-500 mt-2">
          Bu prompt, Retell botuna fiyat hesaplama talimatlarını verir. Dikkatli düzenleyiniz.
        </p>
      </div>
    </div>
  )
}

