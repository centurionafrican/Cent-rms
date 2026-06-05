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
    // Calculate payroll based on days worked (attendance = present)
    const startDate = `${month}-01`
    const endDate = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).toISOString().split("T")[0]

    let payrollQuery
    if (guard_id) {
      payrollQuery = await sql`
        SELECT 
          g.id as guard_id,
          g.first_name,
          g.last_name,
          g.guard_code,
          g.daily_rate,
          g.phone,
          COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.date END) as days_worked,
          COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN a.date END) as days_absent,
          COALESCE(g.daily_rate, 0) * COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.date END) as gross_pay
        FROM guards g
        LEFT JOIN assignments asn ON asn.guard_id = g.id
        LEFT JOIN attendance a ON a.assignment_id = asn.id AND a.date >= ${startDate}::date AND a.date <= ${endDate}::date
        WHERE g.id = ${parseInt(guard_id)} AND g.status = 'active'
        GROUP BY g.id, g.first_name, g.last_name, g.guard_code, g.daily_rate, g.phone
      `
    } else {
      payrollQuery = await sql`
        SELECT 
          g.id as guard_id,
          g.first_name,
          g.last_name,
          g.guard_code,
          g.daily_rate,
          g.phone,
          COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.date END) as days_worked,
          COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN a.date END) as days_absent,
          COALESCE(g.daily_rate, 0) * COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.date END) as gross_pay
        FROM guards g
        LEFT JOIN assignments asn ON asn.guard_id = g.id
        LEFT JOIN attendance a ON a.assignment_id = asn.id AND a.date >= ${startDate}::date AND a.date <= ${endDate}::date
        WHERE g.status = 'active'
        GROUP BY g.id, g.first_name, g.last_name, g.guard_code, g.daily_rate, g.phone
        ORDER BY g.first_name, g.last_name
      `
    }

    // Summary
    const totalDaysWorked = payrollQuery.reduce((sum, p) => sum + (Number(p.days_worked) || 0), 0)
    const totalGrossPay = payrollQuery.reduce((sum, p) => sum + (Number(p.gross_pay) || 0), 0)

    return NextResponse.json({
      month,
      startDate,
      endDate,
      payroll: payrollQuery,
      summary: {
        totalGuards: payrollQuery.length,
        totalDaysWorked,
        totalGrossPay,
      }
    })
  } catch (error) {
    console.error("Payroll error:", error)
    return NextResponse.json({ error: "Failed to calculate payroll" }, { status: 500 })
  }
}
