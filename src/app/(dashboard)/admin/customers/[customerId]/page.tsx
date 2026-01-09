import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatDate, formatDuration } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function CustomerDetailsPage({
  params,
}: {
  params: { customerId: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const customer = await prisma.user.findFirst({
    where: {
      id: params.customerId,
      organizationId: session.user.organizationId,
      role: "CUSTOMER"
    },
    include: {
      assignedBots: {
        include: {
          bot: {
            select: {
              id: true,
              name: true,
              description: true,
              isActive: true
            }
          }
        }
      },
      initiatedCalls: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          bot: { select: { name: true } },
          analytics: true
        }
      }
    }
  })

  if (!customer) {
    notFound()
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin/customers"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Müşterilere Dön
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{customer.name || "İsimsiz Müşteri"}</h1>
            <p className="text-gray-600 mt-1">{customer.email}</p>
          </div>
          <span className="px-3 py-2 text-sm rounded bg-blue-100 text-blue-800">
            Müşteri
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Atanmış Asistanlar</h3>
          <p className="text-3xl font-bold">{customer.assignedBots.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Toplam Görüşmeler</h3>
          <p className="text-3xl font-bold">{customer.initiatedCalls.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Üyelik Tarihi</h3>
          <p className="text-lg font-semibold">{formatDate(customer.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Atanmış Asistanlar</h2>
          {customer.assignedBots.length === 0 ? (
            <p className="text-gray-500">Henüz asistan atanmamış</p>
          ) : (
            <div className="space-y-3">
              {customer.assignedBots.map((assignment) => (
                <div key={assignment.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{assignment.bot.name}</p>
                      {assignment.bot.description && (
                        <p className="text-sm text-gray-600">{assignment.bot.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        assignment.bot.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {assignment.bot.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Hesap Bilgileri</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">E-posta:</span>
              <p className="font-medium">{customer.email}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">İsim:</span>
              <p className="font-medium">{customer.name || "Belirlenmemiş"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Kullanıcı ID:</span>
              <p className="font-mono text-sm">{customer.id}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Oluşturulma:</span>
              <p className="font-medium">{formatDate(customer.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Son Görüşmeler</h2>
        {customer.initiatedCalls.length === 0 ? (
          <p className="text-gray-500">Henüz görüşme yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Tarih
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Asistan
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Aranan Numara
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Süre
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody>
                {customer.initiatedCalls.map((call) => (
                  <tr key={call.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      {formatDate(call.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-sm">{call.bot.name}</td>
                    <td className="py-3 px-4 text-sm font-mono">{call.toNumber}</td>
                    <td className="py-3 px-4 text-sm">
                      {call.durationMs ? formatDuration(call.durationMs) : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          call.status === "ANALYZED"
                            ? "bg-green-100 text-green-800"
                            : call.status === "ENDED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {call.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
