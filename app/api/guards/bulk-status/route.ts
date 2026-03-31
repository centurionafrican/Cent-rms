import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { guard_ids, new_status } = body

    if (!guard_ids || !guard_ids.length || !new_status) {
      return NextResponse.json({ error: "guard_ids and new_status required" }, { status: 400 })
    }

    const validStatuses = ["recruitment", "training", "probation", "active", "retired", "quit", "dismissed", "deceased"]
    if (!validStatuses.includes(new_status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    let updated = 0
    for (const id of guard_ids) {
      await sql`UPDATE guards SET status = ${new_status}, updated_at = NOW() WHERE id = ${id}`
      updated++
    }

    return NextResponse.json({ updated, message: `${updated} guard(s) updated to ${new_status}` })
  } catch (error) {
    console.error("Bulk status update error:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
