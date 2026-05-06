import { cookies } from "next/headers"
import { sql, type User } from "./db"
import bcrypt from "bcryptjs"

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_id")?.value

  console.log("[v0] getSession() - token found:", !!token)
  if (!token) {
    const allCookies = cookieStore.getAll()
    console.log("[v0] getSession() - all cookies:", allCookies.map(c => c.name))
    return null
  }

  console.log("[v0] getSession() - validating token:", token.substring(0, 8) + "...")
  const sessions = await sql`
    SELECT u.* FROM users u
    JOIN sessions s ON s.user_id = u.id
    WHERE s.token = ${token} AND s.expires_at > NOW()
  `

  console.log("[v0] getSession() - session found:", sessions.length > 0)
  return sessions.length > 0 ? (sessions[0] as User) : null
}

export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt.toISOString()})
  `

  return token
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_id")?.value

  if (token) {
    await sql`DELETE FROM sessions WHERE token = ${token}`
  }

  cookieStore.delete("session_id")
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  console.log("[v0] Login attempt for email:", email)
  const users = await sql`
    SELECT * FROM users WHERE LOWER(email) = LOWER(${email})
  `

  console.log("[v0] Users found:", users.length)
  if (users.length === 0) {
    console.log("[v0] No user found with email:", email)
    return { success: false, error: "Invalid email or password" }
  }

  const user = users[0] as User
  console.log("[v0] User found:", user.email, "ID:", user.id)

  // Compare password using bcrypt
  console.log("[v0] Comparing passwords...")
  const passwordMatch = await bcrypt.compare(password, user.password_hash)
  console.log("[v0] Password match:", passwordMatch)
  if (!passwordMatch) {
    console.log("[v0] Password does not match")
    return { success: false, error: "Invalid email or password" }
  }

  // Create session
  const sessionId = await createSession(user.id)

  // Update last login
  await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`

  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set("session_id", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  })

  return { success: true, user }
}

export async function requireAuth(): Promise<User> {
  const user = await getSession()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireRole(allowedRoles: string[]): Promise<User> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden")
  }
  return user
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}
