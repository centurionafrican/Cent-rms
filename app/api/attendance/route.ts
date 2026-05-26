import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
    const limit = Number(searchParams.get("limit")) || 500

    const records = await sql`
      SELECT 
        a.id,
        a.assignment_id,
        g.first_name || ' ' || g.last_name as guard_name,
        s.name as site_name,
        a.time_in,
        a.time_out,
        a.status,
        a.date
      FROM attendance a
      JOIN assignments ast ON a.assignment_id = ast.id
      JOIN guards g ON ast.guard_id = g.id
      JOIN sites s ON ast.site_id = s.id
      WHERE a.date::date = ${date}::date
      ORDER BY a.date DESC, g.first_name
      LIMIT ${limit}
    `

    return NextResponse.json(records)
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { assignment_id, action } = body

    if (!assignment_id || action !== "clock_in") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO attendance (assignment_id, date, time_in, status)
      VALUES (${assignment_id}, CURRENT_DATE, NOW(), 'present')
      RETURNING *
    `

    return NextResponse.json({ attendance: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
