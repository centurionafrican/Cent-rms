import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
      WHERE i.id = ${id}
    `
    if (incidents.length === 0) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    return NextResponse.json(incidents[0])
  } catch (error) {
    console.error("Failed to fetch incident:", error)
    return NextResponse.json({ error: "Failed to fetch incident" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, incident_type, severity, site_id, guard_id, incident_date, status, actions_taken, attachment_url, attachments, notified_parties, resolution_notes } = body

    const result = await sql`
      UPDATE incidents 
      SET title = ${title},
          description = ${description},
          incident_type = ${incident_type},
          severity = ${severity},
          site_id = ${site_id || null},
          guard_id = ${guard_id || null},
          incident_date = ${incident_date},
          status = ${status},
          actions_taken = ${actions_taken || null},
          attachment_url = ${attachment_url || null},
          attachments = ${attachments ? JSON.stringify(attachments) : null},
          notified_parties = ${notified_parties || null},
          resolution_notes = ${resolution_notes || null},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    if (result.length === 0) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }
    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Failed to update incident:", error)
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await sql`DELETE FROM incidents WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete incident:", error)
    return NextResponse.json({ error: "Failed to delete incident" }, { status: 500 })
  }
}
