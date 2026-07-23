import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  UserPlus,
  CalendarPlus,
  Building2,
  ClipboardList,
  FileText,
  FileWarning,
  Download,
  Briefcase,
} from "lucide-react"
import Link from "next/link"
import { EmployeeRosterTable } from "./components/employee-roster-table"

async function getDashboardStats() {
  try {
    // Fetch all counts in simple, direct queries
    const guardsResult = await sql`SELECT COUNT(*) as count FROM guards`
    const totalGuards = Number(guardsResult[0]?.count || 0)

    const sitesResult = await sql`SELECT COUNT(*) as count FROM sites`
    const totalSites = Number(sitesResult[0]?.count || 0)

    const clientsResult = await sql`SELECT COUNT(*) as count FROM clients`
    const totalClients = Number(clientsResult[0]?.count || 0)

    // Total shifts: all assignments in the system
    const totalShiftsResult = await sql`SELECT COUNT(*) as count FROM assignments`
    const totalShifts = Number(totalShiftsResult[0]?.count || 0)
    
    const pendingAssignmentsResult = await sql`SELECT COUNT(*) as count FROM assignments WHERE status = 'pending'`
    const pendingAssignments = Number(pendingAssignmentsResult[0]?.count || 0)

    // Open incidents
    const incidentsResult = await sql`SELECT COUNT(*) as count FROM incidents`
    const openIncidents = Number(incidentsResult[0]?.count || 0)
    
    // Pending leaves
    const leavesResult = await sql`SELECT COUNT(*) as count FROM leave_requests`
    const pendingLeaves = Number(leavesResult[0]?.count || 0)

    return {
      totalGuards,
      activeSites: totalSites,
      totalShifts,
      pendingAssignments,
      openIncidents,
      pendingLeaves,
      totalClients,
    }
  } catch (error) {
    console.error("[v0] Dashboard stats error:", error)
    return {
      totalGuards: 0,
      activeSites: 0,
      totalShifts: 0,
      pendingAssignments: 0,
      openIncidents: 0,
      pendingLeaves: 0,
      totalClients: 0,
    }
  }
}

async function getGuardsWithStatus() {
  try {
    // Get top 5 active guards for the employee roster
    const guards = await sql`
      SELECT id, first_name, last_name, email, phone, status
      FROM guards
      ORDER BY first_name, last_name
      LIMIT 5
    `
    return guards
  } catch (error) {
    console.error("[v0] Error fetching guards:", error)
    return []
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const guards = await getGuardsWithStatus()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Current View / Main Account Default</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalGuards}</div>
            <p className="text-xs text-muted-foreground">{stats.totalGuards} active</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
              Active Sites
            </CardTitle>
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.activeSites}</div>
            <p className="text-xs text-muted-foreground">{stats.activeSites} locations</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
              Total Clients
            </CardTitle>
            <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
              Total Shifts
            </CardTitle>
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalShifts}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingAssignments} pending</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
              Pending Assignments
            </CardTitle>
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.pendingAssignments}</div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
              Open Incidents
            </CardTitle>
            <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.openIncidents}</div>
            <p className="text-xs text-muted-foreground">Attention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
              Pending Leaves
            </CardTitle>
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">Awaiting</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Link href="/dashboard/guards">
          <Button className="w-full h-auto py-6 flex flex-col gap-2 bg-primary hover:bg-primary/90">
            <UserPlus className="h-6 w-6" />
            <span className="font-semibold">Add Guard</span>
            <span className="text-xs opacity-80">Register new security personnel</span>
          </Button>
        </Link>

        <Link href="/dashboard/clients">
          <Button className="w-full h-auto py-6 flex flex-col gap-2 bg-sky-600 hover:bg-sky-700 text-white">
            <Briefcase className="h-6 w-6" />
            <span className="font-semibold">Add Client</span>
            <span className="text-xs opacity-80">Register new client</span>
          </Button>
        </Link>

        <Link href="/dashboard/shifts">
          <Button className="w-full h-auto py-6 flex flex-col gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <CalendarPlus className="h-6 w-6" />
            <span className="font-semibold">Manage Shifts</span>
            <span className="text-xs opacity-80">Create and configure shifts</span>
          </Button>
        </Link>

        <Link href="/dashboard/sites">
          <Button className="w-full h-auto py-6 flex flex-col gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Building2 className="h-6 w-6" />
            <span className="font-semibold">Add Site</span>
            <span className="text-xs opacity-80">Register new security location</span>
          </Button>
        </Link>

        <Link href="/dashboard/assignments">
          <Button className="w-full h-auto py-6 flex flex-col gap-2 hover:bg-amber-700 text-white bg-accent">
            <ClipboardList className="h-6 w-6" />
            <span className="font-semibold">Make Assignment</span>
            <span className="text-xs opacity-80">Assign guards to shifts</span>
          </Button>
        </Link>
      </div>

      {/* Employee Roster */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Employee Roster</CardTitle>
            <p className="text-sm text-muted-foreground">Current staff status and assignments</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {guards.length} active
          </Badge>
        </CardHeader>
        <CardContent>
          <EmployeeRosterTable guards={guards as Record<string, unknown>[]} />
        </CardContent>
      </Card>

      {/* Reports & Analytics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Reports & Analytics</CardTitle>
            <p className="text-sm text-muted-foreground">Generate and download operational reports</p>
          </div>
          <Link href="/dashboard/reports">
            <Button variant="outline" size="sm">View All Reports</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/attendance">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 justify-start items-start bg-transparent">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Attendance Report</span>
                <span className="text-xs text-muted-foreground">Time & attendance data</span>
              </Button>
            </Link>

            <Link href="/dashboard/incidents">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 justify-start items-start bg-transparent">
                <FileWarning className="h-5 w-5 text-red-500" />
                <span className="font-medium">Incidents Report</span>
                <span className="text-xs text-muted-foreground">All incident records</span>
              </Button>
            </Link>

            <Link href="/dashboard/leaves">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 justify-start items-start bg-transparent">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Leave Requests</span>
                <span className="text-xs text-muted-foreground">Manage leave requests</span>
              </Button>
            </Link>

            <Link href="/dashboard/reports">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 justify-start items-start bg-transparent">
                <Download className="h-5 w-5 text-green-500" />
                <span className="font-medium">Export Data</span>
                <span className="text-xs text-muted-foreground">Download all reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
