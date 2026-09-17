import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get("site_id")

    if (!siteId) {
      return NextResponse.json({ error: "site_id is required" }, { status: 400 })
    }

    const contacts = await sql`
      SELECT * FROM site_contacts 
      WHERE site_id = ${Number(siteId)}
      ORDER BY is_primary DESC, created_at ASC
    `

    return NextResponse.json(contacts)
  } catch (error) {
    console.error("Error fetching site contacts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { site_id, contact_person, contact_email, contact_phone, is_primary } = body

    if (!site_id) {
      return NextResponse.json({ error: "site_id is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO site_contacts (site_id, contact_person, contact_email, contact_phone, is_primary)
      VALUES (${Number(site_id)}, ${contact_person || null}, ${contact_email || null}, ${contact_phone || null}, ${is_primary || false})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating site contact:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
