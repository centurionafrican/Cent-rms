"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Search, Users, Calendar, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface PayrollEntry {
  guard_id: number
  first_name: string
  last_name: string
  guard_code: string | null
  bank_name: string | null
  account_number: string | null
  designation: string | null
  location: string | null
  working_days: number
}

interface PayrollData {
  month: string
  startDate: string
  endDate: string
  payroll: PayrollEntry[]
  summary: {
    totalGuards: number
    totalWorkingDays: number
  }
}

export default function PayrollPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [search, setSearch] = useState("")

  const { data, isLoading, error } = useSWR<PayrollData>(
    `/api/payroll?month=${month}`,
    fetcher
  )

  const filtered = data?.payroll.filter((p) =>
    `${p.first_name} ${p.last_name} ${p.guard_code || ""} ${p.bank_name || ""} ${p.location || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  ) || []

  function downloadCSV() {
    if (!data) return

    const headers = ["BANK Name", "A/C", "FULL NAMES", "DESIGNATION", "LOCATION", "WORKING DAYS"]
    const rows = data.payroll.map((p) => [
      p.bank_name || "-",
      p.account_number || "-",
      `${p.first_name} ${p.last_name}`,
      p.designation || "-",
      p.location || "-",
      p.working_days,
    ])

    rows.push([])
    rows.push(["", "", "TOTAL", "", "", data.summary.totalWorkingDays])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c ?? "")}"`).join(","))
      .join("\n")
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
          .company { font-size: 22px; font-weight: bold; color: #1e40af; }
          .period { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #1e40af; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .summary { margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; }
          .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
          @media print { body { padding: 0; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">CENTURION AFRICAN SECURITY SERVICES</div>
          <div class="period">Payroll: ${new Date(data.startDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>BANK Name</th>
              <th>A/C</th>
              <th>FULL NAMES</th>
              <th>DESIGNATION</th>
              <th>LOCATION</th>
              <th>WORKING DAYS</th>
            </tr>
          </thead>
          <tbody>
            ${data.payroll.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.bank_name || "-"}</td>
                <td>${p.account_number || "-"}</td>
                <td>${p.first_name} ${p.last_name}</td>
                <td>${p.designation || "-"}</td>
                <td>${p.location || "-"}</td>
                <td>${p.working_days}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="summary">
          <div class="summary-row"><span>Total Guards:</span><span>${data.summary.totalGuards}</span></div>
          <div class="summary-row"><span>Total Working Days:</span><span>${data.summary.totalWorkingDays}</span></div>
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
            Worked days per guard based on attendance, with banking and posting details
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
      <div className="grid gap-4 md:grid-cols-2">
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
            <CardTitle className="text-sm font-medium">Total Working Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalWorkingDays || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Report</CardTitle>
          <CardDescription>Select a month to view working days per guard</CardDescription>
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
                placeholder="Search by name, bank, location..."
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
                    <TableHead>BANK Name</TableHead>
                    <TableHead>A/C</TableHead>
                    <TableHead>FULL NAMES</TableHead>
                    <TableHead>DESIGNATION</TableHead>
                    <TableHead>LOCATION</TableHead>
                    <TableHead className="text-center">WORKING DAYS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payroll data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p, idx) => (
                      <TableRow key={p.guard_id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>{p.bank_name || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="font-mono">{p.account_number || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                        <TableCell>{p.designation || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>{p.location || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {p.working_days}
                          </Badge>
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
    </div>
  )
}
