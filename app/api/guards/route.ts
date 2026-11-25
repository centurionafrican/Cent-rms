import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const guards = await sql`SELECT * FROM guards ORDER BY first_name, last_name`
    return NextResponse.json(guards)
  } catch (error) {
    console.error("Error fetching guards:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user || (!["roster_manager", "admin"].includes(user.role) && user.email?.trim().toLowerCase() !== "emmanuel.gashabuka@centurionafrica.rw")) {
      return NextResponse.json({ error: "Only Roster Managers can add guards" }, { status: user ? 403 : 401 })
    }

    const body = await request.json()
    const { first_name, last_name, email, phone, address, title, status, guard_code, id_number, annual_leave_days, date_joined, guard_title, gender, education_level, languages_spoken, discipline, special_skills, maternity_status, bank_name, account_number, attachments } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 })
    }

    if (guard_code) {
      const duplicateCode = await sql`
        SELECT id FROM guards WHERE guard_code = ${String(guard_code).trim()} LIMIT 1
      `
      if (duplicateCode.length > 0) {
        return NextResponse.json({ error: `Guard code ${String(guard_code).trim()} is already assigned to another guard.` }, { status: 409 })
      }
    }

    const result = await sql`
      INSERT INTO guards (first_name, last_name, email, phone, address, title, status, guard_code, id_number, annual_leave_days, date_joined, hire_date, guard_title, gender, education_level, languages_spoken, discipline, special_skills, maternity_status, bank_name, account_number, attachments)
      VALUES (${first_name}, ${last_name}, ${email || null}, ${phone || null}, ${address || null}, ${title || 'Security Guard'}, ${status || 'recruitment'}, ${guard_code || null}, ${id_number || null}, ${annual_leave_days ?? 21}, ${date_joined || new Date().toISOString().split('T')[0]}, ${new Date().toISOString().split('T')[0]}, ${guard_title || null}, ${gender || null}, ${education_level || null}, ${languages_spoken ? JSON.stringify(languages_spoken) : null}, ${discipline || 'Excellent'}, ${special_skills ? JSON.stringify(special_skills) : null}, ${gender === 'Female' ? maternity_status || 'Not Applicable' : 'Not Applicable'}, ${bank_name || null}, ${account_number || null}, ${attachments || null})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating guard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
