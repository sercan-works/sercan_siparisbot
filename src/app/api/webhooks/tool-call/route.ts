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
    let tools = (call.bot.customTools as any[]) || []
    console.log(`[tool-call] Bot found - ID: ${call.bot.organizationId}, Tools count: ${tools.length}`)
    console.log(`[tool-call] Bot tools:`, JSON.stringify(tools.map((t: any) => t.function?.name), null, 2))
    console.log(`[tool-call] Looking for tool: ${finalToolNameToUse}`)
    
    let toolDef = tools.find(t => t.function?.name === finalToolNameToUse)

    // If tool not found and it's a built-in tool (create_order, create_reservation), try to inject it
    // This handles cases where bot's customTools is null or empty
    if (!toolDef && finalToolNameToUse && (finalToolNameToUse === "create_order" || finalToolNameToUse === "create_reservation" || finalToolNameToUse === "check_availability")) {
      console.log(`[tool-call] Tool '${finalToolNameToUse}' not found in bot's customTools (count: ${tools.length}), attempting to inject built-in tool...`)
      
      try {
        // Import built-in tools
        const { CREATE_ORDER_TOOL, CREATE_RESERVATION_TOOL, CHECK_AVAILABILITY_TOOL } = await import("@/lib/tools")
        
        let builtInTool = null
        if (finalToolNameToUse === "create_order") {
          builtInTool = CREATE_ORDER_TOOL
        } else if (finalToolNameToUse === "create_reservation") {
          builtInTool = CREATE_RESERVATION_TOOL
        } else if (finalToolNameToUse === "check_availability") {
          builtInTool = CHECK_AVAILABILITY_TOOL
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
        console.log(`[tool-call] Executing built-in tool: ${finalToolNameToUse}`)
        result = await executeBuiltInTool(finalToolNameToUse, toolArgs, call)
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
      // Not needed - KB handles availability
      return {
        message: "Müsaitlik bilgileri Knowledge Base'den alınmaktadır."
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
            include: { user: true }
          })
          
          if (botAssignment) {
            assignedUser = botAssignment.user
            console.log("[create_reservation] Found user from bot assignment:", assignedUser.id)
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

        // Create reservation
        // Similar to create_order - no database lookup for room types
        // All room type info comes from prompt, we just store the name
        const reservation = await prisma.reservation.create({
          data: {
            customerId: assignedUser.id, // Assign to bot-assigned user or HOTEL customer
            callId: call.id,
            guestName: args.guestName,
            guestPhone: guestPhone || "Unknown",
            checkIn: checkInDate,
            checkOut: checkOutDate,
            numberOfGuests: args.guests,
            numberOfRooms: 1, // Default to 1 room
            roomTypeId: null, // No room type ID lookup - info comes from prompt
            roomType: args.roomType, // Store room type name as string (from prompt)
            status: "PENDING",
            specialRequests: args.specialRequests || null
          }
        })

        // Generate confirmation code (last 6 characters of ID, uppercase)
        const confirmationCode = reservation.id.slice(-6).toUpperCase()

        console.log("[create_reservation] Reservation created successfully:", reservation.id)

        return {
          success: true,
          confirmationCode: confirmationCode,
          reservation_id: reservation.id,
          message: `Rezervasyon oluşturuldu! Onay kodunuz: ${confirmationCode}. Bizi tercih ettiğiniz için teşekkürler.`
        }

      } catch (err: any) {
        console.error("[create_reservation] Failed to create reservation:", err)
        console.error("[create_reservation] Error stack:", err.stack)
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
