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

    // Create response with user data and token
    const response = NextResponse.json({
      success: true,
      token: result.token,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role,
      },
    })

    // v0 previews run in a cross-site iframe, so use None + Secure for HTTPS origins.
    if (result.token) {
      const origin = request.headers.get("origin")
      const isSecureOrigin = origin?.startsWith("https://") || new URL(request.url).protocol === "https:"

      response.cookies.set({
        name: "session_id",
        value: result.token,
        httpOnly: true,
        secure: isSecureOrigin,
        sameSite: isSecureOrigin ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      })
    }

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
