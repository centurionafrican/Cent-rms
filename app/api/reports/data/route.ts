import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "guards"
    const from = searchParams.get("from") || null
    const to = searchParams.get("to") || null
    const status = searchParams.get("status") || null
    const site_id = searchParams.get("site_id") || null

    if (type === "guards") {
      let guards
      if (status) {
        guards = await sql`
          SELECT g.*, 
            (SELECT COUNT(*) FROM assignments a WHERE a.guard_id = g.id AND a.date >= CURRENT_DATE) as upcoming_assignments,
            (SELECT COUNT(*) FROM leave_requests lr WHERE lr.guard_id = g.id AND lr.status = 'approved') as approved_leaves
          FROM guards g 
          WHERE g.status = ${status}
          ORDER BY g.first_name
        `
      } else {
        guards = await sql`
          SELECT g.*, 
            (SELECT COUNT(*) FROM assignments a WHERE a.guard_id = g.id AND a.date >= CURRENT_DATE) as upcoming_assignments,
            (SELECT COUNT(*) FROM leave_requests lr WHERE lr.guard_id = g.id AND lr.status = 'approved') as approved_leaves
          FROM guards g 
          ORDER BY g.first_name
        `
      }
      const columns = guards.length > 0 ? Object.keys(guards[0]) : []
      return NextResponse.json({ rows: guards, columns, type })
    }

    if (type === "assignments") {
      let query
      if (from && to && site_id) {
        query = await sql`
          SELECT 
            a.*,
            g.first_name || ' ' || g.last_name as guard_name,
            s.name as site_name,
            sh.name as shift_name,
            sh.start_time,
            sh.end_time
          FROM assignments a
          JOIN guards g ON g.id = a.guard_id
          JOIN sites s ON s.id = a.site_id
          JOIN shifts sh ON sh.id = a.shift_id
          WHERE a.date >= ${from}::date
            AND a.date <= ${to}::date
            AND a.site_id = ${site_id}::int
          ORDER BY a.date DESC, s.name
        `
      } else if (from && to) {
        query = await sql`
          SELECT 
            a.*,
            g.first_name || ' ' || g.last_name as guard_name,
            s.name as site_name,
            sh.name as shift_name,
            sh.start_time,
            sh.end_time
          FROM assignments a
          JOIN guards g ON g.id = a.guard_id
          JOIN sites s ON s.id = a.site_id
          JOIN shifts sh ON sh.id = a.shift_id
          WHERE a.date >= ${from}::date
            AND a.date <= ${to}::date
          ORDER BY a.date DESC, s.name
        `
      } else {
        query = await sql`
          SELECT 
            a.*,
            g.first_name || ' ' || g.last_name as guard_name,
            s.name as site_name,
            sh.name as shift_name,
            sh.start_time,
            sh.end_time
          FROM assignments a
          JOIN guards g ON g.id = a.guard_id
          JOIN sites s ON s.id = a.site_id
          JOIN shifts sh ON sh.id = a.shift_id
          ORDER BY a.date DESC, s.name
        `
      }
      const columns = query.length > 0 ? Object.keys(query[0]) : []
      return NextResponse.json({ rows: query, columns, type })
    }

    if (type === "attendance") {
      let query
      if (from && to) {
        query = await sql`
          SELECT
            a.date,
            g.first_name || ' ' || g.last_name AS guard_name,
            s.name AS site_name,
            sh.name AS shift_name,
            sh.start_time,
            sh.end_time,
            att.time_in,
            att.time_out,
            att.status,
            att.notes
          FROM attendance att
          JOIN assignments a ON a.id = att.assignment_id
          JOIN guards g ON g.id = a.guard_id
          JOIN sites s ON s.id = a.site_id
          JOIN shifts sh ON sh.id = a.shift_id
          WHERE a.date >= ${from}::date
            AND a.date <= ${to}::date
          ORDER BY a.date DESC, g.first_name
        `
      } else {
        query = await sql`
          SELECT
            a.date,
            g.first_name || ' ' || g.last_name AS guard_name,
            s.name AS site_name,
            sh.name AS shift_name,
            sh.start_time,
            sh.end_time,
            att.time_in,
            att.time_out,
            att.status,
            att.notes
          FROM attendance att
          JOIN assignments a ON a.id = att.assignment_id
          JOIN guards g ON g.id = a.guard_id
          JOIN sites s ON s.id = a.site_id
          JOIN shifts sh ON sh.id = a.shift_id
          ORDER BY a.date DESC, g.first_name
        `
      }
      const columns = query.length > 0 ? Object.keys(query[0]) : []
      return NextResponse.json({ rows: query, columns, type })
    }

    if (type === "leaves") {
      let query
      if (from && to && status) {
        query = await sql`
          SELECT 
            lr.*,
            g.first_name || ' ' || g.last_name as guard_name
          FROM leave_requests lr
          JOIN guards g ON g.id = lr.guard_id
          WHERE lr.start_date >= ${from}::date
            AND lr.end_date <= ${to}::date
            AND lr.status = ${status}
          ORDER BY lr.created_at DESC
        `
      } else if (from && to) {
        query = await sql`
          SELECT 
            lr.*,
            g.first_name || ' ' || g.last_name as guard_name
          FROM leave_requests lr
          JOIN guards g ON g.id = lr.guard_id
          WHERE lr.start_date >= ${from}::date
            AND lr.end_date <= ${to}::date
          ORDER BY lr.created_at DESC
        `
      } else if (status) {
        query = await sql`
          SELECT 
            lr.*,
            g.first_name || ' ' || g.last_name as guard_name
          FROM leave_requests lr
          JOIN guards g ON g.id = lr.guard_id
          WHERE lr.status = ${status}
          ORDER BY lr.created_at DESC
        `
      } else {
        query = await sql`
          SELECT 
            lr.*,
            g.first_name || ' ' || g.last_name as guard_name
          FROM leave_requests lr
          JOIN guards g ON g.id = lr.guard_id
          ORDER BY lr.created_at DESC
        `
      }
      return NextResponse.json({ rows: query, columns: query.length > 0 ? Object.keys(query[0]) : [], type })
    }

    if (type === "incidents") {
      let query
      if (from && to) {
        query = await sql`
          SELECT 
            i.*,
            s.name as site_name,
            g.first_name || ' ' || g.last_name as reported_by_name
          FROM incidents i
          LEFT JOIN sites s ON s.id = i.site_id
          LEFT JOIN guards g ON g.id = i.reported_by
          WHERE i.incident_date >= ${from}::date
            AND i.incident_date <= ${to}::date
          ORDER BY i.incident_date DESC
        `
      } else {
        query = await sql`
          SELECT 
            i.*,
            s.name as site_name,
            g.first_name || ' ' || g.last_name as reported_by_name
          FROM incidents i
          LEFT JOIN sites s ON s.id = i.site_id
          LEFT JOIN guards g ON g.id = i.reported_by
          ORDER BY i.incident_date DESC
        `
      }
      const columns = query.length > 0 ? Object.keys(query[0]) : []
      return NextResponse.json({ rows: query, columns, type })
    }

    if (type === "sites") {
      const sites = await sql`
        SELECT s.*, c.name as client_name,
          (SELECT COUNT(DISTINCT a.guard_id) FROM assignments a WHERE a.site_id = s.id AND a.date >= CURRENT_DATE) as assigned_guards
        FROM sites s
        LEFT JOIN clients c ON c.id = s.client_id
        ORDER BY s.name
      `
      const columns = sites.length > 0 ? Object.keys(sites[0]) : []
      return NextResponse.json({ rows: sites, columns, type })
    }

    if (type === "clients") {
      const clients = await sql`
        SELECT
          ROW_NUMBER() OVER (ORDER BY c.name) AS "#",
          c.name AS "Client Name",
          c.contact_person AS "Contact Person",
          c.email AS "Email",
          c.phone AS "Phone",
          c.address AS "Address",
          CAST(COUNT(s.id) AS INTEGER) AS "Total Sites",
          COALESCE(SUM(s.guards_needed), 0) AS "Guards Needed",
          c.status AS "Status"
        FROM clients c
        LEFT JOIN sites s ON s.client_id = c.id
        GROUP BY c.id, c.name, c.contact_person, c.email, c.phone, c.address, c.status
        ORDER BY c.name
      `
      const columns = clients.length > 0 ? Object.keys(clients[0]) : []
      return NextResponse.json({ rows: clients, columns, type })
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
  } catch (error) {
    console.error("Report data error:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
