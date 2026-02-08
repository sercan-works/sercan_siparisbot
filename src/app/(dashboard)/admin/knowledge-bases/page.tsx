"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import HotelKnowledgeForm from "@/components/knowledge-bases/hotel-knowledge-form"
import RestaurantKnowledgeForm from "@/components/knowledge-bases/restaurant-knowledge-form"
import KnowledgeBasesTable from "@/components/knowledge-bases/knowledge-bases-table"
import DeleteKBDialog from "@/components/knowledge-bases/delete-kb-dialog"
import SyncKbButton from "@/components/knowledge-bases/sync-kb-button"

export const dynamic = "force-dynamic"

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
  assignedBot?: { id: string; name: string } | null
}

interface Customer {
  id: string
  name: string | null
  email: string
  customerType: "HOTEL" | "RESTAURANT" | null
}

interface BotOption {
  id: string
  name: string
}

export default function KnowledgeBasesPage() {
  const { data: session, status } = useSession()
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [bots, setBots] = useState<BotOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCustomerSelection, setShowCustomerSelection] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedType, setSelectedType] = useState<"HOTEL" | "RESTAURANT" | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editingKB, setEditingKB] = useState<KnowledgeBase | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; kb: { id: string; name: string } | null }>({
    isOpen: false,
    kb: null
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
  }, [status])

  useEffect(() => {
    if (session?.user.role === "ADMIN") {
      loadKnowledgeBases()
      loadCustomers()
      loadBots()
    }
  }, [session])

  const loadKnowledgeBases = async () => {
    try {
      const response = await fetch("/api/knowledge-bases")
      if (response.ok) {
        const data = await response.json()
        setKnowledgeBases(data.knowledgeBases)
      } else {
        throw new Error("Failed to load knowledge bases")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await fetch("/api/admin/customers")
      if (!response.ok) {
        throw new Error("Failed to load customers")
      }
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (err: any) {
      console.error("Error loading customers:", err)
    }
  }

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({ isOpen: true, kb: { id, name } })
  }

  const loadBots = async () => {
    try {
      const response = await fetch("/api/bots")
      if (!response.ok) throw new Error("Failed to load bots")
      const data = await response.json()
      const botList = (data.bots || []).map((b: any) => ({ id: b.id, name: b.name }))
      setBots(botList)
    } catch (err) {
      console.error("Error loading bots:", err)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.kb) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/knowledge-bases/${deleteDialog.kb.id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setKnowledgeBases(prev => prev.filter(kb => kb.id !== deleteDialog.kb!.id))
        setDeleteDialog({ isOpen: false, kb: null })
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete knowledge base")
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAssignChange = async (kb: KnowledgeBase, botId: string | null) => {
    try {
      const response = await fetch(`/api/knowledge-bases/${kb.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Atama güncellenemedi")
      }
      loadKnowledgeBases()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">Yükleniyor...</p>
            <p className="text-sm text-gray-500 mt-1">Bilgi bankaları getiriliyor</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== "ADMIN") {
    return null
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Bilgi Bankası</h1>
          <p className="text-gray-600 mt-1">
          Yapay zekâ ajanlarınız için belge koleksiyonlarını yönetin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncKbButton onSuccess={loadKnowledgeBases} />
          <button
            onClick={() => {
              setEditingKB(null)
              setSelectedCustomer(null)
              setSelectedType(null)
              setShowCustomerSelection(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Bilgi Bankası Oluştur
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <KnowledgeBasesTable
        knowledgeBases={knowledgeBases}
        bots={bots}
        onAssignChange={handleAssignChange}
        onEdit={(kb) => {
          setEditingKB(kb)
          const targetCustomer = kb.customer || customers.find(c => c.id === kb.customerId) || null
          setSelectedCustomer(targetCustomer || null)

          const deriveType = () => {
            try {
              if (kb.texts && kb.texts.length > 0) {
                const parsed = JSON.parse(kb.texts[0])
                if (parsed.type === "RESTAURANT") {
                  return "RESTAURANT" as const
                }
              }
            } catch {
              // ignore parse errors
            }
            return "HOTEL" as const
          }

          // Eğer müşteri zaten bağlıysa firma seçimini tekrar isteme
          if (targetCustomer) {
            setSelectedType(targetCustomer.customerType || deriveType())
            setShowCreateDialog(true)
            return
          }

          // customerId var ama müşteri objesi yoksa bile formu aç (tipi içerikten türet)
          if (kb.customerId) {
            setSelectedType(deriveType())
            setShowCreateDialog(true)
            return
          }

          // Müşteri hiç yoksa seçim dialogunu aç
          setSelectedType(deriveType())
          setShowCustomerSelection(true)
        }}
        onDelete={handleDeleteClick}
      />

      <CustomerSelectionDialog
        isOpen={showCustomerSelection}
        onClose={() => setShowCustomerSelection(false)}
        customers={customers}
        onSelect={(customer) => {
          setSelectedCustomer(customer)
          setSelectedType(customer.customerType || "HOTEL")
          setShowCustomerSelection(false)
          setShowCreateDialog(true)
        }}
      />

      {showCreateDialog && selectedType === "HOTEL" && (
        <HotelKnowledgeForm
          knowledgeBase={editingKB}
          customerId={selectedCustomer?.id || editingKB?.customerId}
          customerName={
            selectedCustomer?.name ||
            selectedCustomer?.email ||
            editingKB?.customer?.name ||
            editingKB?.customer?.email
          }
          onClose={() => {
            setShowCreateDialog(false)
            setEditingKB(null)
            setSelectedType(null)
            setSelectedCustomer(null)
          }}
          onSuccess={() => {
            setShowCreateDialog(false)
            setEditingKB(null)
            setSelectedType(null)
            setSelectedCustomer(null)
            loadKnowledgeBases()
          }}
        />
      )}

      {showCreateDialog && selectedType === "RESTAURANT" && (
        <RestaurantKnowledgeForm
          knowledgeBase={editingKB}
          customerId={selectedCustomer?.id || editingKB?.customerId}
          customerName={
            selectedCustomer?.name ||
            selectedCustomer?.email ||
            editingKB?.customer?.name ||
            editingKB?.customer?.email
          }
          onClose={() => {
            setShowCreateDialog(false)
            setEditingKB(null)
            setSelectedType(null)
            setSelectedCustomer(null)
          }}
          onSuccess={() => {
            setShowCreateDialog(false)
            setEditingKB(null)
            setSelectedType(null)
            setSelectedCustomer(null)
            loadKnowledgeBases()
          }}
        />
      )}

      <DeleteKBDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, kb: null })}
        onConfirm={handleDeleteConfirm}
        knowledgeBaseName={deleteDialog.kb?.name || ""}
        isDeleting={isDeleting}
      />
    </div>
  )
}

interface CustomerSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  customers: Customer[]
  onSelect: (customer: Customer) => void
}

function CustomerSelectionDialog({
  isOpen,
  onClose,
  customers,
  onSelect
}: CustomerSelectionDialogProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Firma Seçin</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">Bilgi bankasını hangi müşteri için oluşturmak istediğinizi seçin.</p>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {customers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => setSelectedCustomerId(customer.id)}
              className={`w-full text-left p-4 border rounded-lg transition-colors ${
                selectedCustomerId === customer.id
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{customer.name || customer.email}</p>
                  <p className="text-xs text-gray-500 font-mono">{customer.id}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    customer.customerType === "RESTAURANT"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {customer.customerType === "RESTAURANT" ? "Restoran" : "Otel"}
                </span>
              </div>
            </button>
          ))}
          {customers.length === 0 && (
            <div className="text-sm text-gray-500">Bu organizasyonda müşteri bulunamadı.</div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={!selectedCustomer}
            onClick={() => {
              if (selectedCustomer) {
                onSelect(selectedCustomer)
                setSelectedCustomerId("")
              }
            }}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            Devam Et
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface KnowledgeBaseDialogProps {
  knowledgeBase: KnowledgeBase | null
  onClose: () => void
  onSuccess: () => void
}

function KnowledgeBaseDialog({ knowledgeBase, onClose, onSuccess }: KnowledgeBaseDialogProps) {
  const [formData, setFormData] = useState({
    name: knowledgeBase?.name || "",
    texts: knowledgeBase?.texts.join("\n\n---\n\n") || ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const texts = formData.texts
        .split(/\n\n---\n\n/)
        .map(t => t.trim())
        .filter(t => t.length > 0)

      if (texts.length === 0) {
        throw new Error("At least one text chunk is required")
      }

      const payload = {
        name: formData.name,
        texts,
        enableAutoRefresh: false
      }

      const url = knowledgeBase
        ? `/api/knowledge-bases/${knowledgeBase.id}`
        : "/api/knowledge-bases"

      const response = await fetch(url, {
        method: knowledgeBase ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save knowledge base")
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">
            {knowledgeBase ? "Edit Knowledge Base" : "Create Knowledge Base"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Customer Support KB"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Text Chunks <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Separate multiple text chunks with <code className="bg-gray-100 px-1 py-0.5 rounded">---</code> on a new line
            </p>
            <textarea
              required
              value={formData.texts}
              onChange={(e) => setFormData({ ...formData, texts: e.target.value })}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Our business hours are Monday to Friday, 9 AM to 5 PM.

---

We offer free shipping on orders over $50.

---

Returns are accepted within 30 days of purchase."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.texts.split(/\n\n---\n\n/).filter(t => t.trim().length > 0).length} chunk(s)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : knowledgeBase ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
