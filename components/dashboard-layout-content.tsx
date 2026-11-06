"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { DashboardSidebar } from "./dashboard/sidebar"
import { ROLE_ACCESS } from "@/lib/db"
import { DashboardHeader } from "./dashboard/header"
import type { User } from "@/lib/db"

export function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

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

  useEffect(() => {
    if (!user || pathname === "/dashboard") return
    const email = user.email?.toLowerCase()
    const allowedPaths = email === "emmanuel.gashabuka@centurionafrica.rw"
      ? ["/dashboard", "/dashboard/clients", "/dashboard/guards", "/dashboard/sites"]
      : email === "peace.munganyinka@centurionafrica.rw"
        ? [...(ROLE_ACCESS[user.role] || []), "/dashboard/reports"]
        : ROLE_ACCESS[user.role] || []
    const hasAccess = allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    if (!hasAccess) router.replace("/dashboard")
  }, [pathname, router, user])

  if (loading || !user) {
    return null
  }

  const email = user.email?.toLowerCase()
  const allowedPaths = email === "emmanuel.gashabuka@centurionafrica.rw"
    ? ["/dashboard", "/dashboard/clients", "/dashboard/guards", "/dashboard/sites"]
    : email === "peace.munganyinka@centurionafrica.rw"
      ? [...(ROLE_ACCESS[user.role] || []), "/dashboard/reports"]
      : ROLE_ACCESS[user.role] || []
  if (pathname !== "/dashboard" && !allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
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
