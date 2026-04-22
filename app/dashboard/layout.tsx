import React from "react"
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()

  if (!user) {
    redirect('/login')
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
