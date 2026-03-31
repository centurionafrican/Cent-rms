import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
