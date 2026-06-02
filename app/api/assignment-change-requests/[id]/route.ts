import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// PATCH — approve/reject or execute assignment change requests
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, ops_notes } = body

    const [req] = await sql`SELECT * FROM assignment_change_requests WHERE id = ${Number(id)}`
    if (!req) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (req.status !== "pending") {
      return NextResponse.json({ error: "Request is not pending" }, { status: 400 })
    }

    const newStatus = action === "approve" ? "approved" : "rejected"
    const [updated] = await sql`
      UPDATE assignment_change_requests SET
        status = ${newStatus},
        ops_manager_at = NOW(),
        ops_notes = ${ops_notes || null},
        updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating request:", error)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}

// DELETE — cancel an assignment change request
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await sql`
      DELETE FROM assignment_change_requests WHERE id = ${Number(id)}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Request cancelled" })
  } catch (error) {
    console.error("Error deleting request:", error)
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 })
  }
}
