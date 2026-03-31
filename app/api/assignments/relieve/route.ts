import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// POST: Assign reliever guard for a specific site/date when someone is on leave
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { site_id, shift_id, guard_id, date_from, date_to, replacing_guard_id } = body

    if (!site_id || !shift_id || !guard_id || !date_from) {
      return NextResponse.json({ error: "site_id, shift_id, guard_id, and date_from are required" }, { status: 400 })
    }

    const endDate = date_to || date_from
    const start = new Date(date_from)
    const end = new Date(endDate)
    let assigned = 0

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]

      // Check guard is not already assigned this day
      const existing = await sql`
        SELECT id FROM assignments 
        WHERE guard_id = ${guard_id} AND date = ${dateStr}
      `
      if (existing.length > 0) continue

      await sql`
        INSERT INTO assignments (guard_id, site_id, shift_id, date, status)
        VALUES (${guard_id}, ${site_id}, ${shift_id}, ${dateStr}, 'scheduled')
      `
      assigned++
    }

    return NextResponse.json({
      success: true,
      assigned,
      message: `Reliever assigned for ${assigned} day(s)`,
      replacing_guard_id,
    })
  } catch (error) {
    console.error("Reliever assignment error:", error)
    return NextResponse.json({ error: "Failed to assign reliever" }, { status: 500 })
  }
}

// GET: Find available guards for a specific date
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const site_id = searchParams.get("site_id")

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 })
    }

    const available = await sql`
      SELECT g.id, g.first_name || ' ' || g.last_name as name, g.employee_id, g.phone
      FROM guards g
      WHERE g.status = 'active'
        AND g.id NOT IN (
          SELECT a.guard_id FROM assignments a WHERE a.date = ${date}
        )
        AND g.id NOT IN (
          SELECT lr.guard_id FROM leave_requests lr 
          WHERE lr.status = 'approved' AND lr.start_date <= ${date} AND lr.end_date >= ${date}
        )
      ORDER BY g.first_name
    `

    return NextResponse.json({ available, date, site_id })
  } catch (error) {
    console.error("Available guards error:", error)
    return NextResponse.json({ error: "Failed to find available guards" }, { status: 500 })
  }
}
