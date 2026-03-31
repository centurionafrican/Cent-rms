import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (action === "clock_out") {
      const result = await sql`
        UPDATE attendance SET
          time_out = NOW(),
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
