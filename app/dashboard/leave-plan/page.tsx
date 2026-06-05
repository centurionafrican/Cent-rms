"use client"

import { useState } from "react"
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
import { Calendar, Users, Download, Plus, ChevronLeft, ChevronRight, Trash2, CalendarRange } from "lucide-react"

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

interface DateRange {
  id: string
  start_date: string
  end_date: string
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export default function LeavePlanPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedGuard, setSelectedGuard] = useState("")
  const [dateRanges, setDateRanges] = useState<DateRange[]>([{ id: "1", start_date: "", end_date: "" }])
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Full year date range for annual leave planning
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const { data: leavesData, mutate } = useSWR(`/api/leaves?from=${yearStart}&to=${yearEnd}&type=Annual Leave`, fetcher)
  const { data: guardsData } = useSWR("/api/guards", fetcher)

  const leaves: LeaveRequest[] = (leavesData?.leaves || []).filter((l: LeaveRequest) => l.leave_type === "Annual Leave")
  const allGuards: Guard[] = Array.isArray(guardsData) ? guardsData : guardsData?.guards || []
  const guards = allGuards.filter((g) => g.status === "active")

  // Generate calendar days for selected month
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
    if (!start || !end) return 0
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

  // Calculate total working days from all date ranges
  function getTotalWorkingDays(): number {
    return dateRanges.reduce((total, range) => {
      return total + getWorkingDays(range.start_date, range.end_date)
    }, 0)
  }

  // Add new date range
  function addDateRange() {
    setDateRanges([...dateRanges, { id: String(Date.now()), start_date: "", end_date: "" }])
  }

  // Remove date range
  function removeDateRange(id: string) {
    if (dateRanges.length > 1) {
      setDateRanges(dateRanges.filter((r) => r.id !== id))
    }
  }

  // Update date range
  function updateDateRange(id: string, field: "start_date" | "end_date", value: string) {
    setDateRanges(dateRanges.map((r) => r.id === id ? { ...r, [field]: value } : r))
  }

  // Stats
  const totalPlanned = leaves.length
  const approved = leaves.filter((l) => l.status === "approved").length
  const pending = leaves.filter((l) => l.status === "pending").length
  const totalDays = leaves.reduce((sum, l) => sum + getWorkingDays(l.start_date, l.end_date), 0)

  // Group leaves by guard for the list view
  const leavesByGuard = guards.map((guard) => {
    const guardLeaves = leaves.filter((l) => l.guard_id === guard.id)
    const totalDaysPlanned = guardLeaves.reduce((sum, l) => sum + getWorkingDays(l.start_date, l.end_date), 0)
    const remaining = (guard.annual_leave_days || 21) - (guard.leave_days_used || 0)
    return {
      guard,
      leaves: guardLeaves,
      totalDaysPlanned,
      remaining,
      entitlement: guard.annual_leave_days || 21,
    }
  }).filter((g) => g.leaves.length > 0 || g.remaining > 0)

  function getStatusColor(status: string) {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700 border-green-200"
      case "pending": return "bg-amber-100 text-amber-700 border-amber-200"
      case "rejected": return "bg-red-100 text-red-700 border-red-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  async function handleSubmit() {
    const validRanges = dateRanges.filter((r) => r.start_date && r.end_date)
    if (!selectedGuard || validRanges.length === 0) return
    
    setSubmitting(true)
    try {
      // Create a leave request for each date range
      for (const range of validRanges) {
        await fetch("/api/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guard_id: Number(selectedGuard),
            leave_type: "Annual Leave",
            start_date: range.start_date,
            end_date: range.end_date,
            reason: reason || `Annual Leave Plan ${year}`,
          }),
        })
      }
      mutate()
      setIsAddOpen(false)
      setSelectedGuard("")
      setDateRanges([{ id: "1", start_date: "", end_date: "" }])
      setReason("")
    } catch (error) {
      console.error("Failed to create leave requests:", error)
    } finally {
      setSubmitting(false)
    }
  }

  function exportToCSV() {
    const headers = ["Guard Name", "Guard Code", "Leave Period", "Start Date", "End Date", "Working Days", "Status", "Entitlement", "Used", "Remaining"]
    const rows = leavesByGuard.flatMap((item) => 
      item.leaves.length > 0 
        ? item.leaves.map((leave, idx) => [
            idx === 0 ? `${item.guard.first_name} ${item.guard.last_name}` : "",
            idx === 0 ? item.guard.guard_code || "" : "",
            `Period ${idx + 1}`,
            leave.start_date,
            leave.end_date,
            getWorkingDays(leave.start_date, leave.end_date),
            leave.status,
            idx === 0 ? item.entitlement : "",
            idx === 0 ? item.guard.leave_days_used || 0 : "",
            idx === 0 ? item.remaining : "",
          ])
        : [[
            `${item.guard.first_name} ${item.guard.last_name}`,
            item.guard.guard_code || "",
            "No leave planned",
            "", "", "", "",
            item.entitlement,
            item.guard.leave_days_used || 0,
            item.remaining,
          ]]
    )
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `annual_leave_plan_${year}.csv`
    a.click()
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Annual Leave Plan</h1>
          <p className="text-muted-foreground">Plan and manage annual leave for all guards in {year}</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
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
            <p className="text-xs text-muted-foreground">Leave requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approved}</div>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalDays}</div>
            <p className="text-xs text-muted-foreground">Working days planned</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {MONTHS[month]} {year}
              </CardTitle>
              <CardDescription>View planned annual leaves by month</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const dayLeaves = day ? getLeavesForDay(day) : []
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()
              const isWeekend = idx % 7 === 0 || idx % 7 === 6
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] p-1 border rounded-md ${
                    day ? (isWeekend ? "bg-muted/30" : "bg-background") : "bg-transparent border-transparent"
                  } ${isToday ? "ring-2 ring-primary" : ""}`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${isWeekend ? "text-muted-foreground" : ""}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayLeaves.slice(0, 3).map((leave) => (
                          <div
                            key={leave.id}
                            className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-700 truncate"
                            title={`${leave.guard_name} - ${leave.status}`}
                          >
                            {leave.guard_name?.split(" ")[0]}
                          </div>
                        ))}
                        {dayLeaves.length > 3 && (
                          <div className="text-xs text-muted-foreground px-1">+{dayLeaves.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Guard Leave Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Annual Leave Summary by Guard
          </CardTitle>
          <CardDescription>Overview of each guard&apos;s annual leave plan for {year}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guard</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Entitlement</TableHead>
                <TableHead>Planned Periods</TableHead>
                <TableHead>Days Planned</TableHead>
                <TableHead>Days Used</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leavesByGuard.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No annual leave plans found for {year}
                  </TableCell>
                </TableRow>
              ) : (
                leavesByGuard.map((item) => (
                  <TableRow key={item.guard.id}>
                    <TableCell className="font-medium">
                      {item.guard.first_name} {item.guard.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.guard.guard_code || "-"}</TableCell>
                    <TableCell>{item.entitlement} days</TableCell>
                    <TableCell>
                      {item.leaves.length > 0 ? (
                        <div className="space-y-1">
                          {item.leaves.map((leave, idx) => (
                            <div key={leave.id} className="text-xs">
                              <span className="font-medium">Period {idx + 1}:</span>{" "}
                              {new Date(leave.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(leave.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              <span className="text-muted-foreground ml-1">({getWorkingDays(leave.start_date, leave.end_date)} days)</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No leave planned</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.totalDaysPlanned}</TableCell>
                    <TableCell>{item.guard.leave_days_used || 0}</TableCell>
                    <TableCell className={item.remaining <= 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                      {item.remaining}
                    </TableCell>
                    <TableCell>
                      {item.leaves.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.leaves.map((leave) => (
                            <Badge key={leave.id} variant="outline" className={getStatusColor(leave.status)}>
                              {leave.status}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Leave Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5" />
              Plan Annual Leave
            </DialogTitle>
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
                  const remaining = (guard.annual_leave_days || 21) - (guard.leave_days_used || 0)
                  return (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Annual entitlement: <span className="font-medium">{guard.annual_leave_days || 21} days</span></p>
                      <p>Already used: <span className="font-medium">{guard.leave_days_used || 0} days</span></p>
                      <p>Remaining: <span className={`font-medium ${remaining <= 0 ? "text-red-600" : "text-green-600"}`}>{remaining} days</span></p>
                    </div>
                  )
                }
                return null
              })()}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Leave Periods *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDateRange}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Period
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">You can add multiple date ranges for the annual leave plan</p>
              
              {dateRanges.map((range, idx) => (
                <div key={range.id} className="flex items-end gap-2 p-3 border rounded-md bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Period {idx + 1} - Start</Label>
                    <Input 
                      type="date" 
                      value={range.start_date} 
                      onChange={(e) => updateDateRange(range.id, "start_date", e.target.value)}
                      min={`${year}-01-01`}
                      max={`${year}-12-31`}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input 
                      type="date" 
                      value={range.end_date} 
                      onChange={(e) => updateDateRange(range.id, "end_date", e.target.value)}
                      min={range.start_date || `${year}-01-01`}
                      max={`${year}-12-31`}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground w-16 text-center pb-2">
                    {range.start_date && range.end_date ? `${getWorkingDays(range.start_date, range.end_date)} days` : "-"}
                  </div>
                  {dateRanges.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeDateRange(range.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {getTotalWorkingDays() > 0 && (
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded-md">
                  <span className="text-sm font-medium">Total working days:</span>
                  <span className="text-sm font-bold text-blue-700">{getTotalWorkingDays()} days</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional notes for this leave plan" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedGuard || dateRanges.every((r) => !r.start_date || !r.end_date) || submitting}
            >
              {submitting ? "Creating..." : `Create ${dateRanges.filter((r) => r.start_date && r.end_date).length} Leave Request(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
