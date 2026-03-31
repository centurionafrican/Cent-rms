import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Load guard data from a session token (for page refreshes)
export async function POST(request: Request) {
  try {
    const { session_token } = await request.json()
    if (!session_token) {
      return NextResponse.json({ error: "Session token required" }, { status: 400 })
    }

    // Validate session
    const sessions = await sql`
      SELECT gos.guard_id, gos.expires_at
      FROM guard_otp_sessions gos
      WHERE gos.session_token = ${session_token}
        AND gos.used_at IS NOT NULL
        AND gos.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 })
    }

    const guardId = sessions[0].guard_id

    // Load guard details
    const guards = await sql`
      SELECT id, first_name, last_name, email, phone, title, guard_title,
             status, id_number, date_joined, annual_leave_days, leave_days_used,
             hire_date, gender, discipline, address, nationality
      FROM guards WHERE id = ${guardId}
    `

    if (guards.length === 0) {
      return NextResponse.json({ error: "Guard not found" }, { status: 404 })
    }

    // Assignments (current + upcoming)
    const assignments = await sql`
      SELECT a.id, a.date, a.status, a.notes,
             s.name as site_name, s.address as site_address,
             sh.name as shift_name, sh.start_time, sh.end_time, sh.color as shift_color,
             r.first_name || ' ' || r.last_name as reliever_name
      FROM assignments a
      JOIN sites s ON s.id = a.site_id
      JOIN shifts sh ON sh.id = a.shift_id
      LEFT JOIN guards r ON r.id = a.reliever_id
      WHERE a.guard_id = ${guardId}
      ORDER BY a.date DESC
      LIMIT 60
    `

    // Leave requests
    const leaves = await sql`
      SELECT id, leave_type, start_date, end_date, status, reason,
             ops_manager_status, hr_status, coceo_status, created_at
      FROM leave_requests
      WHERE guard_id = ${guardId}
      ORDER BY created_at DESC
      LIMIT 20
    `

    // Attendance
    const attendance = await sql`
      SELECT att.id, att.date, att.status,
             att.time_in as check_in, att.time_out as check_out,
             s.name as site_name
      FROM attendance att
      LEFT JOIN assignments a ON a.id = att.assignment_id
      LEFT JOIN sites s ON s.id = a.site_id
      WHERE att.guard_id = ${guardId}
      ORDER BY att.date DESC
      LIMIT 30
    `

    return NextResponse.json({
      success: true,
      guard: guards[0],
      assignments,
      leaves,
      attendance,
    })
  } catch (error) {
    console.error("[guard-portal/session] Error:", error)
    return NextResponse.json({ error: "Failed to load portal data" }, { status: 500 })
  }
}
