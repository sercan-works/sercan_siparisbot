import Retell from "retell-sdk"
import { prisma } from "./prisma"

// Helper to get API key string (for raw fetch calls)
export async function getRetellApiKey(organizationId: string): Promise<string> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { retellApiKey: true }
  })

  if (organization?.retellApiKey) {
    return organization.retellApiKey
  }

  if (!process.env.RETELL_API_KEY) {
    throw new Error("Retell API key not configured. Please add it in admin settings.")
  }

  return process.env.RETELL_API_KEY
}

// Get organization-specific Retell client
export async function getRetellClient(organizationId: string) {
  const apiKey = await getRetellApiKey(organizationId)
  return new Retell({ apiKey })
}

// Helper for raw Retell API calls (for endpoints not yet in SDK)
export async function callRetellApi(
  method: string,
  endpoint: string,
  body: any = null,
  organizationId?: string
) {
  const apiKey = await getRetellApiKey(organizationId || "")
  const url = `https://api.retellai.com${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`

  const bodySummary = body
    ? Array.isArray(body)
      ? `array(length=${body.length})`
      : `keys=${Object.keys(body).join(",") || "none"}`
    : "none"
  console.log(`Calling Retell API: ${method} ${url} (${bodySummary})`)

  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!resp.ok) {
    const text = await resp.text()
    console.error("Retell API error:", text)
    throw new Error(`Retell API Error ${resp.status}: ${text}`)
  }

  const data = await resp.json().catch(() => ({}))
  const resultSummary = Array.isArray(data)
    ? `array(length=${data.length})`
    : typeof data === "object" && data !== null
      ? `keys=${Object.keys(data).join(",") || "none"}`
      : typeof data
  console.log(`Retell API response summary: ${resultSummary}`)
  return data
}

// Helper to create agent with standard webhook (SDK)
export async function createAgentWithWebhook(config: {
  name: string
  voiceId: string
  llmWebsocketUrl: string
}, organizationId?: string) {
  const client = await getRetellClient(organizationId || "")
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/retell`

  // Use 'as any' to bypass TypeScript type checking for llm_websocket_url
  // This property may not be in the SDK types but is still supported by the API
  return client.agent.create({
    agent_name: config.name,
    voice_id: config.voiceId,
    llm_websocket_url: config.llmWebsocketUrl,
    webhook_url: webhookUrl,
  } as any)
}

// Helper function to format phone numbers to E.164
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return digits.startsWith("+") ? digits : `+${digits}`
}
