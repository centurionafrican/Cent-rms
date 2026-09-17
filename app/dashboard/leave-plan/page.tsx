"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar, Users, Download, Plus, ChevronLeft, ChevronRight, Trash2, CalendarRange, Search, Pencil } from "lucide-react"

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
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedGuard, setSelectedGuard] = useState("")
  const [dateRanges, setDateRanges] = useState<DateRange[]>([{ id: "1", start_date: "", end_date: "" }])
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editLeave, setEditLeave] = useState<LeaveRequest | null>(null)
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editReason, setEditReason] = useState("")

  // Full year date range for annual leave planning
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const { data: leavesData, mutate } = useSWR(`/api/leaves?from=${yearStart}&to=${yearEnd}`, fetcher, { refreshInterval: 5000 })
  const { data: guardsData } = useSWR("/api/guards", fetcher)

  const allLeaves: LeaveRequest[] = leavesData?.leaves || []
  const leaves: LeaveRequest[] = allLeaves.filter((l: LeaveRequest) => l.leave_type === "annual")
  const allGuards: Guard[] = Array.isArray(guardsData) ? guardsData : guardsData?.guards || []
  const guards = allGuards.filter((g) => g.status === "active")

  // Filter leaves by search
  const filteredLeaves = leaves.filter((l) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      l.guard_name?.toLowerCase().includes(searchLower) ||
      l.guard_code?.toLowerCase().includes(searchLower) ||
      l.status?.toLowerCase().includes(searchLower)
    )
  })

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

  // Group leaves by guard for the summary view
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
  }).filter((g) => g.leaves.length > 0)

  // Filter by search
  const filteredLeavesByGuard = leavesByGuard.filter((item) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      item.guard.first_name.toLowerCase().includes(searchLower) ||
      item.guard.last_name.toLowerCase().includes(searchLower) ||
      item.guard.guard_code?.toLowerCase().includes(searchLower)
    )
  })

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
        const res = await fetch("/api/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guard_id: Number(selectedGuard),
            leave_type: "annual",
            start_date: range.start_date,
            end_date: range.end_date,
            reason: reason || `Annual Leave Plan ${year}`,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          alert(err.error || "Failed to create leave request")
          return
        }
      }
      // Refresh the list
      await mutate()
      setIsAddOpen(false)
      setSelectedGuard("")
      setDateRanges([{ id: "1", start_date: "", end_date: "" }])
      setReason("")
    } catch (error) {
      console.error("Failed to create leave requests:", error)
      alert("Failed to create leave requests")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/leaves/${deleteId}`, { method: "DELETE" })
      if (res.ok) {
        await mutate()
      } else {
        const err = await res.json()
        alert(err.error || "Failed to delete")
      }
    } catch (error) {
      console.error("Delete failed:", error)
    } finally {
      setDeleteId(null)
    }
  }

  function openEdit(leave: LeaveRequest) {
    setEditLeave(leave)
    setEditStartDate(leave.start_date)
    setEditEndDate(leave.end_date)
    setEditReason(leave.reason || "")
    setIsEditOpen(true)
  }

  async function handleEdit() {
    if (!editLeave) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/leaves/${editLeave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: editStartDate,
          end_date: editEndDate,
          reason: editReason,
        }),
      })
      if (res.ok) {
        await mutate()
        setIsEditOpen(false)
        setEditLeave(null)
      } else {
        const err = await res.json()
        alert(err.error || "Failed to update")
      }
    } catch (error) {
      console.error("Update failed:", error)
    } finally {
      setSubmitting(false)
    }
  }

  function exportToCSV() {
    const headers = ["#", "Guard Name", "Guard Code", "Start Date", "End Date", "Working Days", "Status", "Reason"]
    const rows = filteredLeaves.map((leave, idx) => [
      idx + 1,
      leave.guard_name,
      leave.guard_code || "",
      leave.start_date,
      leave.end_date,
      getWorkingDays(leave.start_date, leave.end_date),
      leave.status,
      leave.reason || "",
    ])
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

      {/* Leave List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Annual Leave Requests
              </CardTitle>
              <CardDescription>All annual leave requests for {year}</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Guard</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No annual leave plans found for {year}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeaves.map((leave, idx) => (
                  <TableRow key={leave.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{leave.guard_name}</TableCell>
                    <TableCell className="text-muted-foreground">{leave.guard_code || "-"}</TableCell>
                    <TableCell>
                      {new Date(leave.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      {new Date(leave.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="font-medium">{getWorkingDays(leave.start_date, leave.end_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(leave.status)}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground" title={leave.reason}>
                      {leave.reason || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(leave)}
                          disabled={leave.status === "approved"}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(leave.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
                      <p>Days used: <span className="font-medium">{guard.leave_days_used || 0} days</span></p>
                      <p>Remaining: <span className={`font-medium ${remaining <= 0 ? "text-red-600" : "text-green-600"}`}>{remaining} days</span></p>
                    </div>
                  )
                }
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
              {dateRanges.map((range, idx) => (
                <div key={range.id} className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Period {idx + 1} - Start</Label>
                    <Input
                      type="date"
                      value={range.start_date}
                      onChange={(e) => updateDateRange(range.id, "start_date", e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input
                      type="date"
                      value={range.end_date}
                      min={range.start_date}
                      onChange={(e) => updateDateRange(range.id, "end_date", e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap pb-2">
                    {getWorkingDays(range.start_date, range.end_date)} days
                  </div>
                  {dateRanges.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDateRange(range.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {dateRanges.length > 1 && (
                <div className="text-sm font-medium text-right">
                  Total: {getTotalWorkingDays()} working days
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Family vacation, Personal time off"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedGuard || dateRanges.every((r) => !r.start_date || !r.end_date) || submitting}
            >
              {submitting ? "Submitting..." : "Submit Leave Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Guard: <span className="font-medium text-foreground">{editLeave?.guard_name}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={editEndDate}
                  min={editStartDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Working days: <span className="font-medium">{getWorkingDays(editStartDate, editEndDate)}</span>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this leave request. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
