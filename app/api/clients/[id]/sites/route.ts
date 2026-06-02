import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const sites = await sql`
      SELECT id, name, address, guards_needed, site_status, contact_person, contact_phone
      FROM sites
      WHERE client_id = ${Number(id)}
      ORDER BY name ASC
    `

    return NextResponse.json({ sites })
  } catch (error) {
    console.error("Error fetching client sites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
