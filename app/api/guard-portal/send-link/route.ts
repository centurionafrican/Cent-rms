import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { sendEmail, guardPortalAccessEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { guard_id } = await request.json()

    if (!guard_id) {
      return NextResponse.json({ error: "Guard ID is required" }, { status: 400 })
    }

    // Get guard email
    const guards = await sql`SELECT id, email, first_name, last_name FROM guards WHERE id = ${guard_id}`
    if (guards.length === 0) {
      return NextResponse.json({ error: "Guard not found" }, { status: 404 })
    }

    const guard = guards[0]
    if (!guard.email) {
      return NextResponse.json({ error: "Guard does not have an email address" }, { status: 400 })
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Invalidate any existing tokens for this guard
    await sql`UPDATE guard_magic_links SET used_at = NOW() WHERE guard_id = ${guard_id} AND used_at IS NULL`

    // Store the token
    await sql`
      INSERT INTO guard_magic_links (guard_id, token, expires_at)
      VALUES (${guard_id}, ${token}, ${expiresAt.toISOString()})
    `

    // Build the magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
    const magicLink = `${baseUrl}/guard-portal?token=${token}`

    // Send email via Microsoft 365 SMTP
    const guardName = `${guard.first_name} ${guard.last_name}`
    const result = await sendEmail({
      to: guard.email,
      subject: "Your Guard Portal Access Link",
      html: guardPortalAccessEmail(guardName, magicLink),
    })

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Portal access link sent to ${guard.email}`,
        emailSent: true
      })
    } else {
      console.error("Email send failed:", result.error)
      return NextResponse.json({ 
        error: `Failed to send email: ${result.error}` 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Send magic link error:", error)
    return NextResponse.json({ error: "Failed to generate portal link" }, { status: 500 })
  }
}
