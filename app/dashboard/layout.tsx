import React from "react"
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { hasAccess } from '@/lib/db'
import { ShieldAlert } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()

  if (!user) {
    redirect('/login')
  }

  // Get the current path for access control
  const headerList = await headers()
  const pathname = headerList.get("x-next-pathname") || headerList.get("x-invoke-path") || "/dashboard"

  // Check access - extract the base path (e.g., /dashboard/guards from /dashboard/guards/123)
  const pathSegments = pathname.split("/").filter(Boolean)
  const basePath = `/${pathSegments.slice(0, Math.min(pathSegments.length, 2)).join("/")}`
  const canAccess = hasAccess(user.role, basePath)

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardSidebar user={user} />
      <div className="lg:pl-64">
        <DashboardHeader user={user} />
        <main className="p-6">
          {canAccess ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground text-center max-w-md">
                You do not have permission to access this page. Please contact your administrator if you believe this is an error.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
