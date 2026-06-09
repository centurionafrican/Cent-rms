"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Download, Search, Users, Calendar, FileSpreadsheet, Clock, Moon, CalendarDays, Timer } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface PayrollEntry {
  guard_id: number
  first_name: string
  last_name: string
  guard_code: string | null
  phone: string | null
  days_worked: number
  regular_hours: number
  overtime_hours: number
  night_shifts: number
  holiday_days: number
}

interface PayrollData {
  month: string
  startDate: string
  endDate: string
  payroll: PayrollEntry[]
  summary: {
    totalGuards: number
    totalDaysWorked: number
    totalRegularHours: number
    totalOvertimeHours: number
    totalNightShifts: number
    totalHolidayDays: number
  }
}

export default function PayrollPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [search, setSearch] = useState("")
  const [selectedGuard, setSelectedGuard] = useState<PayrollEntry | null>(null)

  const { data, isLoading, error } = useSWR<PayrollData>(
    `/api/payroll?month=${month}`,
    fetcher
  )

  const filtered = data?.payroll.filter((p) =>
    `${p.first_name} ${p.last_name} ${p.guard_code || ""}`.toLowerCase().includes(search.toLowerCase())
  ) || []

  function downloadCSV() {
    if (!data) return

    const headers = [
      "Guard Code",
      "Name",
      "Phone",
      "Days Worked",
      "Regular Hours",
      "Overtime Hours",
      "Night Shifts",
      "Holiday Days",
    ]
    const rows = data.payroll.map((p) => [
      p.guard_code || "-",
      `${p.first_name} ${p.last_name}`,
      p.phone || "-",
      p.days_worked,
      p.regular_hours,
      p.overtime_hours,
      p.night_shifts,
      p.holiday_days,
    ])

    rows.push([])
    rows.push([
      "TOTAL",
      "",
      "",
      data.summary.totalDaysWorked,
      data.summary.totalRegularHours,
      data.summary.totalOvertimeHours,
      data.summary.totalNightShifts,
      data.summary.totalHolidayDays,
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payroll-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Payroll CSV downloaded")
  }

  function downloadPDF() {
    if (!data) return

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payroll Report - ${month}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
          .company { font-size: 24px; font-weight: bold; color: #1e40af; }
          .period { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #1e40af; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .summary { margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; }
          .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">CENTURION AFRICAN SECURITY SERVICES</div>
          <div class="period">Payroll Report: ${new Date(data.startDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Guard Code</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Days Worked</th>
              <th>Regular Hours</th>
              <th>Overtime Hours</th>
              <th>Night Shifts</th>
              <th>Holiday Days</th>
            </tr>
          </thead>
          <tbody>
            ${data.payroll.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.guard_code || "-"}</td>
                <td>${p.first_name} ${p.last_name}</td>
                <td>${p.phone || "-"}</td>
                <td>${p.days_worked}</td>
                <td>${p.regular_hours}</td>
                <td>${p.overtime_hours}</td>
                <td>${p.night_shifts}</td>
                <td>${p.holiday_days}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row"><span>Total Guards:</span><span>${data.summary.totalGuards}</span></div>
          <div class="summary-row"><span>Total Days Worked:</span><span>${data.summary.totalDaysWorked}</span></div>
          <div class="summary-row"><span>Total Regular Hours:</span><span>${data.summary.totalRegularHours}</span></div>
          <div class="summary-row"><span>Total Overtime Hours:</span><span>${data.summary.totalOvertimeHours}</span></div>
          <div class="summary-row"><span>Total Night Shifts:</span><span>${data.summary.totalNightShifts}</span></div>
          <div class="summary-row"><span>Total Holiday Days:</span><span>${data.summary.totalHolidayDays}</span></div>
        </div>

        <script>window.print();</script>
      </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll Management</h1>
          <p className="text-muted-foreground">
            Track worked hours, overtime, night shifts and holidays based on attendance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCSV} disabled={!data}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={downloadPDF} disabled={!data}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guards</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalGuards || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Worked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalDaysWorked || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regular Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalRegularHours || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{data?.summary.totalOvertimeHours || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Night Shifts</CardTitle>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{data?.summary.totalNightShifts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Holiday Days</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data?.summary.totalHolidayDays || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Report</CardTitle>
          <CardDescription>Select a month to view worked hours and allowances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="flex items-center gap-2">
              <Label>Month:</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guards..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payroll data...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">Failed to load payroll data</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Guard Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-center">Days Worked</TableHead>
                    <TableHead className="text-center">Regular Hours</TableHead>
                    <TableHead className="text-center">Overtime Hours</TableHead>
                    <TableHead className="text-center">Night Shifts</TableHead>
                    <TableHead className="text-center">Holiday Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No payroll data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p, idx) => (
                      <TableRow
                        key={p.guard_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedGuard(p)}
                      >
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-mono font-semibold">{p.guard_code || "-"}</TableCell>
                        <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                        <TableCell>{p.phone || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {p.days_worked}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{p.regular_hours}</TableCell>
                        <TableCell className="text-center">
                          {Number(p.overtime_hours) > 0 ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {p.overtime_hours}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {Number(p.night_shifts) > 0 ? (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                              {p.night_shifts}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {Number(p.holiday_days) > 0 ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {p.holiday_days}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guard Detail Dialog */}
      <Dialog open={!!selectedGuard} onOpenChange={() => setSelectedGuard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payroll Details</DialogTitle>
          </DialogHeader>
          {selectedGuard && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {selectedGuard.first_name[0]}{selectedGuard.last_name[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedGuard.first_name} {selectedGuard.last_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedGuard.guard_code || "No code"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Days Worked</p>
                  <p className="text-lg font-semibold text-green-600">{selectedGuard.days_worked}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Regular Hours</p>
                  <p className="text-lg font-semibold">{selectedGuard.regular_hours}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Overtime Hours</p>
                  <p className="text-lg font-semibold text-amber-600">{selectedGuard.overtime_hours}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Night Shifts</p>
                  <p className="text-lg font-semibold text-indigo-600">{selectedGuard.night_shifts}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg col-span-2">
                  <p className="text-sm text-muted-foreground">Holiday Days (weekends/holidays worked)</p>
                  <p className="text-lg font-semibold text-blue-600">{selectedGuard.holiday_days}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedGuard(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
