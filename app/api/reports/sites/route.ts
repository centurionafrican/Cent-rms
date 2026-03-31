import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sites = await sql`
      SELECT 
        s.id, s.name, s.address, s.contact_person, s.contact_phone, s.is_active, s.created_at,
        COUNT(DISTINCT a.guard_id) as assigned_guards
      FROM sites s
      LEFT JOIN assignments a ON a.site_id = s.id AND a.date = CURRENT_DATE
      GROUP BY s.id
      ORDER BY s.name
    `

    const headers = ["ID", "Name", "Address", "Contact Person", "Contact Phone", "Active", "Assigned Guards", "Created At"]
    const rows = sites.map(s => [
      s.id,
      s.name,
      s.address,
      s.contact_person,
      s.contact_phone,
      s.is_active ? "Yes" : "No",
      s.assigned_guards,
      s.created_at
    ])

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell || ""}"`).join(","))
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=sites-report.csv"
      }
    })
  } catch (error) {
    console.error("Error generating sites report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
