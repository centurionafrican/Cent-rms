import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// GET guard info by employee_id or phone
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const guardId = searchParams.get("guard_id")

    if (!guardId) {
      return NextResponse.json({ error: "guard_id is required" }, { status: 400 })
    }

    // Get guard details
    const guard = await sql`
      SELECT id, first_name, last_name, email, phone, title, 
             status, id_number, date_joined, annual_leave_days, leave_days_used,
             hire_date
      FROM guards WHERE id = ${guardId}
    `

    if (guard.length === 0) {
      return NextResponse.json({ error: "Guard not found" }, { status: 404 })
    }

    // Get current/upcoming assignments
    const today = new Date().toISOString().split("T")[0]
    const assignments = await sql`
      SELECT a.*, s.name as site_name, sh.name as shift_name, 
             sh.start_time as shift_start, sh.end_time as shift_end,
             sh.color as shift_color
      FROM assignments a
      JOIN sites s ON s.id = a.site_id
      JOIN shifts sh ON sh.id = a.shift_id
      WHERE a.guard_id = ${guardId} AND a.date::date >= ${today}::date
      ORDER BY a.date ASC
      LIMIT 30
    `

    // Get leave requests
    const leaves = await sql`
      SELECT lr.*, 
        om.first_name || ' ' || om.last_name as ops_manager_name,
        hr.first_name || ' ' || hr.last_name as hr_name,
        cc.first_name || ' ' || cc.last_name as coceo_name
      FROM leave_requests lr
      LEFT JOIN users om ON om.id = lr.ops_manager_approved_by
      LEFT JOIN users hr ON hr.id = lr.hr_approved_by
      LEFT JOIN users cc ON cc.id = lr.coceo_approved_by
      WHERE lr.guard_id = ${guardId}
      ORDER BY lr.created_at DESC
      LIMIT 20
    `

    // Calculate leave balance
    const approvedLeaves = await sql`
      SELECT COALESCE(SUM(
        CASE WHEN end_date IS NOT NULL 
        THEN (end_date::date - start_date::date + 1) 
        ELSE 1 END
      ), 0) as used_days
      FROM leave_requests 
      WHERE guard_id = ${guardId} AND status = 'approved'
    `

    const usedDays = Number(approvedLeaves[0]?.used_days || 0)
    const annualDays = Number(guard[0].annual_leave_days || 21)

    return NextResponse.json({
      guard: guardResult[0],
      assignments,
      leaves,
      leaveBalance: {
        total: annualDays,
        used: usedDays,
        remaining: annualDays - usedDays,
      },
      offs: await sql`
        SELECT id, date, reason, notes
        FROM guard_offs
        WHERE guard_id = ${guardId}
          AND date >= CURRENT_DATE
        ORDER BY date ASC
      `,
    })
  } catch (error) {
    console.error("Guard portal error:", error)
    return NextResponse.json({ error: "Failed to fetch guard data" }, { status: 500 })
  }
}
