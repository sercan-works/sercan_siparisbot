"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"

export default function SyncKbButton({ onSuccess }: { onSuccess: () => void }) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    if (!confirm("Retell'deki tüm asistanların KB atamalarını çekmek istiyor musunuz?")) {
      return
    }

    setIsSyncing(true)
    try {
      const response = await fetch("/api/knowledge-bases/sync", { method: "POST" })
      const data = await response.json()

      console.log("[KB Sync] response", data)

      if (!response.ok) {
        throw new Error(data.error || data.details || "Senkronizasyon başarısız")
      }

      const kbSummaryText = data.kbSummary
        ? `KB -> created: ${data.kbSummary.created}, updated: ${data.kbSummary.updated}`
        : ""
      const summaryText = data.assignmentSummary
        .map((s: any) =>
          `${s.botName} (${s.botId.slice(0, 6)}...): +${s.assignmentsCreated} / ↺${s.assignmentsUpdated}` +
          (s.missingKbIds.length ? `, eksik KB: ${s.missingKbIds.join(", ")}` : "")
        )
        .join("\n")

      alert(
        `✅ Senkron tamamlandı\n${kbSummaryText}\n\n${summaryText || "Atama kaydı bulunamadı"}`
      )
      onSuccess()
    } catch (err: any) {
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
      title="Retell'deki KB atamalarını içe aktar"
    >
      <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
      {isSyncing ? "Senkronize ediliyor..." : "Retell KB Senkronu"}
    </button>
  )
}
