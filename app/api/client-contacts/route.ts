import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("client_id")

    if (!clientId) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 })
    }

    const contacts = await sql`
      SELECT * FROM client_contacts 
      WHERE client_id = ${Number(clientId)}
      ORDER BY is_primary DESC, created_at ASC
    `

    return NextResponse.json(contacts)
  } catch (error) {
    console.error("Error fetching client contacts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { client_id, contact_person, contact_email, contact_phone, is_primary } = body

    if (!client_id) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO client_contacts (client_id, contact_person, contact_email, contact_phone, is_primary)
      VALUES (${Number(client_id)}, ${contact_person || null}, ${contact_email || null}, ${contact_phone || null}, ${is_primary || false})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating client contact:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
