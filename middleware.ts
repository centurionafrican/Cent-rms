import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // If there's a token in the query params (from redirect after login), set it as a cookie
  const url = request.nextUrl
  const token = url.searchParams.get('auth_token')
  
  const response = NextResponse.next()
  
  if (token) {
    response.cookies.set({
      name: 'session_id',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: false,
    })
    
    // Remove the token from the URL
    url.searchParams.delete('auth_token')
    return NextResponse.redirect(url, response)
  }
  
  return response
}

export const config = {
  matcher: ['/dashboard/:path*']
}
