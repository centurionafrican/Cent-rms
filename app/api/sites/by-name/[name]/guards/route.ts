import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const decodedName = decodeURIComponent(name)

    // Get site ID by name
    const site = await sql`
      SELECT id FROM sites WHERE name = ${decodedName}
    `

    if (site.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    const siteId = site[0].id

    // Get all guards assigned to this site
    const guards = await sql`
      SELECT DISTINCT
        g.id,
        g.first_name,
        g.last_name,
        g.id_number,
        g.phone,
        g.email,
        g.status,
        a.date_from,
        a.date_to
      FROM guards g
      INNER JOIN assignments a ON g.id = a.guard_id
      WHERE a.site_id = ${siteId}
      ORDER BY g.first_name, g.last_name`

    const formattedGuards = guards.map((row: any) => ({
      id: row.id,
      guard_name: `${row.first_name} ${row.last_name}`,
      id_number: row.id_number,
      phone: row.phone,
      email: row.email,
      status: row.status,
      date_from: row.date_from,
      date_to: row.date_to,
    }))

    return NextResponse.json({ guards: formattedGuards })
  } catch (error) {
    console.error("Error fetching site guards:", error)
    return NextResponse.json(
      { error: "Failed to fetch site guards" },
      { status: 500 }
    )
  }
}
