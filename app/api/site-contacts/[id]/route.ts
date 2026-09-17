import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { contact_person, contact_email, contact_phone, is_primary } = body

    const result = await sql`
      UPDATE site_contacts SET
        contact_person = ${contact_person || null},
        contact_email = ${contact_email || null},
        contact_phone = ${contact_phone || null},
        is_primary = ${is_primary || false},
        updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating site contact:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await sql`DELETE FROM site_contacts WHERE id = ${Number(id)}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting site contact:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
