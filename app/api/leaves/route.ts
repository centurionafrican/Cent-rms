import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const leaves = await sql`
      SELECT 
        lr.*,
        g.first_name || ' ' || g.last_name as guard_name,
        g.phone as guard_phone,
        u.first_name || ' ' || u.last_name as reviewed_by_name,
        om.first_name || ' ' || om.last_name as ops_manager_name,
        hr.first_name || ' ' || hr.last_name as hr_name,
        cc.first_name || ' ' || cc.last_name as coceo_name
      FROM leave_requests lr
      JOIN guards g ON g.id = lr.guard_id
      LEFT JOIN users u ON u.id = lr.reviewed_by
      LEFT JOIN users om ON om.id = lr.ops_manager_approved_by
      LEFT JOIN users hr ON hr.id = lr.hr_approved_by
      LEFT JOIN users cc ON cc.id = lr.coceo_approved_by
      ORDER BY lr.created_at DESC
    `
    return NextResponse.json({ leaves })
  } catch (error) {
    console.error("Error fetching leaves:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { guard_id, leave_type, start_date, end_date, reason } = body

    if (!guard_id || !leave_type || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO leave_requests (guard_id, leave_type, start_date, end_date, reason, status)
      VALUES (${guard_id}, ${leave_type}, ${start_date}, ${end_date}, ${reason || null}, 'pending')
      RETURNING *
    `

    return NextResponse.json({ leave: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating leave request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
