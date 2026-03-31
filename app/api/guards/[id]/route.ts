import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const guards = await sql`SELECT * FROM guards WHERE id = ${id}`

    if (guards.length === 0) {
      return NextResponse.json({ error: "Guard not found" }, { status: 404 })
    }

    return NextResponse.json(guards[0])
  } catch (error) {
    console.error("Error fetching guard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { first_name, last_name, email, phone, address, title, status, id_number, annual_leave_days, date_joined, guard_title, gender, education_level, languages_spoken, discipline, special_skills, maternity_status } = body

    const result = await sql`
      UPDATE guards SET
        first_name = ${first_name},
        last_name = ${last_name},
        email = ${email || null},
        phone = ${phone || null},
        address = ${address || null},
        title = ${title || 'Security Guard'},
        status = ${status || 'active'},
        id_number = ${id_number || null},
        annual_leave_days = ${annual_leave_days || 21},
        date_joined = ${date_joined || null},
        guard_title = ${guard_title || null},
        gender = ${gender || null},
        education_level = ${education_level || null},
        languages_spoken = ${languages_spoken || null},
        discipline = ${discipline || 'Excellent'},
        special_skills = ${special_skills || null},
        maternity_status = ${gender === 'Female' ? maternity_status || 'Not Applicable' : 'Not Applicable'},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Guard not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating guard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    await sql`DELETE FROM guards WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting guard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
