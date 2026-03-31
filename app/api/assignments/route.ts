import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail, assignmentNotificationEmail } from "@/lib/email"

export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    let assignments
    if (from && to) {
      assignments = await sql`
        SELECT 
          a.*,
          g.first_name || ' ' || g.last_name as guard_name,
          g.phone as guard_phone,
          s.name as site_name,
          sh.name as shift_name,
          sh.start_time as shift_start,
          sh.end_time as shift_end,
          sh.color as shift_color,
          sh.shift_type,
          r.first_name || ' ' || r.last_name as reliever_name
        FROM assignments a
        JOIN guards g ON g.id = a.guard_id
        JOIN sites s ON s.id = a.site_id
        JOIN shifts sh ON sh.id = a.shift_id
        LEFT JOIN guards r ON r.id = a.reliever_id
        WHERE a.date::date >= ${from}::date AND a.date::date <= ${to}::date
        ORDER BY a.date ASC, sh.start_time
      `
    } else {
      assignments = await sql`
        SELECT 
          a.*,
          g.first_name || ' ' || g.last_name as guard_name,
          g.phone as guard_phone,
          s.name as site_name,
          sh.name as shift_name,
          sh.start_time as shift_start,
          sh.end_time as shift_end,
          sh.color as shift_color,
          sh.shift_type,
          r.first_name || ' ' || r.last_name as reliever_name
        FROM assignments a
        JOIN guards g ON g.id = a.guard_id
        JOIN sites s ON s.id = a.site_id
        JOIN shifts sh ON sh.id = a.shift_id
        LEFT JOIN guards r ON r.id = a.reliever_id
        ORDER BY a.date DESC, sh.start_time
      `
    }
    return NextResponse.json({ assignments })
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { guard_id, site_id, shift_id, date, notes, position } = body

    if (!guard_id || !site_id || !shift_id || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO assignments (guard_id, site_id, shift_id, date, notes, position, status)
      VALUES (${guard_id}, ${site_id}, ${shift_id}, ${date}, ${notes || null}, ${position || null}, 'scheduled')
      RETURNING *
    `

    // Derive the base URL from the incoming request so the portal link is always correct
    const reqUrl = new URL(request.url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`

    // Send assignment notification email if guard has an email address
    try {
      const guardInfo = await sql`
        SELECT g.first_name, g.last_name, g.email,
               s.name as site_name,
               sh.name as shift_name, sh.start_time, sh.end_time
        FROM guards g
        JOIN sites s ON s.id = ${site_id}
        JOIN shifts sh ON sh.id = ${shift_id}
        WHERE g.id = ${guard_id}
      `
      if (guardInfo.length > 0 && guardInfo[0].email) {
        const g = guardInfo[0]
        await sendEmail({
          to: g.email,
          subject: `New Assignment — ${g.site_name} on ${new Date(date).toLocaleDateString()}`,
          html: assignmentNotificationEmail({
            guardName: `${g.first_name} ${g.last_name}`,
            siteName: g.site_name,
            shiftName: g.shift_name,
            shiftStart: g.start_time,
            shiftEnd: g.end_time,
            date,
            portalUrl: `${baseUrl}/guard-portal`,
          }),
        })
      }
    } catch (emailErr) {
      // Don't fail the assignment creation if email fails
      console.error("[assignments] Email notification failed:", emailErr)
    }

    return NextResponse.json({ assignment: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating assignment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
