import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { sendEmail, guardPortalLoginEmail } from "@/lib/email"

// Guard requests their own login link by providing their email
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Find guard by email
    const guards = await sql`SELECT id, email, first_name, last_name FROM guards WHERE LOWER(email) = LOWER(${email})`
    if (guards.length === 0) {
      // Return success even if not found (don't reveal if email exists)
      return NextResponse.json({ success: true, message: "If this email is registered, a login link has been sent." })
    }

    const guard = guards[0]

    // Generate token
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Invalidate existing tokens
    await sql`UPDATE guard_magic_links SET used_at = NOW() WHERE guard_id = ${guard.id} AND used_at IS NULL`

    // Store the token
    await sql`
      INSERT INTO guard_magic_links (guard_id, token, expires_at)
      VALUES (${guard.id}, ${token}, ${expiresAt.toISOString()})
    `

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
    const magicLink = `${baseUrl}/guard-portal?token=${token}`

    // Send email via Microsoft 365 SMTP
    const guardName = `${guard.first_name} ${guard.last_name}`
    const result = await sendEmail({
      to: guard.email,
      subject: "Your Guard Portal Login Link",
      html: guardPortalLoginEmail(guardName, magicLink),
    })

    if (!result.success) {
      console.error("Email send failed:", result.error)
    }

    return NextResponse.json({ success: true, message: "If this email is registered, a login link has been sent." })
  } catch (error) {
    console.error("Request link error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
