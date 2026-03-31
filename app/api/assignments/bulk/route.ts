import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { site_id, shift_id, date_from, date_to, guard_ids, auto_assign, guards_needed, position } = await request.json()

    if (!site_id || !shift_id || !date_from || !date_to) {
      return NextResponse.json({ error: "Site, shift, and date range are required" }, { status: 400 })
    }

    // Generate all dates in the range
    const dates: string[] = []
    const start = new Date(date_from)
    const end = new Date(date_to)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0])
    }

    let selectedGuardIds: number[] = guard_ids || []

    // Auto-assign: pick available guards who are "active" status and not already assigned on those dates
    if (auto_assign) {
      const needed = guards_needed || 1

      // Get active guards not on leave and not already assigned to this site+shift on any of those dates
      const availableGuards = await sql`
        SELECT g.id FROM guards g
        WHERE g.status = 'active'
          AND g.id NOT IN (
            SELECT lr.guard_id FROM leave_requests lr
            WHERE lr.status = 'approved'
              AND lr.start_date <= ${date_to}
              AND lr.end_date >= ${date_from}
          )
        ORDER BY (
          SELECT COUNT(*) FROM assignments a
          WHERE a.guard_id = g.id AND a.date::date >= ${date_from}::date AND a.date::date <= ${date_to}::date
        ) ASC, RANDOM()
        LIMIT ${needed}
      `

      selectedGuardIds = availableGuards.map((g: { id: number }) => g.id)

      if (selectedGuardIds.length === 0) {
        return NextResponse.json({ error: "No available guards found for the selected date range" }, { status: 400 })
      }
    }

    if (selectedGuardIds.length === 0) {
      return NextResponse.json({ error: "No guards selected" }, { status: 400 })
    }

    // Create assignments for each guard on each date
    let created = 0
    let skipped = 0

    for (const date of dates) {
      for (const guardId of selectedGuardIds) {
        // Check if assignment already exists
        const existing = await sql`
          SELECT id FROM assignments
          WHERE guard_id = ${guardId} AND site_id = ${site_id} AND shift_id = ${shift_id} AND date::date = ${date}::date
        `
        if (existing.length > 0) {
          skipped++
          continue
        }

        await sql`
          INSERT INTO assignments (guard_id, site_id, shift_id, date, status, position)
          VALUES (${guardId}, ${site_id}, ${shift_id}, ${date}, 'scheduled', ${position || null})
        `
        created++
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      guards: selectedGuardIds.length,
      days: dates.length,
      message: `Created ${created} assignments for ${selectedGuardIds.length} guards over ${dates.length} days. ${skipped} duplicates skipped.`,
    })
  } catch (error) {
    console.error("Error bulk assigning:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
