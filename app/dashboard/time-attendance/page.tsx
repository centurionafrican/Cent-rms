"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Search, LogIn, LogOut, Plus } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Attendance {
  id: number
  assignment_id: number
  guard_name: string
  site_name: string
  time_in: string | null
  time_out: string | null
  status: string
  date: string
}

interface Guard {
  id: number
  first_name: string
  last_name: string
}

interface Assignment {
  id: number
  guard_id: number
  guard_name: string
  site_name: string
  shift_name: string
  date: string
}

export default function TimeAttendancePage() {
  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0])
  const [isClockInOpen, setIsClockInOpen] = useState(false)
  const [isClockOutOpen, setIsClockOutOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: records = [], isLoading } = useSWR(
    `/api/attendance?date=${dateFilter}&limit=500`,
    fetcher,
    { refreshInterval: 60000 }
  )

  const { data: assignmentsData } = useSWR(
    `/api/assignments?date=${dateFilter}&limit=200`,
    fetcher
  )
  const assignments: Assignment[] = Array.isArray(assignmentsData) 
    ? assignmentsData 
    : assignmentsData?.assignments || []

  const filtered = records.filter((r: Attendance) =>
    r.guard_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.site_name?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: records.length,
    present: records.filter((r: Attendance) => r.status === "present").length,
    absent: records.filter((r: Attendance) => r.status === "absent").length,
  }

  async function handleClockIn() {
    if (!selectedAssignment) return
    setSaving(true)
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: Number(selectedAssignment),
          time_in: new Date().toISOString(),
          status: "present",
          date: dateFilter,
        }),
      })
      if (res.ok) {
        toast.success("Clock in recorded successfully")
        mutate(`/api/attendance?date=${dateFilter}&limit=500`)
        setIsClockInOpen(false)
        setSelectedAssignment("")
      } else {
        toast.error("Failed to record clock in")
      }
    } catch {
      toast.error("Error recording clock in")
    } finally {
      setSaving(false)
    }
  }

  async function handleClockOut() {
    if (!selectedRecord) return
    setSaving(true)
    try {
      const res = await fetch(`/api/attendance/${selectedRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_out: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        toast.success("Clock out recorded successfully")
        mutate(`/api/attendance?date=${dateFilter}&limit=500`)
        setIsClockOutOpen(false)
        setSelectedRecord(null)
      } else {
        toast.error("Failed to record clock out")
      }
    } catch {
      toast.error("Error recording clock out")
    } finally {
      setSaving(false)
    }
  }

  async function handleDirectClockIn(assignmentId: number) {
    setSaving(true)
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          time_in: new Date().toISOString(),
          status: "present",
          date: dateFilter,
        }),
      })
      if (res.ok) {
        toast.success("Clock in recorded successfully")
        mutate(`/api/attendance?date=${dateFilter}&limit=500`)
      } else {
        toast.error("Failed to record clock in")
      }
    } catch {
      toast.error("Error recording clock in")
    } finally {
      setSaving(false)
    }
  }

  async function handleDirectClockOut(attendanceId: number) {
    setSaving(true)
    try {
      const res = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_out: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        toast.success("Clock out recorded successfully")
        mutate(`/api/attendance?date=${dateFilter}&limit=500`)
      } else {
        toast.error("Failed to record clock out")
      }
    } catch {
      toast.error("Error recording clock out")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Time & Attendance</h1>
            <p className="text-muted-foreground">
              Track guard check-in and check-out times for all assignments.
            </p>
          </div>
          <div className="flex gap-2">
            {/* Clock In Dialog */}
            <Dialog open={isClockInOpen} onOpenChange={setIsClockInOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Clock In
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clock In Guard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Assignment</Label>
                    <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a guard assignment..." />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.guard_name} - {a.site_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Clock In Time</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Clock className="h-4 w-4" />
                      <span className="font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleClockIn} disabled={!selectedAssignment || saving}>
                    {saving ? "Recording..." : "Record Clock In"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Clock Out Dialog */}
            <Dialog open={isClockOutOpen} onOpenChange={setIsClockOutOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Clock Out
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clock Out Guard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Clocked-In Guard</Label>
                    <Select 
                      value={selectedRecord ? String(selectedRecord.id) : ""} 
                      onValueChange={(val) => {
                        const rec = records.find((r: Attendance) => String(r.id) === val)
                        setSelectedRecord(rec || null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a guard to clock out..." />
                      </SelectTrigger>
                      <SelectContent>
                        {records
                          .filter((r: Attendance) => r.time_in && !r.time_out)
                          .map((r: Attendance) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.guard_name} - {r.site_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedRecord && (
                    <div className="space-y-2">
                      <Label>Clocked In At</Label>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono">
                          {selectedRecord.time_in 
                            ? new Date(selectedRecord.time_in).toLocaleTimeString() 
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Clock Out Time</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Clock className="h-4 w-4" />
                      <span className="font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleClockOut} disabled={!selectedRecord || saving}>
                    {saving ? "Recording..." : "Record Clock Out"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Guards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1 flex items-center gap-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guards or sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border-0 bg-transparent"
          />
        </div>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full md:w-32"
        />
      </div>

      {/* Assignments Table - Clock In/Out for each guard */}
      <Card>
        <CardHeader>
          <CardTitle>Guard Assignments - Clock In/Out</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No assignments found for {dateFilter}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guard Name</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments
                    .filter((a: Assignment) => 
                      a.guard_name?.toLowerCase().includes(search.toLowerCase()) ||
                      a.site_name?.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((assignment: Assignment) => {
                      const attendanceRecord = records.find(
                        (r: Attendance) => r.assignment_id === assignment.id
                      )
                      const isClockedIn = attendanceRecord?.time_in && !attendanceRecord?.time_out
                      const isClockedOut = attendanceRecord?.time_in && attendanceRecord?.time_out
                      
                      return (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.guard_name}</TableCell>
                          <TableCell>{assignment.site_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {assignment.shift_name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                isClockedOut ? "default" :
                                isClockedIn ? "secondary" : "outline"
                              }
                            >
                              {isClockedOut ? "Completed" : isClockedIn ? "On Duty" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {attendanceRecord?.time_in 
                              ? new Date(attendanceRecord.time_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) 
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {attendanceRecord?.time_out 
                              ? new Date(attendanceRecord.time_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) 
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!attendanceRecord?.time_in && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleDirectClockIn(assignment.id)}
                                  disabled={saving}
                                  className="gap-1"
                                >
                                  <LogIn className="h-3 w-3" />
                                  Clock In
                                </Button>
                              )}
                              {isClockedIn && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDirectClockOut(attendanceRecord.id)}
                                  disabled={saving}
                                  className="gap-1"
                                >
                                  <LogOut className="h-3 w-3" />
                                  Clock Out
                                </Button>
                              )}
                              {isClockedOut && (
                                <span className="text-sm text-green-600 font-medium">Done</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No records found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guard Name</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record: Attendance) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.guard_name}</TableCell>
                      <TableCell>{record.site_name}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell className="text-sm">
                        {record.time_in ? new Date(record.time_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.time_out ? new Date(record.time_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === "present"
                              ? "default"
                              : record.status === "absent"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </main>
  )
}
