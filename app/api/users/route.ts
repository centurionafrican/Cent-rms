import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can view all users
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const users = await sql`
      SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at, last_login
      FROM users
      ORDER BY created_at DESC
    `
    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create users
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, first_name, last_name, role, status } = body

    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Check if email already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10)

    const isActive = status === "inactive" ? false : true

    const result = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
      VALUES (${email}, ${password_hash}, ${first_name}, ${last_name}, ${role || 'coordinator'}, ${isActive})
      RETURNING id, email, first_name, last_name, role, is_active, created_at
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
