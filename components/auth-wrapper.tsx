"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getStoredToken } from "@/lib/client-auth"

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      // Not authenticated, redirect to login
      router.push("/login")
    }
  }, [router])

  // If we have a token, render the children
  const token = getStoredToken()
  if (!token) {
    // Show loading state while redirecting
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>
  }

  return <>{children}</>
}
