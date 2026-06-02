'use client'

/**
 * Fetch wrapper that automatically adds Authorization header with stored token
 * Use this instead of fetch() in client components that need authentication
 */
export async function authenticatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null

  const headers = new Headers(options?.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
