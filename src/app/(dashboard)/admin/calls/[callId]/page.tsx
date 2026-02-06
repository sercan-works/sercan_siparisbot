import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatDate, formatDuration } from "@/lib/utils"
import CallRecordingPlayer from "@/components/calls/call-recording-player"

export const dynamic = "force-dynamic"

export default async function AdminCallDetailsPage({
  params,
}: {
  params: { callId: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const call = await prisma.call.findFirst({
    where: {
      id: params.callId,
      organizationId: session.user.organizationId,
    },
    include: {
      bot: { select: { id: true, name: true } },
      initiatedBy: { select: { name: true, email: true } },
      analytics: true
    }
  })

  if (!call) {
    notFound()
  }

  let transcript: any = null
  if (call.transcript) {
    try {
      transcript = JSON.parse(call.transcript)
    } catch {
      transcript = call.transcript
    }
  }

  const statusTranslations: Record<string, string> = {
    "ANALYZED": "Analiz Edildi",
    "ENDED": "Bitti",
    "IN_PROGRESS": "Devam Ediyor",
    "FAILED": "Basarisiz"
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin/calls"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          &#8592; Gorusmelere Don
        </Link>
        <h1 className="text-3xl font-bold">Gorusme Detaylari</h1>
        <p className="text-gray-600 mt-1">
          {formatDate(call.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Durum</h3>
          <span
            className={`inline-block px-3 py-1 rounded text-sm font-medium ${
              call.status === "ANALYZED"
                ? "bg-green-100 text-green-800"
                : call.status === "ENDED"
                ? "bg-blue-100 text-blue-800"
                : call.status === "IN_PROGRESS"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {statusTranslations[call.status] || call.status}
          </span>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Sure</h3>
          <p className="text-2xl font-bold">
            {call.durationMs ? formatDuration(call.durationMs) : "-"}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Asistan</h3>
          <p className="text-lg font-semibold">{call.bot.name}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Aranan Numara</h3>
          <p className="text-lg font-mono">{call.toNumber}</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Kullanici Bilgisi</h2>
        <p><span className="text-gray-500">Ad:</span> {call.initiatedBy.name || "-"}</p>
        <p><span className="text-gray-500">Email:</span> {call.initiatedBy.email}</p>
      </div>

      {call.analytics && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Gorusme Analizi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {call.analytics.sentiment && (
              <div>
                <span className="text-sm text-gray-500">Duygu Analizi:</span>
                <span
                  className={`ml-2 px-2 py-1 text-xs rounded ${
                    call.analytics.sentiment === "positive"
                      ? "bg-green-100 text-green-800"
                      : call.analytics.sentiment === "negative"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {call.analytics.sentiment === "positive" ? "Olumlu" :
                   call.analytics.sentiment === "negative" ? "Olumsuz" :
                   call.analytics.sentiment === "neutral" ? "Notr" : call.analytics.sentiment}
                </span>
              </div>
            )}
            {call.analytics.callOutcome && (
              <div>
                <span className="text-sm text-gray-500">Sonuc:</span>
                <span className="ml-2 font-medium">{call.analytics.callOutcome}</span>
              </div>
            )}
            {call.analytics.summary && (
              <div className="md:col-span-2">
                <span className="text-sm text-gray-500">Ozet:</span>
                <p className="text-sm mt-1">{call.analytics.summary}</p>
              </div>
            )}
            {call.analytics.e2eLatencyP50 && (
              <div>
                <span className="text-sm text-gray-500">Ortalama Gecikme (P50):</span>
                <p className="font-medium">{call.analytics.e2eLatencyP50}ms</p>
              </div>
            )}
          </div>
        </div>
      )}

      {call.recordingUrl && (
        <div className="mb-6">
          <CallRecordingPlayer
            recordingUrl={call.recordingUrl}
            callId={call.retellCallId}
          />
        </div>
      )}

      {transcript && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Konusma Metni</h2>
          <div className="space-y-3">
            {Array.isArray(transcript) ? (
              transcript.map((message: any, index: number) => (
                <div key={index} className={`flex ${message.role === "agent" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "agent"
                        ? "bg-gray-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <p className="text-xs text-gray-500 mb-1">
                      {message.role === "agent" ? "Asistan" : "Musteri"}
                    </p>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm whitespace-pre-wrap">{transcript}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
