"use client"

import { useState, useEffect } from "react"
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

export function GuardAnalytics({ dateFrom, dateTo }: ReportAnalyticsProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/reports/analytics?type=guard_analytics&from=${dateFrom}&to=${dateTo}`)
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error("Error fetching guard analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [dateFrom, dateTo])

  if (loading) return <div className="text-center py-4">Loading analytics...</div>
  if (!data) return <div className="text-center py-4 text-muted-foreground">No data available</div>

  const summaryData = [
    { name: "Present", value: data.summary.present, color: "#10b981" },
    { name: "Absent", value: data.summary.absent, color: "#ef4444" },
    { name: "Late", value: data.summary.late, color: "#f59e0b" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{data.summary.late}</div>
            <p className="text-xs text-muted-foreground mt-1">Late arrivals</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Summary</CardTitle>
          <CardDescription>Distribution of attendance status</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Attendance Trend</CardTitle>
          <CardDescription>Attendance pattern over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10b981" name="Present" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Absent" />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Late" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SiteAnalytics({ dateFrom, dateTo }: ReportAnalyticsProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSite, setSelectedSite] = useState<any>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/reports/analytics?type=site_analytics&from=${dateFrom}&to=${dateTo}`)
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error("Error fetching site analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [dateFrom, dateTo])

  if (loading) return <div className="text-center py-4">Loading analytics...</div>
  if (!data?.sites?.length) return <div className="text-center py-4 text-muted-foreground">No site data available</div>

  const topSite = data.sites[0]
  const totalGuards = data.sites.reduce((sum: number, s: any) => sum + (s.total_guards || 0), 0)
  const totalIncidents = data.sites.reduce((sum: number, s: any) => sum + (s.open_incidents || 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Guards Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalGuards}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all sites</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Site by Guards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{topSite?.name}</div>
            <p className="text-xs text-muted-foreground mt-1">{topSite?.total_guards} guards assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{totalIncidents}</div>
            <p className="text-xs text-muted-foreground mt-1">Requiring attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sites Overview</CardTitle>
          <CardDescription>Guards assigned and incidents by site</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sites}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_guards" fill="#1e40af" name="Guards" />
                <Bar dataKey="upcoming_assignments" fill="#10b981" name="Upcoming" />
                <Bar dataKey="open_incidents" fill="#ef4444" name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Site Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.sites.map((site: any) => (
              <div
                key={site.id}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedSite(site)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{site.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {site.total_guards} guards • {site.upcoming_assignments} upcoming • {site.open_incidents} incidents
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={site.open_incidents > 0 ? "destructive" : "default"}>
                      {site.open_incidents} Issues
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSite} onOpenChange={(open) => !open && setSelectedSite(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSite?.name} - Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Guards</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedSite?.total_guards}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Upcoming Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedSite?.upcoming_assignments}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Open Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{selectedSite?.open_incidents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Avg Hours/Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(selectedSite?.avg_hours_worked || 0).toFixed(1)}h</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function IncidentAnalytics({ dateFrom, dateTo }: ReportAnalyticsProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/reports/analytics?type=incident_analytics&from=${dateFrom}&to=${dateTo}`)
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error("Error fetching incident analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [dateFrom, dateTo])

  if (loading) return <div className="text-center py-4">Loading analytics...</div>
  if (!data) return <div className="text-center py-4 text-muted-foreground">No incident data available</div>

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
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/reports/analytics?type=leave_analytics&from=${dateFrom}&to=${dateTo}`)
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error("Error fetching leave analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [dateFrom, dateTo])

  if (loading) return <div className="text-center py-4">Loading analytics...</div>
  if (!data) return <div className="text-center py-4 text-muted-foreground">No leave data available</div>

  const statusData = [
    { name: "Approved", value: data.summary.approved, color: "#10b981" },
    { name: "Pending", value: data.summary.pending, color: "#f59e0b" },
    { name: "Rejected", value: data.summary.rejected, color: "#ef4444" },
  ]

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
