"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Hotel, UtensilsCrossed } from "lucide-react"

interface TypeSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: "HOTEL" | "RESTAURANT") => void
}

export default function TypeSelectionDialog({
  isOpen,
  onClose,
  onSelect
}: TypeSelectionDialogProps) {
  const [selectedType, setSelectedType] = useState<"HOTEL" | "RESTAURANT" | null>(null)

  const handleSelect = (type: "HOTEL" | "RESTAURANT") => {
    setSelectedType(type)
  }

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType)
      setSelectedType(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bilgi Bankası Tipi Seçin</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleSelect("HOTEL")}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedType === "HOTEL"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50/50"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <Hotel size={48} className={selectedType === "HOTEL" ? "text-purple-600" : "text-gray-400"} />
                <span className={`font-semibold ${selectedType === "HOTEL" ? "text-purple-700" : "text-gray-700"}`}>
                  Otel
                </span>
                <p className="text-xs text-gray-500 text-center">
                  Oda ve rezervasyon yönetimi için
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelect("RESTAURANT")}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedType === "RESTAURANT"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50/50"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <UtensilsCrossed size={48} className={selectedType === "RESTAURANT" ? "text-purple-600" : "text-gray-400"} />
                <span className={`font-semibold ${selectedType === "RESTAURANT" ? "text-purple-700" : "text-gray-700"}`}>
                  Restoran
                </span>
                <p className="text-xs text-gray-500 text-center">
                  Sipariş ve menü yönetimi için
                </p>
              </div>
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedType}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Devam Et
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

