import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { callRetellApi } from "@/lib/retell"
import { updateKnowledgeBaseDailyRatesAvailability } from "@/lib/knowledge-base-updater"
import { analyzeToolCallResult } from "@/lib/call-metrics-analyzer"
import { resolveDailyRates } from "@/lib/pricing-helpers"
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

    // Check headers for Retell Custom Function name (Retell may send it in headers)
    const headers = req.headers
    const functionNameFromHeader = headers.get("x-retell-function-name") || 
                                   headers.get("x-function-name") ||
                                   headers.get("function-name")

    // Check query parameters
    const { searchParams } = new URL(req.url)
    const functionNameFromQuery = searchParams.get("function_name") || 
                                  searchParams.get("functionName")

    // Extract tool call information - support both snake_case and camelCase
    // Retell Custom Functions use different formats:
    // - "Payload: args only: True" -> body is directly arguments
    // - "Payload: args only: False" -> body has { name, args, call } structure
    // - LLM tools use "tool_name" format
    const {
      call_id,
      callId, // Alternative camelCase format
      tool_call_id: extractedToolCallId,
      tool_name,
      toolName, // Alternative camelCase format
      function_name, // Retell Custom Function format (in body)
      functionName, // Alternative camelCase format (in body)
      name, // Retell Custom Function format when "Payload: args only: False"
      arguments: toolArgsFromKey,
      args, // Retell Custom Function format when "Payload: args only: False" (uses "args" not "arguments")
    } = body

    // Extract call_id from nested call object if present (Payload: args only: False mode)
    const callObject = body.call
    const callIdFromCallObject = callObject?.call_id

    // Use call_id from multiple sources
    const retellCallId = call_id || callId || callIdFromCallObject
    tool_call_id = extractedToolCallId || body.tool_call_id || body.toolCallId
    
    // Get arguments from multiple sources
    // Priority: 1. body.arguments, 2. body.args (Retell "Payload: args only: False"), 3. body itself (Payload: args only: True)
    let toolArgs = toolArgsFromKey || args
    
    // Support multiple sources for function name:
    // 1. Header (x-retell-function-name, x-function-name, function-name)
    // 2. Query parameter (function_name, functionName)
    // 3. Body.name (Retell "Payload: args only: False" mode)
    // 4. Body (function_name, functionName, tool_name, toolName)
    let toolNameToUse = functionNameFromHeader || 
                        functionNameFromQuery || 
                        name || // Retell "Payload: args only: False" uses "name" field
                        function_name || 
                        functionName || 
                        tool_name || 
                        toolName

    // If still no tool name but we have arguments that look like reservation/order data, infer it
    let inferredToolName: string | undefined = undefined
    if (!toolNameToUse && toolArgs) {
      const hasReservationFields = toolArgs.checkIn && toolArgs.checkOut && toolArgs.guestName && toolArgs.roomType
      const hasOrderFields = toolArgs.items
      if (hasReservationFields) {
        inferredToolName = "create_reservation"
        console.log("[tool-call] Inferring tool name 'create_reservation' from arguments structure")
        toolNameToUse = inferredToolName
      } else if (hasOrderFields) {
        inferredToolName = "create_order"
        console.log("[tool-call] Inferring tool name 'create_order' from arguments structure")
        toolNameToUse = inferredToolName
      }
    }
    
    // Also extract agent_id from call object if present
    const agentIdFromCallObject = callObject?.agent_id
    
    // Final tool name to use throughout the function
    const finalToolNameToUse = toolNameToUse

    console.log("Tool call received - full body:", JSON.stringify(body, null, 2))
    console.log("Tool call received - headers:", {
      "x-retell-function-name": headers.get("x-retell-function-name"),
      "x-function-name": headers.get("x-function-name"),
      "function-name": headers.get("function-name")
    })
    console.log("Tool call received - query params:", {
      function_name: searchParams.get("function_name"),
      functionName: searchParams.get("functionName")
    })
    console.log("Tool call received - extracted:", {
      call_id: retellCallId,
      tool_call_id,
      tool_name: finalToolNameToUse,
      arguments: toolArgs,
      has_agent_id: !!body.agent_id || !!body.agentId || !!agentIdFromCallObject,
      functionNameFromHeader,
      functionNameFromQuery,
      inferredToolName,
      bodyName: body.name,
      bodyArgs: body.args,
      bodyArguments: body.arguments,
      callObjectCallId: callIdFromCallObject
    })

    // Handle case where call_id is missing but agent_id is provided (test scenario)
    // Check for agent_id in multiple possible locations
    let agentId = body.agent_id || body.agentId || 
                  body.metadata?.agent_id || body.metadata?.agentId ||
                  callObject?.agent_id || agentIdFromCallObject
    
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
        // Try to find bot based on tool_name (smart fallback for testing)
        // For create_order, find a restaurant bot. For create_reservation, find a hotel bot.
        console.log("No call_id or agent_id found, attempting to find suitable bot based on tool_name:", finalToolNameToUse)
        try {
          let anyBot: any = null
          
          // Try to find bot that has the tool defined (best match)
          if (finalToolNameToUse === "create_order") {
            // Find a bot that has create_order tool (usually restaurant bots)
            const bots = await prisma.bot.findMany({
              select: {
                id: true,
                retellAgentId: true,
                organizationId: true,
                customTools: true
              },
              orderBy: { createdAt: 'desc' }
            })
            
            // Find bot with create_order tool
            for (const bot of bots) {
              const tools = (bot.customTools as any[]) || []
              if (tools.some((t: any) => t.function?.name === "create_order")) {
                anyBot = bot
                console.log("Found bot with create_order tool:", bot.id)
                break
              }
            }
            
            // If no bot with tool found, find any bot from restaurant organization
            if (!anyBot) {
              const restaurantOrg = await prisma.user.findFirst({
                where: { customerType: "RESTAURANT" },
                select: { organizationId: true }
              })
              
              if (restaurantOrg) {
                anyBot = await prisma.bot.findFirst({
                  where: { organizationId: restaurantOrg.organizationId },
                  select: {
                    id: true,
                    retellAgentId: true,
                    organizationId: true,
                    customTools: true
                  },
                  orderBy: { createdAt: 'desc' }
                })
              }
            }
          } else if (finalToolNameToUse === "create_reservation") {
            // Similar logic for hotel reservations
            const hotelOrg = await prisma.user.findFirst({
              where: { customerType: "HOTEL" },
              select: { organizationId: true }
            })
            
            if (hotelOrg) {
              anyBot = await prisma.bot.findFirst({
                where: { organizationId: hotelOrg.organizationId },
                select: {
                  id: true,
                  retellAgentId: true,
                  organizationId: true,
                  customTools: true
                },
                orderBy: { createdAt: 'desc' }
              })
            }
          }
          
          // Final fallback: any bot
          if (!anyBot) {
            anyBot = await prisma.bot.findFirst({
              select: {
                id: true,
                retellAgentId: true,
                organizationId: true,
                customTools: true
              },
              orderBy: { createdAt: 'desc' }
            })
          }
          
          if (anyBot) {
            console.log("Found fallback bot for testing:", anyBot.id, "(tool:", finalToolNameToUse + ")")
            agentId = anyBot.retellAgentId
            finalRetellCallId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`
            isTestCall = true
          } else {
            console.error("No bot found in database for testing. Full body:", JSON.stringify(body, null, 2))
            return NextResponse.json({
              result: `Error executing tool: No bot found in system. Please create a bot first or provide 'call_id' or 'agent_id' in the request. Received body keys: ${allKeys.join(', ')}`,
              tool_call_id: tool_call_id || "unknown"
            }, { status: 200 }) // Return 200 so Retell doesn't retry
          }
        } catch (fallbackError: any) {
          console.error("Fallback bot search failed:", fallbackError)
          console.error("call_id is missing from request body. Full body:", JSON.stringify(body, null, 2))
          return NextResponse.json({
            result: `Error executing tool: Failed to find bot for testing. ${fallbackError.message || 'Please provide call_id, callId, or agent_id field.'} Received body keys: ${allKeys.join(', ')}`,
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
            id: true,
            customTools: true,
            organizationId: true
          }
        }
      }
    })

    if (call) {
      console.log("[tool-call] Call found in DB:", {
        callId: call.id,
        retellCallId: call.retellCallId,
        hasBot: !!call.bot,
        organizationId: call.bot?.organizationId
      })
    }

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
                id: true,
                customTools: true,
                organizationId: true
              }
            }
          }
        })
        console.log(`✓ ${isTestCall ? 'Created test' : 'Recovered/Created'} call record:`, {
          callId: call.id,
          retellCallId: call.retellCallId,
          hasBot: !!call.bot,
          organizationId: call.bot?.organizationId
        })
        
        // Validate call.id was created
        if (!call.id || typeof call.id !== 'string' || call.id.trim() === '') {
          throw new Error(`Failed to create call record - call.id is invalid: ${call.id}`)
        }

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
    let tools = (call.bot.customTools as any[]) || []
    console.log(`[tool-call] Bot found - ID: ${call.bot.id}, Organization ID: ${call.bot.organizationId}, Tools count: ${tools.length}`)
    console.log(`[tool-call] Bot tools:`, JSON.stringify(tools.map((t: any) => t.function?.name), null, 2))
    console.log(`[tool-call] Looking for tool: ${finalToolNameToUse}`)
    
    let toolDef = tools.find(t => t.function?.name === finalToolNameToUse)

    // If tool not found and it's a built-in tool (create_order, create_reservation), try to inject it
    // This handles cases where bot's customTools is null or empty
    const builtInToolNames = [
      "create_order",
      "create_reservation",
      "check_availability",
      "get_room_types",
      "get_hotel_info",
      "get_pricing_info",
      "get_price_rules",
      "get_restaurant_info"
    ]

    if (!toolDef && finalToolNameToUse && builtInToolNames.includes(finalToolNameToUse)) {
      console.log(`[tool-call] Tool '${finalToolNameToUse}' not found in bot's customTools (count: ${tools.length}), attempting to inject built-in tool...`)
      
      try {
        // Import built-in tools
        const {
          CREATE_ORDER_TOOL,
          CREATE_RESERVATION_TOOL,
          CHECK_AVAILABILITY_TOOL,
          GET_ROOM_TYPES_TOOL,
          GET_HOTEL_INFO_TOOL,
          GET_PRICING_INFO_TOOL,
          GET_PRICE_RULES_TOOL,
          GET_RESTAURANT_INFO_TOOL
        } = await import("@/lib/tools")
        
        let builtInTool = null
        if (finalToolNameToUse === "create_order") {
          builtInTool = CREATE_ORDER_TOOL
        } else if (finalToolNameToUse === "create_reservation") {
          builtInTool = CREATE_RESERVATION_TOOL
        } else if (finalToolNameToUse === "check_availability") {
          builtInTool = CHECK_AVAILABILITY_TOOL
        } else if (finalToolNameToUse === "get_room_types") {
          builtInTool = GET_ROOM_TYPES_TOOL
        } else if (finalToolNameToUse === "get_hotel_info") {
          builtInTool = GET_HOTEL_INFO_TOOL
        } else if (finalToolNameToUse === "get_pricing_info") {
          builtInTool = GET_PRICING_INFO_TOOL
        } else if (finalToolNameToUse === "get_price_rules") {
          builtInTool = GET_PRICE_RULES_TOOL
        } else if (finalToolNameToUse === "get_restaurant_info") {
          builtInTool = GET_RESTAURANT_INFO_TOOL
        }
        
        if (builtInTool) {
          // Use the built-in tool definition (in-memory, doesn't update DB)
          toolDef = builtInTool
          tools = [...tools, builtInTool]
          console.log(`[tool-call] ✓ Injected built-in tool '${finalToolNameToUse}' for this request`)
        } else {
          console.error(`[tool-call] Built-in tool '${finalToolNameToUse}' not found in tools library`)
        }
      } catch (importError) {
        console.error("[tool-call] Failed to import built-in tools:", importError)
      }
    }

    if (!toolDef) {
      console.error("Tool not found:", finalToolNameToUse, "Available tools:", tools.map((t: any) => t.function?.name || 'null'))
      console.error("Bot customTools raw:", JSON.stringify(call.bot.customTools, null, 2))
      return NextResponse.json({
        result: `Error: Tool '${finalToolNameToUse || 'unknown'}' not found. Available tools: ${tools.map((t: any) => t.function?.name || 'unknown').join(', ') || '(none)'}. Please update the bot to include this tool.`,
        tool_call_id
      }, { status: 200 }) // Return 200 so Retell doesn't retry
    }

    // Execute the tool based on its configuration
    let result: any

    try {
      console.log(`[tool-call] Executing tool: ${finalToolNameToUse}, has URL: ${!!toolDef.function.url}`)
      
      if (toolDef.function.url) {
        // External webhook-based tool
        try {
          const response = await fetch(toolDef.function.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              call_id: finalRetellCallId,
              tool_call_id,
              tool_name: finalToolNameToUse,
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
        // Atanan agent_id otoriterdir: KB verisi için agent_id ile bot bulunur (call.bot yanlış olabilir, örn. playground)
        let callForTools = call
        if (agentId) {
          const agentBot = await prisma.bot.findUnique({
            where: { retellAgentId: agentId },
            select: { id: true, organizationId: true, customTools: true }
          })
          if (agentBot) {
            callForTools = { ...call, bot: agentBot }
            console.log(`[tool-call] Using bot from agent_id for KB resolution: ${agentBot.id}`)
          }
        }
        console.log(`[tool-call] Executing built-in tool: ${finalToolNameToUse}`)
        result = await executeBuiltInTool(finalToolNameToUse, toolArgs, callForTools, body)
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
 * Agent'a atanmış bilgi bankasını bulur. Atanan agent id → o agent'e atanmış KB.
 * Sadece BotKnowledgeBase kullanılır - agent'a atanmış KB o agent'e ait veridir.
 */
async function resolveKnowledgeBaseForBot(botId: string) {
  const botKbLinks = await prisma.botKnowledgeBase.findMany({
    where: { botId },
    include: { knowledgeBase: true }
  })
  const kb = botKbLinks[0]?.knowledgeBase
  if (kb?.texts?.length) return kb
  return null
}

/** @deprecated Use resolveKnowledgeBaseForBot */
async function resolveHotelKnowledgeBaseForBot(botId: string, _organizationId: string) {
  return resolveKnowledgeBaseForBot(botId)
}

/**
 * Execute built-in tools
 * Add custom tool logic here based on tool_name
 */
async function executeBuiltInTool(
  toolName: string,
  args: any,
  call: any,
  body?: any
): Promise<any> {
  switch (toolName) {
    case "create_order":
      // Validated Logic for creating an order
      try {
        console.log("[create_order] Starting with args:", JSON.stringify(args, null, 2))
        console.log("[create_order] Call info:", { 
          callId: call?.id, 
          retellCallId: call?.retellCallId,
          initiatedById: call?.initiatedById,
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

        // Find the correct user to assign the order to
        // CRITICAL: Bot'a atanmış müşteri varsa kesinlikle ona atanmalı
        // Priority: 1. Bot-assigned user (MANDATORY if exists), 2. First RESTAURANT customer in org, 3. Any user in org
        let assignedUser = null
        
        // Priority 1: Bot'a atanmış kullanıcıyı bul (ZORUNLU - eğer varsa)
        if (call.bot?.id) {
          const botAssignment = await prisma.botAssignment.findFirst({
            where: { botId: call.bot.id },
            include: { 
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  organizationId: true,
                  customerType: true,
                  role: true
                }
              }
            },
            orderBy: {
              assignedAt: 'desc' // En son atanan kullanıcıyı al
            }
          })
          
          if (botAssignment?.user) {
            assignedUser = botAssignment.user
            console.log("[create_order] ✓ Bot assignment found - assigning to:", {
              userId: assignedUser.id,
              email: assignedUser.email,
              customerType: assignedUser.customerType
            })
          } else {
            console.log("[create_order] ⚠ No bot assignment found for bot:", call.bot.id)
          }
        } else {
          console.log("[create_order] ⚠ Bot ID not found in call object")
        }
        
        // Priority 2: Fallback - Bot'a atanmış kullanıcı yoksa, RESTAURANT customerType'ına sahip kullanıcıyı bul
        if (!assignedUser) {
          assignedUser = await prisma.user.findFirst({
            where: { 
              organizationId: organizationId,
              customerType: "RESTAURANT",
              role: "CUSTOMER"
            }
          })
          
          if (assignedUser) {
            console.log("[create_order] ⚠ Fallback: Found RESTAURANT customer in organization:", {
              userId: assignedUser.id,
              email: assignedUser.email
            })
          }
        }
        
        // Priority 3: Final fallback - Organization'daki herhangi bir kullanıcı
        if (!assignedUser) {
          assignedUser = await prisma.user.findFirst({
            where: { organizationId: organizationId }
          })
          
          if (assignedUser) {
            console.log("[create_order] ⚠ Final fallback: Found any user in organization:", {
              userId: assignedUser.id,
              email: assignedUser.email
            })
          }
        }

        if (!assignedUser) {
          throw new Error(`No user found for organization ${organizationId} to assign order`)
        }

        console.log("[create_order] Final assigned user:", {
          userId: assignedUser.id,
          email: assignedUser.email,
          organizationId: assignedUser.organizationId
        })

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
          customerId: assignedUser.id,
          callId: call.id,
          retellCallId: call.retellCallId,
          customerName: args.customer_name || args.name || "Misafir Müşteri",
          items: args.items || "Belirtilmedi",
          totalAmount,
          deliveryAddress: args.delivery_address || args.address || null
        })

        // Validate call.id is not null/undefined
        if (!call.id || typeof call.id !== 'string' || call.id.trim() === '') {
          throw new Error(`Invalid call.id: ${call.id}. Call may not be properly saved.`)
        }

        // Check if order already exists for this call
        const existingOrder = await prisma.order.findUnique({
          where: { callId: call.id }
        })

        if (existingOrder) {
          console.log("[create_order] Order already exists, updating:", existingOrder.id)
        } else {
          console.log("[create_order] Creating new order for call:", call.id)
        }

        // Upsert order: Create if new, Update if exists (for changes during call)
        let newOrder
        try {
          newOrder = await prisma.order.upsert({
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
              customerId: assignedUser.id,
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
        } catch (upsertError: any) {
          console.error("[create_order] Upsert error details:", {
            error: upsertError.message,
            code: upsertError.code,
            meta: upsertError.meta,
            stack: upsertError.stack
          })
          throw new Error(`Failed to upsert order: ${upsertError.message || upsertError}. Code: ${upsertError.code || 'unknown'}`)
        }

        // Verify order was actually created/updated
        if (!newOrder || !newOrder.id) {
          throw new Error("Order upsert returned null or missing id")
        }

        // Double-check order exists in database
        const verifyOrder = await prisma.order.findUnique({
          where: { id: newOrder.id }
        })

        if (!verifyOrder) {
          throw new Error(`Order was created but not found in database. Order ID: ${newOrder.id}`)
        }

        console.log("[create_order] Order created/updated successfully:", {
          orderId: newOrder.id,
          callId: newOrder.callId,
          status: newOrder.status,
          items: newOrder.items,
          verified: !!verifyOrder
        })

        // Update metrics for successful order
        if (call?.id) {
          try {
            await prisma.callAnalytics.upsert({
              where: { callId: call.id },
              create: {
                callId: call.id,
                callOutcome: "SUCCESS",
                hasReservation: false,
                hasOrder: true
              },
              update: {
                callOutcome: "SUCCESS",
                hasOrder: true
              }
            })
          } catch (metricsError) {
            console.error("[create_order] Failed to update metrics:", metricsError)
            // Don't fail the tool call if metrics update fails
          }
        }

        return {
          success: true,
          order_id: newOrder.id,
          message: `Siparişiniz alındı. Sipariş numaranız: ${newOrder.id.slice(-4)}. Hazırlanmaya başlıyor.`
        }

      } catch (err: any) {
        console.error("[create_order] Failed to create order:", err)
        console.error("[create_order] Error stack:", err.stack)
        
        // Update metrics for failed order
        if (call?.id) {
          try {
            const errorResult = {
              error: true,
              message: `Sipariş oluşturulurken bir hata oluştu: ${err.message || err}`
            }
            const metrics = analyzeToolCallResult("create_order", errorResult)
            await prisma.callAnalytics.upsert({
              where: { callId: call.id },
              create: {
                callId: call.id,
                callOutcome: metrics.callOutcome,
                rejectionReason: metrics.rejectionReason,
                hasReservation: false,
                hasOrder: false
              },
              update: {
                callOutcome: metrics.callOutcome,
                rejectionReason: metrics.rejectionReason,
                hasOrder: false
              }
            })
          } catch (metricsError) {
            console.error("[create_order] Failed to update error metrics:", metricsError)
            // Don't fail the tool call if metrics update fails
          }
        }
        
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
      // Get all data between two dates (room types, reservations, availability)
      try {
        console.log("[check_availability] Starting with args:", JSON.stringify(args, null, 2))
        
        // Validate call context
        if (!call) {
          throw new Error("Call record is missing")
        }

        if (!call.bot || !call.bot.organizationId) {
          throw new Error("Call context missing organization/bot info")
        }

        // Validate required arguments
        if (!args.checkIn || !args.checkOut || !args.guests) {
          throw new Error("Required fields missing: checkIn, checkOut, and guests are required")
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(args.checkIn) || !dateRegex.test(args.checkOut)) {
          throw new Error("Invalid date format. Dates must be in YYYY-MM-DD format")
        }

        const organizationId = call.bot.organizationId
        const botId = call.bot.id

        // Parse dates
        const startDate = new Date(args.checkIn)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(args.checkOut)
        endDate.setHours(0, 0, 0, 0)

        const knowledgeBase = await resolveHotelKnowledgeBaseForBot(botId, organizationId)

        if (!knowledgeBase || !knowledgeBase.texts || knowledgeBase.texts.length === 0) {
      return {
            error: true,
            message: "Fiyatlandırma bilgisi bulunamadı."
          }
        }

        // Parse hotel data from KB JSON
        let hotelData: any
        try {
          hotelData = JSON.parse(knowledgeBase.texts[0])
        } catch (parseError) {
          console.error("[check_availability] Failed to parse KB JSON:", parseError)
          return {
            error: true,
            message: "Fiyatlandırma verisi okunamadı."
          }
        }

        const pricingData = hotelData.pricing || {}
        const roomTypes = hotelData.roomTypes || []
        const dailyRates = resolveDailyRates(pricingData, {
          roomType: args.roomType,
          roomTypes
        })

        // Filter daily rates for the date range
        const filteredDailyRates = dailyRates.filter((rate: any) => {
          if (!rate.date) return false
          const rateDate = new Date(rate.date)
          rateDate.setHours(0, 0, 0, 0)
          return rateDate >= startDate && rateDate < endDate
        })

        // Sort by date
        filteredDailyRates.sort((a: any, b: any) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        })

        // If roomType is specified, find matching room type from KB
        let matchedRoomType = null
        if (args.roomType) {
          matchedRoomType = roomTypes.find((rt: any) => {
            return rt.name && rt.name.toLowerCase() === args.roomType.toLowerCase()
          })
          
          if (!matchedRoomType) {
            // Try partial match
            matchedRoomType = roomTypes.find((rt: any) => {
              return rt.name && rt.name.toLowerCase().includes(args.roomType.toLowerCase())
            })
          }
        }

        // Check if any rooms are available
        const hasAvailableRooms = filteredDailyRates.some((rate: any) => {
          const availableRooms = parseInt(rate.availableRooms || "0")
          return availableRooms > 0
        })

        // Calculate lowest price from all rates (for reference, LLM will use this to form its own response)
        let lowestPrice = Infinity
        filteredDailyRates.forEach((rate: any) => {
          const ppPrice = parseFloat(rate.ppPrice || "0")
          const single = parseFloat(rate.single || "0")
          const dbl = parseFloat(rate.dbl || "0")
          const triple = parseFloat(rate.triple || "0")
          
          const prices = [ppPrice, single, dbl, triple].filter((p) => p > 0)
          if (prices.length > 0) {
            const minPrice = Math.min(...prices)
            if (minPrice < lowestPrice) {
              lowestPrice = minPrice
            }
          }
        })

        // Update metrics if no rooms available
        if (!hasAvailableRooms && call?.id) {
          try {
            const metrics = analyzeToolCallResult("check_availability", { available: false })
            await prisma.callAnalytics.upsert({
              where: { callId: call.id },
              create: {
                callId: call.id,
                callOutcome: metrics.callOutcome,
                rejectionReason: metrics.rejectionReason,
                hasReservation: false,
                hasOrder: false
              },
              update: {
                callOutcome: metrics.callOutcome,
                rejectionReason: metrics.rejectionReason
              }
            })
          } catch (metricsError) {
            console.error("[check_availability] Failed to update metrics:", metricsError)
            // Don't fail the tool call if metrics update fails
          }
        }

        // Return data only - LLM will form its own natural response message
        return {
          success: true,
          available: hasAvailableRooms,
          dateRange: {
            checkIn: args.checkIn,
            checkOut: args.checkOut
          },
          roomType: matchedRoomType ? {
            name: matchedRoomType.name,
            availableRooms: matchedRoomType.adet || "0",
            maxGuests: matchedRoomType.maxKisi || null,
            features: matchedRoomType
          } : null,
          pricing: {
            dailyRates: filteredDailyRates,
            lowestPrice: lowestPrice !== Infinity ? lowestPrice : null
          }
        }

      } catch (err: any) {
        console.error("[check_availability] Error:", err)
        console.error("[check_availability] Error stack:", err.stack)
        return {
          error: true,
          message: `Müsaitlik kontrolü yapılırken bir hata oluştu: ${err.message || err}`
        }
      }

    case "get_room_types":
      // Get all room types from Knowledge Base (no internal fetch)
      try {
        console.log("[get_room_types] Starting")
        
        // Validate call context
        if (!call) {
          throw new Error("Call record is missing")
        }

        if (!call.bot || !call.bot.organizationId) {
          throw new Error("Call context missing organization/bot info")
        }

        const organizationId = call.bot.organizationId
        const botId = call.bot.id

        const knowledgeBase = await resolveHotelKnowledgeBaseForBot(botId, organizationId)

        if (!knowledgeBase || !knowledgeBase.texts || knowledgeBase.texts.length === 0) {
          return {
            success: true,
            roomTypes: [],
            totalRoomTypes: 0,
            message: "Oda tipi bilgisi bulunamadı."
          }
        }

        // Parse hotel data from KB JSON
        let hotelData: any
        try {
          hotelData = JSON.parse(knowledgeBase.texts[0])
        } catch (parseError) {
          console.error("[get_room_types] Failed to parse KB JSON:", parseError)
          return {
            error: true,
            message: "Oda tipi verisi okunamadı."
          }
        }

        // Get room types from KB
        const kbRoomTypes = hotelData.roomTypes || []

        // Format room types for response
        const formattedRoomTypes = kbRoomTypes.map((rt: any) => {
          // Create features array from KB data
          const featuresArray: string[] = []
          if (rt.balkon && rt.balkon.toLowerCase() === "evet") featuresArray.push("Balkon")
          if (rt.manzara) featuresArray.push(`Manzara: ${rt.manzara}`)
          if (rt.minibar && rt.minibar.toLowerCase() === "evet") featuresArray.push("Minibar")
          if (rt.kettle && rt.kettle.toLowerCase() === "evet") featuresArray.push("Kettle")
          if (rt.kahveMak && rt.kahveMak.toLowerCase() === "evet") featuresArray.push("Kahve Makinesi")
          if (rt.jakuzi && rt.jakuzi.toLowerCase() === "evet") featuresArray.push("Jakuzi")
          if (rt.klima && rt.klima.toLowerCase() === "evet") featuresArray.push("Klima")
          if (rt.safeBox && rt.safeBox.toLowerCase() === "evet") featuresArray.push("Kasa")
          if (rt.tvTelefon && rt.tvTelefon.toLowerCase() === "evet") featuresArray.push("TV/Telefon")
          if (rt.bornoz && rt.bornoz.toLowerCase() === "evet") featuresArray.push("Bornoz")
          if (rt.mutfak && rt.mutfak.toLowerCase() === "evet") featuresArray.push("Mutfak")

          return {
            id: rt.id || "",
            name: rt.name || "",
            description: "",
            totalRooms: parseInt(rt.adet || "0"),
            availableRooms: parseInt(rt.adet || "0"), // KB'deki adet değeri kullanılıyor
            bookedRooms: 0, // KB'de rezervasyon bilgisi yok, sadece toplam adet var
            maxGuests: parseInt(rt.maxKisi || "2"),
            pricePerNight: 0, // KB'de fiyat bilgisi yok, pricing.dailyRates'te var
            features: featuresArray, // Array format as expected
            // Include all details in a details object for reference
            details: {
              metrekare: rt.metrekare || null,
              banyoSayisi: rt.banyoSayisi || null,
              balkon: rt.balkon || null,
              manzara: rt.manzara || null,
              yatakTipi: rt.yatakTipi || null,
              yatakSayisi: rt.yatakSayisi || null,
              bukletler: rt.bukletler || null,
              minibar: rt.minibar || null,
              kettle: rt.kettle || null,
              kahveMak: rt.kahveMak || null,
              jakuzi: rt.jakuzi || null,
              fonMak: rt.fonMak || null,
              bornoz: rt.bornoz || null,
              tvTelefon: rt.tvTelefon || null,
              klima: rt.klima || null,
              safeBox: rt.safeBox || null,
              utu: rt.utu || null,
              mutfak: rt.mutfak || null,
              customFeatures: rt.customFeatures || {}
            }
          }
        })

        console.log("[get_room_types] KB roomTypes found:", kbRoomTypes.length)
        console.log("[get_room_types] Room types formatted:", formattedRoomTypes.length)

        return {
          success: true,
          roomTypes: formattedRoomTypes,
          totalRoomTypes: formattedRoomTypes.length,
          message: `${formattedRoomTypes.length} oda tipi bulundu.`
        }

      } catch (err: any) {
        console.error("[get_room_types] Error:", err)
        return {
          error: true,
          message: `Oda tipleri alınırken bir hata oluştu: ${err.message || err}`
        }
      }

    case "get_hotel_info":
      // Get hotel information from KB directly (no internal fetch)
      try {
        console.log("[get_hotel_info] Starting with args:", JSON.stringify(args, null, 2))
        
        // Validate call context
        if (!call) {
          throw new Error("Call record is missing")
        }

        if (!call.bot || !call.bot.organizationId) {
          throw new Error("Call context missing organization/bot info")
        }

        const organizationId = call.bot.organizationId
        const botId = call.bot.id
        const section = args.section || "all"

        const knowledgeBase = await resolveHotelKnowledgeBaseForBot(botId, organizationId)

        if (!knowledgeBase || !knowledgeBase.texts || knowledgeBase.texts.length === 0) {
          return {
            success: true,
            section: section === "all" ? "all" : section,
            data: {},
            message: "Otel bilgisi bulunamadı."
          }
        }

        // Parse hotel data from KB JSON
        let hotelData: any
        try {
          hotelData = JSON.parse(knowledgeBase.texts[0])
        } catch (parseError) {
          console.error("[get_hotel_info] Failed to parse KB JSON:", parseError)
          return {
            error: true,
            message: "Otel verisi okunamadı."
          }
        }

        // Return requested section or all data
        let responseData: any = {}

        if (section === "all" || section === "facility") {
          responseData.facilityInfo = hotelData.facilityInfo || {}
        }

        if (section === "all" || section === "services") {
          responseData.services = hotelData.services || { free: [], paid: [] }
        }

        if (section === "all" || section === "policies") {
          responseData.policies = hotelData.policies || []
        }

        if (section === "all" || section === "concept") {
          responseData.conceptFeatures = hotelData.conceptFeatures || {}
        }

        if (section === "all" || section === "menus") {
          responseData.menus = hotelData.menus || []
        }

        console.log("[get_hotel_info] Hotel info fetched for section:", section)

        return {
          success: true,
          section: section === "all" ? "all" : section,
          data: responseData,
          message: "Otel bilgileri başarıyla alındı."
        }

      } catch (err: any) {
        console.error("[get_hotel_info] Error:", err)
        return {
          error: true,
          message: `Otel bilgileri alınırken bir hata oluştu: ${err.message || err}`
        }
      }

    case "get_restaurant_info":
      // Get restaurant information from KB directly - agent'a atanmış KB kullanılır
      try {
        console.log("[get_restaurant_info] Starting with args:", JSON.stringify(args, null, 2))
        
        if (!call || !call.bot || !call.bot.organizationId) {
          throw new Error("Call context missing")
        }

        const botId = call.bot.id
        const section = args.section || "all"
        const knowledgeBase = await resolveKnowledgeBaseForBot(botId)

        if (!knowledgeBase || !knowledgeBase.texts || knowledgeBase.texts.length === 0) {
          return {
            success: true,
            section: section === "all" ? "all" : section,
            data: {},
            message: "Restoran bilgisi bulunamadı."
          }
        }

        // Parse restaurant data from KB JSON
        let restaurantData: any
        try {
          restaurantData = JSON.parse(knowledgeBase.texts[0])
        } catch (parseError) {
          console.error("[get_restaurant_info] Failed to parse KB JSON:", parseError)
          return {
            error: true,
            message: "Restoran verisi okunamadı."
          }
        }

        // Return requested section or all data
        let responseData: any = {}

        if (section === "all" || section === "facility") {
          responseData.facilityInfo = restaurantData.facilityInfo || {}
        }

        if (section === "all" || section === "menus") {
          responseData.menus = restaurantData.menus || {
            yiyecek: [],
            icecek: [],
            tatli: [],
            diyet: [],
            minimumTutar: ""
          }
        }

        if (section === "all" || section === "campaigns") {
          responseData.campaigns = restaurantData.campaigns || []
        }

        if (section === "all" || section === "other") {
          responseData.other = restaurantData.other || {}
        }

        console.log("[get_restaurant_info] Restaurant info fetched for section:", section)

        return {
          success: true,
          section: section === "all" ? "all" : section,
          data: responseData,
          message: "Restoran bilgileri başarıyla alındı."
        }

      } catch (err: any) {
        console.error("[get_restaurant_info] Error:", err)
        return {
          error: true,
          message: `Restoran bilgileri alınırken bir hata oluştu: ${err.message || err}`
        }
      }

    case "get_pricing_info":
      // Get pricing information directly from KB (no internal fetch)
      try {
        console.log("[get_pricing_info] Starting with args:", JSON.stringify(args, null, 2))
        
        // Validate call context
        if (!call) {
          throw new Error("Call record is missing")
        }

        if (!call.bot || !call.bot.organizationId) {
          throw new Error("Call context missing organization/bot info")
        }

        const organizationId = call.bot.organizationId
        const botId = call.bot.id
        const date = args.date || null

        const knowledgeBase = await resolveHotelKnowledgeBaseForBot(botId, organizationId)

        if (!knowledgeBase || !knowledgeBase.texts || knowledgeBase.texts.length === 0) {
          return {
            success: true,
            date: date || null,
            data: {
              dailyRates: [],
              rules: {},
              discounts: []
            },
            message: "Fiyatlandırma bilgisi bulunamadı."
          }
        }

        // Parse hotel data from KB JSON
        let hotelData: any
        try {
          hotelData = JSON.parse(knowledgeBase.texts[0])
        } catch (parseError) {
          console.error("[get_pricing_info] Failed to parse KB JSON:", parseError)
          return {
            error: true,
            message: "Fiyatlandırma verisi okunamadı."
          }
        }

        const pricingData = hotelData.pricing || {}
        const roomTypes = hotelData.roomTypes || []
        const dailyRates = resolveDailyRates(pricingData, {
          roomType: args.roomType,
          roomTypes,
          date: date || undefined
        })

        console.log("[get_pricing_info] Pricing info fetched for date:", date || "all")

        return {
          success: true,
          date: date || null,
          data: {
            dailyRates: dailyRates,
            rules: pricingData.rules || {},
            discounts: pricingData.discounts || []
          },
          message: "Fiyat bilgileri başarıyla alındı."
        }

      } catch (err: any) {
        console.error("[get_pricing_info] Error:", err)
        return {
          error: true,
          message: `Fiyat bilgileri alınırken bir hata oluştu: ${err.message || err}`
        }
      }

    case "get_price_rules":
      // Get pricing calculation rules (Fiyat Hesaplama Prompt) from Hotel Knowledge Base
      try {
        console.log("[get_price_rules] Starting with args:", JSON.stringify(args, null, 2))
        
        // Validate call context
        if (!call) {
          throw new Error("Call record is missing")
        }

        if (!call.bot || !call.bot.organizationId) {
          throw new Error("Call context missing organization/bot info")
        }

        const organizationId = call.bot.organizationId
        const botId = call.bot.id

        const knowledgeBase = await resolveHotelKnowledgeBaseForBot(botId, organizationId)

        if (!knowledgeBase || !knowledgeBase.texts || knowledgeBase.texts.length === 0) {
          return {
            success: true,
            pricingPrompt: null,
            message: "Fiyat hesaplama prompt'u bulunamadı."
          }
        }

        // Parse hotel data from KB JSON
        let hotelData: any
        try {
          hotelData = JSON.parse(knowledgeBase.texts[0])
        } catch (parseError) {
          console.error("[get_price_rules] Failed to parse KB JSON:", parseError)
          return {
            error: true,
            message: "Hotel bilgi bankası verisi okunamadı."
          }
        }

        const pricingData = hotelData.pricing || {}
        const pricingPrompt = pricingData.pricingPrompt || null

        console.log("[get_price_rules] Pricing prompt fetched", {
          hasPrompt: !!pricingPrompt,
          promptLength: pricingPrompt ? pricingPrompt.length : 0
        })

        return {
          success: true,
          pricingPrompt: pricingPrompt,
          message: pricingPrompt 
            ? "Fiyat hesaplama kuralları başarıyla alındı." 
            : "Fiyat hesaplama prompt'u bulunamadı."
        }

      } catch (err: any) {
        console.error("[get_price_rules] Error:", err)
        return {
          error: true,
          message: `Fiyat hesaplama kuralları alınırken bir hata oluştu: ${err.message || err}`
        }
      }

    case "create_reservation":
      // Create hotel reservation
      try {
        console.log("[create_reservation] Starting with args:", JSON.stringify(args, null, 2))
        console.log("[create_reservation] Call info:", { 
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
        console.log("[create_reservation] Organization ID:", organizationId)

        // Validate required arguments
        if (!args.checkIn || !args.checkOut || !args.guests || !args.guestName || !args.roomType) {
          throw new Error("Required fields missing: checkIn, checkOut, guests, guestName, and roomType are required")
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(args.checkIn) || !dateRegex.test(args.checkOut)) {
          throw new Error("Invalid date format. Dates must be in YYYY-MM-DD format")
        }

        // Find user to assign reservation to
        // Priority: 1. Bot assignments (users assigned to this bot), 2. First HOTEL customer in org
        let assignedUser = null
        
        // Try to find a user assigned to this bot
        if (call.bot?.id) {
          const botAssignment = await prisma.botAssignment.findFirst({
            where: { botId: call.bot.id },
            include: { 
              user: {
                select: {
                  id: true,
                  customerType: true,
                  email: true,
                  name: true
                }
              }
            }
          })
          
          if (botAssignment?.user) {
            // Only use assigned user if they are HOTEL type
            if (botAssignment.user.customerType === "HOTEL") {
              assignedUser = botAssignment.user
              console.log("[create_reservation] Found HOTEL user from bot assignment:", assignedUser.id)
            } else {
              console.log(`[create_reservation] Assigned user is ${botAssignment.user.customerType}, not HOTEL, searching for HOTEL customer...`)
            }
          }
        }
        
        // Fallback: Find first HOTEL customer in organization
        if (!assignedUser) {
          assignedUser = await prisma.user.findFirst({
            where: { 
              organizationId: organizationId,
              customerType: "HOTEL",
              role: "CUSTOMER"
            }
          })
          
          if (assignedUser) {
            console.log("[create_reservation] Found HOTEL customer in organization:", assignedUser.id)
          }
        }
        
        // Final fallback: Any user in organization
        if (!assignedUser) {
          assignedUser = await prisma.user.findFirst({
            where: { organizationId: organizationId }
          })
          
          if (assignedUser) {
            console.log("[create_reservation] Found any user in organization:", assignedUser.id)
          }
        }

        if (!assignedUser) {
          throw new Error(`No user found for organization ${organizationId} to assign reservation`)
        }

        console.log("[create_reservation] Room type from prompt:", args.roomType)

        // Get guest phone from args or call
        // Priority: 1. args.guestPhone (from Retell function call), 2. call.fromNumber (from DB), 3. Retell API
        let guestPhone = args.guestPhone || call.fromNumber || null
        
        console.log("[create_reservation] Phone number lookup:", {
          fromArgs: args.guestPhone,
          fromCall: call.fromNumber,
          retellCallId: call.retellCallId,
          currentValue: guestPhone
        })

        // If still no phone and we have call_id, try to fetch from Retell
        if (!guestPhone && call.retellCallId) {
          try {
            console.log("[create_reservation] Attempting to fetch phone from Retell API...")
            const retellCall = await callRetellApi("GET", `/get-call/${call.retellCallId}`, null, organizationId)
            guestPhone = retellCall?.from_number || null
            console.log("[create_reservation] Retell API response:", {
              hasFromNumber: !!retellCall?.from_number,
              fromNumber: retellCall?.from_number
            })
          } catch (err) {
            console.warn("[create_reservation] Could not retrieve phone from Retell:", err)
          }
        }

        // Final fallback: log if still no phone
        if (!guestPhone) {
          console.warn("[create_reservation] No phone number found from any source. Will use 'Unknown' as fallback.")
        }

        // Validate check-in/check-out dates
        const checkInDate = new Date(args.checkIn)
        const checkOutDate = new Date(args.checkOut)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (checkInDate < today) {
          throw new Error("Check-in tarihi bugünden önce olamaz")
        }

        if (checkOutDate <= checkInDate) {
          throw new Error("Check-out tarihi check-in tarihinden sonra olmalıdır")
        }

        // Calculate total price
        // Priority: 1. totalPrice (if provided), 2. Calculate from adultPrice/childPrice, 3. Parse from transcript, 4. null
        let totalPrice: number | null = null
        
        if (args.totalPrice !== undefined && args.totalPrice !== null) {
          // Use provided totalPrice
          if (typeof args.totalPrice === 'number') {
            totalPrice = args.totalPrice
          } else {
            // Remove currency symbols and parse
            // Handle Turkish number format: "12.500" = 12500 (dot is thousands separator)
            let cleaned = String(args.totalPrice).replace(/[^0-9.,]/g, "")
            // If there's a comma, it's likely decimal separator (e.g., "12,50")
            // If there's only dots, they're thousands separators (e.g., "12.500")
            if (cleaned.includes(',')) {
              // Decimal separator is comma: "12,50" = 12.50
              cleaned = cleaned.replace(/\./g, '').replace(',', '.')
            } else if (cleaned.includes('.')) {
              // Only dots: could be thousands separator or decimal
              // If there's only one dot at the end or near end, it might be decimal
              // Otherwise, remove all dots (thousands separator)
              const parts = cleaned.split('.')
              if (parts.length === 2 && parts[1].length <= 2) {
                // Likely decimal: "12.50" = 12.50
                cleaned = cleaned.replace('.', '')
              } else {
                // Thousands separator: "12.500" = 12500
                cleaned = cleaned.replace(/\./g, '')
              }
            }
            totalPrice = parseFloat(cleaned) || null
            console.log("[create_reservation] Parsed totalPrice:", args.totalPrice, "->", totalPrice)
          }
        } else if (args.adultPrice !== undefined || args.childPrice !== undefined) {
          // Calculate from adultPrice and childPrice
          const numberOfAdults = args.numberOfAdults || args.guests || 0
          const numberOfChildren = args.numberOfChildren || 0
          const adultPrice = typeof args.adultPrice === 'number' ? args.adultPrice : 
                            (args.adultPrice ? parseFloat(String(args.adultPrice).replace(/[^0-9.]/g, "")) : 0)
          const childPrice = typeof args.childPrice === 'number' ? args.childPrice : 
                            (args.childPrice ? parseFloat(String(args.childPrice).replace(/[^0-9.]/g, "")) : 0)
          
          totalPrice = (adultPrice * numberOfAdults) + (childPrice * numberOfChildren)
          if (totalPrice === 0) totalPrice = null
        }
        
        // Fallback: Try to parse price from transcript if available
        // Get transcript from call object or body
        const transcript = call?.transcript || body?.call?.transcript || body?.transcript
        if (!totalPrice && transcript) {
          console.log("[create_reservation] Attempting to parse price from transcript...")
          // Look for patterns like "toplam 3000 TL", "toplam 3000", "3000 TL", etc.
          const pricePatterns = [
            /toplam\s+(\d+(?:[.,]\d+)?)\s*(?:TL|₺|türk\s*lirası)?/i,
            /(\d+(?:[.,]\d+)?)\s*TL['\s]*dir/i,
            /(\d+(?:[.,]\d+)?)\s*TL['\s]*toplam/i,
            /toplam[^\d]*(\d+(?:[.,]\d+)?)/i,
            /gecelik\s+(\d+(?:[.,]\d+)?)\s*TL[^,]*toplam\s+(\d+(?:[.,]\d+)?)\s*TL/i  // "gecelik 1000 TL, toplam 3000 TL"
          ]
          
          for (const pattern of pricePatterns) {
            const match = transcript.match(pattern)
            if (match) {
              // If pattern has 2 groups (gecelik + toplam), use the total (second group)
              const priceMatch = match[2] || match[1]
              if (priceMatch) {
                const priceStr = priceMatch.replace(',', '.')
                const parsedPrice = parseFloat(priceStr)
                if (!isNaN(parsedPrice) && parsedPrice > 0) {
                  totalPrice = parsedPrice
                  console.log("[create_reservation] ✓ Parsed price from transcript:", totalPrice, "using pattern:", pattern)
                  break
                }
              }
            }
          }
        }

        console.log("[create_reservation] Price calculation:", {
          totalPriceFromArgs: args.totalPrice,
          adultPrice: args.adultPrice,
          childPrice: args.childPrice,
          numberOfAdults: args.numberOfAdults,
          numberOfChildren: args.numberOfChildren,
          finalTotalPrice: totalPrice,
          transcriptAvailable: !!(call?.transcript || body?.call?.transcript || body?.transcript)
        })

        // Find room type by name (case-insensitive)
        let roomTypeId: string | null = null
        let foundRoomType: any = null
        
        if (args.roomType) {
          foundRoomType = await prisma.roomType.findFirst({
            where: {
              organizationId: organizationId,
              customerId: assignedUser.id,
              name: { contains: args.roomType, mode: "insensitive" },
              isActive: true
            }
          })
          
          if (foundRoomType) {
            roomTypeId = foundRoomType.id
            console.log("[create_reservation] Found room type:", { id: roomTypeId, name: foundRoomType.name, currentTotalRooms: foundRoomType.totalRooms })
          } else {
            console.log("[create_reservation] Room type not found in database, will create reservation without roomTypeId:", args.roomType)
          }
        }

        // Create reservation and update room count in transaction
        const reservation = await prisma.$transaction(async (tx) => {
        // Create reservation
          const newReservation = await tx.reservation.create({
          data: {
            customerId: assignedUser.id, // Assign to bot-assigned user or HOTEL customer
            callId: call.id,
            guestName: args.guestName,
            guestPhone: guestPhone || "Unknown",
            checkIn: checkInDate,
            checkOut: checkOutDate,
            numberOfGuests: args.guests,
            numberOfChildren: args.numberOfChildren || null,
            numberOfRooms: 1, // Default to 1 room
              roomTypeId: roomTypeId, // Set room type ID if found
            roomType: args.roomType, // Store room type name as string (from prompt)
            status: "PENDING",
            totalPrice: totalPrice,
            specialRequests: args.specialRequests || null
          }
          })

          // Update room count if room type was found
          if (roomTypeId && foundRoomType) {
            const newTotalRooms = Math.max(0, foundRoomType.totalRooms - 1)
            await tx.roomType.update({
              where: { id: roomTypeId },
              data: { totalRooms: newTotalRooms }
            })
            console.log("[create_reservation] Updated room count:", { roomTypeId, oldCount: foundRoomType.totalRooms, newCount: newTotalRooms })
          }

          return newReservation
        })

        // Generate confirmation code (last 6 characters of ID, uppercase)
        const confirmationCode = reservation.id.slice(-6).toUpperCase()

        console.log("[create_reservation] Reservation created successfully:", reservation.id)

        // Update knowledge base daily rates availability asynchronously (don't wait for it)
        // Decrease availableRooms for each day in the reservation date range
        updateKnowledgeBaseDailyRatesAvailability(
          organizationId,
          assignedUser.id,
          checkInDate,
          checkOutDate,
          1, // delta=1 means decrease availableRooms by 1
          args.roomType
        ).catch((err) => {
          console.error("[create_reservation] Failed to update knowledge base daily rates:", err)
          // Don't fail reservation creation if KB update fails
        })

        // Update metrics for successful reservation
        if (call?.id) {
          try {
            await prisma.callAnalytics.upsert({
              where: { callId: call.id },
              create: {
                callId: call.id,
                callOutcome: "SUCCESS",
                hasReservation: true,
                hasOrder: false
              },
              update: {
                callOutcome: "SUCCESS",
                hasReservation: true
              }
            })
          } catch (metricsError) {
            console.error("[create_reservation] Failed to update metrics:", metricsError)
            // Don't fail the tool call if metrics update fails
          }
        }

        return {
          success: true,
          confirmationCode: confirmationCode,
          reservation_id: reservation.id,
          message: `Rezervasyon oluşturuldu! Onay kodunuz: ${confirmationCode}. Bizi tercih ettiğiniz için teşekkürler.`
        }

      } catch (err: any) {
        console.error("[create_reservation] Failed to create reservation:", err)
        console.error("[create_reservation] Error stack:", err.stack)
        
        // Update metrics for failed reservation
        if (call?.id) {
          try {
            const errorResult = {
              error: true,
              message: `Rezervasyon oluşturulurken bir hata oluştu: ${err.message || err}`
            }
            const metrics = analyzeToolCallResult("create_reservation", errorResult)
            await prisma.callAnalytics.upsert({
              where: { callId: call.id },
              create: {
                callId: call.id,
                callOutcome: metrics.callOutcome,
                rejectionReason: metrics.rejectionReason,
                hasReservation: false,
                hasOrder: false
              },
              update: {
                callOutcome: metrics.callOutcome,
                rejectionReason: metrics.rejectionReason,
                hasReservation: false
              }
            })
          } catch (metricsError) {
            console.error("[create_reservation] Failed to update error metrics:", metricsError)
            // Don't fail the tool call if metrics update fails
          }
        }
        
        return {
          error: true,
          message: `Rezervasyon oluşturulurken bir hata oluştu: ${err.message || err}`
        }
      }

    default:
      console.warn(`Unknown tool call: ${toolName}`, args)
      return {
        error: true,
        message: `Unknown tool: ${toolName}`
      }
  }
}
