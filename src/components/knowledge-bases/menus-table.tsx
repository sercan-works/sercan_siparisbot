"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

export interface Menu {
  id: string
  menuAdi: string
  servisSekli: string
  servisAlani: string
  fiyat: string
}

interface MenusTableProps {
  menus: Menu[]
  onChange: (menus: Menu[]) => void
}

export default function MenusTable({
  menus,
  onChange
}: MenusTableProps) {
  // menus undefined veya null ise boş array kullan
  const safeMenus = menus || []

  const addMenu = () => {
    const newMenu: Menu = {
      id: Date.now().toString(),
      menuAdi: "",
      servisSekli: "",
      servisAlani: "",
      fiyat: ""
    }
    onChange([...safeMenus, newMenu])
  }

  const removeMenu = (id: string) => {
    onChange(safeMenus.filter((m) => m.id !== id))
  }

  const updateMenu = (id: string, field: keyof Menu, value: string) => {
    onChange(
      safeMenus.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Menüler</h3>
          <p className="text-sm text-gray-500 mt-1">
            Otel menülerini ve fiyatlarını tanımlayın
          </p>
        </div>
        <Button type="button" onClick={addMenu} variant="outline" size="sm">
          <Plus size={16} className="mr-2" />
          Menü Ekle
        </Button>
      </div>

      {safeMenus.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">Henüz menü eklenmemiş</p>
          <Button type="button" onClick={addMenu} variant="outline">
            <Plus size={16} className="mr-2" />
            Menü Ekle
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Menü Adı</TableHead>
                <TableHead className="min-w-[150px]">Servis Şekli</TableHead>
                <TableHead className="min-w-[150px]">Servis Alanı</TableHead>
                <TableHead className="min-w-[120px]">Fiyat</TableHead>
                <TableHead className="min-w-[80px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeMenus.map((menu) => (
                <TableRow key={menu.id}>
                  <TableCell>
                    <Input
                      value={menu.menuAdi}
                      onChange={(e) => updateMenu(menu.id, "menuAdi", e.target.value)}
                      placeholder="Örn: Kahvaltı Menüsü"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={menu.servisSekli}
                      onChange={(e) => updateMenu(menu.id, "servisSekli", e.target.value)}
                      placeholder="Örn: Açık Büfe, A la Carte"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={menu.servisAlani}
                      onChange={(e) => updateMenu(menu.id, "servisAlani", e.target.value)}
                      placeholder="Örn: Ana Restoran, Havuz Bar"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={menu.fiyat}
                      onChange={(e) => updateMenu(menu.id, "fiyat", e.target.value)}
                      placeholder="Örn: 150 TL, 25€"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMenu(menu.id)}
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
  )
}

