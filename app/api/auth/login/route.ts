import { loginUser } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const result = await loginUser(email, password)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role,
      },
    })

    // Set session cookie - this will be captured by middleware
    if (result.token) {
      response.cookies.set({
        name: "session_id",
        value: result.token,
        httpOnly: true,
        secure: false, // Allow localhost in development
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: "/",
      })
    }

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
