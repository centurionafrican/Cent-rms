import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function DELETE(request: Request) {
  try {
    const user = await getSession()
    if (!user || user.role === "guard") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 })
    }
    await sql`DELETE FROM sites WHERE id = ANY(${ids}::int[])`
    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error("Error bulk deleting sites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
