import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month") // Format: YYYY-MM
  const guard_id = searchParams.get("guard_id")

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

    // Standard work day length (hours) used to split regular vs overtime
    const STANDARD_HOURS = 8

    const guardFilter = guard_id ? sql`AND g.id = ${parseInt(guard_id)}` : sql``

    const payrollQuery = await sql`
      WITH attendance_metrics AS (
        SELECT
          a.guard_id,
          a.date,
          -- Hours worked: use clock in/out when present, else shift duration, else standard day
          CASE
            WHEN a.time_in IS NOT NULL AND a.time_out IS NOT NULL
              THEN GREATEST(EXTRACT(EPOCH FROM (a.time_out - a.time_in)) / 3600.0, 0)
            WHEN s.start_time IS NOT NULL AND s.end_time IS NOT NULL
              THEN CASE
                WHEN s.end_time > s.start_time
                  THEN EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0
                ELSE EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0 + 24
              END
            ELSE ${STANDARD_HOURS}
          END AS hours_worked,
          COALESCE(s.shift_type, '') AS shift_type,
          EXTRACT(DOW FROM a.date) AS dow
        FROM attendance a
        LEFT JOIN assignments asn ON asn.id = a.assignment_id
        LEFT JOIN shifts s ON s.id = asn.shift_id
        WHERE a.status = 'present'
          AND a.date >= ${startDate}::date
          AND a.date <= ${endDate}::date
      )
      SELECT
        g.id AS guard_id,
        g.first_name,
        g.last_name,
        g.guard_code,
        g.phone,
        COUNT(DISTINCT am.date) AS days_worked,
        COALESCE(ROUND(SUM(LEAST(am.hours_worked, ${STANDARD_HOURS}))::numeric, 1), 0) AS regular_hours,
        COALESCE(ROUND(SUM(GREATEST(am.hours_worked - ${STANDARD_HOURS}, 0))::numeric, 1), 0) AS overtime_hours,
        COUNT(DISTINCT CASE WHEN am.shift_type ILIKE '%night%' THEN am.date END) AS night_shifts,
        COUNT(DISTINCT CASE WHEN am.dow IN (0, 6) THEN am.date END) AS holiday_days
      FROM guards g
      LEFT JOIN attendance_metrics am ON am.guard_id = g.id
      WHERE g.status = 'active' ${guardFilter}
      GROUP BY g.id, g.first_name, g.last_name, g.guard_code, g.phone
      ORDER BY g.first_name, g.last_name
    `

    const totalDaysWorked = payrollQuery.reduce((sum, p) => sum + (Number(p.days_worked) || 0), 0)
    const totalRegularHours = payrollQuery.reduce((sum, p) => sum + (Number(p.regular_hours) || 0), 0)
    const totalOvertimeHours = payrollQuery.reduce((sum, p) => sum + (Number(p.overtime_hours) || 0), 0)
    const totalNightShifts = payrollQuery.reduce((sum, p) => sum + (Number(p.night_shifts) || 0), 0)
    const totalHolidayDays = payrollQuery.reduce((sum, p) => sum + (Number(p.holiday_days) || 0), 0)

    return NextResponse.json({
      month,
      startDate,
      endDate,
      payroll: payrollQuery,
      summary: {
        totalGuards: payrollQuery.length,
        totalDaysWorked,
        totalRegularHours: Math.round(totalRegularHours * 10) / 10,
        totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
        totalNightShifts,
        totalHolidayDays,
      },
    })
  } catch (error) {
    console.error("Payroll error:", error)
    return NextResponse.json({ error: "Failed to calculate payroll" }, { status: 500 })
  }
}
