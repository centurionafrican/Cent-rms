import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { first_name, last_name, email, phone, address, title, status, id_number, annual_leave_days, date_joined, guard_title, gender, education_level, languages_spoken, discipline, special_skills, maternity_status } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO guards (first_name, last_name, email, phone, address, title, status, id_number, annual_leave_days, date_joined, hire_date, guard_title, gender, education_level, languages_spoken, discipline, special_skills, maternity_status)
      VALUES (${first_name}, ${last_name}, ${email || null}, ${phone || null}, ${address || null}, ${title || 'Security Guard'}, ${status || 'recruitment'}, ${id_number || null}, ${annual_leave_days || 21}, ${date_joined || new Date().toISOString().split('T')[0]}, ${new Date().toISOString().split('T')[0]}, ${guard_title || null}, ${gender || null}, ${education_level || null}, ${languages_spoken || null}, ${discipline || 'Excellent'}, ${special_skills || null}, ${gender === 'Female' ? maternity_status || 'Not Applicable' : 'Not Applicable'})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating guard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
