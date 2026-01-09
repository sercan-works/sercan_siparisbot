"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"

interface ServicesTabProps {
  services: {
    free: string[]
    paid: string[]
  }
  onChange: (services: { free: string[]; paid: string[] }) => void
}

export default function ServicesTab({
  services,
  onChange
}: ServicesTabProps) {
  const addService = (type: "free" | "paid") => {
    const newService = ""
    onChange({
      ...services,
      [type]: [...services[type], newService]
    })
  }

  const removeService = (type: "free" | "paid", index: number) => {
    onChange({
      ...services,
      [type]: services[type].filter((_, i) => i !== index)
    })
  }

  const updateService = (type: "free" | "paid", index: number, value: string) => {
    const updated = [...services[type]]
    updated[index] = value
    onChange({
      ...services,
      [type]: updated
    })
  }

  return (
    <div className="space-y-8">
      {/* Ücretsiz Hizmetler */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Ücretsiz Hizmetler</h3>
            <p className="text-sm text-gray-500 mt-1">
              Müşterilere ücretsiz sunulan hizmetler
            </p>
          </div>
          <Button
            type="button"
            onClick={() => addService("free")}
            variant="outline"
            size="sm"
          >
            <Plus size={16} className="mr-2" />
            Hizmet Ekle
          </Button>
        </div>

        {services.free.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-gray-500 mb-4">Henüz hizmet eklenmemiş</p>
            <Button
              type="button"
              onClick={() => addService("free")}
              variant="outline"
            >
              <Plus size={16} className="mr-2" />
              Hizmet Ekle
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {services.free.map((service, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={service}
                  onChange={(e) => updateService("free", index, e.target.value)}
                  placeholder="Örn: Wifi, Otopark"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeService("free", index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => addService("free")}
              variant="outline"
              size="sm"
              className="w-full mt-2"
            >
              <Plus size={16} className="mr-2" />
              Hizmet Ekle
            </Button>
          </div>
        )}
      </div>

      {/* Ücretli Hizmetler */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Ücretli Hizmetler</h3>
            <p className="text-sm text-gray-500 mt-1">
              Müşterilere ücretli sunulan hizmetler
            </p>
          </div>
          <Button
            type="button"
            onClick={() => addService("paid")}
            variant="outline"
            size="sm"
          >
            <Plus size={16} className="mr-2" />
            Hizmet Ekle
          </Button>
        </div>

        {services.paid.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-gray-500 mb-4">Henüz hizmet eklenmemiş</p>
            <Button
              type="button"
              onClick={() => addService("paid")}
              variant="outline"
            >
              <Plus size={16} className="mr-2" />
              Hizmet Ekle
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {services.paid.map((service, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={service}
                  onChange={(e) => updateService("paid", index, e.target.value)}
                  placeholder="Örn: Çamaşırhane, Oda servisi"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeService("paid", index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => addService("paid")}
              variant="outline"
              size="sm"
              className="w-full mt-2"
            >
              <Plus size={16} className="mr-2" />
              Hizmet Ekle
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

