import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { name, contact_person, contact_email, contact_phone, address, city, is_active, notes } = await request.json()

    const result = await sql`
      UPDATE clients SET
        name = ${name}, contact_person = ${contact_person || null}, contact_email = ${contact_email || null},
        contact_phone = ${contact_phone || null}, address = ${address || null}, city = ${city || null},
        is_active = ${is_active ?? true}, notes = ${notes || null}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    if (result.length === 0) return NextResponse.json({ error: "Client not found" }, { status: 404 })
    return NextResponse.json({ client: result[0] })
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const sites = await sql`SELECT COUNT(*) as cnt FROM sites WHERE client_id = ${id}`
    if (Number(sites[0].cnt) > 0) {
      return NextResponse.json({ error: "Cannot delete client with linked sites. Remove site links first." }, { status: 400 })
    }

    await sql`DELETE FROM clients WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
