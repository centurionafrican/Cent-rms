import { sql } from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    console.log("[v0] Admin setup request for email:", email)

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Hash the new password
    console.log("[v0] Hashing password...")
    const hashedPassword = await hashPassword(password)
    console.log("[v0] Password hashed successfully")

    // Check if admin user exists
    console.log("[v0] Looking for existing admin users...")
    const users = await sql`
      SELECT id FROM users WHERE role = 'admin'
      ORDER BY created_at ASC
      LIMIT 1
    `

    console.log("[v0] Found", users.length, "admin users")

    if (users.length > 0) {
      // Update existing admin
      console.log("[v0] Updating existing admin user:", users[0].id)
      await sql`
        UPDATE users 
        SET email = ${email}, password_hash = ${hashedPassword}, updated_at = NOW()
        WHERE id = ${users[0].id}
      `
      console.log("[v0] Admin user updated successfully")
      return NextResponse.json({
        success: true,
        message: `Admin user updated successfully. Email: ${email}. You can now login!`,
      })
    } else {
      // Create new admin user if none exists
      console.log("[v0] Creating new admin user...")
      const result = await sql`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
        VALUES (${email}, ${hashedPassword}, 'System', 'Administrator', 'admin', true, NOW(), NOW())
        RETURNING id, email, role
      `
      console.log("[v0] Admin user created successfully:", result[0])
      return NextResponse.json({
        success: true,
        message: `Admin user created successfully. Email: ${email}. You can now login!`,
        user: result[0],
      })
    }
  } catch (error) {
    console.error("[v0] Admin setup error:", error)
    return NextResponse.json(
      { error: "Failed to update admin credentials: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
