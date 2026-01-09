"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

export interface Campaign {
  id: string
  detay: string
}

interface RestaurantCampaignsTableProps {
  campaigns: Campaign[]
  onChange: (campaigns: Campaign[]) => void
}

export default function RestaurantCampaignsTable({
  campaigns,
  onChange
}: RestaurantCampaignsTableProps) {
  const safeCampaigns = campaigns || []

  const addCampaign = () => {
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      detay: ""
    }
    onChange([...safeCampaigns, newCampaign])
  }

  const removeCampaign = (id: string) => {
    onChange(safeCampaigns.filter((c) => c.id !== id))
  }

  const updateCampaign = (id: string, field: keyof Campaign, value: string) => {
    onChange(
      safeCampaigns.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Kampanyalar</h3>
          <p className="text-sm text-gray-500 mt-1">
            Özel kampanya ve promosyonları tanımlayın
          </p>
        </div>
        <Button type="button" onClick={addCampaign} variant="outline" size="sm">
          <Plus size={16} className="mr-2" />
          Kampanya Ekle
        </Button>
      </div>

      {safeCampaigns.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">Henüz kampanya eklenmemiş</p>
          <Button type="button" onClick={addCampaign} variant="outline">
            <Plus size={16} className="mr-2" />
            Kampanya Ekle
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampanya Detayı</TableHead>
                <TableHead className="min-w-[80px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Input
                      value={campaign.detay}
                      onChange={(e) => updateCampaign(campaign.id, "detay", e.target.value)}
                      placeholder="Örn: İki al Bir öde, Tatlı ikram vb"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCampaign(campaign.id)}
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

