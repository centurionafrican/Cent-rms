import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { redirect } from "next/navigation"
import { ReportsDashboard } from "./reports-dashboard"

async function getReportData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Guard counts by status
  const guardsByStatus = await sql`
    SELECT 
      status,
      COUNT(*) as count
    FROM guards
    GROUP BY status
  `

  // Assignments by site
  const assignmentsBySite = await sql`
    SELECT 
      s.name as site,
      COUNT(a.id) as count
    FROM sites s
    LEFT JOIN assignments a ON a.site_id = s.id 
      AND a.date >= ${startOfMonth.toISOString().split("T")[0]}
      AND a.date <= ${endOfMonth.toISOString().split("T")[0]}
    WHERE s.is_active = true
    GROUP BY s.id, s.name
    ORDER BY count DESC
  `

  // Attendance summary
  const attendanceSummary = await sql`
    SELECT 
      status,
      COUNT(*) as count
    FROM attendance
    GROUP BY status
  `

  // Leave requests by type
  const leavesByType = await sql`
    SELECT 
      leave_type,
      COUNT(*) as count
    FROM leave_requests
    GROUP BY leave_type
  `

  // Incidents by severity
  const incidentsBySeverity = await sql`
    SELECT 
      severity,
      COUNT(*) as count
    FROM incidents
    GROUP BY severity
  `

  // Overall stats
  const totalGuards = await sql`
    SELECT COUNT(*) as count FROM guards WHERE status = 'active'
  `

  const totalSites = await sql`
    SELECT COUNT(*) as count FROM sites WHERE is_active = true
  `

  const totalAssignmentsThisMonth = await sql`
    SELECT COUNT(*) as count FROM assignments 
    WHERE date >= ${startOfMonth.toISOString().split("T")[0]}
      AND date <= ${endOfMonth.toISOString().split("T")[0]}
  `

  const pendingLeaves = await sql`
    SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'
  `

  const openIncidents = await sql`
    SELECT COUNT(*) as count FROM incidents WHERE status = 'open'
  `

  return {
    guardsByStatus,
    assignmentsBySite,
    attendanceSummary,
    leavesByType,
    incidentsBySeverity,
    stats: {
      totalGuards: Number(totalGuards[0]?.count || 0),
      totalSites: Number(totalSites[0]?.count || 0),
      totalAssignmentsThisMonth: Number(totalAssignmentsThisMonth[0]?.count || 0),
      pendingLeaves: Number(pendingLeaves[0]?.count || 0),
      openIncidents: Number(openIncidents[0]?.count || 0),
    },
  }
}

export default async function ReportsPage() {
  const user = await getSession()
  if (!user) return null

  if (user.role === "guard") {
    redirect("/dashboard")
  }

  const reportData = await getReportData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          View workforce analytics and download operational reports.
        </p>
      </div>

      <ReportsDashboard data={reportData} />
    </div>
  )
}
