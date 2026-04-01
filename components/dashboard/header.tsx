"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { type User, ROLE_ACCESS } from "@/lib/db"
import Image from "next/image"
import {
  Menu,
  LogOut,
  User as UserIcon,
  Bell,
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
} from "lucide-react"

interface HeaderProps {
  user: User
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  manager: "Ops Manager",
  supervisor: "HR / Supervisor",
  coordinator: "Coordinator",
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/dashboard/clients", icon: Building2 },
  { name: "Guards", href: "/dashboard/guards", icon: Users },
  { name: "Sites", href: "/dashboard/sites", icon: MapPin },
  { name: "Shifts", href: "/dashboard/shifts", icon: Clock },
  { name: "Assignments", href: "/dashboard/assignments", icon: CalendarCheck },
  { name: "Time & Attendance", href: "/dashboard/attendance", icon: Timer },
  { name: "Leaves", href: "/dashboard/leaves", icon: CalendarX },
  { name: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
  { name: "Guard Portal", href: "/dashboard/guard-portal", icon: Contact },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "System Users", href: "/dashboard/users", icon: UserCog },
]

export function DashboardHeader({ user }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center gap-4 px-6">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-16 items-center gap-3 border-b border-border px-6">
              <Image
                src="/images/image.png"
                alt="Centurion Logo"
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <div className="flex flex-col">
                <h1 className="font-bold text-foreground text-lg leading-tight">Centurion</h1>
                <span className="text-xs text-muted-foreground">Roster Management</span>
              </div>
            </div>
            <nav className="flex flex-col gap-1 p-3 overflow-y-auto">
              {navigation.filter((item) => (ROLE_ACCESS[user.role] || []).includes(item.href)).map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex-1" />

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                {user.first_name?.charAt(0) || "A"}
              </div>
              <span className="hidden md:inline-block">{user.first_name} {user.last_name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.first_name} {user.last_name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {roleLabels[user.role] || user.role}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
