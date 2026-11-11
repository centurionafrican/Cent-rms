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
    let cancelled = false

    async function restoreUser() {
      const userStr = sessionStorage.getItem("user")
      if (userStr) {
        try {
          const storedUser = JSON.parse(userStr) as User
          if (!cancelled) setUser(storedUser)
          setLoading(false)
          return
        } catch (error) {
          console.error("Failed to parse user:", error)
          sessionStorage.removeItem("user")
        }
      }

      const token = sessionStorage.getItem("auth_token")
      if (token) {
        try {
          const response = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (response.ok) {
            const data = await response.json()
            if (!cancelled && data.user) {
              sessionStorage.setItem("user", JSON.stringify(data.user))
              setUser(data.user)
            }
          } else {
            sessionStorage.removeItem("auth_token")
          }
        } catch (error) {
          console.error("Failed to restore session user:", error)
        }
      }

      if (!cancelled) setLoading(false)
    }

    void restoreUser()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [loading, router, user])

  useEffect(() => {
    if (!user || pathname === "/dashboard") return
    const email = user.email?.trim().toLowerCase()
    const role = String(user.role || "").trim().toLowerCase()
    const allowedPaths = email === "emmanuel.gashabuka@centurionafrica.rw"
      ? ["/dashboard", "/dashboard/clients", "/dashboard/guards", "/dashboard/sites"]
      : email === "peace.munganyinka@centurionafrica.rw"
        ? [...(ROLE_ACCESS[role] || []), "/dashboard/reports"]
        : ROLE_ACCESS[role] || []
    const hasAccess = allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    if (!hasAccess) router.replace("/dashboard")
  }, [pathname, router, user])

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-muted-foreground">Loading your dashboard…</main>
  }
  if (!user) return null

  const email = user.email?.trim().toLowerCase()
  const role = String(user.role || "").trim().toLowerCase()
  const allowedPaths = email === "emmanuel.gashabuka@centurionafrica.rw"
    ? ["/dashboard", "/dashboard/clients", "/dashboard/guards", "/dashboard/sites"]
    : email === "peace.munganyinka@centurionafrica.rw"
      ? [...(ROLE_ACCESS[role] || []), "/dashboard/reports"]
      : ROLE_ACCESS[role] || []
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
