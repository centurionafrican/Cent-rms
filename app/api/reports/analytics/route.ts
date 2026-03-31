import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  try {
    if (type === "guard_analytics") {
      const present = await sql`
        SELECT COUNT(*) as count FROM attendance WHERE status = 'present' AND date >= ${from}::date AND date <= ${to}::date
      `
      const absent = await sql`
        SELECT COUNT(*) as count FROM attendance WHERE status = 'absent' AND date >= ${from}::date AND date <= ${to}::date
      `
      const late = await sql`
        SELECT COUNT(*) as count FROM attendance WHERE status = 'late' AND date >= ${from}::date AND date <= ${to}::date
      `
      const daily = await sql`
        SELECT date, 
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
          COUNT(CASE WHEN status = 'late' THEN 1 END) as late
        FROM attendance
        WHERE date >= ${from}::date AND date <= ${to}::date
        GROUP BY date
        ORDER BY date
      `
      return NextResponse.json({
        summary: {
          present: present[0]?.count || 0,
          absent: absent[0]?.count || 0,
          late: late[0]?.count || 0,
        },
        trend: daily,
      })
    }

    if (type === "site_analytics") {
      const siteStats = await sql`
        SELECT s.id, s.name,
          (SELECT COUNT(DISTINCT a.guard_id) FROM assignments a WHERE a.site_id = s.id) as total_guards,
          (SELECT COUNT(*) FROM assignments a WHERE a.site_id = s.id AND a.date >= CURRENT_DATE) as upcoming_assignments,
          (SELECT COUNT(*) FROM incidents i WHERE i.site_id = s.id AND i.status = 'open') as open_incidents,
          (SELECT AVG(EXTRACT(EPOCH FROM (att.time_out - att.time_in))/3600) 
           FROM attendance att
           JOIN assignments a ON a.id = att.assignment_id
           WHERE a.site_id = s.id AND att.date >= ${from}::date AND att.date <= ${to}::date) as avg_hours_worked
        FROM sites s
        WHERE s.is_active = true
        ORDER BY total_guards DESC
      `
      return NextResponse.json({ sites: siteStats })
    }

    if (type === "leave_analytics") {
      const approved = await sql`
        SELECT COUNT(*) as count FROM leave_requests WHERE status = 'approved'
      `
      const pending = await sql`
        SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'
      `
      const rejected = await sql`
        SELECT COUNT(*) as count FROM leave_requests WHERE status = 'rejected'
      `
      const byType = await sql`
        SELECT leave_type, COUNT(*) as count FROM leave_requests WHERE status = 'approved' GROUP BY leave_type
      `
      return NextResponse.json({
        summary: {
          approved: approved[0]?.count || 0,
          pending: pending[0]?.count || 0,
          rejected: rejected[0]?.count || 0,
        },
        byType,
      })
    }

    if (type === "incident_analytics") {
      const bySeverity = await sql`
        SELECT severity, COUNT(*) as count FROM incidents GROUP BY severity
      `
      const byStatus = await sql`
        SELECT status, COUNT(*) as count FROM incidents GROUP BY status
      `
      const byMonth = await sql`
        SELECT DATE_TRUNC('month', incident_date) as month, COUNT(*) as count
        FROM incidents
        WHERE incident_date >= ${from}::date AND incident_date <= ${to}::date
        GROUP BY month
        ORDER BY month
      `
      return NextResponse.json({
        severity: bySeverity,
        status: byStatus,
        trend: byMonth,
      })
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
