import React from "react"
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardAuth } from '@/components/dashboard-auth'
import { DashboardLayoutContent } from '@/components/dashboard-layout-content'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardAuth>
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </DashboardAuth>
  )
}
