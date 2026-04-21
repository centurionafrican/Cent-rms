import { cookies } from "next/headers"
import { sql, type User } from "./db"
import bcrypt from "bcryptjs"

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_id")?.value

  console.log("[v0] getSession() - token present:", !!token)

  if (!token) {
    console.log("[v0] getSession() - no token found, all cookies:", cookieStore.getAll().map(c => c.name))
    return null
  }

  try {
    const sessions = await sql`
      SELECT u.* FROM users u
      JOIN sessions s ON s.user_id = u.id
      WHERE s.token = ${token} AND s.expires_at > NOW()
    `

    console.log("[v0] getSession() - query found:", sessions.length, "sessions")
    return sessions.length > 0 ? (sessions[0] as User) : null
  } catch (error) {
    console.error("[v0] Session query error:", error)
    return null
  }
}

export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  try {
    await sql`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (${token}, ${userId}, ${expiresAt.toISOString()})
    `
  } catch (error) {
    console.error("[v0] Session creation failed:", error)
    throw error
  }

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
): Promise<{ success: boolean; error?: string; user?: User; token?: string }> {
  const users = await sql`
    SELECT * FROM users WHERE LOWER(email) = LOWER(${email})
  `

  if (users.length === 0) {
    return { success: false, error: "Invalid email or password" }
  }

  const user = users[0] as User

  // Compare password using bcrypt
  const passwordMatch = await bcrypt.compare(password, user.password_hash)
  if (!passwordMatch) {
    return { success: false, error: "Invalid email or password" }
  }

  // Create session and return token for Route Handler to set as cookie
  const sessionId = await createSession(user.id)

  // Update last login
  await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`

  return { success: true, user, token: sessionId }
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
