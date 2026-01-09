"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

interface FacilityFeature {
  id: string
  tesisTipi: string
  acilisKapanisSaatleri: string
  ozellikleriServisSekli: string
  kurallar: string
}

interface FacilityFeaturesTableProps {
  facilityFeatures: FacilityFeature[]
  onChange: (facilityFeatures: FacilityFeature[]) => void
}

export default function FacilityFeaturesTable({
  facilityFeatures,
  onChange
}: FacilityFeaturesTableProps) {
  const addFeature = () => {
    const newFeature: FacilityFeature = {
      id: Date.now().toString(),
      tesisTipi: "",
      acilisKapanisSaatleri: "",
      ozellikleriServisSekli: "",
      kurallar: ""
    }
    onChange([...facilityFeatures, newFeature])
  }

  const removeFeature = (id: string) => {
    onChange(facilityFeatures.filter((f) => f.id !== id))
  }

  const updateFeature = (id: string, field: keyof FacilityFeature, value: string) => {
    onChange(
      facilityFeatures.map((f) =>
        f.id === id ? { ...f, [field]: value } : f
      )
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Outletler</h3>
          <p className="text-sm text-gray-500 mt-1">
            Restoranlar, Barlar, Toplantı salonları, Spa, vb. outlet bilgilerini girin
          </p>
        </div>
        <Button onClick={addFeature} variant="outline" size="sm">
          <Plus size={16} className="mr-2" />
          Outlet Ekle
        </Button>
      </div>

      {facilityFeatures.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">Henüz tesis özelliği eklenmemiş</p>
          <Button onClick={addFeature} variant="outline">
            <Plus size={16} className="mr-2" />
            Outlet Ekle
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Tesis Tipi</TableHead>
                <TableHead className="min-w-[200px]">Açılış Kapanış Saatleri</TableHead>
                <TableHead className="min-w-[200px]">Özellikleri - Servis Şekli</TableHead>
                <TableHead className="min-w-[200px]">Kurallar</TableHead>
                <TableHead className="min-w-[80px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilityFeatures.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell>
                    <Input
                      value={feature.tesisTipi}
                      onChange={(e) => updateFeature(feature.id, "tesisTipi", e.target.value)}
                      placeholder="Örn: Restoranlar"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={feature.acilisKapanisSaatleri}
                      onChange={(e) => updateFeature(feature.id, "acilisKapanisSaatleri", e.target.value)}
                      placeholder="Örn: 08:00 - 22:00"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={feature.ozellikleriServisSekli}
                      onChange={(e) => updateFeature(feature.id, "ozellikleriServisSekli", e.target.value)}
                      placeholder="Özellikler ve servis şekli"
                      className="w-full"
                      rows={2}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={feature.kurallar}
                      onChange={(e) => updateFeature(feature.id, "kurallar", e.target.value)}
                      placeholder="Kurallar"
                      className="w-full"
                      rows={2}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(feature.id)}
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

