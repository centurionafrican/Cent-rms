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
    const { approval_step, approved } = body

    // approval_step: "ops_manager" | "hr" | "coceo"
    // approved: boolean

    if (!approval_step || !["ops_manager", "hr", "coceo"].includes(approval_step)) {
      return NextResponse.json({ error: "Invalid approval step" }, { status: 400 })
    }

    // Fetch current leave request
    const existing = await sql`SELECT * FROM leave_requests WHERE id = ${id}`
    if (existing.length === 0) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    const leave = existing[0]

    // Validate the approval order
    if (approval_step === "hr" && !leave.ops_manager_approved) {
      return NextResponse.json({ error: "Operations Manager must approve first" }, { status: 400 })
    }
    if (approval_step === "coceo" && !leave.hr_approved) {
      return NextResponse.json({ error: "HR must approve first" }, { status: 400 })
    }

    // If rejecting at any step, mark the whole leave as rejected
    if (!approved) {
      await sql`
        UPDATE leave_requests SET
          status = 'rejected',
          reviewed_by = ${user.id},
          reviewed_at = NOW(),
          ${approval_step === "ops_manager" ? sql`ops_manager_approved = false, ops_manager_approved_by = ${user.id}, ops_manager_approved_at = NOW()` : 
            approval_step === "hr" ? sql`hr_approved = false, hr_approved_by = ${user.id}, hr_approved_at = NOW()` :
            sql`coceo_approved = false, coceo_approved_by = ${user.id}, coceo_approved_at = NOW()`}
        WHERE id = ${id}
      `
      return NextResponse.json({ success: true, status: "rejected" })
    }

    // Handle each approval step
    if (approval_step === "ops_manager") {
      await sql`
        UPDATE leave_requests SET
          ops_manager_approved = true,
          ops_manager_approved_by = ${user.id},
          ops_manager_approved_at = NOW()
        WHERE id = ${id}
      `
    } else if (approval_step === "hr") {
      await sql`
        UPDATE leave_requests SET
          hr_approved = true,
          hr_approved_by = ${user.id},
          hr_approved_at = NOW()
        WHERE id = ${id}
      `
    } else if (approval_step === "coceo") {
      // Final approval - mark leave as approved
      await sql`
        UPDATE leave_requests SET
          coceo_approved = true,
          coceo_approved_by = ${user.id},
          coceo_approved_at = NOW(),
          status = 'approved',
          reviewed_by = ${user.id},
          reviewed_at = NOW()
        WHERE id = ${id}
      `
      // Update guard status to on_leave
      await sql`
        UPDATE guards SET status = 'on_leave' 
        WHERE id = ${leave.guard_id}
      `
    }

    const updated = await sql`SELECT * FROM leave_requests WHERE id = ${id}`
    return NextResponse.json({ leave: updated[0] })
  } catch (error) {
    console.error("Error updating leave request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
