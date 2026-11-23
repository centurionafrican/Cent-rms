"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface ReportAnalyticsProps {
  dateFrom: string
  dateTo: string
}

const COLORS = ["#1e40af", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

async function analyticsFetcher(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Analytics request failed (${response.status})`)
  return response.json()
}

function AnalyticsError({ message }: { message: string }) {
  return <div role="alert" className="py-4 text-center text-destructive">{message}</div>
}

export function GuardAnalytics({ dateFrom, dateTo }: ReportAnalyticsProps) {
  const { data, error, isLoading } = useSWR(
    `/api/reports/analytics?type=guard_analytics&from=${dateFrom}&to=${dateTo}`,
    analyticsFetcher,
  )

  if (isLoading) return <div className="py-4 text-center">Loading analytics...</div>
  if (error) return <AnalyticsError message="Unable to load attendance analytics. Please try again." />
  if (!data) return <div className="py-4 text-center text-muted-foreground">No attendance data available.</div>

  const hasAttendance = Array.isArray(data.status) && data.status.length > 0
  const summaryData: Array<{ name: string; value: number; color: string }> = (data.status || []).map((item: any, index: number) => ({
    name: item.status,
    value: Number(item.count),
    color: COLORS[index % COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{data.summary.present}</div>
            <p className="text-xs text-muted-foreground mt-1">On time attendance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{data.summary.absent}</div>
            <p className="text-xs text-muted-foreground mt-1">Missed shifts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Summary</CardTitle>
          <CardDescription>Distribution of attendance status</CardDescription>
        </CardHeader>
        <CardContent>
          {hasAttendance ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summaryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {summaryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-center text-muted-foreground">No attendance records in the selected date range.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Attendance Trend</CardTitle>
          <CardDescription>Attendance pattern over time</CardDescription>
        </CardHeader>
        <CardContent>
          {data.trend?.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#10b981" name="Present" />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Absent" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-center text-muted-foreground">No attendance records in the selected date range.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function SiteAnalytics({ dateFrom, dateTo }: ReportAnalyticsProps) {
  const [selectedSite, setSelectedSite] = useState<any>(null)
  const { data, error, isLoading } = useSWR(
    `/api/reports/analytics?type=site_analytics&from=${dateFrom}&to=${dateTo}`,
    analyticsFetcher,
  )

  if (isLoading) return <div className="py-4 text-center">Loading analytics...</div>
  if (error) return <AnalyticsError message="Unable to load site analytics. Please try again." />
  if (!data?.sites?.length) return <div className="py-4 text-center text-muted-foreground">No active sites found in the system.</div>

  const summary = data.summary
  const hasSiteActivity = Number(summary?.assigned_guards ?? 0) > 0 || Number(summary?.open_incidents ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Active Sites</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{summary.active_sites}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Guards Needed</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{summary.guards_needed}</div><p className="mt-1 text-xs text-muted-foreground">From site staffing requirements</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Active Guards</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{summary.active_guards}</div><p className="mt-1 text-xs text-muted-foreground">From the guard roster</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Guards Assigned</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{summary.assigned_guards}</div><p className="mt-1 text-xs text-muted-foreground">Unique guards in the selected date range</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Open Incidents</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-orange-600">{summary.open_incidents}</div><p className="mt-1 text-xs text-muted-foreground">In the selected date range</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Site Staffing</CardTitle>
          <CardDescription>
            {Number(summary.assigned_guards) > 0
              ? "System-recorded guard requirements compared with assignments in the selected date range"
              : "Showing recorded guard requirements; no assignments exist in the selected date range."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.sites.some((site: any) => site.guards_needed !== null || Number(site.assigned_guards) > 0) ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sites}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="guards_needed" fill="#1e40af" name="Guards Needed" />
                  {Number(summary.assigned_guards) > 0 && <Bar dataKey="assigned_guards" fill="#10b981" name="Guards Assigned" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-center text-muted-foreground">No staffing requirements or assignments are recorded for these sites.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Site Information</CardTitle>
          <CardDescription>{hasSiteActivity ? "Site records for the selected date range" : "No assignments or incidents are recorded in the selected date range; site requirements and guard roster counts are shown."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {data.sites.map((site: any) => (
              <button
                key={site.id}
                type="button"
                className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => setSelectedSite(site)}
                aria-label={`View ${site.name} analytics details`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold">{site.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {site.guards_needed == null ? "Guard requirement not specified" : `${site.guards_needed} guards needed`}
                      {Number(site.assigned_guards) > 0 && ` • ${site.assigned_guards} assigned`}
                      {Number(site.upcoming_assignments) > 0 && ` • ${site.upcoming_assignments} upcoming`}
                      {Number(site.open_incidents) > 0 && ` • ${site.open_incidents} incidents`}
                    </p>
                  </div>
                  <Badge variant={Number(site.open_incidents) > 0 ? "destructive" : "secondary"}>
                    {site.open_incidents} open
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSite} onOpenChange={(open) => !open && setSelectedSite(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSite?.name} - Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Guards Needed</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{selectedSite?.guards_needed ?? "Not specified"}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Guards Assigned</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{selectedSite?.assigned_guards}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming Assignments</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{selectedSite?.upcoming_assignments}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Open Incidents</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-orange-600">{selectedSite?.open_incidents}</div></CardContent>
            </Card>
            <Card className="col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Average Hours Worked</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedSite?.avg_hours_worked == null ? "No attendance records" : `${Number(selectedSite.avg_hours_worked).toFixed(1)}h`}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function IncidentAnalytics({ dateFrom, dateTo }: ReportAnalyticsProps) {
  const { data, error, isLoading } = useSWR(
    `/api/reports/analytics?type=incident_analytics&from=${dateFrom}&to=${dateTo}`,
    analyticsFetcher,
  )

  if (isLoading) return <div className="py-4 text-center">Loading analytics...</div>
  if (error) return <AnalyticsError message="Unable to load incident analytics. Please try again." />
  if (!data) return <div className="py-4 text-center text-muted-foreground">No incident data available.</div>
  if (!data.severity?.length && !data.status?.length && !data.trend?.length) {
    return <div className="py-8 text-center text-muted-foreground">No incidents recorded in the selected date range.</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incidents by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.severity}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ severity, count }) => `${severity}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.severity.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.status?.map((item: any) => (
                <div key={item.status} className="flex justify-between items-center">
                  <span className="capitalize">{item.status}</span>
                  <Badge>{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Trend</CardTitle>
          <CardDescription>Monthly incident pattern</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#ef4444" name="Incidents" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function LeaveAnalytics({ dateFrom, dateTo }: ReportAnalyticsProps) {
  const { data, error, isLoading } = useSWR(
    `/api/reports/analytics?type=leave_analytics&from=${dateFrom}&to=${dateTo}`,
    analyticsFetcher,
  )

  if (isLoading) return <div className="py-4 text-center">Loading analytics...</div>
  if (error) return <AnalyticsError message="Unable to load leave analytics. Please try again." />
  if (!data) return <div className="py-4 text-center text-muted-foreground">No leave data available.</div>
  if (!data.status?.length) return <div className="py-8 text-center text-muted-foreground">No leave requests overlap the selected date range.</div>

  const statusData: Array<{ name: string; value: number; color: string }> = data.status.map((item: any, index: number) => ({
    name: item.status,
    value: Number(item.count),
    color: COLORS[index % COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{data.summary.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{data.summary.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{data.summary.rejected}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leaves by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byType || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="leave_type" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="#1e40af" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
