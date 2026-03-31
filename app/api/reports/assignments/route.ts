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

    let assignments
    if (from && to) {
      assignments = await sql`
        SELECT 
          a.id, a.date, a.status, a.notes,
          g.first_name || ' ' || g.last_name as guard_name,
          s.name as site_name,
          sh.name as shift_name,
          sh.start_time, sh.end_time,
          r.first_name || ' ' || r.last_name as reliever_name
        FROM assignments a
        JOIN guards g ON g.id = a.guard_id
        JOIN sites s ON s.id = a.site_id
        JOIN shifts sh ON sh.id = a.shift_id
        LEFT JOIN guards r ON r.id = a.reliever_id
        WHERE a.date >= ${from} AND a.date <= ${to}
        ORDER BY a.date DESC, sh.start_time ASC, a.id DESC
      `
    } else {
      assignments = await sql`
        SELECT 
          a.id, a.date, a.status, a.notes,
          g.first_name || ' ' || g.last_name as guard_name,
          s.name as site_name,
          sh.name as shift_name,
          sh.start_time, sh.end_time,
          r.first_name || ' ' || r.last_name as reliever_name
        FROM assignments a
        JOIN guards g ON g.id = a.guard_id
        JOIN sites s ON s.id = a.site_id
        JOIN shifts sh ON sh.id = a.shift_id
        LEFT JOIN guards r ON r.id = a.reliever_id
        ORDER BY a.date DESC, sh.start_time ASC, a.id DESC
      `
    }

    const headers = ["ID", "Date", "Guard", "Site", "Shift", "Start Time", "End Time", "Status", "Reliever", "Notes"]
    const rows = assignments.map(a => [
      a.id,
      a.date,
      a.guard_name,
      a.site_name,
      a.shift_name,
      a.start_time,
      a.end_time,
      a.status,
      a.reliever_name || "",
      a.notes || ""
    ])

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell || ""}"`).join(","))
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=assignments-report-${from}-to-${to}.csv`
      }
    })
  } catch (error) {
    console.error("Error generating assignments report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
