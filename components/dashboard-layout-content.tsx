"use client"

import { useEffect, useState } from "react"
import { DashboardSidebar } from "./dashboard/sidebar"
import { DashboardHeader } from "./dashboard/header"
import type { User } from "@/lib/db"

export function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userStr = sessionStorage.getItem("user")
    if (userStr) {
      try {
        setUser(JSON.parse(userStr))
      } catch (error) {
        console.error("Failed to parse user:", error)
      }
    }
    setLoading(false)
  }, [])

  if (loading || !user) {
    return null
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
