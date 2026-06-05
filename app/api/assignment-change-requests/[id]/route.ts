import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// PATCH — roster manager verify, approve/reject, or execute assignment change requests
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, ops_notes, user_id, user_role } = body

    const [req] = await sql`SELECT * FROM assignment_change_requests WHERE id = ${Number(id)}`
    if (!req) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Roster Manager: verify the request (sets roster_manager_verified = true, but status stays pending)
    if (action === "verify" && user_role === "roster_manager") {
      const [updated] = await sql`
        UPDATE assignment_change_requests SET
          roster_manager_verified = true,
          roster_manager_id = ${user_id},
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `
      return NextResponse.json(updated)
    }

    // Ops Manager: approve/reject (requires roster manager verification first if applicable)
    if (action === "approve" || action === "reject") {
      if (req.status !== "pending") {
        return NextResponse.json({ error: "Request is not pending" }, { status: 400 })
      }

      const newStatus = action === "approve" ? "approved" : "rejected"
      const [updated] = await sql`
        UPDATE assignment_change_requests SET
          status = ${newStatus},
          ops_manager_id = ${user_id},
          ops_manager_at = NOW(),
          ops_notes = ${ops_notes || null},
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `
      return NextResponse.json(updated)
    }

    // Roster Manager: execute the approved change
    if (action === "execute" && user_role === "roster_manager") {
      if (req.status !== "approved") {
        return NextResponse.json({ error: "Request must be approved before execution" }, { status: 400 })
      }

      const [updated] = await sql`
        UPDATE assignment_change_requests SET
          status = 'executed',
          executed_by = ${user_id},
          executed_at = NOW(),
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
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
