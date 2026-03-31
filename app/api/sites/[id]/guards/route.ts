import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const site = await sql`
      SELECT s.*, c.name as client_name
      FROM sites s
      LEFT JOIN clients c ON c.id = s.client_id
      WHERE s.id = ${id}
    `

    if (!site.length) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    // Get current assignments with guard info
    const assignments = await sql`
      SELECT 
        a.*,
        g.first_name || ' ' || g.last_name as guard_name,
        g.phone as guard_phone,
        g.status as guard_status,
        sh.name as shift_name,
        sh.start_time,
        sh.end_time
      FROM assignments a
      JOIN guards g ON g.id = a.guard_id
      JOIN shifts sh ON sh.id = a.shift_id
      WHERE a.site_id = ${id} AND a.date >= CURRENT_DATE
      ORDER BY a.date, sh.start_time
    `

    // Get leave alerts - guards assigned here who have approved leave coming up
    const leaveAlerts = await sql`
      SELECT 
        lr.*,
        g.first_name || ' ' || g.last_name as guard_name,
        a.date as assignment_date,
        sh.name as shift_name
      FROM leave_requests lr
      JOIN guards g ON g.id = lr.guard_id
      JOIN assignments a ON a.guard_id = lr.guard_id AND a.site_id = ${id}
      JOIN shifts sh ON sh.id = a.shift_id
      WHERE lr.status IN ('approved', 'pending')
        AND lr.start_date <= a.date AND lr.end_date >= a.date
        AND a.date >= CURRENT_DATE
      ORDER BY lr.start_date
    `

    // Get available guards (active, not already assigned on upcoming dates at this site)
    const availableGuards = await sql`
      SELECT g.id, g.first_name || ' ' || g.last_name as name, g.phone, g.status
      FROM guards g
      WHERE g.status = 'active'
        AND g.id NOT IN (
          SELECT DISTINCT a2.guard_id FROM assignments a2 WHERE a2.date >= CURRENT_DATE
        )
      ORDER BY g.first_name
    `

    return NextResponse.json({
      site: site[0],
      assignments,
      leaveAlerts,
      availableGuards,
      stats: {
        totalAssigned: new Set(assignments.map((a: Record<string, unknown>) => a.guard_id)).size,
        guardsNeeded: site[0].guards_needed || 0,
        upcomingLeaves: leaveAlerts.length,
      },
    })
  } catch (error) {
    console.error("Site detail error:", error)
    return NextResponse.json({ error: "Failed to load site details" }, { status: 500 })
  }
}
