import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { notifyApprovalRequest } from "@/lib/notifications"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { approval_step, approved } = body
    const session = await getSession()
    const userId = session?.id || 1

    // approval_step: "roster_manager" | "ops_manager" | "hr" | "coceo"
    // approved: boolean

    if (!approval_step || !["roster_manager", "ops_manager", "hr", "coceo"].includes(approval_step)) {
      return NextResponse.json({ error: "Invalid approval step" }, { status: 400 })
    }

    // Fetch current leave request
    const existing = await sql`SELECT * FROM leave_requests WHERE id = ${id}`
    if (existing.length === 0) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    const leave = existing[0]

    // Validate the approval order
    if (approval_step === "ops_manager" && !leave.roster_manager_approved) {
      return NextResponse.json({ error: "Roster Manager must approve first" }, { status: 400 })
    }
    if (approval_step === "hr" && !leave.ops_manager_approved) {
      return NextResponse.json({ error: "Operations Manager must approve first" }, { status: 400 })
    }
    if (approval_step === "coceo" && !leave.hr_approved) {
      return NextResponse.json({ error: "HR must approve first" }, { status: 400 })
    }

    // If rejecting at any step, mark the whole leave as rejected
    if (!approved) {
      if (approval_step === "roster_manager") {
        await sql`
          UPDATE leave_requests SET
            status = 'rejected',
            roster_manager_approved = false,
            roster_manager_id = ${userId},
            roster_manager_approved_at = NOW()
          WHERE id = ${id}
        `
      } else if (approval_step === "ops_manager") {
        await sql`
          UPDATE leave_requests SET
            status = 'rejected',
            ops_manager_approved = false,
            ops_manager_approved_by = ${userId},
            ops_manager_approved_at = NOW()
          WHERE id = ${id}
        `
      } else if (approval_step === "hr") {
        await sql`
          UPDATE leave_requests SET
            status = 'rejected',
            hr_approved = false,
            hr_approved_by = ${userId},
            hr_approved_at = NOW()
          WHERE id = ${id}
        `
      } else if (approval_step === "coceo") {
        await sql`
          UPDATE leave_requests SET
            status = 'rejected',
            coceo_approved = false,
            coceo_approved_by = ${userId},
            coceo_approved_at = NOW()
          WHERE id = ${id}
        `
      }
      return NextResponse.json({ success: true, status: "rejected" })
    }

    // Handle each approval step
    if (approval_step === "roster_manager") {
      await sql`
        UPDATE leave_requests SET
          roster_manager_approved = true,
          roster_manager_id = ${userId},
          roster_manager_approved_at = NOW()
        WHERE id = ${id}
      `
      // Notify Operations Manager for next approval
      const guardInfo = await sql`
        SELECT g.first_name || ' ' || g.last_name as name, lr.leave_type, lr.start_date, lr.end_date
        FROM leave_requests lr
        JOIN guards g ON g.id = lr.guard_id
        WHERE lr.id = ${id}
      `
      if (guardInfo.length > 0) {
        const g = guardInfo[0]
        await notifyApprovalRequest(
          "leave",
          parseInt(id),
          "operations_manager",
          g.name,
          `${g.leave_type} leave from ${new Date(g.start_date).toLocaleDateString()} to ${new Date(g.end_date).toLocaleDateString()}`
        )
      }
    } else if (approval_step === "ops_manager") {
      await sql`
        UPDATE leave_requests SET
          ops_manager_approved = true,
          ops_manager_approved_by = ${userId},
          ops_manager_approved_at = NOW()
        WHERE id = ${id}
      `
      // Notify HR for next approval
      const guardInfo = await sql`
        SELECT g.first_name || ' ' || g.last_name as name, lr.leave_type, lr.start_date, lr.end_date
        FROM leave_requests lr
        JOIN guards g ON g.id = lr.guard_id
        WHERE lr.id = ${id}
      `
      if (guardInfo.length > 0) {
        const g = guardInfo[0]
        await notifyApprovalRequest(
          "leave",
          parseInt(id),
          "hr",
          g.name,
          `${g.leave_type} leave from ${new Date(g.start_date).toLocaleDateString()} to ${new Date(g.end_date).toLocaleDateString()}`
        )
      }
    } else if (approval_step === "hr") {
      await sql`
        UPDATE leave_requests SET
          hr_approved = true,
          hr_approved_by = ${userId},
          hr_approved_at = NOW()
        WHERE id = ${id}
      `
      // Notify Co-CEO for final approval
      const guardInfo = await sql`
        SELECT g.first_name || ' ' || g.last_name as name, lr.leave_type, lr.start_date, lr.end_date
        FROM leave_requests lr
        JOIN guards g ON g.id = lr.guard_id
        WHERE lr.id = ${id}
      `
      if (guardInfo.length > 0) {
        const g = guardInfo[0]
        await notifyApprovalRequest(
          "leave",
          parseInt(id),
          "coceo",
          g.name,
          `${g.leave_type} leave from ${new Date(g.start_date).toLocaleDateString()} to ${new Date(g.end_date).toLocaleDateString()}`
        )
      }
    } else if (approval_step === "coceo") {
      // Final approval - mark leave as approved
      await sql`
        UPDATE leave_requests SET
          coceo_approved = true,
          coceo_approved_by = ${userId},
          coceo_approved_at = NOW(),
          status = 'approved',
          reviewed_by = ${userId},
          reviewed_at = NOW()
        WHERE id = ${id}
      `
    }

    const updated = await sql`SELECT * FROM leave_requests WHERE id = ${id}`
    return NextResponse.json({ leave: updated[0] })
  } catch (error) {
    console.error("Error updating leave request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
