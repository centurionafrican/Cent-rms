import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail, assignmentChangeApprovedEmail, assignmentChangedGuardEmail } from "@/lib/email"

// PATCH — ops manager approves/rejects, roster manager executes
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      if (req.status !== "pending") {
        return NextResponse.json({ error: "Request is not pending" }, { status: 400 })
      }

      const newStatus = action === "approve" ? "approved" : "rejected"
      const [updated] = await sql`
        UPDATE assignment_change_requests SET
          status = ${newStatus},
          ops_manager_id = ${user.id},
          ops_manager_at = NOW(),
          ops_notes = ${ops_notes ?? null},
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `

      // On approval: notify roster managers to execute
      if (action === "approve") {
        const rosterManagers = await sql`
          SELECT * FROM users WHERE role IN ('roster_manager', 'admin') AND email IS NOT NULL
        `
        for (const rm of rosterManagers) {
          await sendEmail({
            to: rm.email,
            subject: "Assignment Change Request Approved — Please Execute",
            html: assignmentChangeApprovedEmail({
              rosterManagerName: `${rm.first_name} ${rm.last_name}`,
              coordinatorName: "",
              guardName: req.current_guard_name,
              siteName: req.site_name,
              shiftName: req.shift_name,
              date: req.assignment_date,
              opsNotes: ops_notes,
              executeUrl: `${appUrl}/dashboard/assignment-change-requests`,
            }),
          })
        }
      }

      return NextResponse.json(updated)
    }

    // ── Roster Manager: execute the change ───────────────────────────────
    if (action === "execute") {
      if (!["roster_manager", "admin"].includes(user.role)) {
        return NextResponse.json({ error: "Only Roster Managers can execute changes" }, { status: 403 })
      }
      if (req.status !== "approved") {
        return NextResponse.json({ error: "Request must be approved first" }, { status: 400 })
      }
      // new_guard_id: the guard to assign (can differ from requested_guard_id)
      if (!new_guard_id) {
        return NextResponse.json({ error: "new_guard_id is required to execute" }, { status: 400 })
      }

      // Fetch new guard details
      const [newGuard] = await sql`SELECT * FROM guards WHERE id = ${new_guard_id}`
      if (!newGuard) return NextResponse.json({ error: "New guard not found" }, { status: 404 })

      // Update assignment guard
      await sql`
        UPDATE assignments SET guard_id = ${new_guard_id}, updated_at = NOW()
        WHERE id = ${req.assignment_id}
      `

      // Mark request executed
      const [updated] = await sql`
        UPDATE assignment_change_requests SET
          status = 'executed',
          executed_by = ${user.id},
          executed_at = NOW(),
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `

      const portalUrl = `${appUrl}/guard-portal`

      // Notify old guard — removed from assignment
      if (req.current_guard_email) {
        await sendEmail({
          to: req.current_guard_email,
          subject: "Assignment Update — Shift Change",
          html: assignmentChangedGuardEmail({
            guardName: req.current_guard_name,
            siteName: req.site_name,
            shiftName: req.shift_name,
            date: req.assignment_date,
            action: "removed",
            portalUrl,
          }),
        })
      }

      // Notify new guard — assigned
      if (newGuard.email) {
        await sendEmail({
          to: newGuard.email,
          subject: "New Assignment — You Have Been Assigned",
          html: assignmentChangedGuardEmail({
            guardName: `${newGuard.first_name} ${newGuard.last_name}`,
            siteName: req.site_name,
            shiftName: req.shift_name,
            date: req.assignment_date,
            action: "assigned",
            portalUrl,
          }),
        })
      }

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[ACR PATCH]", error)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
