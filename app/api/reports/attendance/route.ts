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

    let attendance
    if (from && to) {
      attendance = await sql`
        SELECT 
          att.id, att.time_in, att.time_out, att.status, att.notes,
          a.date,
          g.first_name || ' ' || g.last_name as guard_name,
          s.name as site_name,
          sh.name as shift_name
        FROM attendance att
        JOIN assignments a ON a.id = att.assignment_id
        JOIN guards g ON g.id = a.guard_id
        JOIN sites s ON s.id = a.site_id
        JOIN shifts sh ON sh.id = a.shift_id
        WHERE a.date >= ${from} AND a.date <= ${to}
        ORDER BY a.date DESC, att.time_in DESC, att.id DESC
      `
    } else {
      attendance = await sql`
        SELECT 
          att.id, att.time_in, att.time_out, att.status, att.notes,
          a.date,
          g.first_name || ' ' || g.last_name as guard_name,
          s.name as site_name,
          sh.name as shift_name
        FROM attendance att
        JOIN assignments a ON a.id = att.assignment_id
        JOIN guards g ON g.id = a.guard_id
        JOIN sites s ON s.id = a.site_id
        JOIN shifts sh ON sh.id = a.shift_id
        ORDER BY a.date DESC, att.time_in DESC, att.id DESC
      `
    }

    const headers = ["ID", "Date", "Guard", "Site", "Shift", "Time In", "Time Out", "Status", "Notes"]
    const rows = attendance.map(a => [
      a.id,
      a.date,
      a.guard_name,
      a.site_name,
      a.shift_name,
      a.time_in ? new Date(a.time_in).toLocaleTimeString() : "",
      a.time_out ? new Date(a.time_out).toLocaleTimeString() : "",
      a.status,
      a.notes || ""
    ])

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell || ""}"`).join(","))
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=attendance-report-${from}-to-${to}.csv`
      }
    })
  } catch (error) {
    console.error("Error generating attendance report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
