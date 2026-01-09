"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

interface Discount {
  id: string
  aksiyonAdi: string
  indirimOrani: string
  satisTarihiBaslangic: string
  satisTarihiBitis: string
  konaklamaTarihiBaslangic: string
  konaklamaTarihiBitis: string
  odaTipi: string
}

interface DiscountsTableProps {
  discounts: Discount[]
  onChange: (discounts: Discount[]) => void
}

export default function DiscountsTable({
  discounts,
  onChange
}: DiscountsTableProps) {
  const addDiscount = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const newDiscount: Discount = {
      id: Date.now().toString(),
      aksiyonAdi: "",
      indirimOrani: "",
      satisTarihiBaslangic: "",
      satisTarihiBitis: "",
      konaklamaTarihiBaslangic: "",
      konaklamaTarihiBitis: "",
      odaTipi: ""
    }
    onChange([...discounts, newDiscount])
  }

  const removeDiscount = (id: string) => {
    onChange(discounts.filter((d) => d.id !== id))
  }

  const updateDiscount = (id: string, field: keyof Discount, value: string) => {
    onChange(
      discounts.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      )
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">İndirimler</h3>
          <p className="text-sm text-gray-500 mt-1">
            Özel indirim kampanyalarını tanımlayın
          </p>
        </div>
        <Button 
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            addDiscount(e)
          }} 
          variant="outline" 
          size="sm"
        >
          <Plus size={16} className="mr-2" />
          İndirim Ekle
        </Button>
      </div>

      {discounts.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">Henüz indirim eklenmemiş</p>
          <Button 
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              addDiscount(e)
            }} 
            variant="outline"
          >
            <Plus size={16} className="mr-2" />
            İndirim Ekle
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Aksiyon Adı</TableHead>
                <TableHead className="min-w-[120px]">İndirim Oranı (%)</TableHead>
                <TableHead className="min-w-[150px]">Satış Tarihi Başlangıç</TableHead>
                <TableHead className="min-w-[150px]">Satış Tarihi Bitiş</TableHead>
                <TableHead className="min-w-[150px]">Konaklama Tarihi Başlangıç</TableHead>
                <TableHead className="min-w-[150px]">Konaklama Tarihi Bitiş</TableHead>
                <TableHead className="min-w-[120px]">Oda Tipi</TableHead>
                <TableHead className="min-w-[80px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <Input
                      value={discount.aksiyonAdi}
                      onChange={(e) => updateDiscount(discount.id, "aksiyonAdi", e.target.value)}
                      placeholder="Örn: Erken Rez"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={discount.indirimOrani}
                      onChange={(e) => updateDiscount(discount.id, "indirimOrani", e.target.value)}
                      placeholder="%"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={discount.satisTarihiBaslangic}
                      onChange={(e) => updateDiscount(discount.id, "satisTarihiBaslangic", e.target.value)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={discount.satisTarihiBitis}
                      onChange={(e) => updateDiscount(discount.id, "satisTarihiBitis", e.target.value)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={discount.konaklamaTarihiBaslangic}
                      onChange={(e) => updateDiscount(discount.id, "konaklamaTarihiBaslangic", e.target.value)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={discount.konaklamaTarihiBitis}
                      onChange={(e) => updateDiscount(discount.id, "konaklamaTarihiBitis", e.target.value)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={discount.odaTipi}
                      onChange={(e) => updateDiscount(discount.id, "odaTipi", e.target.value)}
                      placeholder="Örn: Standart"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeDiscount(discount.id)
                      }}
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

