import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRetellClient, callRetellApi } from "@/lib/retell"
import { createBotSchema } from "@/lib/validations"
import { z } from "zod"
import {
  CHECK_AVAILABILITY_TOOL,
  CREATE_RESERVATION_TOOL,
  CREATE_ORDER_TOOL,
  GET_ROOM_TYPES_TOOL,
  GET_HOTEL_INFO_TOOL,
  GET_PRICING_INFO_TOOL,
  GET_PRICE_RULES_TOOL,
  GET_RESTAURANT_INFO_TOOL
} from "@/lib/tools"
import { updateBotPromptWithPricingPrompt } from "@/lib/bot-prompt-helper"

export const dynamic = "force-dynamic"

// GET /api/bots - List bots (tenant-scoped)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    // Admins see all bots in org, customers see assigned bots
    const bots = await prisma.bot.findMany({
      where: {
        organizationId,
        ...(role === "CUSTOMER" && {
          assignments: {
            some: { userId }
          }
        })
      },
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        _count: {
          select: { calls: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ bots })
  } catch (error) {
    console.error("Error fetching bots:", error)
    return NextResponse.json(
      { error: "Failed to fetch bots" },
      { status: 500 }
    )
  }
}

// POST /api/bots - Create new bot
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  try {
    const body = await req.json()
    const data = createBotSchema.parse(body)

    // Get organization-specific Retell client
    const retellClient = await getRetellClient(organizationId)

    // Step 1: Create LLM in Retell (using raw API as SDK v2 lacks it)
    // Get tool call webhook URL for tool execution
    const toolCallWebhookUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/tool-call`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/webhooks/tool-call`
      : 'https://siparisbot.vercel.app/api/webhooks/tool-call' // Fallback

    const llmPayload: any = {
      model: data.model,
      general_prompt: data.generalPrompt,
      begin_message: data.beginMessage || "Hello! How can I help you today?",
      start_speaker: "agent", // Required: who starts the conversation
      tool_call_url: toolCallWebhookUrl // URL for tool execution callbacks
    }

    // NOTE: Tools are now added manually via Retell Dashboard
    // Auto-inject safety protocol for Hotels
    if (session.user.customerType === "HOTEL") {
      const safetyProtocol = `\n\n## RESERVATION PROTOCOL (STRICT)\nBefore calling 'create_reservation', you MUST verbally confirm the details with the user: "So I have a request for [Guest Name] for [Room Type] from [Check-in] to [Check-out]. Is this correct?". Only proceed if they say YES.`

      if (llmPayload.general_prompt) {
        llmPayload.general_prompt += safetyProtocol
      }
    } else if (session.user.customerType === "RESTAURANT") {
      // Auto-inject safety protocol for Orders
      const safetyProtocol = `\n\n## ORDER PROTOCOL (STRICT)\nBefore confirming an order, you MUST verbally confirm the details with the user: "So I have an order for [Items] to be delivered to [Address]. Is this correct?". Only proceed if they say YES.`

      if (llmPayload.general_prompt) {
        llmPayload.general_prompt += safetyProtocol
      }
    }

    // SDK exposes agents but not LLM creation, keep raw call via internal client
    // NOTE: Tools are now added manually via Retell Dashboard
    const llm = await callRetellApi("POST", "/create-retell-llm", llmPayload, organizationId) as any
    console.log("[bot creation] LLM creation response:", JSON.stringify(llm, null, 2))

    // Check if llm_id exists
    if (!llm?.llm_id) {
      console.error("[bot creation] Invalid LLM response - missing llm_id:", llm)
      throw new Error("Failed to create LLM: Invalid response from Retell API")
    }

    // Step 2: Create Agent in Retell with advanced settings
    const defaultWebhookUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/retell`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/webhooks/retell`
      : 'https://siparisbot.vercel.app/api/webhooks/retell' // Fallback

    const webhookUrl = data.webhookUrl || defaultWebhookUrl

    const agentPayload: any = {
      response_engine: {
        type: "retell-llm",
        llm_id: llm.llm_id
      },
      voice_id: data.voiceId,
      agent_name: data.name,
      webhook_url: webhookUrl,
      language: data.language || "en-US",
    }

    // Add advanced voice settings if provided (snake_case for API)
    if (data.voiceTemperature !== undefined) agentPayload.voice_temperature = data.voiceTemperature
    if (data.voiceSpeed !== undefined) agentPayload.voice_speed = data.voiceSpeed
    if (data.responsiveness !== undefined) agentPayload.responsiveness = data.responsiveness
    if (data.enableBackchannel !== undefined) agentPayload.enable_backchannel = data.enableBackchannel
    if (data.ambientSound) agentPayload.ambient_sound = data.ambientSound
    if (data.boostedKeywords && data.boostedKeywords.length > 0) agentPayload.boosted_keywords = data.boostedKeywords
    if (data.normalizeForSpeech !== undefined) agentPayload.normalize_for_speech = data.normalizeForSpeech
    if (data.optOutSensitiveDataStorage !== undefined) agentPayload.opt_out_sensitive_data_storage = data.optOutSensitiveDataStorage

    const agent = await retellClient.agent.create(agentPayload as any)
    console.log("Agent creation response:", JSON.stringify(agent, null, 2))

    if (!agent.agent_id) {
      throw new Error("Failed to create agent: No agent_id returned")
    }

    // Step 3: Create bot in database
    const bot = await prisma.bot.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId,
        createdById: userId,
        retellAgentId: agent.agent_id,
        retellLlmId: llm.llm_id,
        voiceId: data.voiceId,
        model: data.model,
        generalPrompt: data.generalPrompt,
        beginMessage: data.beginMessage || "Hello! How can I help you today?",
        webhookUrl,
        language: data.language || "en-US",
        // Advanced voice settings
        voiceTemperature: data.voiceTemperature,
        voiceSpeed: data.voiceSpeed,
        responsiveness: data.responsiveness,
        interruptionSensitivity: data.interruptionSensitivity,
        enableBackchannel: data.enableBackchannel || false,
        ambientSound: data.ambientSound,
        boostedKeywords: data.boostedKeywords || [],
        normalizeForSpeech: data.normalizeForSpeech ?? true,
        optOutSensitiveDataStorage: data.optOutSensitiveDataStorage || false,
        // NOTE: Tools are now added manually via Retell Dashboard
        // Store tool definitions in database for reference (optional)
        customTools: session.user.customerType === "HOTEL" 
          ? [
              CHECK_AVAILABILITY_TOOL,
              CREATE_RESERVATION_TOOL,
              GET_ROOM_TYPES_TOOL,
              GET_HOTEL_INFO_TOOL,
              GET_PRICING_INFO_TOOL,
              GET_PRICE_RULES_TOOL
            ]
          : session.user.customerType === "RESTAURANT"
          ? [GET_RESTAURANT_INFO_TOOL, CREATE_ORDER_TOOL]
          : undefined,
        // Auto-assign to creator if customer
        ...(role === "CUSTOMER" && {
          assignments: {
            create: { userId }
          }
        })
      },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    })

    // If HOTEL customer, update bot prompt with pricingPrompt from assigned KBs
    if (session.user.customerType === "HOTEL") {
      updateBotPromptWithPricingPrompt(bot.id, organizationId).catch((err) => {
        console.error("[POST /api/bots] Failed to update pricingPrompt:", err)
        // Don't fail bot creation if pricingPrompt update fails
      })
    }

    return NextResponse.json({ bot }, { status: 201 })
  } catch (error) {
    console.error("Error creating bot:", error)
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors)
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create bot", details: (error as Error).message },
      { status: 500 }
    )
  }
}
