import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 })
    }
    await sql`DELETE FROM locations WHERE id = ANY(${ids}::text[])`
    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error("Error bulk deleting locations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
