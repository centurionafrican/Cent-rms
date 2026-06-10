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
      WITH days AS (
        SELECT generate_series(${startDate}::date, ${endDate}::date, '1 day') AS d
      ),
      guard_days AS (
        SELECT g.id AS guard_id, days.d
        FROM guards g
        CROSS JOIN days
        WHERE g.status = 'active'
      ),
      worked AS (
        SELECT gd.guard_id, COUNT(*) AS working_days
        FROM guard_days gd
        WHERE
          -- present on attendance
          EXISTS (
            SELECT 1 FROM attendance a
            WHERE a.guard_id = gd.guard_id AND a.date = gd.d AND a.status = 'present'
          )
          -- OR covered by an approved leave (counts even if attendance is absent)
          OR EXISTS (
            SELECT 1 FROM leave_requests lr
            WHERE lr.guard_id = gd.guard_id
              AND lr.status = 'approved'
              AND gd.d BETWEEN lr.start_date AND lr.end_date
          )
          -- OR covered by an approved off day (single date or range)
          OR EXISTS (
            SELECT 1 FROM guard_offs gof
            WHERE gof.guard_id = gd.guard_id
              AND (
                gof.date = gd.d
                OR (gof.start_date IS NOT NULL AND gof.end_date IS NOT NULL AND gd.d BETWEEN gof.start_date AND gof.end_date)
              )
          )
        GROUP BY gd.guard_id
      ),
      location AS (
        SELECT asn.guard_id, MODE() WITHIN GROUP (ORDER BY st.district) AS district
        FROM assignments asn
        JOIN sites st ON st.id = asn.site_id
        WHERE asn.date >= ${startDate}::date
          AND asn.date <= ${endDate}::date
          AND st.district IS NOT NULL
        GROUP BY asn.guard_id
      )
      SELECT
        g.id AS guard_id,
        g.first_name,
        g.last_name,
        g.guard_code,
        g.bank_name,
        g.account_number,
        COALESCE(g.guard_title, g.title) AS designation,
        COALESCE(l.district, '') AS location,
        COALESCE(w.working_days, 0) AS working_days
      FROM guards g
      LEFT JOIN worked w ON w.guard_id = g.id
      LEFT JOIN location l ON l.guard_id = g.id
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
