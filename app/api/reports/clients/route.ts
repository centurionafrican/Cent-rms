import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clients = await sql`
      SELECT
        ROW_NUMBER() OVER (ORDER BY c.name) AS "#",
        c.name                                                              AS "Client Name",
        c.contact_person                                                    AS "Contact Person",
        c.contact_email                                                     AS "Email",
        c.contact_phone                                                     AS "Phone",
        c.city                                                              AS "City",
        c.address                                                           AS "Address",
        CASE WHEN c.is_active THEN 'Active' ELSE 'Inactive' END            AS "Status",
        CAST(COUNT(s.id) AS INTEGER)                                        AS "Total Sites",
        COALESCE(SUM(s.guards_needed), 0)                                  AS "Guards Needed",
        STRING_AGG(s.name, ', ' ORDER BY s.name)                          AS "Sites",
        c.notes                                                             AS "Notes",
        c.created_at                                                        AS "Created At"
      FROM clients c
      LEFT JOIN sites s ON s.client_id = c.id
      GROUP BY c.id, c.name, c.contact_person, c.contact_email, c.contact_phone,
               c.city, c.address, c.is_active, c.notes, c.created_at
      ORDER BY c.name
    `

    const headers = [
      "#", "Client Name", "Contact Person", "Email", "Phone", "City",
      "Address", "Status", "Total Sites", "Guards Needed", "Sites", "Notes", "Created At",
    ]

    const rows = clients.map(r =>
      headers.map(h => r[h] ?? "")
    )

    const csv = [
      headers.join(","),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=clients-report-${new Date().toISOString().split("T")[0]}.csv`,
      },
    })
  } catch (error) {
    console.error("Error generating clients report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
