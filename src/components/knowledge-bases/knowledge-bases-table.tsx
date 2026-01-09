"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, X, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface KnowledgeBase {
  id: string
  name: string
  texts: string[]
  enableAutoRefresh: boolean
  retellKnowledgeBaseId: string
  createdAt: string
  updatedAt: string
  customerId?: string | null
  customer?: {
    id: string
    name: string | null
    email: string
    customerType: "HOTEL" | "RESTAURANT" | null
  } | null
  _count: {
    bots: number
  }
}

interface KnowledgeBasesTableProps {
  knowledgeBases: KnowledgeBase[]
  onEdit?: (kb: KnowledgeBase) => void
  onDelete?: (id: string, name: string) => void
  onAssign?: (kb: KnowledgeBase) => void
}

export default function KnowledgeBasesTable({
  knowledgeBases,
  onEdit,
  onDelete,
  onAssign
}: KnowledgeBasesTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [autoRefreshFilter, setAutoRefreshFilter] = useState<string>("all")
  const [botCountFilter, setBotCountFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Type bilgisini JSON'dan parse et
  const getKnowledgeBaseType = (kb: KnowledgeBase): "HOTEL" | "RESTAURANT" => {
    if (kb.customer?.customerType === "RESTAURANT") {
      return "RESTAURANT"
    }
    try {
      if (kb.texts && kb.texts.length > 0) {
        const parsed = JSON.parse(kb.texts[0])
        if (parsed.type === "RESTAURANT") {
          return "RESTAURANT"
        }
      }
    } catch (e) {
      // Parse edilemezse veya type yoksa default HOTEL
    }
    return "HOTEL"
  }

  const filteredKnowledgeBases = useMemo(() => {
    return knowledgeBases.filter((kb) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        kb.name.toLowerCase().includes(searchQuery.toLowerCase())

      // Auto refresh filter
      const matchesAutoRefresh =
        autoRefreshFilter === "all" ||
        (autoRefreshFilter === "enabled" && kb.enableAutoRefresh) ||
        (autoRefreshFilter === "disabled" && !kb.enableAutoRefresh)

      // Bot count filter
      const matchesBotCount =
        botCountFilter === "all" ||
        (botCountFilter === "with-bots" && kb._count.bots > 0) ||
        (botCountFilter === "no-bots" && kb._count.bots === 0)

      // Type filter
      const kbType = getKnowledgeBaseType(kb)
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "hotel" && kbType === "HOTEL") ||
        (typeFilter === "restaurant" && kbType === "RESTAURANT")

      return matchesSearch && matchesAutoRefresh && matchesBotCount && matchesType
    })
  }, [knowledgeBases, searchQuery, autoRefreshFilter, botCountFilter, typeFilter])

  const clearFilters = () => {
    setSearchQuery("")
    setAutoRefreshFilter("all")
    setBotCountFilter("all")
    setTypeFilter("all")
  }

  const hasActiveFilters =
    searchQuery !== "" || autoRefreshFilter !== "all" || botCountFilter !== "all" || typeFilter !== "all"

  // Always show table, even if empty

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="İsim veya ID ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={autoRefreshFilter} onValueChange={setAutoRefreshFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Auto Refresh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="enabled">Aktif</SelectItem>
              <SelectItem value="disabled">Pasif</SelectItem>
            </SelectContent>
          </Select>
          <Select value={botCountFilter} onValueChange={setBotCountFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Bot Sayısı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="with-bots">Bot Atanmış</SelectItem>
              <SelectItem value="no-bots">Bot Atanmamış</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Tür" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="hotel">Otel</SelectItem>
              <SelectItem value="restaurant">Restoran</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="whitespace-nowrap"
            >
              <X size={16} className="mr-2" />
              Filtreleri Temizle
            </Button>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {filteredKnowledgeBases.length} / {knowledgeBases.length} sonuç
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">İsim</TableHead>
              <TableHead className="min-w-[180px]">Firma</TableHead>
              <TableHead className="min-w-[100px]">Tür</TableHead>
              <TableHead className="min-w-[120px] hidden">Chunk Sayısı</TableHead>
              <TableHead className="min-w-[120px]">Bot Sayısı</TableHead>
              <TableHead className="min-w-[120px]">Auto Refresh</TableHead>
              <TableHead className="min-w-[150px]">Oluşturulma</TableHead>
              <TableHead className="min-w-[150px]">Güncelleme</TableHead>
              {(onEdit || onDelete || onAssign) && (
                <TableHead className="min-w-[160px] text-right">İşlemler</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {knowledgeBases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onEdit || onDelete || onAssign ? 8 : 7} className="text-center py-12 text-gray-500">
                  Henüz bilgi bankası yok
                </TableCell>
              </TableRow>
            ) : filteredKnowledgeBases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onEdit || onDelete || onAssign ? 8 : 7} className="text-center py-12 text-gray-500">
                  Filtrelere uygun bilgi bankası bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              filteredKnowledgeBases.map((kb) => {
                const kbType = getKnowledgeBaseType(kb)
                return (
                  <TableRow key={kb.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{kb.name}</TableCell>
                    <TableCell>
                      {kb.customer ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{kb.customer.name || kb.customer.email}</span>
                          <span className="text-xs text-gray-500 font-mono">{kb.customer.id}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Atanmamış</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={kbType === "RESTAURANT" ? "default" : "secondary"}
                        className={kbType === "RESTAURANT" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}
                      >
                        {kbType === "RESTAURANT" ? "Restoran" : "Otel"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden">
                      <Badge variant="secondary">{kb.texts.length}</Badge>
                    </TableCell>
                  <TableCell>
                    <Badge variant={kb._count.bots > 0 ? "default" : "outline"}>
                      {kb._count.bots}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={kb.enableAutoRefresh ? "default" : "outline"}
                      className={kb.enableAutoRefresh ? "bg-green-100 text-green-800" : ""}
                    >
                      {kb.enableAutoRefresh ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(kb.createdAt).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(kb.updatedAt).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })}
                  </TableCell>
                  {(onEdit || onDelete || onAssign) && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {onAssign && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAssign(kb)}
                            className="h-8 px-2 text-xs"
                            title="Asistana ata"
                          >
                            Ata
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(kb)}
                            className="h-8 w-8 p-0"
                            title="Düzenle"
                          >
                            <Edit size={16} />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(kb.id, kb.name)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

