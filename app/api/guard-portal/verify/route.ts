import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Find the token
    const links = await sql`
      SELECT ml.*, g.id as guard_id, g.first_name, g.last_name, g.email, g.phone,
             g.title, g.status, g.id_number, g.date_joined, g.annual_leave_days,
             g.leave_days_used, g.hire_date, g.guard_title, g.gender, g.discipline
      FROM guard_magic_links ml
      JOIN guards g ON g.id = ml.guard_id
      WHERE ml.token = ${token} AND ml.used_at IS NULL AND ml.expires_at > NOW()
    `

    if (links.length === 0) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 })
    }

    const link = links[0]

    // Mark link as used
    await sql`UPDATE guard_magic_links SET used_at = NOW() WHERE id = ${link.id}`

    // Get guard assignments
    const assignments = await sql`
      SELECT a.*, s.name as site_name, sh.name as shift_name, sh.start_time, sh.end_time
      FROM assignments a
      JOIN sites s ON s.id = a.site_id
      JOIN shifts sh ON sh.id = a.shift_id
      WHERE a.guard_id = ${link.guard_id} AND a.date >= CURRENT_DATE
      ORDER BY a.date ASC
      LIMIT 20
    `

    // Get guard leaves
    const leaves = await sql`
      SELECT * FROM leave_requests
      WHERE guard_id = ${link.guard_id}
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Get attendance
    const attendance = await sql`
      SELECT att.*, a.date as assignment_date, s.name as site_name
      FROM attendance att
      LEFT JOIN assignments a ON a.id = att.assignment_id
      LEFT JOIN sites s ON s.id = a.site_id
      WHERE att.guard_id = ${link.guard_id}
      ORDER BY att.date DESC
      LIMIT 20
    `

    return NextResponse.json({
      success: true,
      guard: {
        id: link.guard_id,
        first_name: link.first_name,
        last_name: link.last_name,
        email: link.email,
        phone: link.phone,
        title: link.title,
        guard_title: link.guard_title,
        status: link.status,
        id_number: link.id_number,
        date_joined: link.date_joined,
        annual_leave_days: link.annual_leave_days,
        leave_days_used: link.leave_days_used,
        hire_date: link.hire_date,
        gender: link.gender,
        discipline: link.discipline,
      },
      assignments,
      leaves,
      attendance,
    })
  } catch (error) {
    console.error("Verify token error:", error)
    return NextResponse.json({ error: "Failed to verify token" }, { status: 500 })
  }
}
