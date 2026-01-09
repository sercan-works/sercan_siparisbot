import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { syncBotsFromRetell } from "@/lib/retell-sync"

export const dynamic = "force-dynamic"

/**
 * POST /api/bots/sync - Sync bots from Retell to database
 * This endpoint fetches all agents from Retell API and creates them in the database
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { organizationId, role, id: userId } = session.user

  // Only admins can sync bots
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const results = await syncBotsFromRetell(organizationId, userId)
    return NextResponse.json({
      success: true,
      message: `Sync completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      results
    })
  } catch (error: any) {
    console.error("Error syncing bots from Retell:", error)
    return NextResponse.json(
      {
        error: "Failed to sync bots from Retell",
        details: error.message
      },
      { status: 500 }
    )
  }
}
