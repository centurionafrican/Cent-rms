import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
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
    const body = await request.json()
    const { name, contact_person, contact_email, contact_phone, address } = body

    if (!name) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO clients (name, contact_person, contact_email, contact_phone, address)
      VALUES (${name}, ${contact_person || null}, ${contact_email || null}, ${contact_phone || null}, ${address || null})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
