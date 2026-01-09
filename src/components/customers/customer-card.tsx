"use client"

import { useState } from "react"
import Link from "next/link"
import { User } from "@prisma/client"
import ResetPasswordDialog from "./reset-password-dialog"

interface CustomerCardProps {
  customer: User & {
    assignedBotsCount?: number
    callsCount?: number
  }
  onDelete?: (customerId: string) => void
}

export default function CustomerCard({ customer, onDelete }: CustomerCardProps) {
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{customer.name || "Unnamed"}</h3>
          <p className="text-sm text-gray-600 mt-1">{customer.email}</p>
          {customer.customerType && (
            <p className="text-xs text-gray-500 mt-1">
              {customer.customerType === "RESTAURANT" ? "🍔 Restoran" : "🏨 Otel"}
            </p>
          )}
        </div>
        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
          Müşteri
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex justify-between">
          <span>Atanan Asistanlar:</span>
          <span className="font-medium">{customer.assignedBotsCount || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Toplam Görüşme:</span>
          <span className="font-medium">{customer.callsCount || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Kayıt Tarihi:</span>
          <span className="font-medium">
            {new Date(customer.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href={`/admin/customers/${customer.id}`}
          className="text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Detaylar
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => setIsResetPasswordOpen(true)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
          >
            Şifre Sıfırla
          </button>
          <button
            onClick={() => onDelete?.(customer.id)}
            className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors text-sm"
          >
            Sil
          </button>
        </div>
      </div>

      <ResetPasswordDialog
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        customerId={customer.id}
        customerName={customer.name || customer.email}
      />
    </div>
  )
}
