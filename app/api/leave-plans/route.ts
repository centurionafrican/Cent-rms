import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const guardId = searchParams.get("guard_id")

    let query = `
      SELECT lp.*, g.first_name || ' ' || g.last_name as guard_name
      FROM leave_plans lp
      JOIN guards g ON g.id = lp.guard_id
    `

    if (guardId) {
      query += ` WHERE lp.guard_id = ${Number(guardId)}`
    }

    query += ` ORDER BY lp.start_date DESC`

    const plans = await sql(query)
    return NextResponse.json(plans)
  } catch (error) {
    console.error("Error fetching leave plans:", error)
    return NextResponse.json({ error: "Failed to fetch leave plans" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { guard_id, start_date, end_date, leave_type, reason, created_by } = body

    if (!guard_id || !start_date || !end_date || !leave_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO leave_plans (guard_id, start_date, end_date, leave_type, reason, created_by)
      VALUES (${Number(guard_id)}, ${start_date}, ${end_date}, ${leave_type}, ${reason || null}, ${created_by || null})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating leave plan:", error)
    return NextResponse.json({ error: "Failed to create leave plan" }, { status: 500 })
  }
}
