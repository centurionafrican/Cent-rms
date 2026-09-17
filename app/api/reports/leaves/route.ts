import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    let leaves
    if (from && to) {
      leaves = await sql`
        SELECT 
          l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
          g.first_name || ' ' || g.last_name as guard_name,
          g.guard_code,
          l.roster_manager_approved,
          l.roster_manager_approved_at,
          rm.first_name || ' ' || rm.last_name as roster_manager_name,
          l.ops_manager_approved,
          l.ops_manager_approved_at,
          om.first_name || ' ' || om.last_name as ops_manager_name,
          l.hr_approved,
          l.hr_approved_at,
          hr.first_name || ' ' || hr.last_name as hr_name,
          l.coceo_approved,
          l.coceo_approved_at,
          coceo.first_name || ' ' || coceo.last_name as coceo_name
        FROM leave_requests l
        JOIN guards g ON g.id = l.guard_id
        LEFT JOIN users rm ON rm.id = l.roster_manager_id
        LEFT JOIN users om ON om.id = l.ops_manager_approved_by
        LEFT JOIN users hr ON hr.id = l.hr_approved_by
        LEFT JOIN users coceo ON coceo.id = l.coceo_approved_by
        WHERE l.start_date::date >= ${from}::date AND l.start_date::date <= ${to}::date
        ORDER BY l.start_date DESC, l.id DESC
      `
    } else {
      leaves = await sql`
        SELECT 
          l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
          g.first_name || ' ' || g.last_name as guard_name,
          g.guard_code,
          l.roster_manager_approved,
          l.roster_manager_approved_at,
          rm.first_name || ' ' || rm.last_name as roster_manager_name,
          l.ops_manager_approved,
          l.ops_manager_approved_at,
          om.first_name || ' ' || om.last_name as ops_manager_name,
          l.hr_approved,
          l.hr_approved_at,
          hr.first_name || ' ' || hr.last_name as hr_name,
          l.coceo_approved,
          l.coceo_approved_at,
          coceo.first_name || ' ' || coceo.last_name as coceo_name
        FROM leave_requests l
        JOIN guards g ON g.id = l.guard_id
        LEFT JOIN users rm ON rm.id = l.roster_manager_id
        LEFT JOIN users om ON om.id = l.ops_manager_approved_by
        LEFT JOIN users hr ON hr.id = l.hr_approved_by
        LEFT JOIN users coceo ON coceo.id = l.coceo_approved_by
        ORDER BY l.start_date DESC, l.id DESC
      `
    }

    // Calculate working days between two dates
    function getWorkingDays(start: string, end: string): number {
      const startDate = new Date(start)
      const endDate = new Date(end)
      let count = 0
      const current = new Date(startDate)
      while (current <= endDate) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++
        current.setDate(current.getDate() + 1)
      }
      return count
    }

    const headers = [
      "ID", "Guard Code", "Guard Name", "Leave Type", "Start Date", "End Date", "Working Days", 
      "Reason", "Status", 
      "Roster Mgr Approved", "Roster Mgr Name", "Roster Mgr Date",
      "Ops Mgr Approved", "Ops Mgr Name", "Ops Mgr Date",
      "HR Approved", "HR Name", "HR Date",
      "Co-CEO Approved", "Co-CEO Name", "Co-CEO Date",
      "Created At"
    ]
    const rows = leaves.map(l => [
      l.id,
      l.guard_code || "",
      l.guard_name,
      l.leave_type,
      l.start_date,
      l.end_date,
      getWorkingDays(l.start_date, l.end_date),
      l.reason || "",
      l.status,
      l.roster_manager_approved === true ? "Yes" : l.roster_manager_approved === false ? "Rejected" : "Pending",
      l.roster_manager_name || "",
      l.roster_manager_approved_at ? new Date(l.roster_manager_approved_at).toLocaleDateString() : "",
      l.ops_manager_approved === true ? "Yes" : l.ops_manager_approved === false ? "Rejected" : "Pending",
      l.ops_manager_name || "",
      l.ops_manager_approved_at ? new Date(l.ops_manager_approved_at).toLocaleDateString() : "",
      l.hr_approved === true ? "Yes" : l.hr_approved === false ? "Rejected" : "Pending",
      l.hr_name || "",
      l.hr_approved_at ? new Date(l.hr_approved_at).toLocaleDateString() : "",
      l.coceo_approved === true ? "Yes" : l.coceo_approved === false ? "Rejected" : "Pending",
      l.coceo_name || "",
      l.coceo_approved_at ? new Date(l.coceo_approved_at).toLocaleDateString() : "",
      l.created_at
    ])

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=leaves-report-${from}-to-${to}.csv`
      }
    })
  } catch (error) {
    console.error("Error generating leaves report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
