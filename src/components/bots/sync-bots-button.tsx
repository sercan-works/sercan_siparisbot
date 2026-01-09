"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"

export default function SyncBotsButton({ onSuccess }: { onSuccess: () => void }) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    if (!confirm("Bu işlem Retell AI'dan tüm asistanları içe aktaracak. Devam edilsin mi?")) {
      return
    }

    setIsSyncing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/bots/sync", {
        method: "POST"
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || "Asistanlar senkronize edilemedi")
      }

      setResult(data.results)
      alert(`✅ ${data.message}\n\n` +
        `Oluşturulan: ${data.results.created}\n` +
        `Güncellenen: ${data.results.updated}\n` +
        `Atlanan: ${data.results.skipped}` +
        (data.results.errors.length > 0 ? `\n\nHatalar:\n${data.results.errors.join('\n')}` : '')
      )

      // Refresh the page to show new bots
      onSuccess()
    } catch (err: any) {
      console.error("Sync error:", err)
      setError(err.message)
      alert(`❌ Hata: ${err.message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Retell AI'dan asistanları içe aktar"
    >
      <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
      {isSyncing ? "Senkronize Ediliyor..." : "Retell'den Senkronize Et"}
    </button>
  )
}
