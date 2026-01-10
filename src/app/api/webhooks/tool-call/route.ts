import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { callRetellApi } from "@/lib/retell"
import crypto from "crypto"

export const dynamic = "force-dynamic"

/**
 * Webhook endpoint for Retell tool execution callbacks
 * This endpoint is called when an agent invokes a custom tool during a call
 */
export async function POST(req: NextRequest) {
  let tool_call_id: string | undefined = undefined
  try {
    const body = await req.json()

    // Extract tool call information - support both snake_case and camelCase
    const {
      call_id,
      callId, // Alternative camelCase format
      tool_call_id: extractedToolCallId,
      tool_name,
      toolName, // Alternative camelCase format
      arguments: toolArgs,
    } = body

    // Use call_id or callId (camelCase alternative)
    const retellCallId = call_id || callId
    tool_call_id = extractedToolCallId || body.tool_call_id || body.toolCallId
    const toolNameToUse = tool_name || toolName

    console.log("Tool call received - full body:", JSON.stringify(body, null, 2))
    console.log("Tool call received - extracted:", {
      call_id: retellCallId,
      tool_call_id,
      tool_name: toolNameToUse,
      arguments: toolArgs,
      has_agent_id: !!body.agent_id || !!body.agentId
    })

    // Handle case where call_id is missing but agent_id is provided (test scenario)
    // Check for agent_id in multiple possible locations
    let agentId = body.agent_id || body.agentId || 
                  body.metadata?.agent_id || body.metadata?.agentId ||
                  body.call?.agent_id || body.call?.agentId
    
    // Also check all top-level keys to see what we have
    const allKeys = Object.keys(body)
    console.log("All keys in request body:", allKeys)
    console.log("Body metadata:", body.metadata)
    console.log("Body call object:", body.call)
    
    let finalRetellCallId = retellCallId
    let isTestCall = false
    
    if (!retellCallId) {
      if (agentId) {
        console.log("call_id missing but agent_id found - creating test call record with agent_id:", agentId)
        // Generate a test call_id for dashboard testing
        finalRetellCallId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`
        isTestCall = true
      } else {
        // Try to find agent_id from any available bot (fallback for testing)
        // This is less ideal but allows testing when no context is provided
        console.log("No call_id or agent_id found, attempting to find any available bot for testing...")
        try {
          const anyBot = await prisma.bot.findFirst({
            select: {
              id: true,
              retellAgentId: true,
              organizationId: true,
              customTools: true
            },
            orderBy: { createdAt: 'desc' }
          })
          
          if (anyBot) {
            console.log("Found fallback bot for testing:", anyBot.id)
            agentId = anyBot.retellAgentId
            finalRetellCallId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`
            isTestCall = true
          } else {
            console.error("call_id is missing and no agent_id found. Full body:", JSON.stringify(body, null, 2))
            return NextResponse.json({
              result: `Error executing tool: call_id is required but was not provided in the request. Please ensure the request includes 'call_id', 'callId', or 'agent_id' field for testing. Received body keys: ${allKeys.join(', ')}`,
              tool_call_id: tool_call_id || "unknown"
            }, { status: 200 }) // Return 200 so Retell doesn't retry
          }
        } catch (fallbackError) {
          console.error("Fallback bot search failed:", fallbackError)
          console.error("call_id is missing from request body. Full body:", JSON.stringify(body, null, 2))
          return NextResponse.json({
            result: `Error executing tool: call_id is required but was not provided in the request. Please ensure the request includes 'call_id', 'callId', or 'agent_id' field for testing. Received body keys: ${allKeys.join(', ')}`,
            tool_call_id: tool_call_id || "unknown"
          }, { status: 200 }) // Return 200 so Retell doesn't retry
        }
      }
    }

    // Find the call in database to get organization context
    let call = await prisma.call.findUnique({
      where: { retellCallId: finalRetellCallId },
      include: {
        bot: {
          select: {
            customTools: true,
            organizationId: true
          }
        }
      }
    })

    if (!call) {
      console.log("Call not found in DB, attempting to create or fetch:", finalRetellCallId)

      try {
        // First find bot by agent_id if available in body metadata
        // Otherwise fetch from Retell API
        let retellCall: any = null
        let bot: any = null

        // Use agentId from earlier extraction (supports multiple locations)
        if (agentId) {
          bot = await prisma.bot.findUnique({
            where: { retellAgentId: agentId },
            select: {
              id: true,
              organizationId: true,
              customTools: true
            }
          })
        }

        if (!bot && !isTestCall) {
          // Fetch call details from Retell to get agent_id (only if not test call)
          try {
            retellCall = await callRetellApi("GET", `/get-call/${finalRetellCallId}`, null, undefined)

            if (retellCall && retellCall.agent_id) {
              // Find bot to link context
              bot = await prisma.bot.findUnique({
                where: { retellAgentId: retellCall.agent_id },
                select: {
                  id: true,
                  organizationId: true,
                  customTools: true
                }
              })
            }
          } catch (apiError) {
            console.log("Could not fetch call from Retell API, using agent_id from body:", apiError)
          }
        }

        if (!bot && agentId) {
          // Try one more time with agent_id from body
          bot = await prisma.bot.findUnique({
            where: { retellAgentId: agentId },
            select: {
              id: true,
              organizationId: true,
              customTools: true
            }
          })
        }

        if (!bot) {
          throw new Error(`Bot not found for agent_id: ${agentId || retellCall?.agent_id || 'unknown'}. Please provide a valid agent_id in the request.`)
        }

        retellCall = retellCall || { agent_id: agentId || bot.retellAgentId }

        // Find owner to link as initiator (fallback)
        const owner = await prisma.user.findFirst({
          where: { organizationId: bot.organizationId }
        })

        if (!owner) {
          throw new Error(`No user found for organization: ${bot.organizationId}`)
        }

        // Create the missing call record on the fly
        call = await prisma.call.create({
          data: {
            retellCallId: finalRetellCallId,
            organizationId: bot.organizationId,
            botId: bot.id,
            initiatedById: owner.id,
            fromNumber: retellCall?.from_number || body.from_number || body.fromNumber || null,
            toNumber: retellCall?.to_number || body.to_number || body.toNumber || "test-call",
            status: isTestCall ? "INITIATED" : "IN_PROGRESS",
            startedAt: retellCall?.start_timestamp ? new Date(retellCall.start_timestamp) : new Date()
          },
          include: {
            bot: {
              select: {
                customTools: true,
                organizationId: true
              }
            }
          }
        })
        console.log(`✓ ${isTestCall ? 'Created test' : 'Recovered/Created'} call record:`, call.id, `(retellCallId: ${finalRetellCallId})`)

      } catch (recoveryError: any) {
        console.error("Failed to recover call context:", recoveryError)
        return NextResponse.json({
          result: `Error: Call not found and recovery failed - ${recoveryError.message || recoveryError}`,
          tool_call_id
        }, { status: 200 }) // Return 200 so Retell doesn't retry
      }
    }

    // Validate call has bot and customTools
    if (!call.bot) {
      console.error("Bot not found for call:", finalRetellCallId)
      return NextResponse.json({
        result: `Error: Bot not found for this call`,
        tool_call_id
      }, { status: 200 })
    }

    // Find the tool definition
    const tools = (call.bot.customTools as any[]) || []
    const toolDef = tools.find(t => t.function?.name === toolNameToUse)

    if (!toolDef) {
      console.error("Tool not found:", toolNameToUse, "Available tools:", tools.map((t: any) => t.function?.name))
      return NextResponse.json({
        result: `Error: Tool '${toolNameToUse || 'unknown'}' not found. Available tools: ${tools.map((t: any) => t.function?.name || 'unknown').join(', ')}`,
        tool_call_id
      }, { status: 200 }) // Return 200 so Retell doesn't retry
    }

    // Execute the tool based on its configuration
    let result: any

    try {
      console.log(`[tool-call] Executing tool: ${toolNameToUse}, has URL: ${!!toolDef.function.url}`)
      
      if (toolDef.function.url) {
        // External webhook-based tool
        try {
          const response = await fetch(toolDef.function.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              call_id: finalRetellCallId,
              tool_call_id,
              tool_name: toolNameToUse,
              arguments: toolArgs,
              organization_id: call.bot.organizationId
            })
          })

          if (!response.ok) {
            throw new Error(`Tool webhook returned ${response.status}`)
          }

          result = await response.json()
          console.log(`[tool-call] External tool result:`, result)
        } catch (error: any) {
          console.error("[tool-call] Tool webhook error:", error)
          result = {
            error: true,
            message: `Tool execution failed: ${error.message}`
          }
        }
      } else {
        // Built-in tool execution logic
        console.log(`[tool-call] Executing built-in tool: ${toolNameToUse}`)
        result = await executeBuiltInTool(toolNameToUse, toolArgs, call)
        console.log(`[tool-call] Built-in tool result:`, result)
      }

      // Format result for Retell
      // Retell expects result as a string, so convert objects to JSON string
      let resultString: string
      if (typeof result === "string") {
        resultString = result
      } else if (result && typeof result === "object") {
        // If result has an error, format as error message
        if (result.error) {
          resultString = result.message || JSON.stringify(result)
          console.log(`[tool-call] Tool returned error: ${resultString}`)
        } else {
          // Success: convert to JSON string
          resultString = JSON.stringify(result)
          console.log(`[tool-call] Tool returned success: ${resultString}`)
        }
      } else {
        resultString = String(result)
      }

      // Return result to Retell (always return 200, Retell handles errors from result content)
      const response = {
        result: resultString,
        tool_call_id
      }
      console.log(`[tool-call] Final response:`, JSON.stringify(response, null, 2))
      
      return NextResponse.json(response, { status: 200 })

    } catch (toolError: any) {
      console.error("Tool execution error:", toolError)
      // Return error in Retell format (200 status, error in result)
      return NextResponse.json({
        result: `Error executing tool: ${toolError.message || toolError}`,
        tool_call_id
      }, { status: 200 })
    }

  } catch (error: any) {
    console.error("Tool call webhook error:", error)
    // Return error in Retell format (200 status, error in result)
    // Use tool_call_id from earlier extraction or default
    return NextResponse.json({
      result: `Error executing tool: ${error.message || String(error)}`,
      tool_call_id: tool_call_id || "unknown"
    }, { status: 200 })
  }
}

