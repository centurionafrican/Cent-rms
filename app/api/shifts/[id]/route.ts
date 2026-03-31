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
    const shifts = await sql`SELECT * FROM shifts WHERE id = ${id}`

    if (shifts.length === 0) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    return NextResponse.json(shifts[0])
  } catch (error) {
    console.error("Error fetching shift:", error)
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
    const { name, start_time, end_time, description, is_active, shift_type } = body

    const result = await sql`
      UPDATE shifts SET
        name = ${name},
        start_time = ${start_time},
        end_time = ${end_time},
        description = ${description || null},
        is_active = ${is_active !== false},
        shift_type = ${shift_type || 'day'}
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating shift:", error)
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

    await sql`DELETE FROM shifts WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting shift:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
