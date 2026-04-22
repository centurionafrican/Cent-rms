import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // If there's a token in the query params (from redirect after login), set it as a cookie
  const url = request.nextUrl
  const token = url.searchParams.get('auth_token')
  
  if (token) {
    // Remove token from URL to keep it clean
    url.searchParams.delete('auth_token')
    const response = NextResponse.rewrite(url)
    
    // Set the session cookie in the response
    response.cookies.set({
      name: 'session_id',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: false,
    })
    
    return response
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
