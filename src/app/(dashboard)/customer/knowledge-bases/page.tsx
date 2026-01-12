"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Loader2 } from "lucide-react"
import KnowledgeBasesTable from "@/components/knowledge-bases/knowledge-bases-table"
import DeleteKBDialog from "@/components/knowledge-bases/delete-kb-dialog"

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
}

export default function CustomerKnowledgeBasesPage() {
  const { data: session, status } = useSession()
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
    if (session?.user) {
      loadKnowledgeBases()
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

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({ isOpen: true, kb: { id, name } })
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

  if (!session) {
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
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <KnowledgeBasesTable
        knowledgeBases={knowledgeBases}
        onDelete={handleDeleteClick}
      />

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
