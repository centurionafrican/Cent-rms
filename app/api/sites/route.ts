import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sites = await sql`
      SELECT s.*, c.name as client_name
      FROM sites s
      LEFT JOIN clients c ON c.id = s.client_id
      ORDER BY s.name
    `
    return NextResponse.json(sites)
  } catch (error) {
    console.error("Error fetching sites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, contact_person, contact_phone, is_active, client_id, site_status, guards_needed } = body

    if (!name) {
      return NextResponse.json({ error: "Site name is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO sites (name, address, contact_person, contact_phone, is_active, client_id, site_status, guards_needed)
      VALUES (${name}, ${address || null}, ${contact_person || null}, ${contact_phone || null}, ${is_active !== false}, ${client_id || null}, ${site_status || 'active'}, ${guards_needed || 1})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating site:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
