import { cookies } from "next/headers"
import { sql, type User } from "./db"
import bcrypt from "bcryptjs"

/**
 * Get the current user session from the session_id cookie
 * Validates the session exists in the database and hasn't expired
 */
export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_id")?.value

  if (!token) {
    return null
  }

  try {
    const sessions = await sql`
      SELECT u.* FROM users u
      JOIN sessions s ON s.user_id = u.id
      WHERE s.token = ${token} AND s.expires_at > NOW()
    `

    return sessions.length > 0 ? (sessions[0] as User) : null
  } catch (error) {
    console.error("Error fetching session:", error)
    return null
  }
}

/**
 * Create a new session for a user
 * Returns the session token
 */
export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt.toISOString()})
  `

  return token
}

/**
 * Destroy the current session (logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_id")?.value

  if (token) {
    await sql`DELETE FROM sessions WHERE token = ${token}`
  }

  cookieStore.delete("session_id")
}

/**
 * Login a user with email and password
 * Creates a session and returns user data
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User; token?: string }> {
  try {
    // Find user by email
    const users = await sql`
      SELECT * FROM users WHERE LOWER(email) = LOWER(${email})
    `

    if (users.length === 0) {
      return { success: false, error: "Invalid email or password" }
    }

    const user = users[0] as User

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      return { success: false, error: "Invalid email or password" }
    }

    // Create session in database
    const token = await createSession(user.id)

    // Update last login timestamp
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`

    return { success: true, user, token }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "An error occurred during login" }
  }
}

/**
 * Protect routes by requiring authentication
 * Throws error if user is not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getSession()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

/**
 * Protect routes by requiring specific roles
 * Throws error if user doesn't have required role
 */
export async function requireRole(allowedRoles: string[]): Promise<User> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden")
  }
  return user
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}
