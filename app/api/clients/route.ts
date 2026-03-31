import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const clients = await sql`
      SELECT c.*, 
        CAST((SELECT COUNT(*) FROM sites s WHERE s.client_id = c.id) AS INTEGER) as site_count,
        (SELECT COALESCE(SUM(s.guards_needed), 0) FROM sites s WHERE s.client_id = c.id) as total_guards_needed
      FROM clients c
      ORDER BY c.name ASC
    `
    return NextResponse.json({ clients })
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { name, contact_person, contact_email, contact_phone, address, city, notes } = await request.json()

    if (!name) return NextResponse.json({ error: "Client name is required" }, { status: 400 })

    const result = await sql`
      INSERT INTO clients (name, contact_person, contact_email, contact_phone, address, city, notes)
      VALUES (${name}, ${contact_person || null}, ${contact_email || null}, ${contact_phone || null}, ${address || null}, ${city || null}, ${notes || null})
      RETURNING *
    `
    return NextResponse.json({ client: result[0] })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
