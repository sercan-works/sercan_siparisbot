"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

export interface MenuItem {
  id: string
  ad: string
  icindekiler: string
  fiyat: string
}

export interface RestaurantMenus {
  yiyecek: MenuItem[]
  icecek: MenuItem[]
  tatli: MenuItem[]
  diyet: MenuItem[]
  minimumTutar: string
}

interface RestaurantMenusTabProps {
  menus: RestaurantMenus
  onChange: (menus: RestaurantMenus) => void
}

const menuCategories = [
  { key: "yiyecek" as const, label: "Yiyecek Menüsü" },
  { key: "icecek" as const, label: "İçecek Menüsü" },
  { key: "tatli" as const, label: "Tatlı Menüsü" },
  { key: "diyet" as const, label: "Diyet Menüler" }
] as const

export default function RestaurantMenusTab({
  menus,
  onChange
}: RestaurantMenusTabProps) {
  const addMenuItem = (category: keyof RestaurantMenus) => {
    if (category === "minimumTutar") return
    
    const newItem: MenuItem = {
      id: Date.now().toString(),
      ad: "",
      icindekiler: "",
      fiyat: ""
    }
    onChange({
      ...menus,
      [category]: [...menus[category], newItem]
    })
  }

  const removeMenuItem = (category: keyof RestaurantMenus, id: string) => {
    if (category === "minimumTutar") return
    
    onChange({
      ...menus,
      [category]: menus[category].filter((item) => item.id !== id)
    })
  }

  const updateMenuItem = (category: keyof RestaurantMenus, id: string, field: keyof MenuItem, value: string) => {
    if (category === "minimumTutar") return
    
    onChange({
      ...menus,
      [category]: menus[category].map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    })
  }

  return (
    <div className="space-y-6">
      {/* Minimum Tutar */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <Label htmlFor="minimumTutar" className="text-base font-semibold">
          Paket Siparişi için Minimum Tutar
        </Label>
        <Input
          id="minimumTutar"
          value={menus.minimumTutar}
          onChange={(e) => onChange({ ...menus, minimumTutar: e.target.value })}
          placeholder="Örn: 100 TL"
          className="mt-2 max-w-xs"
        />
      </div>

      {/* Menü Kategorileri */}
      {menuCategories.map((category) => (
        <div key={category.key} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{category.label}</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addMenuItem(category.key)}
            >
              <Plus size={16} className="mr-2" />
              {category.label} Ekle
            </Button>
          </div>

          {menus[category.key].length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-gray-500 mb-4">Henüz {category.label.toLowerCase()} eklenmemiş</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => addMenuItem(category.key)}
              >
                <Plus size={16} className="mr-2" />
                İlk {category.label} Ekle
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">{category.label}</TableHead>
                    <TableHead>İçindekiler</TableHead>
                    <TableHead className="min-w-[120px]">Fiyat</TableHead>
                    <TableHead className="min-w-[80px]">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menus[category.key].map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.ad}
                          onChange={(e) => updateMenuItem(category.key, item.id, "ad", e.target.value)}
                          placeholder={`${category.label} adı`}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.icindekiler}
                          onChange={(e) => updateMenuItem(category.key, item.id, "icindekiler", e.target.value)}
                          placeholder="İçindekiler"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={item.fiyat}
                          onChange={(e) => updateMenuItem(category.key, item.id, "fiyat", e.target.value)}
                          placeholder="Fiyat"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMenuItem(category.key, item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

