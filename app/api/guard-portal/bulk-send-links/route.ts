import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { sendEmail, guardPortalAccessEmail } from "@/lib/email"
import { getSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { guard_ids } = await request.json()
    if (!Array.isArray(guard_ids) || guard_ids.length === 0) {
      return NextResponse.json({ error: "guard_ids array is required" }, { status: 400 })
    }

    const reqUrl = new URL(request.url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`

    const results: { id: number; name: string; email: string; success: boolean; error?: string }[] = []

    for (const guard_id of guard_ids) {
      const guards = await sql`SELECT id, email, first_name, last_name FROM guards WHERE id = ${guard_id}`
      if (guards.length === 0) { results.push({ id: guard_id, name: "Unknown", email: "", success: false, error: "Not found" }); continue }

      const guard = guards[0]
      const guardName = `${guard.first_name} ${guard.last_name}`

      if (!guard.email) { results.push({ id: guard_id, name: guardName, email: "", success: false, error: "No email address" }); continue }

      const token = crypto.randomBytes(32).toString("hex")
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await sql`UPDATE guard_magic_links SET used_at = NOW() WHERE guard_id = ${guard_id} AND used_at IS NULL`
      await sql`INSERT INTO guard_magic_links (guard_id, token, expires_at) VALUES (${guard_id}, ${token}, ${expiresAt.toISOString()})`

      const magicLink = `${baseUrl}/guard-portal?token=${token}`
      const result = await sendEmail({
        to: guard.email,
        subject: "Your Guard Portal Access Link — Centurion RMS",
        html: guardPortalAccessEmail(guardName, magicLink),
      })

      results.push({ id: guard_id, name: guardName, email: guard.email, success: result.success, error: result.error })
    }

    const sent = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success)

    return NextResponse.json({ success: true, sent, failed: failed.length, details: results })
  } catch (error) {
    console.error("Bulk send links error:", error)
    return NextResponse.json({ error: "Failed to send links" }, { status: 500 })
  }
}
