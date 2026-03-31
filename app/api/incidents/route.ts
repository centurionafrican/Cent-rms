import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const incidents = await sql`
      SELECT 
        i.*,
        s.name as site_name,
        g.first_name || ' ' || g.last_name as guard_name,
        u.first_name || ' ' || u.last_name as reported_by_name
      FROM incidents i
      LEFT JOIN sites s ON s.id = i.site_id
      LEFT JOIN guards g ON g.id = i.guard_id
      LEFT JOIN users u ON u.id = i.reported_by
      ORDER BY i.created_at DESC
    `
    return NextResponse.json(incidents)
  } catch (error) {
    console.error("Failed to fetch incidents:", error)
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, incident_type, severity, site_id, guard_id, reported_by, incident_date, actions_taken, attachment_url, attachments, notified_parties } = body

    const result = await sql`
      INSERT INTO incidents (title, description, incident_type, severity, site_id, guard_id, reported_by, incident_date, actions_taken, attachment_url, attachments, notified_parties)
      VALUES (${title}, ${description}, ${incident_type}, ${severity}, ${site_id || null}, ${guard_id || null}, ${reported_by || null}, ${incident_date}, ${actions_taken || null}, ${attachment_url || null}, ${attachments ? JSON.stringify(attachments) : null}, ${notified_parties || null})
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Failed to create incident:", error)
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 })
  }
}
