import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { sendEmail, guardOtpEmail } from "@/lib/email"

// Guard submits their email → receive a 6-digit OTP
export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    // Find guard by email (silent on not found)
    const guards = await sql`
      SELECT id, first_name, last_name, email FROM guards
      WHERE LOWER(email) = LOWER(${email}) AND status = 'active'
    `

    // Always return success to avoid email enumeration
    if (guards.length === 0) {
      return NextResponse.json({ success: true })
    }

    const guard = guards[0]

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Invalidate any existing unused OTPs for this guard
    await sql`
      UPDATE guard_otp_sessions
      SET used_at = NOW()
      WHERE guard_id = ${guard.id} AND used_at IS NULL
    `

    // Store the OTP
    await sql`
      INSERT INTO guard_otp_sessions (guard_id, otp_code, expires_at)
      VALUES (${guard.id}, ${otp}, ${expiresAt.toISOString()})
    `

    // Send OTP email
    const result = await sendEmail({
      to: guard.email,
      subject: `${otp} — Your Guard Portal Verification Code`,
      html: guardOtpEmail(`${guard.first_name} ${guard.last_name}`, otp),
    })

    if (!result.success) {
      console.error("[otp] Email send failed:", result.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[otp/request] Error:", error)
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 })
  }
}
