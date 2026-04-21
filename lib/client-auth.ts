"use client"

// Get the session token from sessionStorage
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem("session_token")
}

// Clear the session token
export function clearStoredToken(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem("session_token")
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getStoredToken() !== null
}

// Make an authenticated fetch request
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken()
  
  const headers = new Headers(options.headers || {})
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  })
}
