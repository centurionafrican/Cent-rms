import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    let leaves
    if (from && to) {
      leaves = await sql`
        SELECT 
          l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
          g.first_name || ' ' || g.last_name as guard_name,
          u.first_name || ' ' || u.last_name as reviewed_by
        FROM leave_requests l
        JOIN guards g ON g.id = l.guard_id
        LEFT JOIN users u ON u.id = l.reviewed_by
        WHERE l.start_date::date >= ${from}::date AND l.start_date::date <= ${to}::date
        ORDER BY l.start_date DESC, l.id DESC
      `
    } else {
      leaves = await sql`
        SELECT 
          l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
          g.first_name || ' ' || g.last_name as guard_name,
          u.first_name || ' ' || u.last_name as reviewed_by
        FROM leave_requests l
        JOIN guards g ON g.id = l.guard_id
        LEFT JOIN users u ON u.id = l.reviewed_by
        ORDER BY l.start_date DESC, l.id DESC
      `
    }

    const headers = ["ID", "Guard", "Type", "Start Date", "End Date", "Reason", "Status", "Reviewed By", "Created At"]
    const rows = leaves.map(l => [
      l.id,
      l.guard_name,
      l.leave_type,
      l.start_date,
      l.end_date,
      l.reason || "",
      l.status,
      l.reviewed_by || "",
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
