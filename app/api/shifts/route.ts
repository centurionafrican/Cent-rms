import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const shifts = await sql`SELECT * FROM shifts ORDER BY start_time`
    return NextResponse.json(shifts)
  } catch (error) {
    console.error("Error fetching shifts:", error)
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
    const { name, start_time, end_time, description, is_active, shift_type } = body

    if (!name || !start_time || !end_time) {
      return NextResponse.json({ error: "Name, start time, and end time are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO shifts (name, start_time, end_time, description, is_active, shift_type)
      VALUES (${name}, ${start_time}, ${end_time}, ${description || null}, ${is_active !== false}, ${shift_type || 'day'})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating shift:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
