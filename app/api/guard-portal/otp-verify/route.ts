import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import crypto from "crypto"

// Guard submits 6-digit OTP → receive a session token
export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()
    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 })
    }

    // Find guard by email
    const guards = await sql`
      SELECT id FROM guards WHERE LOWER(email) = LOWER(${email}) AND status = 'active'
    `
    if (guards.length === 0) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 401 })
    }

    const guardId = guards[0].id

    // Find a valid OTP
    const otpRows = await sql`
      SELECT id FROM guard_otp_sessions
      WHERE guard_id = ${guardId}
        AND otp_code = ${otp}
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (otpRows.length === 0) {
      return NextResponse.json({ error: "Invalid or expired code. Please request a new one." }, { status: 401 })
    }

    // Generate a session token (valid 7 days)
    const sessionToken = crypto.randomBytes(40).toString("hex")
    const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Mark OTP as used and store session token
    await sql`
      UPDATE guard_otp_sessions
      SET used_at = NOW(), session_token = ${sessionToken}, expires_at = ${sessionExpires.toISOString()}
      WHERE id = ${otpRows[0].id}
    `

    return NextResponse.json({ success: true, session_token: sessionToken })
  } catch (error) {
    console.error("[otp/verify] Error:", error)
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 })
  }
}
