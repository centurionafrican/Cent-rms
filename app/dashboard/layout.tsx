import React from "react"
import { AuthWrapper } from '@/components/auth-wrapper'
import { DashboardLayoutClient } from '@/components/dashboard/layout-client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthWrapper>
      <DashboardLayoutClient>
        {children}
      </DashboardLayoutClient>
    </AuthWrapper>
  )
}
