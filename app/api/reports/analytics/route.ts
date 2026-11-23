import { getReportAccessResponse } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

function isISODate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function GET(request: Request) {
  const accessResponse = await getReportAccessResponse()
  if (accessResponse) return accessResponse

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  if (!isISODate(from) || !isISODate(to) || from > to) {
    return NextResponse.json({ error: "A valid date range is required" }, { status: 400 })
  }

  try {
    if (type === "guard_analytics") {
      const summary = await sql`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'present')::int AS present,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'absent')::int AS absent
        FROM attendance
        WHERE date BETWEEN ${from}::date AND ${to}::date
      ` as Array<{ present: number; absent: number }>
      const status = await sql`
        SELECT COALESCE(NULLIF(BTRIM(status), ''), 'Unspecified') AS status, COUNT(*)::int AS count
        FROM attendance
        WHERE date BETWEEN ${from}::date AND ${to}::date
        GROUP BY status
        ORDER BY status
      `
      const daily = await sql`
        SELECT date,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'present')::int AS present,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'absent')::int AS absent
        FROM attendance
        WHERE date BETWEEN ${from}::date AND ${to}::date
        GROUP BY date
        ORDER BY date
      `
      return NextResponse.json({
        summary: summary[0] || { present: 0, absent: 0 },
        status,
        trend: daily,
      })
    }

    if (type === "site_analytics") {
      const sites = await sql`
        SELECT
          s.id,
          s.name,
          s.guards_needed,
          (SELECT COUNT(DISTINCT a.guard_id)::int
           FROM assignments a
           WHERE a.site_id = s.id AND a.date BETWEEN ${from}::date AND ${to}::date) AS assigned_guards,
          (SELECT COUNT(*)::int
           FROM assignments a
           WHERE a.site_id = s.id
             AND a.date BETWEEN ${from}::date AND ${to}::date
             AND a.date >= CURRENT_DATE) AS upcoming_assignments,
          (SELECT COUNT(*)::int
           FROM incidents i
           WHERE i.site_id = s.id
             AND LOWER(COALESCE(i.status, '')) = 'open'
             AND i.incident_date::date BETWEEN ${from}::date AND ${to}::date) AS open_incidents,
          (SELECT AVG(EXTRACT(EPOCH FROM (att.time_out - att.time_in)) / 3600.0)
           FROM attendance att
           JOIN assignments a ON a.id = att.assignment_id
           WHERE a.site_id = s.id
             AND att.date BETWEEN ${from}::date AND ${to}::date
             AND att.time_in IS NOT NULL
             AND att.time_out IS NOT NULL) AS avg_hours_worked
        FROM sites s
        WHERE s.is_active = TRUE
        ORDER BY s.guards_needed DESC NULLS LAST, s.name
      `
      const summary = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM sites WHERE is_active = TRUE) AS active_sites,
          (SELECT COALESCE(SUM(guards_needed), 0)::int FROM sites WHERE is_active = TRUE) AS guards_needed,
          (SELECT COUNT(*)::int FROM guards WHERE LOWER(COALESCE(status, '')) = 'active') AS active_guards,
          (SELECT COUNT(DISTINCT a.guard_id)::int
           FROM assignments a
           JOIN sites s ON s.id = a.site_id
           WHERE s.is_active = TRUE AND a.date BETWEEN ${from}::date AND ${to}::date) AS assigned_guards,
          (SELECT COUNT(DISTINCT i.id)::int
           FROM incidents i
           JOIN sites s ON s.id = i.site_id
           WHERE s.is_active = TRUE
             AND LOWER(COALESCE(i.status, '')) = 'open'
             AND i.incident_date::date BETWEEN ${from}::date AND ${to}::date) AS open_incidents
      ` as Array<{ active_sites: number; guards_needed: number; active_guards: number; assigned_guards: number; open_incidents: number }>
      return NextResponse.json({ sites, summary: summary[0] })
    }

    if (type === "leave_analytics") {
      const status = await sql`
        SELECT COALESCE(NULLIF(BTRIM(status), ''), 'Unspecified') AS status, COUNT(*)::int AS count
        FROM leave_requests
        WHERE start_date <= ${to}::date AND end_date >= ${from}::date
        GROUP BY status
        ORDER BY status
      ` as Array<{ status: string; count: number }>
      const byType = await sql`
        SELECT COALESCE(NULLIF(BTRIM(leave_type), ''), 'Unspecified') AS leave_type, COUNT(*)::int AS count
        FROM leave_requests
        WHERE start_date <= ${to}::date AND end_date >= ${from}::date
        GROUP BY leave_type
        ORDER BY leave_type
      `
      const summary = status.reduce(
        (result: { approved: number; pending: number; rejected: number }, row: { status: string; count: number }) => {
          const normalizedStatus = row.status.toLowerCase()
          if (normalizedStatus === "approved") result.approved = row.count
          if (normalizedStatus === "pending") result.pending = row.count
          if (normalizedStatus === "rejected") result.rejected = row.count
          return result
        },
        { approved: 0, pending: 0, rejected: 0 },
      )
      return NextResponse.json({ summary, status, byType })
    }

    if (type === "incident_analytics") {
      const bySeverity = await sql`
        SELECT COALESCE(NULLIF(BTRIM(severity), ''), 'Unspecified') AS severity, COUNT(*)::int AS count
        FROM incidents
        WHERE incident_date::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY severity
        ORDER BY severity
      `
      const byStatus = await sql`
        SELECT COALESCE(NULLIF(BTRIM(status), ''), 'Unspecified') AS status, COUNT(*)::int AS count
        FROM incidents
        WHERE incident_date::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY status
        ORDER BY status
      `
      const byMonth = await sql`
        SELECT DATE_TRUNC('month', incident_date)::date AS month, COUNT(*)::int AS count
        FROM incidents
        WHERE incident_date::date BETWEEN ${from}::date AND ${to}::date
        GROUP BY month
        ORDER BY month
      `
      return NextResponse.json({ severity: bySeverity, status: byStatus, trend: byMonth })
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
