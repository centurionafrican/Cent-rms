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

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role,
      },
    })

    // Set the session cookie in the response
    if (result.token) {
      const isProduction = process.env.NODE_ENV === "production"
      // Force secure to false in development
      const secure = isProduction ? true : false
      
      response.cookies.set({
        name: "session_id",
        value: result.token,
        httpOnly: true,
        secure: secure,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      })
      
      console.log("[v0] Cookie set - secure:", secure, "token:", result.token.substring(0, 8) + "...")
    }

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
