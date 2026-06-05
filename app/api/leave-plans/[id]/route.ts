import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { start_date, end_date, leave_type, reason } = body

    if (!start_date || !end_date || !leave_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      UPDATE leave_plans SET
        start_date = ${start_date},
        end_date = ${end_date},
        leave_type = ${leave_type},
        reason = ${reason || null},
        updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Leave plan not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating leave plan:", error)
    return NextResponse.json({ error: "Failed to update leave plan" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await sql`DELETE FROM leave_plans WHERE id = ${Number(id)}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting leave plan:", error)
    return NextResponse.json({ error: "Failed to delete leave plan" }, { status: 500 })
  }
}
