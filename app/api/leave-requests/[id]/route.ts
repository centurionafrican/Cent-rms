import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, user_id, user_role } = body

    const [leaveReq] = await sql`SELECT * FROM leave_requests WHERE id = ${Number(id)}`
    if (!leaveReq) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    // Roster Manager: verify the leave request
    if (action === "verify" && user_role === "roster_manager") {
      const [updated] = await sql`
        UPDATE leave_requests SET
          roster_manager_verified = true,
          roster_manager_id = ${user_id},
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `
      return NextResponse.json(updated)
    }

    // Ops Manager: approve/reject
    if (action === "approve" || action === "reject") {
      const newApproved = action === "approve"
      const [updated] = await sql`
        UPDATE leave_requests SET
          ops_manager_approved = ${newApproved},
          ops_manager_approved_by = ${user_id},
          ops_manager_approved_at = NOW(),
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `
      return NextResponse.json(updated)
    }

    // HR: approve/reject
    if (action === "hr_approve" || action === "hr_reject") {
      const newApproved = action === "hr_approve"
      const [updated] = await sql`
        UPDATE leave_requests SET
          hr_approved = ${newApproved},
          hr_approved_by = ${user_id},
          hr_approved_at = NOW(),
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `
      return NextResponse.json(updated)
    }

    // COCEO: final approve/reject
    if (action === "coceo_approve" || action === "coceo_reject") {
      const newApproved = action === "coceo_approve"
      const [updated] = await sql`
        UPDATE leave_requests SET
          coceo_approved = ${newApproved},
          coceo_approved_by = ${user_id},
          coceo_approved_at = NOW(),
          status = ${newApproved ? 'approved' : 'rejected'},
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error updating leave request:", error)
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { leave_plan_id, guard_id, reason, user_id } = body

    if (!guard_id) {
      return NextResponse.json({ error: "guard_id is required" }, { status: 400 })
    }

    let startDate, endDate, leaveType
    if (leave_plan_id) {
      const [plan] = await sql`SELECT start_date, end_date, leave_type FROM leave_plans WHERE id = ${Number(leave_plan_id)}`
      if (!plan) {
        return NextResponse.json({ error: "Leave plan not found" }, { status: 404 })
      }
      startDate = plan.start_date
      endDate = plan.end_date
      leaveType = plan.leave_type
    } else {
      const { start_date, end_date, leave_type } = body
      if (!start_date || !end_date || !leave_type) {
        return NextResponse.json({ error: "Missing date or leave type" }, { status: 400 })
      }
      startDate = start_date
      endDate = end_date
      leaveType = leave_type
    }

    const result = await sql`
      INSERT INTO leave_requests (guard_id, start_date, end_date, leave_type, reason, reviewed_by, status)
      VALUES (${Number(guard_id)}, ${startDate}, ${endDate}, ${leaveType}, ${reason || null}, ${user_id || null}, 'pending')
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating leave request from plan:", error)
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 })
  }
}
