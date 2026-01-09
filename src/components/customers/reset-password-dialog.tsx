"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface ResetPasswordDialogProps {
  isOpen: boolean
  onClose: () => void
  customerId: string
  customerName: string
}

export default function ResetPasswordDialog({
  isOpen,
  onClose,
  customerId,
  customerName,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor")
      return
    }

    if (newPassword.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/customers/${customerId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Şifre sıfırlama başarısız")
      }

      alert(`✅ ${customerName} kullanıcısının şifresi başarıyla sıfırlandı!`)
      setNewPassword("")
      setConfirmPassword("")
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Şifre Sıfırla</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          <strong>{customerName}</strong> için yeni şifre belirleyin
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Yeni Şifre *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="En az 8 karakter"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Şifre Tekrar *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Şifreyi tekrar girin"
              required
              minLength={8}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
