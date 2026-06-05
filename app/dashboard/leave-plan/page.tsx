"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Calendar, Users, Download, Plus, Eye, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface LeaveRequest {
  id: number
  guard_id: number
  guard_name: string
  guard_code: string
  leave_type: string
  start_date: string
  end_date: string
  status: string
  reason: string
}

interface Guard {
  id: number
  first_name: string
  last_name: string
  guard_code: string
  status: string
  annual_leave_days: number
  leave_days_used: number
}

const LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Maternity Leave", "Paternity Leave", "Compassionate Leave", "Unpaid Leave"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export default function LeavePlanPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedGuard, setSelectedGuard] = useState("")
  const [leaveType, setLeaveType] = useState("Annual Leave")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Calculate date range for the selected month
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`
  const monthEnd = new Date(year, month + 1, 0).toISOString().split("T")[0]

  const { data: leavesData, mutate } = useSWR(`/api/leaves?from=${monthStart}&to=${monthEnd}`, fetcher)
  const { data: guardsData } = useSWR("/api/guards", fetcher)

  const leaves: LeaveRequest[] = leavesData?.leaves || []
  // Guards API returns array directly, filter to active only
  const allGuards: Guard[] = Array.isArray(guardsData) ? guardsData : guardsData?.guards || []
  const guards = allGuards.filter((g) => g.status === "active")

  // Generate calendar days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startingDayOfWeek; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i)

  // Get leaves for a specific day
  function getLeavesForDay(day: number): LeaveRequest[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return leaves.filter((leave) => {
      const start = new Date(leave.start_date)
      const end = new Date(leave.end_date)
      const current = new Date(dateStr)
      return current >= start && current <= end
    })
  }

  // Get working days count
  function getWorkingDays(start: string, end: string): number {
    const startDate = new Date(start)
    const endDate = new Date(end)
    let count = 0
    const current = new Date(startDate)
    while (current <= endDate) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++
      current.setDate(current.getDate() + 1)
    }
    return count
  }

  async function handleSubmit() {
    if (!selectedGuard || !startDate || !endDate) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guard_id: Number(selectedGuard),
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
        }),
      })
      if (res.ok) {
        setIsAddOpen(false)
        setSelectedGuard("")
        setStartDate("")
        setEndDate("")
        setReason("")
        mutate()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to create leave request")
      }
    } finally {
      setSubmitting(false)
    }
  }

  function downloadCSV() {
    const headers = ["Guard Code", "Guard Name", "Leave Type", "Start Date", "End Date", "Working Days", "Status", "Reason"]
    const rows = leaves.map((l) => [
      l.guard_code || "",
      l.guard_name,
      l.leave_type,
      l.start_date,
      l.end_date,
      getWorkingDays(l.start_date, l.end_date),
      l.status,
      l.reason || "",
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leave-plan-${MONTHS[month]}-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700 border-green-200"
      case "rejected": return "bg-red-100 text-red-700 border-red-200"
      default: return "bg-amber-100 text-amber-700 border-amber-200"
    }
  }

  function getLeaveTypeColor(type: string) {
    switch (type) {
      case "Annual Leave": return "bg-blue-500"
      case "Sick Leave": return "bg-red-500"
      case "Maternity Leave": return "bg-pink-500"
      case "Paternity Leave": return "bg-purple-500"
      case "Compassionate Leave": return "bg-amber-500"
      default: return "bg-gray-500"
    }
  }

  // Summary stats
  const totalPlanned = leaves.length
  const approved = leaves.filter((l) => l.status === "approved").length
  const pending = leaves.filter((l) => l.status === "pending").length
  const totalDays = leaves.reduce((sum, l) => sum + getWorkingDays(l.start_date, l.end_date), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Plan</h1>
          <p className="text-muted-foreground">Plan and view scheduled leaves for guards</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Plan Leave
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Planned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlanned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalDays}</div>
          </CardContent>
        </Card>
      </div>

      {/* Month Navigation & View Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => {
                if (month === 0) { setMonth(11); setYear(year - 1) }
                else setMonth(month - 1)
              }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={() => {
                if (month === 11) { setMonth(0); setYear(year + 1) }
                else setMonth(month + 1)
              }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1">
              <Button variant={viewMode === "calendar" ? "default" : "outline"} size="sm" onClick={() => setViewMode("calendar")}>
                <CalendarDays className="h-4 w-4 mr-1" />
                Calendar
              </Button>
              <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
                <Users className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "calendar" ? (
            <div className="border rounded-lg overflow-hidden">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 bg-muted">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium border-b">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar Body */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dayLeaves = day ? getLeavesForDay(day) : []
                  const isWeekend = i % 7 === 0 || i % 7 === 6
                  return (
                    <div
                      key={i}
                      className={`min-h-[100px] border-b border-r p-1 ${isWeekend ? "bg-muted/50" : ""} ${!day ? "bg-muted/30" : ""}`}
                    >
                      {day && (
                        <>
                          <div className="text-sm font-medium mb-1">{day}</div>
                          <div className="space-y-0.5">
                            {dayLeaves.slice(0, 3).map((leave) => (
                              <div
                                key={leave.id}
                                className={`text-xs px-1 py-0.5 rounded truncate text-white ${getLeaveTypeColor(leave.leave_type)}`}
                                title={`${leave.guard_name} - ${leave.leave_type}`}
                              >
                                {leave.guard_name.split(" ")[0]}
                              </div>
                            ))}
                            {dayLeaves.length > 3 && (
                              <div className="text-xs text-muted-foreground">+{dayLeaves.length - 3} more</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guard</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No leave requests for {MONTHS[month]} {year}
                    </TableCell>
                  </TableRow>
                ) : (
                  leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>
                        <div className="font-medium">{leave.guard_name}</div>
                        <div className="text-xs text-muted-foreground">{leave.guard_code}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getLeaveTypeColor(leave.leave_type).replace("bg-", "border-").replace("500", "200") + " " + getLeaveTypeColor(leave.leave_type).replace("bg-", "text-").replace("500", "700")}>
                          {leave.leave_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(leave.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(leave.end_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{getWorkingDays(leave.start_date, leave.end_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(leave.status)}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{leave.reason || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Leave Types Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {LEAVE_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${getLeaveTypeColor(type)}`} />
                <span className="text-sm">{type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Leave Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Guard *</Label>
              <Select value={selectedGuard} onValueChange={setSelectedGuard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select guard" />
                </SelectTrigger>
                <SelectContent>
                  {guards.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.first_name} {g.last_name} ({g.guard_code || "No code"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGuard && (() => {
                const guard = guards.find((g) => g.id === Number(selectedGuard))
                if (guard) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      Leave balance: {(guard.annual_leave_days || 21) - (guard.leave_days_used || 0)} days remaining
                    </p>
                  )
                }
                return null
              })()}
            </div>
            <div className="space-y-2">
              <Label>Leave Type *</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
              </div>
            </div>
            {startDate && endDate && (
              <p className="text-sm text-muted-foreground">
                Working days: <span className="font-medium">{getWorkingDays(startDate, endDate)}</span>
              </p>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!selectedGuard || !startDate || !endDate || submitting}>
              {submitting ? "Creating..." : "Create Leave Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
