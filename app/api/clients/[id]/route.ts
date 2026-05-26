import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const clients = await sql`SELECT * FROM clients WHERE id = ${Number(id)}`
    if (clients.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }
    return NextResponse.json(clients[0])
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, contact_person, contact_email, contact_phone, address } = body

    if (!name) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 })
    }

    const result = await sql`
      UPDATE clients SET
        name = ${name},
        contact_person = ${contact_person || null},
        contact_email = ${contact_email || null},
        contact_phone = ${contact_phone || null},
        address = ${address || null},
        updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await sql`DELETE FROM clients WHERE id = ${Number(id)}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
