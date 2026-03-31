import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail, assignmentChangeRequestEmail } from "@/lib/email"

// GET — list requests (filtered by role)
export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"

    const rows = await sql`
      SELECT
        acr.*,
        u_req.first_name || ' ' || u_req.last_name  AS requested_by_name,
        u_ops.first_name || ' ' || u_ops.last_name  AS ops_manager_name,
        u_exe.first_name || ' ' || u_exe.last_name  AS executed_by_name,
        cg.first_name || ' ' || cg.last_name        AS current_guard_name,
        rg.first_name || ' ' || rg.last_name        AS requested_guard_name,
        a.date                                       AS assignment_date,
        s.name                                       AS site_name,
        sh.name                                      AS shift_name,
        sh.start_time,
        sh.end_time
      FROM assignment_change_requests acr
      JOIN assignments  a     ON a.id     = acr.assignment_id
      JOIN sites        s     ON s.id     = a.site_id
      JOIN shifts       sh    ON sh.id    = a.shift_id
      JOIN guards       cg    ON cg.id    = acr.current_guard_id
      LEFT JOIN guards  rg    ON rg.id    = acr.requested_guard_id
      JOIN users        u_req ON u_req.id = acr.requested_by
      LEFT JOIN users   u_ops ON u_ops.id = acr.ops_manager_id
      LEFT JOIN users   u_exe ON u_exe.id = acr.executed_by
      ORDER BY acr.created_at DESC
    `

    return NextResponse.json(rows)
  } catch (error) {
    console.error("[ACR GET]", error)
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 })
  }
}

// POST — coordinator creates a change request
export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user || !["coordinator", "roster_manager", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { assignment_id, reason, requested_guard_id } = body

    if (!assignment_id || !reason?.trim()) {
      return NextResponse.json({ error: "assignment_id and reason are required" }, { status: 400 })
    }

    // Fetch assignment details for the email
    const [asgn] = await sql`
      SELECT a.*, g.first_name || ' ' || g.last_name AS guard_name,
             s.name AS site_name, sh.name AS shift_name, a.date
      FROM assignments a
      JOIN guards g ON g.id = a.guard_id
      JOIN sites s ON s.id = a.site_id
      JOIN shifts sh ON sh.id = a.shift_id
      WHERE a.id = ${assignment_id}
    `
    if (!asgn) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

    const [newReq] = await sql`
      INSERT INTO assignment_change_requests
        (assignment_id, requested_by, current_guard_id, requested_guard_id, reason)
      VALUES
        (${assignment_id}, ${user.id}, ${asgn.guard_id}, ${requested_guard_id ?? null}, ${reason.trim()})
      RETURNING *
    `

    // Notify all ops managers by email
    const opsManagers = await sql`
      SELECT * FROM users WHERE role IN ('operations_manager', 'admin') AND email IS NOT NULL
    `
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://centuriongrp.rw"
    for (const mgr of opsManagers) {
      let requestedGuardName: string | undefined
      if (requested_guard_id) {
        const [rg] = await sql`SELECT first_name || ' ' || last_name AS name FROM guards WHERE id = ${requested_guard_id}`
        requestedGuardName = rg?.name
      }
      await sendEmail({
        to: mgr.email,
        subject: "Assignment Change Request — Action Required",
        html: assignmentChangeRequestEmail({
          opsManagerName: `${mgr.first_name} ${mgr.last_name}`,
          coordinatorName: `${user.first_name} ${user.last_name}`,
          guardName: asgn.guard_name,
          siteName: asgn.site_name,
          shiftName: asgn.shift_name,
          date: asgn.date,
          reason,
          requestedGuardName,
          reviewUrl: `${appUrl}/dashboard/assignment-change-requests`,
        }),
      })
    }

    return NextResponse.json(newReq, { status: 201 })
  } catch (error) {
    console.error("[ACR POST]", error)
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
  }
}
