"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Settings2, X } from "lucide-react"

export interface RoomType {
  id: string
  name: string
  adet: string
  maxKisi: string
  metrekare: string
  banyoSayisi: string
  balkon: string
  manzara: string
  yatakTipi: string
  yatakSayisi: string
  bukletler: string
  minibar: string
  kettle: string
  kahveMak: string
  jakuzi: string
  fonMak: string
  bornoz: string
  tvTelefon: string
  klima: string
  safeBox: string
  utu: string
  mutfak: string
  // Dinamik özellikler: key-value çiftleri
  customFeatures: Record<string, string>
}

interface RoomTypesTableProps {
  roomTypes: RoomType[]
  onChange: (roomTypes: RoomType[]) => void
}

const defaultRoomType: Omit<RoomType, "id"> = {
  name: "",
  adet: "",
  maxKisi: "",
  metrekare: "",
  banyoSayisi: "",
  balkon: "",
  manzara: "",
  yatakTipi: "",
  yatakSayisi: "",
  bukletler: "",
  minibar: "",
  kettle: "",
  kahveMak: "",
  jakuzi: "",
  fonMak: "",
  bornoz: "",
  tvTelefon: "",
  klima: "",
  safeBox: "",
  utu: "",
  mutfak: "",
  customFeatures: {}
}

const roomTypeFields: Array<{ key: keyof RoomType; label: string; type?: "text" | "number" }> = [
  { key: "name", label: "Oda Tipi Adı", type: "text" },
  { key: "adet", label: "Adet", type: "number" },
  { key: "maxKisi", label: "Max Kişi", type: "number" },
  { key: "metrekare", label: "Metrekare", type: "number" },
  { key: "banyoSayisi", label: "Banyo Sayısı", type: "number" },
  { key: "balkon", label: "Balkon", type: "text" },
  { key: "manzara", label: "Manzara", type: "text" },
  { key: "yatakTipi", label: "Yatak Tipi", type: "text" },
  { key: "yatakSayisi", label: "Yatak Sayısı", type: "number" },
  { key: "bukletler", label: "Bukletler", type: "text" },
  { key: "minibar", label: "Minibar", type: "text" },
  { key: "kettle", label: "Kettle", type: "text" },
  { key: "kahveMak", label: "Kahve Mak.", type: "text" },
  { key: "jakuzi", label: "Jakuzi", type: "text" },
  { key: "fonMak", label: "Fön Mak.", type: "text" },
  { key: "bornoz", label: "Bornoz", type: "text" },
  { key: "tvTelefon", label: "TV-Telefon", type: "text" },
  { key: "klima", label: "Klima", type: "text" },
  { key: "safeBox", label: "Safe Box", type: "text" },
  { key: "utu", label: "Ütü", type: "text" },
  { key: "mutfak", label: "Mutfak", type: "text" }
]

