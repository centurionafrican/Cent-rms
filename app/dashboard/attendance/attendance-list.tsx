"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Timer, LogIn, LogOut, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Attendance {
  id: number
  assignment_id: number
  time_in: string | null
  time_out: string | null
  status: string
  date: string
  guard_name: string
  guard_phone: string
  site_name: string
  shift_name: string
  shift_start: string
  shift_end: string
}

interface TodayAssignment {
  id: number
  guard_id: number
  guard_name: string
  site_name: string
  shift_name: string
  attendance_id: number | null
  time_in: string | null
  time_out: string | null
  attendance_status: string | null
}

interface AttendanceListProps {
  initialAttendance: Attendance[]
  todayAssignments: TodayAssignment[]
}

export function AttendanceList({ initialAttendance, todayAssignments }: AttendanceListProps) {
  const router = useRouter()
  const [attendance] = useState<Attendance[]>(initialAttendance)
  const [assignments, setAssignments] = useState<TodayAssignment[]>(todayAssignments)
  const [loading, setLoading] = useState<number | null>(null)
  const [search, setSearch] = useState("")

  const filteredAttendance = attendance.filter((a) =>
    `${a.guard_name} ${a.site_name}`.toLowerCase().includes(search.toLowerCase())
  )

  async function handleClockIn(assignmentId: number) {
    setLoading(assignmentId)
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignmentId, action: "clock_in" }),
      })

      if (res.ok) {
        router.refresh()
        const data = await res.json()
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId
              ? { ...a, attendance_id: data.attendance.id, time_in: data.attendance.time_in, attendance_status: "present" }
              : a
          )
        )
      }
    } catch (error) {
      console.error("Failed to clock in:", error)
    } finally {
      setLoading(null)
    }
  }

  async function handleClockOut(attendanceId: number, assignmentId: number) {
    setLoading(assignmentId)
    try {
      const res = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clock_out" }),
      })

      if (res.ok) {
        router.refresh()
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId
              ? { ...a, time_out: new Date().toISOString(), attendance_status: "present" }
              : a
          )
        )
      }
    } catch (error) {
      console.error("Failed to clock out:", error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Today's Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Today&apos;s Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guard</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No assignments for today.
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.guard_name}</TableCell>
                    <TableCell>{assignment.site_name}</TableCell>
                    <TableCell>{assignment.shift_name}</TableCell>
                    <TableCell>
                      {assignment.time_in
                        ? new Date(assignment.time_in).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </TableCell>
                    <TableCell>
                      {assignment.time_out
                        ? new Date(assignment.time_out).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          assignment.attendance_status === "present"
                            ? "default"
                            : assignment.attendance_status === "late"
                            ? "destructive"
                            : "outline"
                        }
                        className={
                          assignment.attendance_status === "present"
                            ? "bg-green-100 text-green-700"
                            : ""
                        }
                      >
                        {assignment.attendance_status || "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!assignment.time_in ? (
                        <Button
                          size="sm"
                          onClick={() => handleClockIn(assignment.id)}
                          disabled={loading === assignment.id}
                        >
                          <LogIn className="h-4 w-4 mr-1" />
                          Clock In
                        </Button>
                      ) : !assignment.time_out ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleClockOut(assignment.attendance_id!, assignment.id)
                          }
                          disabled={loading === assignment.id}
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          Clock Out
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Completed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attendance History</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Guard</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No attendance records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{record.guard_name}</TableCell>
                    <TableCell>{record.site_name}</TableCell>
                    <TableCell>{record.shift_name}</TableCell>
                    <TableCell>
                      {record.time_in
                        ? new Date(record.time_in).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </TableCell>
                    <TableCell>
                      {record.time_out
                        ? new Date(record.time_out).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "present"
                            ? "default"
                            : record.status === "late"
                            ? "destructive"
                            : "secondary"
                        }
                        className={record.status === "present" ? "bg-green-100 text-green-700" : ""}
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
