"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/settings/profile-form"

export const dynamic = "force-dynamic"

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const [settings, setSettings] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    retellApiKey: "",
    retellWebhookSecret: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
  }, [status])

  useEffect(() => {
    if (session?.user.role !== "ADMIN") {
      return
    }

    loadSettings()
  }, [session])

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings")
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      } else {
        throw new Error("Failed to load settings")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const payload: any = {}

      // Only include fields that have values
      if (formData.retellApiKey.trim()) {
        payload.retellApiKey = formData.retellApiKey.trim()
      }
      if (formData.retellWebhookSecret.trim()) {
        payload.retellWebhookSecret = formData.retellWebhookSecret.trim()
      }

      if (Object.keys(payload).length === 0) {
        setError("Güncellemek için en az bir değer girin")
        setIsSaving(false)
        return
      }

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update settings")
      }

      const data = await response.json()
      setSettings(data.settings)
      setSuccess("Ayarlar başarıyla güncellendi!")
      setFormData({ retellApiKey: "", retellWebhookSecret: "" })

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (status === "loading" || isLoading) {
    return <div className="p-8">Yükleniyor...</div>
  }

  if (!session || session.user.role !== "ADMIN") {
    return null
  }

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Ayarlar</h1>
        <p className="text-gray-600 mt-1">Organizasyon API anahtarları ve yapılandırmayı yönetin</p>
      </div>

      <section>
        <ProfileForm />
      </section>

      <section className="space-y-6 pt-6 border-t border-gray-200">
        <h2 className="text-2xl font-bold">Organizasyon Ayarları</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Organization Info */}
        {settings && (
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Organizasyon Bilgileri</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">İsim:</span>
                <p className="font-medium">{settings.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Slug:</span>
                <p className="font-mono text-sm">{settings.slug}</p>
              </div>
            </div>
          </div>
        )}

        {/* Current API Keys Status */}
        {settings && (
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Mevcut API Yapılandırması</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="text-sm font-medium">Retell API Anahtarı:</span>
                  <p className="text-xs text-gray-600 mt-1">
                    {settings.hasRetellApiKey ? (
                      <span className="font-mono">{settings.retellApiKey}</span>
                    ) : (
                      <span className="text-gray-400">Yapılandırılmamış</span>
                    )}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-xs font-medium ${settings.hasRetellApiKey
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                    }`}
                >
                  {settings.hasRetellApiKey ? "Yapılandırıldı" : "Eksik"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="text-sm font-medium">Webhook Gizli Anahtarı:</span>
                  <p className="text-xs text-gray-600 mt-1">
                    {settings.hasWebhookSecret ? (
                      <span className="font-mono">{settings.retellWebhookSecret}</span>
                    ) : (
                      <span className="text-gray-400">Yapılandırılmamış</span>
                    )}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-xs font-medium ${settings.hasWebhookSecret
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                    }`}
                >
                  {settings.hasWebhookSecret ? "Yapılandırıldı" : "Eksik"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Update Form */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">API Anahtarlarını Güncelle</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Retell API Anahtarı
                <span className="text-xs text-gray-500 ml-2">(key_ ile başlar)</span>
              </label>
              <input
                type="password"
                value={formData.retellApiKey}
                onChange={(e) => setFormData({ ...formData, retellApiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="key_..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Mevcut anahtarı korumak için boş bırakın. Güncellemek için yeni anahtar girin.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Retell Webhook Gizli Anahtarı
                <span className="text-xs text-gray-500 ml-2">(opsiyonel)</span>
              </label>
              <input
                type="password"
                value={formData.retellWebhookSecret}
                onChange={(e) => setFormData({ ...formData, retellWebhookSecret: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="whsec_..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Webhook imza doğrulaması için kullanılır. Mevcut olanı korumak için boş bırakın.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {isSaving ? "Kaydediliyor..." : "Ayarları Güncelle"}
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Retell API Anahtarınızı nasıl alırsınız:</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li><a href="https://app.retellai.com" target="_blank" className="underline">Retell Kontrol Paneli</a>'ne gidin</li>
            <li>Ayarlar → API Anahtarları'na gidin</li>
            <li>Yeni bir API anahtarı oluşturun veya mevcut olanı kopyalayın</li>
            <li>Anahtarı buraya yapıştırın (key_ ile başlar)</li>
          </ol>
        </div>
      </section>
    </div>
  )
}
