import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { date } = body

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    // Get all shifts with their types
    const shifts = await sql`
      SELECT id, name, shift_type FROM shifts WHERE is_active = true
    `

    const dayShift = shifts.find(s => s.shift_type === 'day' || s.name.toLowerCase().includes('day'))
    const nightShift = shifts.find(s => s.shift_type === 'night' || s.name.toLowerCase().includes('night'))

    if (!dayShift || !nightShift) {
      return NextResponse.json({ error: "Day and Night shifts must be configured" }, { status: 400 })
    }

    // First check if there are existing assignments for the rotation date
    const existingAssignments = await sql`
      SELECT id, guard_id, site_id, shift_id
      FROM assignments 
      WHERE date = ${date}
    `

    let rotatedCount = 0

    if (existingAssignments.length > 0) {
      // Rotate existing assignments for the selected date
      for (const assignment of existingAssignments) {
        // Swap shifts: day becomes night, night becomes day
        const newShiftId = assignment.shift_id === dayShift.id ? nightShift.id : dayShift.id

        await sql`
          UPDATE assignments 
          SET shift_id = ${newShiftId}
          WHERE id = ${assignment.id}
        `
        rotatedCount++
      }
    } else {
      // No assignments for the date - get most recent assignments and create rotated ones
      const recentAssignments = await sql`
        SELECT DISTINCT ON (guard_id, site_id) 
          guard_id, site_id, shift_id
        FROM assignments 
        WHERE date < ${date}
        ORDER BY guard_id, site_id, date DESC
      `

      if (recentAssignments.length === 0) {
        return NextResponse.json({ error: "No assignments found to rotate" }, { status: 400 })
      }

      for (const assignment of recentAssignments) {
        // Swap shifts: day becomes night, night becomes day
        const newShiftId = assignment.shift_id === dayShift.id ? nightShift.id : dayShift.id

        await sql`
          INSERT INTO assignments (guard_id, site_id, shift_id, date, status)
          VALUES (${assignment.guard_id}, ${assignment.site_id}, ${newShiftId}, ${date}, 'scheduled')
        `
        rotatedCount++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully rotated ${rotatedCount} assignments for ${date}`,
      rotatedCount 
    })
  } catch (error) {
    console.error("Error rotating assignments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
