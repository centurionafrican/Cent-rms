"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Users, Calendar, Building2, AlertTriangle, FileText, Download, Eye, Search, X } from "lucide-react"
import { GuardAnalytics, SiteAnalytics, IncidentAnalytics, LeaveAnalytics } from "./report-analytics"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface ReportData {
  guardsByStatus: { status: string; count: number }[]
  assignmentsBySite: { site: string; count: number }[]
  attendanceSummary: { status: string; count: number }[]
  leavesByType: { leave_type: string; count: number }[]
  incidentsBySeverity: { severity: string; count: number }[]
  stats: {
    totalGuards: number
    totalSites: number
    totalAssignmentsThisMonth: number
    pendingLeaves: number
    openIncidents: number
  }
}

interface ReportsDashboardProps {
  data: ReportData
}

const COLORS = ["#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#10b981", "#f59e0b", "#ef4444"]

type ReportRow = Record<string, string | number | boolean | null>

export function ReportsDashboard({ data }: ReportsDashboardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0]
  )
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0])
  const [activeTab, setActiveTab] = useState("overview")
  const [analyticsTab, setAnalyticsTab] = useState("guards")

  // In-system report viewing
  const [viewingReport, setViewingReport] = useState<string | null>(null)
  const [reportRows, setReportRows] = useState<ReportRow[]>([])
  const [reportColumns, setReportColumns] = useState<string[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [reportSearch, setReportSearch] = useState("")
  const [reportFilter, setReportFilter] = useState("all")

  // Site drill-down
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [siteGuards, setSiteGuards] = useState<any[]>([])
  const [siteModalOpen, setSiteModalOpen] = useState(false)
  const [loadingSiteGuards, setLoadingSiteGuards] = useState(false)
  const [isExportingSiteData, setIsExportingSiteData] = useState(false)

  const siteData = data.assignmentsBySite.map((item) => ({
    name: item.site,
    assignments: Number(item.count),
  }))

  const statusData = data.guardsByStatus.map((item) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: Number(item.count),
  }))

  const incidentData = data.incidentsBySeverity.map((item) => ({
    name: item.severity.charAt(0).toUpperCase() + item.severity.slice(1),
    value: Number(item.count),
  }))

  async function viewSiteDetails(siteName: string) {
    setSelectedSite(siteName)
    setLoadingSiteGuards(true)
    try {
      const res = await fetch(`/api/sites/by-name/${encodeURIComponent(siteName)}/guards`)
      if (res.ok) {
        const data = await res.json()
        setSiteGuards(data.guards || [])
      }
    } catch (e) {
      console.error("Failed to fetch site guards:", e)
    } finally {
      setLoadingSiteGuards(false)
      setSiteModalOpen(true)
    }
  }

  async function downloadSiteData() {
    if (!selectedSite || siteGuards.length === 0) return
    setIsExportingSiteData(true)
    try {
      // Create CSV content
      const headers = ["Guard Name", "ID Number", "Phone", "Email", "Status", "Assignment Period"]
      const rows = siteGuards.map((guard) => [
        guard.guard_name,
        guard.id_number || "N/A",
        guard.phone || "N/A",
        guard.email || "N/A",
        guard.status,
        guard.date_from && guard.date_to
          ? `${new Date(guard.date_from).toLocaleDateString()} - ${new Date(guard.date_to).toLocaleDateString()}`
          : "N/A",
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${selectedSite}_guards_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error("Export failed:", e)
    } finally {
      setIsExportingSiteData(false)
    }
  }

  async function viewReport(reportType: string) {
    setReportLoading(true)
    setViewingReport(reportType)
    setReportSearch("")
    setReportFilter("all")
    try {
      const res = await fetch(`/api/reports/data?type=${reportType}&from=${dateFrom}&to=${dateTo}`)
      if (res.ok) {
        const result = await res.json()
        setReportRows(result.rows || [])
        setReportColumns(result.columns || [])
      }
    } catch (error) {
      console.error("Error fetching report:", error)
    } finally {
      setReportLoading(false)
    }
  }

  async function downloadReport(reportType: string) {
    setLoading(reportType)
    try {
      const res = await fetch(`/api/reports/${reportType}?from=${dateFrom}&to=${dateTo}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${reportType}-report-${dateFrom}-to-${dateTo}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert("Failed to generate report")
      }
    } catch (error) {
      console.error("Error downloading report:", error)
      alert("Failed to download report")
    } finally {
      setLoading(null)
    }
  }

  // Columns that are internal DB keys — hide them from the display table
  const HIDDEN_COLS = new Set(["id", "guard_id", "site_id", "shift_id", "assignment_id", "client_id", "created_at", "updated_at", "created_by", "resolved_by", "password_hash"])

  const visibleColumns = reportColumns.filter((c) => !HIDDEN_COLS.has(c))

  const filteredRows = reportRows.filter((row) => {
    const matchesSearch = reportSearch === "" || Object.values(row).some(
      (v) => String(v ?? "").toLowerCase().includes(reportSearch.toLowerCase())
    )
    const matchesFilter = reportFilter === "all" || Object.values(row).some(
      (v) => String(v ?? "").toLowerCase() === reportFilter.toLowerCase()
    )
    return matchesSearch && matchesFilter
  })

  const reportLabels: Record<string, string> = {
    guards: "Guards Report",
    clients: "Clients Report",
    sites: "Sites Report",
    assignments: "Assignments Report",
    attendance: "Attendance Report",
    incidents: "Incidents Report",
    leaves: "Leaves Report",
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Guards</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalGuards}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sites</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.totalSites}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assignments (Month)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.stats.totalAssignmentsThisMonth}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Leaves</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{data.stats.pendingLeaves}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{data.stats.openIncidents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-2">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="grid gap-2">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            {viewingReport && (
              <Button variant="outline" onClick={() => viewReport(viewingReport)}>
                Refresh Data
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="view">View Reports</TabsTrigger>
          <TabsTrigger value="download">Download CSV</TabsTrigger>
        </TabsList>

        {/* Charts Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Assignments by Site</CardTitle>
                <CardDescription>Click on a site to view assigned guards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {siteData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={siteData} onClick={(state) => {
                        if (state?.activeTooltipIndex !== undefined) {
                          const siteName = siteData[state.activeTooltipIndex]?.name
                          if (siteName) viewSiteDetails(siteName)
                        }
                      }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs cursor-pointer" />
                        <YAxis className="text-xs" />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} cursor={{ fill: "rgba(0,0,0,0.1)" }} />
                        <Bar dataKey="assignments" fill="#1e40af" radius={[4, 4, 0, 0]} onClick={(data) => viewSiteDetails(data.payload?.name)} style={{ cursor: "pointer" }} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No assignment data</div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Guards by Status</CardTitle>
                <CardDescription>Distribution across lifecycle phases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {statusData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No guard data</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Incidents by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {incidentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incidentData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No incident data</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* View Reports Tab */}
        <TabsContent value="view" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {["guards", "clients", "sites", "assignments", "attendance", "incidents", "leaves"].map((type) => (
              <Card key={type} className={`cursor-pointer transition-colors hover:border-primary/50 ${viewingReport === type ? "border-primary bg-primary/5" : ""}`} onClick={() => viewReport(type)}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="font-medium capitalize">{type} Report</p>
                    <p className="text-sm text-muted-foreground">View {type} data in system</p>
                  </div>
                  <Eye className="h-5 w-5 text-primary" />
                </CardContent>
              </Card>
            ))}
          </div>

          {viewingReport && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{reportLabels[viewingReport]}</CardTitle>
                    <CardDescription>{filteredRows.length} records found ({dateFrom} to {dateTo})</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => downloadReport(viewingReport)} disabled={loading === viewingReport}>
                      <Download className="mr-2 h-3.5 w-3.5" />
                      {loading === viewingReport ? "Exporting..." : "Export CSV"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search records..." value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} className="pl-10" />
                  </div>
                  {reportColumns.includes("status") && (
                    <Select value={reportFilter} onValueChange={setReportFilter}>
                      <SelectTrigger className="w-[150px]"><SelectValue placeholder="Filter status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {reportLoading ? (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">Loading report data...</div>
                ) : reportColumns.length > 0 ? (
                  <div className="rounded-md border overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center font-semibold">#</TableHead>
                          {visibleColumns.map((col) => (
                            <TableHead key={col} className="whitespace-nowrap capitalize font-semibold">{col.replace(/_/g, " ")}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.length === 0 ? (
                          <TableRow><TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">No data found</TableCell></TableRow>
                        ) : (
                          filteredRows.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-center text-muted-foreground text-sm font-mono w-12">{idx + 1}</TableCell>
                              {visibleColumns.map((col) => (
                                <TableCell key={col} className="whitespace-nowrap">
                                  {col === "status" || col === "severity" ? (
                                    <Badge variant="outline" className="capitalize">{String(row[col] ?? "")}</Badge>
                                  ) : (
                                    String(row[col] ?? "-")
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">Select a report type above to view data</div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex gap-2 mb-6">
            <Button
              variant={analyticsTab === "guards" ? "default" : "outline"}
              onClick={() => setAnalyticsTab("guards")}
            >
              Guard Analytics
            </Button>
            <Button
              variant={analyticsTab === "sites" ? "default" : "outline"}
              onClick={() => setAnalyticsTab("sites")}
            >
              Site Analytics
            </Button>
            <Button
              variant={analyticsTab === "incidents" ? "default" : "outline"}
              onClick={() => setAnalyticsTab("incidents")}
            >
              Incidents
            </Button>
            <Button
              variant={analyticsTab === "leaves" ? "default" : "outline"}
              onClick={() => setAnalyticsTab("leaves")}
            >
              Leaves
            </Button>
          </div>

          {analyticsTab === "guards" && <GuardAnalytics dateFrom={dateFrom} dateTo={dateTo} />}
          {analyticsTab === "sites" && <SiteAnalytics dateFrom={dateFrom} dateTo={dateTo} />}
          {analyticsTab === "incidents" && <IncidentAnalytics dateFrom={dateFrom} dateTo={dateTo} />}
          {analyticsTab === "leaves" && <LeaveAnalytics dateFrom={dateFrom} dateTo={dateTo} />}
        </TabsContent>

        {/* Download Tab */}
        <TabsContent value="download">
          <Card>
            <CardHeader>
              <CardTitle>Export Reports as CSV</CardTitle>
              <CardDescription>Download reports for the selected date range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {["guards", "clients", "sites", "assignments", "attendance", "incidents", "leaves"].map((type) => (
                  <Button key={type} variant="outline" onClick={() => downloadReport(type)} disabled={loading === type} className="justify-start h-auto py-3">
                    <Download className="mr-3 h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <p className="font-medium capitalize">{type} Report</p>
                      <p className="text-xs text-muted-foreground">{dateFrom} to {dateTo}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Site Drill-Down Modal */}
      <Dialog open={siteModalOpen} onOpenChange={setSiteModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedSite}</DialogTitle>
            <DialogDescription>All guards assigned to this site</DialogDescription>
          </DialogHeader>

          {loadingSiteGuards ? (
            <div className="flex h-32 items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : siteGuards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No guards currently assigned to this site.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guard Name</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignment Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteGuards.map((guard, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{guard.guard_name}</TableCell>
                      <TableCell className="font-mono text-sm">{guard.id_number || "N/A"}</TableCell>
                      <TableCell>{guard.phone || "N/A"}</TableCell>
                      <TableCell className="text-sm">{guard.email || "N/A"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{guard.status}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {guard.date_from && guard.date_to ? (
                          `${new Date(guard.date_from).toLocaleDateString()} - ${new Date(guard.date_to).toLocaleDateString()}`
                        ) : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSiteModalOpen(false)}>Close</Button>
            {siteGuards.length > 0 && (
              <Button onClick={downloadSiteData} disabled={isExportingSiteData}>
                <Download className="mr-2 h-4 w-4" />
                {isExportingSiteData ? "Exporting..." : "Export to CSV"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
