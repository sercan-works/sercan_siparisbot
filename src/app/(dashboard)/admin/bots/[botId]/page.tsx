import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatDate, formatDuration } from "@/lib/utils"
import VersionManager from "@/components/bots/version-manager"
import KBAssignmentSection from "@/components/bots/kb-assignment-section"
import ToolManagementSection from "@/components/bots/tool-management-section"
import DeleteBotButton from "@/components/bots/delete-bot-button"

export const dynamic = "force-dynamic"

export default async function BotDetailsPage({
  params,
}: {
  params: { botId: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const bot = await prisma.bot.findFirst({
    where: {
      id: params.botId,
      organizationId: session.user.organizationId,
    },
    include: {
      assignments: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      calls: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          analytics: true,
          initiatedBy: {
            select: { name: true, email: true }
          }
        }
      },
      _count: {
        select: { calls: true }
      }
    }
  })

  if (!bot) {
    notFound()
  }

  return (
    <div className="p-2 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link
          href="/admin/bots"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Asistanlara Dön
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{bot.name}</h1>
            {bot.description && (
              <p className="text-gray-600 mt-1">{bot.description}</p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Link
              href={`/admin/bots/${bot.id}/edit`}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Asistanı Düzenle
            </Link>
            <DeleteBotButton botId={bot.id} botName={bot.name} />
            <span
              className={`px-3 py-2 text-sm rounded ${
                bot.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {bot.isActive ? "Aktif" : "Pasif"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Toplam Görüşmeler</h3>
          <p className="text-3xl font-bold">{bot._count.calls}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Atandığı</h3>
          <p className="text-3xl font-bold">{bot.assignments.length} müşteri</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Oluşturulma</h3>
          <p className="text-lg font-semibold">{formatDate(bot.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Yapılandırma</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Ses ID:</span>
              <p className="font-medium">{bot.voiceId}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Model:</span>
              <p className="font-medium">{bot.model}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Retell Agent ID:</span>
              <p className="font-mono text-sm">{bot.retellAgentId}</p>
            </div>
            {bot.retellLlmId && (
              <div>
                <span className="text-sm text-gray-500">Retell LLM ID:</span>
                <p className="font-mono text-sm">{bot.retellLlmId}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Atanmış Müşteriler</h2>
          {bot.assignments.length === 0 ? (
            <p className="text-gray-500">Henüz müşteri atanmamış</p>
          ) : (
            <div className="space-y-2">
              {bot.assignments.map((assignment) => (
                <div key={assignment.id} className="border-b pb-2">
                  <p className="font-medium">{assignment.user.name}</p>
                  <p className="text-sm text-gray-500">{assignment.user.email}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prompt Configuration */}
      <div className="bg-white border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Prompt Yapılandırması</h2>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-500">Genel Prompt:</span>
            <p className="mt-1 p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap">{bot.generalPrompt}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Başlangıç Mesajı:</span>
            <p className="mt-1 p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap">{bot.beginMessage}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Son Görüşmeler</h2>
        {bot.calls.length === 0 ? (
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
                    Aranan Numara
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Süre
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Durum
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Başlatan
                  </th>
                </tr>
              </thead>
              <tbody>
                {bot.calls.map((call) => (
                  <tr key={call.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      {formatDate(call.createdAt)}
                    </td>
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
                            : call.status === "IN_PROGRESS"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {call.initiatedBy.name || call.initiatedBy.email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Prompt Yapılandırması</h2>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-500">Genel Prompt:</span>
            <p className="mt-1 p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap">
              {bot.generalPrompt}
            </p>
          </div>
          {bot.beginMessage && (
            <div>
              <span className="text-sm text-gray-500">Başlangıç Mesajı:</span>
              <p className="mt-1 p-3 bg-gray-50 rounded border text-sm">
                {bot.beginMessage}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Version Management */}
      <div className="mt-6">
        <VersionManager botId={bot.id} isAdmin={true} />
      </div>

      {/* Knowledge Base Assignment */}
      <div className="mt-6">
        <KBAssignmentSection botId={bot.id} />
      </div>

      {/* Tool Management */}
      <div className="mt-6">
        <ToolManagementSection botId={bot.id} />
      </div>
    </div>
  )
}
