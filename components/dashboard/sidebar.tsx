"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { type User, ROLE_ACCESS } from "@/lib/db"
import {
  LayoutDashboard,
  Users,
  MapPin,
  Clock,
  CalendarCheck,
  Timer,
  CalendarX,
  AlertTriangle,
  FileText,
  UserCog,
  Building2,
  Contact,
  ArrowLeftRight,
  CalendarOff,
} from "lucide-react"

interface SidebarProps {
  user: User
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/dashboard/clients", icon: Building2 },
  { name: "Guards", href: "/dashboard/guards", icon: Users },
  { name: "Sites", href: "/dashboard/sites", icon: MapPin },
  { name: "Shifts", href: "/dashboard/shifts", icon: Clock },
  { name: "Assignments", href: "/dashboard/assignments", icon: CalendarCheck },
  { name: "Assignment Changes", href: "/dashboard/assignment-change-requests", icon: ArrowLeftRight },
  { name: "Guard Off Days", href: "/dashboard/guard-offs", icon: CalendarOff },
  { name: "Time & Attendance", href: "/dashboard/attendance", icon: Timer },
  { name: "Leaves", href: "/dashboard/leaves", icon: CalendarX },
  { name: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
  { name: "Guard Portal", href: "/dashboard/guard-portal", icon: Contact },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "System Users", href: "/dashboard/users", icon: UserCog },
]

const roleLabels: Record<string, string> = {
  admin: "System Admin",
  ceo: "CEO",
  coceo: "Co-CEO",
  operations_manager: "Operations Manager",
  hr: "HR",
  roster_manager: "Roster Manager",
  coordinator: "Coordinator",
}

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const allowedPaths = ROLE_ACCESS[user.role] || []
  const filteredNavigation = navigation
    .filter((item) => allowedPaths.includes(item.href))
    .filter((item) => {
      // Hide System Users for non-admin users
      if (item.href === "/dashboard/users" && user.role !== "admin") {
        return false
      }
      return true
    })

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <Image
          src="/images/image.png"
          alt="Centurion Logo"
          width={40}
          height={40}
          className="h-10 w-10"
        />
        <div className="flex flex-col">
          <h1 className="font-bold text-sidebar-foreground text-lg leading-tight">Centurion</h1>
          <span className="text-xs text-sidebar-foreground/60">Roster Management</span>
        </div>
      </div>
      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary font-semibold">
            {user.first_name?.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.first_name} {user.last_name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {roleLabels[user.role] || user.role}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-3 overflow-y-auto h-[calc(100vh-180px)]">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
