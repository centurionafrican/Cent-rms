import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, time_out } = body

    // Handle direct time_out update or action-based clock out
    if (time_out || action === "clock_out") {
      const result = await sql`
        UPDATE attendance SET
          time_out = ${time_out || new Date().toISOString()},
          status = 'present'
        WHERE id = ${id}
        RETURNING *
      `

      if (result.length === 0) {
        return NextResponse.json({ error: "Attendance not found" }, { status: 404 })
      }

      return NextResponse.json({ attendance: result[0] })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error updating attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
