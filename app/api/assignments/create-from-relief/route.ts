import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { relievedAssignmentId, relieverId } = await request.json()

    // Get the relieved assignment details
    const relievedAssignment = await sql`
      SELECT 
        a.id,
        a.site_id,
        a.shift_id,
        a.date_from,
        a.date_to,
        a.guard_id,
        a.status,
        g.first_name,
        g.last_name
      FROM assignments a
      JOIN guards g ON a.guard_id = g.id
      WHERE a.id = ${relievedAssignmentId}
    `

    if (relievedAssignment.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const assignment = relievedAssignment[0]

    // Get reliever details
    const relieverData = await sql`
      SELECT first_name, last_name FROM guards WHERE id = ${relieverId}
    `

    if (relieverData.length === 0) {
      return NextResponse.json({ error: "Reliever not found" }, { status: 404 })
    }

    // Create auto-assignment for the reliever with same requirements
    const newAssignment = await sql`
      INSERT INTO assignments (
        guard_id,
        site_id,
        shift_id,
        date_from,
        date_to,
        status,
        notes
      ) VALUES (
        ${relieverId},
        ${assignment.site_id},
        ${assignment.shift_id},
        ${assignment.date_from},
        ${assignment.date_to},
        'auto_assigned',
        ${'Auto-assigned as reliever for ' + assignment.first_name + ' ' + assignment.last_name}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: "Reliever assignment created successfully",
      assignment: newAssignment[0],
    })
  } catch (error) {
    console.error("Failed to create reliever assignment:", error)
    return NextResponse.json(
      { error: "Failed to create reliever assignment" },
      { status: 500 }
    )
  }
}
