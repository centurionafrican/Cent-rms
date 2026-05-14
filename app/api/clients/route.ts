import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
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
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
