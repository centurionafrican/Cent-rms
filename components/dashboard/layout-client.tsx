"use client"

import { useEffect, useState } from "react"
import { DashboardSidebar } from "./sidebar"
import { DashboardHeader } from "./header"
import type { User } from "@/lib/db"

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get user data from sessionStorage
    const userStr = sessionStorage.getItem("user")
    if (userStr) {
      try {
        const userData = JSON.parse(userStr)
        setUser(userData)
      } catch (error) {
        console.error("Failed to parse user data:", error)
      }
    }
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">No user data found</div>
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardSidebar user={user} />
      <div className="lg:pl-64">
        <DashboardHeader user={user} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