export default function RoomTypesTable({
  roomTypes,
  onChange
}: RoomTypesTableProps) {
  const [showAddFeatureDialog, setShowAddFeatureDialog] = useState(false)
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null)
  const [newFeatureName, setNewFeatureName] = useState("")
  const [allCustomFeatures, setAllCustomFeatures] = useState<Set<string>>(new Set())
  const isManuallyUpdating = useRef(false)

  // Tüm oda tiplerinden custom feature'ları topla
  // Sadece roomTypes değiştiğinde ve manuel güncelleme yapılmadığında güncelle
  useEffect(() => {
    // Eğer manuel güncelleme yapılıyorsa, useEffect'i atla
    if (isManuallyUpdating.current) {
      isManuallyUpdating.current = false
      return
    }

    const features = new Set<string>()
    roomTypes.forEach(rt => {
      Object.keys(rt.customFeatures || {}).forEach(key => features.add(key))
    })
    
    // Sadece gerçekten değişmişse güncelle
    const currentFeaturesArray = Array.from(allCustomFeatures).sort()
    const newFeaturesArray = Array.from(features).sort()
    
    if (currentFeaturesArray.length !== newFeaturesArray.length ||
        !currentFeaturesArray.every((val, idx) => val === newFeaturesArray[idx])) {
      setAllCustomFeatures(features)
    }
  }, [roomTypes])

  const addRoomType = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const newRoomType: RoomType = {
      id: Date.now().toString(),
      ...defaultRoomType
    }
    onChange([...roomTypes, newRoomType])
  }

  const removeRoomType = (id: string) => {
    onChange(roomTypes.filter((rt) => rt.id !== id))
  }

  const updateRoomType = (id: string, field: keyof RoomType, value: string | Record<string, string>) => {
    onChange(
      roomTypes.map((rt) =>
        rt.id === id ? { ...rt, [field]: value } : rt
      )
    )
  }

  const openAddFeatureDialog = (roomTypeId: string) => {
    setSelectedRoomTypeId(roomTypeId)
    setNewFeatureName("")
    setShowAddFeatureDialog(true)
  }

  const addCustomFeature = () => {
    if (!selectedRoomTypeId || !newFeatureName.trim()) return

    const roomType = roomTypes.find(rt => rt.id === selectedRoomTypeId)
    if (!roomType) return

    const featureKey = newFeatureName.trim().toLowerCase().replace(/\s+/g, "_")
    
    // Eğer bu özellik zaten varsa, sadece bu oda tipine ekle
    if (!roomType.customFeatures) {
      roomType.customFeatures = {}
    }
    
    if (!roomType.customFeatures[featureKey]) {
      roomType.customFeatures[featureKey] = ""
    }

    // Tüm oda tiplerine bu özelliği ekle (eğer yoksa)
    const updatedRoomTypes = roomTypes.map(rt => {
      if (!rt.customFeatures) {
        rt.customFeatures = {}
      }
      if (!rt.customFeatures[featureKey]) {
        rt.customFeatures[featureKey] = ""
      }
      return rt
    })

    // Manuel güncelleme flag'ini set et
    isManuallyUpdating.current = true
    
    onChange(updatedRoomTypes)
    setAllCustomFeatures(new Set([...allCustomFeatures, featureKey]))
    setShowAddFeatureDialog(false)
    setNewFeatureName("")
    setSelectedRoomTypeId(null)
  }

  const removeCustomFeature = (featureKey: string) => {
    // Manuel güncelleme flag'ini set et
    isManuallyUpdating.current = true
    
    // Önce allCustomFeatures state'inden kaldır (hemen görünür olması için)
    const newSet = new Set(allCustomFeatures)
    newSet.delete(featureKey)
    setAllCustomFeatures(newSet)
    
    // Sonra tüm oda tiplerinden bu özelliği kaldır
    const updatedRoomTypes = roomTypes.map(rt => {
      if (rt.customFeatures && rt.customFeatures[featureKey]) {
        const { [featureKey]: removed, ...rest } = rt.customFeatures
        return { ...rt, customFeatures: rest }
      }
      return rt
    })
    
    // RoomTypes'ı güncelle (useEffect atlanacak çünkü isManuallyUpdating.current = true)
    onChange(updatedRoomTypes)
  }

  const updateCustomFeature = (roomTypeId: string, featureKey: string, value: string) => {
    onChange(
      roomTypes.map((rt) => {
        if (rt.id === roomTypeId) {
          const customFeatures = { ...(rt.customFeatures || {}), [featureKey]: value }
          return { ...rt, customFeatures }
        }
        return rt
      })
    )
  }

  if (roomTypes.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-gray-500 mb-4">Henüz oda tipi eklenmemiş</p>
        <Button 
          type="button" 
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            addRoomType(e)
          }} 
          variant="outline"
        >
          <Plus size={16} className="mr-2" />
          Oda Tipi Ekle
        </Button>
      </div>
    )
  }

  const getFeatureLabel = (key: string) => {
    const defaultField = roomTypeFields.find(f => f.key === key)
    if (defaultField) return defaultField.label
    // Custom feature için key'i label'a çevir
    return key.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ")
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Oda Tipleri</h3>
          <p className="text-sm text-gray-500 mt-1">
            Her oda tipi için özellik ekleyebilirsiniz
          </p>
        </div>
        <Button 
          type="button" 
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            addRoomType(e)
          }} 
          variant="outline" 
          size="sm"
        >
          <Plus size={16} className="mr-2" />
          Oda Tipi Ekle
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Oda Tipi</TableHead>
              {roomTypeFields.slice(1).map((field) => (
                <TableHead key={field.key} className="min-w-[100px]">
                  {field.label}
                </TableHead>
              ))}
              {Array.from(allCustomFeatures).map((featureKey) => (
                <TableHead key={featureKey} className="min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <span>{getFeatureLabel(featureKey)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeCustomFeature(featureKey)
                      }}
                      className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                      title="Özelliği Kaldır"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                </TableHead>
              ))}
              <TableHead className="min-w-[120px]">Özellik Ekle</TableHead>
              <TableHead className="min-w-[80px]">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roomTypes.map((roomType) => (
              <TableRow key={roomType.id}>
                <TableCell>
                  <Input
                    value={roomType.name}
                    onChange={(e) => updateRoomType(roomType.id, "name", e.target.value)}
                    placeholder="Örn: Standart"
                    className="w-full"
                  />
                </TableCell>
                {roomTypeFields.slice(1).map((field) => (
                  <TableCell key={field.key}>
                    <Input
                      type={field.type || "text"}
                      value={(roomType[field.key] as string) || ""}
                      onChange={(e) => updateRoomType(roomType.id, field.key, e.target.value)}
                      placeholder={field.label}
                      className="w-full"
                    />
                  </TableCell>
                ))}
                {Array.from(allCustomFeatures).map((featureKey) => (
                  <TableCell key={featureKey}>
                    <Input
                      value={roomType.customFeatures?.[featureKey] || ""}
                      onChange={(e) => updateCustomFeature(roomType.id, featureKey, e.target.value)}
                      placeholder={getFeatureLabel(featureKey)}
                      className="w-full"
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openAddFeatureDialog(roomType.id)
                    }}
                    className="flex items-center gap-1"
                    title="Yeni Özellik Ekle"
                  >
                    <Settings2 size={14} />
                    <Plus size={14} />
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeRoomType(roomType.id)
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

      {/* Özellik Ekleme Dialog */}
      <Dialog 
        open={showAddFeatureDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddFeatureDialog(false)
            setNewFeatureName("")
            setSelectedRoomTypeId(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Özellik Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="featureName">
                Özellik Adı <span className="text-red-500">*</span>
              </Label>
              <Input
                id="featureName"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                placeholder="Örn: Wi-Fi Hızı, Oyun Konsolu"
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addCustomFeature()
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Bu özellik tüm oda tiplerine eklenecektir
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddFeatureDialog(false)
                setNewFeatureName("")
                setSelectedRoomTypeId(null)
              }}
            >
              İptal
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addCustomFeature()
              }}
              disabled={!newFeatureName.trim()}
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