/**
 * Execute built-in tools
 * Add custom tool logic here based on tool_name
 */
async function executeBuiltInTool(
  toolName: string,
  args: any,
  call: any
): Promise<any> {
  switch (toolName) {
    case "create_order":
      // Validated Logic for creating an order
      try {
        console.log("[create_order] Starting with args:", JSON.stringify(args, null, 2))
        console.log("[create_order] Call info:", { 
          callId: call?.id, 
          retellCallId: call?.retellCallId,
          hasBot: !!call?.bot,
          organizationId: call?.bot?.organizationId
        })

        // Validate call context
        if (!call) {
          throw new Error("Call record is missing")
        }

        if (!call.id) {
          throw new Error("Call ID is missing - call may not be saved yet")
        }

        if (!call.bot || !call.bot.organizationId) {
          throw new Error("Call context missing organization/bot info")
        }

        const organizationId = call.bot.organizationId
        console.log("[create_order] Organization ID:", organizationId)

        // Validate required arguments
        if (!args.items) {
          throw new Error("Items are required but not provided")
        }

        // customer_name is optional but preferred - use default if not provided

        // Find a default user for this org to assign the order to (usually the admin/owner)
        const defaultUser = await prisma.user.findFirst({
          where: { organizationId: organizationId }
        })

        if (!defaultUser) {
          throw new Error(`No user found for organization ${organizationId} to assign order`)
        }

        console.log("[create_order] Found user:", defaultUser.id)

        // Clean up total amount - handle both number and string
        let totalAmount: number | null = null
        if (args.total_amount !== undefined && args.total_amount !== null) {
          if (typeof args.total_amount === 'number') {
            totalAmount = args.total_amount
          } else {
            // Remove currency symbols and parse
            const cleaned = String(args.total_amount).replace(/[^0-9.]/g, "")
            totalAmount = parseFloat(cleaned) || null
          }
        }

        console.log("[create_order] Prepared order data:", {
          customerId: defaultUser.id,
          callId: call.id,
          customerName: args.customer_name || args.name || "Misafir Müşteri",
          items: args.items || "Belirtilmedi",
          totalAmount
        })

        // Upsert order: Create if new, Update if exists (for changes during call)
        const newOrder = await prisma.order.upsert({
          where: { callId: call.id },
          update: {
            customerName: args.customer_name || args.name || "Misafir Müşteri",
            customerPhone: args.customer_phone || args.phone || call.fromNumber || null,
            items: args.items || args.order_details || "Belirtilmedi",
            deliveryAddress: args.delivery_address || args.address || null,
            totalAmount: totalAmount,
            notes: args.notes || null,
          },
          create: {
            customerId: defaultUser.id,
            callId: call.id,
            customerName: args.customer_name || args.name || "Misafir Müşteri",
            customerPhone: args.customer_phone || args.phone || call.fromNumber || null,
            items: args.items || args.order_details || "Belirtilmedi",
            deliveryAddress: args.delivery_address || args.address || null,
            totalAmount: totalAmount,
            notes: args.notes || null,
            status: "PENDING"
          }
        })

        console.log("[create_order] Order created/updated successfully:", newOrder.id)

        return {
          success: true,
          order_id: newOrder.id,
          message: `Siparişiniz alındı. Sipariş numaranız: ${newOrder.id.slice(-4)}. Hazırlanmaya başlıyor.`
        }

      } catch (err: any) {
        console.error("[create_order] Failed to create order:", err)
        console.error("[create_order] Error stack:", err.stack)
        return {
          error: true,
          message: `Sipariş oluşturulurken bir hata oluştu: ${err.message || err}`
        }
      }

    case "check_order_status":
      // Logic to check order status
      try {
        const orderId = args.order_id
        if (!orderId) throw new Error("Order ID required")

        // Find order (fuzzy match last 4 chars if short id provided)
        let order = null
        if (orderId.length < 10) {
          order = await prisma.order.findFirst({
            where: {
              id: { endsWith: orderId },
              call: { retellCallId: call.retellCallId } // Security: scope to this call or customer phone
            }
          })
        } else {
          order = await prisma.order.findUnique({ where: { id: orderId } })
        }

        if (!order) return { error: true, message: "Sipariş bulunamadı." }

        return {
          status: order.status,
          items: order.items,
          message: `Siparişinizin durumu: ${order.status === 'PENDING' ? 'Bekliyor' : order.status === 'PREPARING' ? 'Hazırlanıyor' : order.status === 'READY' ? 'Teslime Hazır' : 'Tamamlandı'}.`
        }

      } catch (err) {
        return { error: true, message: "Sipariş durumu sorgulanamadı." }
      }

    case "get_call_info":
      // Example: Return call information
      return {
        call_id: call.id,
        status: call.status,
        duration: call.durationMs,
        to_number: call.toNumber
      }

    case "lookup_customer":
      // Example: Customer lookup
      // Implement your custom logic here
      return {
        customer_id: args.customer_id || "unknown",
        name: "John Doe",
        status: "active"
      }

    case "check_availability":
      // Example: Availability check
      const date = args.date || new Date().toISOString().split("T")[0]
      return {
        date,
        available: true,
        slots: ["09:00", "10:00", "14:00", "15:00"]
      }

    default:
      console.warn(`Unknown tool call: ${toolName}`, args)
      return {
        error: true,
        message: `Unknown tool: ${toolName}`
      }
  }
}
