import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    let incidents
    if (from && to) {
      incidents = await sql`
        SELECT 
          i.id, i.title, i.description, i.incident_type, i.severity, i.status,
          i.incident_date, i.actions_taken, i.email_sent, i.email_sent_to,
          s.name as site_name,
          g.first_name || ' ' || g.last_name as guard_name,
          u.first_name || ' ' || u.last_name as reported_by
        FROM incidents i
        LEFT JOIN sites s ON s.id = i.site_id
        LEFT JOIN guards g ON g.id = i.guard_id
        LEFT JOIN users u ON u.id = i.reported_by
        WHERE i.incident_date::date >= ${from}::date AND i.incident_date::date <= ${to}::date
        ORDER BY i.incident_date DESC, i.id DESC
      `
    } else {
      incidents = await sql`
        SELECT 
          i.id, i.title, i.description, i.incident_type, i.severity, i.status,
          i.incident_date, i.actions_taken, i.email_sent, i.email_sent_to,
          s.name as site_name,
          g.first_name || ' ' || g.last_name as guard_name,
          u.first_name || ' ' || u.last_name as reported_by
        FROM incidents i
        LEFT JOIN sites s ON s.id = i.site_id
        LEFT JOIN guards g ON g.id = i.guard_id
        LEFT JOIN users u ON u.id = i.reported_by
        ORDER BY i.incident_date DESC, i.id DESC
      `
    }

    const headers = ["ID", "Title", "Type", "Severity", "Status", "Date", "Site", "Guard", "Reported By", "Actions Taken", "Email Sent"]
    const rows = incidents.map(i => [
      i.id,
      i.title,
      i.incident_type,
      i.severity,
      i.status,
      new Date(i.incident_date).toLocaleString(),
      i.site_name || "",
      i.guard_name || "",
      i.reported_by || "",
      i.actions_taken || "",
      i.email_sent ? `Yes (${i.email_sent_to})` : "No"
    ])

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=incidents-report-${from}-to-${to}.csv`
      }
    })
  } catch (error) {
    console.error("Error generating incidents report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
