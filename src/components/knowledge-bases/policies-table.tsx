"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

interface Policy {
  id: string
  name: string
  detail: string
}

interface PoliciesTableProps {
  policies: Policy[]
  onChange: (policies: Policy[]) => void
}

export default function PoliciesTable({
  policies,
  onChange
}: PoliciesTableProps) {
  const addPolicy = () => {
    const newPolicy: Policy = {
      id: Date.now().toString(),
      name: "",
      detail: ""
    }
    onChange([...policies, newPolicy])
  }

  const removePolicy = (id: string) => {
    onChange(policies.filter((p) => p.id !== id))
  }

  const updatePolicy = (id: string, field: keyof Policy, value: string) => {
    onChange(
      policies.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Politikalar</h3>
          <p className="text-sm text-gray-500 mt-1">
            Otel politikalarını ve kurallarını tanımlayın
          </p>
        </div>
        <Button type="button" onClick={addPolicy} variant="outline" size="sm">
          <Plus size={16} className="mr-2" />
          Politika Ekle
        </Button>
      </div>

      {policies.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">Henüz politika eklenmemiş</p>
          <Button type="button" onClick={addPolicy} variant="outline">
            <Plus size={16} className="mr-2" />
            Politika Ekle
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Politika Adı</TableHead>
                <TableHead>Detay</TableHead>
                <TableHead className="min-w-[80px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell>
                    <Input
                      value={policy.name}
                      onChange={(e) => updatePolicy(policy.id, "name", e.target.value)}
                      placeholder="Örn: Evcil Hayvan Politikası"
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={policy.detail}
                      onChange={(e) => updatePolicy(policy.id, "detail", e.target.value)}
                      placeholder="Politika detayları"
                      className="w-full"
                      rows={2}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePolicy(policy.id)}
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

