import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function DELETE(request: Request) {
  try {
    const user = await getSession()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 })
    }
    // Prevent deleting yourself
    const filteredIds = ids.filter((id: number) => id !== user.id)
    if (filteredIds.length === 0) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }
    await sql`DELETE FROM users WHERE id = ANY(${filteredIds}::int[])`
    return NextResponse.json({ success: true, deleted: filteredIds.length })
  } catch (error) {
    console.error("Error bulk deleting users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
