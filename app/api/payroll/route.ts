import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month") // Format: YYYY-MM

  if (!month) {
    return NextResponse.json({ error: "Month parameter required (YYYY-MM)" }, { status: 400 })
  }

  try {
    const startDate = `${month}-01`
    const endDate = new Date(
      parseInt(month.split("-")[0]),
      parseInt(month.split("-")[1]),
      0
    ).toISOString().split("T")[0]

    const payrollQuery = await sql`
      WITH worked AS (
        SELECT
          a.guard_id,
          COUNT(DISTINCT a.date) AS working_days,
          -- most frequent site for the guard in the period (their location)
          MODE() WITHIN GROUP (ORDER BY st.name) AS location
        FROM attendance a
        LEFT JOIN assignments asn ON asn.id = a.assignment_id
        LEFT JOIN sites st ON st.id = asn.site_id
        WHERE a.status = 'present'
          AND a.date >= ${startDate}::date
          AND a.date <= ${endDate}::date
        GROUP BY a.guard_id
      )
      SELECT
        g.id AS guard_id,
        g.first_name,
        g.last_name,
        g.guard_code,
        g.bank_name,
        g.account_number,
        COALESCE(g.guard_title, g.title) AS designation,
        COALESCE(w.location, '') AS location,
        COALESCE(w.working_days, 0) AS working_days
      FROM guards g
      LEFT JOIN worked w ON w.guard_id = g.id
      WHERE g.status = 'active'
      ORDER BY g.first_name, g.last_name
    `

    const totalWorkingDays = payrollQuery.reduce((sum, p) => sum + (Number(p.working_days) || 0), 0)

    return NextResponse.json({
      month,
      startDate,
      endDate,
      payroll: payrollQuery,
      summary: {
        totalGuards: payrollQuery.length,
        totalWorkingDays,
      },
    })
  } catch (error) {
    console.error("Payroll error:", error)
    return NextResponse.json({ error: "Failed to calculate payroll" }, { status: 500 })
  }
}
