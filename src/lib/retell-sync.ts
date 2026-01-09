import { prisma } from "./prisma"
import { getRetellApiKey } from "./retell"

interface SyncResults {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// Fetch latest agents from Retell and upsert into our DB for the given org
export async function syncBotsFromRetell(organizationId: string, userId: string): Promise<SyncResults> {
  const apiKey = await getRetellApiKey(organizationId)

  const response = await fetch("https://api.retellai.com/list-agents", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Retell API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
  }

  const retellAgents = await response.json()

  // Deduplicate by agent_id, keep the latest modified
  const latestAgentsMap = new Map<string, any>()
  for (const agent of retellAgents) {
    const existing = latestAgentsMap.get(agent.agent_id)
    if (!existing || agent.last_modification_timestamp > existing.last_modification_timestamp) {
      latestAgentsMap.set(agent.agent_id, agent)
    }
  }
  const agents = Array.from(latestAgentsMap.values())

  const results: SyncResults = { created: 0, updated: 0, skipped: 0, errors: [] }

  for (const agent of agents) {
    try {
      // Fetch LLM details if agent uses retell-llm
      let llmId: string | null = null
      let model = "gpt-4.1"
      let generalPrompt = "You are a helpful AI assistant."
      let beginMessage = "Hello! How can I help you today?"

      if (agent.response_engine?.type === "retell-llm" && agent.response_engine?.llm_id) {
        llmId = agent.response_engine.llm_id
        try {
          const llmResponse = await fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            }
          })
          if (llmResponse.ok) {
            const llmData = await llmResponse.json()
            model = llmData.model || model
            generalPrompt = llmData.general_prompt || generalPrompt
            beginMessage = llmData.begin_message || beginMessage
          }
        } catch (llmError) {
          console.warn(`Could not fetch LLM details for ${llmId}:`, llmError)
        }
      }

      const existingBot = await prisma.bot.findFirst({
        where: {
          retellAgentId: agent.agent_id,
          organizationId
        }
      })

      if (existingBot) {
        await prisma.bot.update({
          where: { id: existingBot.id },
          data: {
            name: agent.agent_name || existingBot.name,
            voiceId: agent.voice_id || existingBot.voiceId,
            webhookUrl: agent.webhook_url || existingBot.webhookUrl,
            model,
            generalPrompt,
            beginMessage,
            isActive: true,
            updatedAt: new Date()
          }
        })
        results.updated++
      } else {
        await prisma.bot.create({
          data: {
            name: agent.agent_name || `Imported Bot ${agent.agent_id.slice(0, 8)}`,
            description: "Imported from Retell AI",
            organizationId,
            createdById: userId,
            retellAgentId: agent.agent_id,
            retellLlmId: llmId,
            voiceId: agent.voice_id || "11labs-Adrian",
            model,
            generalPrompt,
            beginMessage,
            webhookUrl: agent.webhook_url || null,
            isActive: true
          }
        })
        results.created++
      }
    } catch (botError: any) {
      results.errors.push(`${agent.agent_name || agent.agent_id}: ${botError.message}`)
      results.skipped++
    }
  }

  return results
}
