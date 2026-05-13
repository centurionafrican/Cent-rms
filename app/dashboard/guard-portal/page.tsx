"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, User, MapPin, Clock, CalendarX, Shield, Calendar, CheckCircle2, XCircle, Clock3, AlertCircle, CalendarOff } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface GuardInfo {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  title: string
  status: string
  id_number: string | null
  date_joined: string | null
  annual_leave_days: number
  leave_days_used: number
  hire_date: string
}

interface Assignment {
  id: number
  date: string
  site_name: string
  shift_name: string
  shift_start: string
  shift_end: string
  shift_color: string
  status: string
}

interface Leave {
  id: number
  start_date: string
  end_date: string
  reason: string
  status: string
  leave_type: string
  ops_manager_approved: boolean | null
  hr_approved: boolean | null
  coceo_approved: boolean | null
  ops_manager_name: string | null
  hr_name: string | null
  coceo_name: string | null
}

interface LeaveBalance {
  total: number
  used: number
  remaining: number
}

const statusLabels: Record<string, { label: string; color: string }> = {
  recruitment: { label: "Recruitment", color: "bg-blue-100 text-blue-700" },
  training: { label: "Training", color: "bg-indigo-100 text-indigo-700" },
  probation: { label: "Probation", color: "bg-yellow-100 text-yellow-700" },
  active: { label: "Full Active", color: "bg-green-100 text-green-700" },
  retired: { label: "Retired", color: "bg-gray-100 text-gray-700" },
  quit: { label: "Quit", color: "bg-orange-100 text-orange-700" },
  dismissed: { label: "Dismissed", color: "bg-red-100 text-red-700" },
  deceased: { label: "Deceased", color: "bg-gray-200 text-gray-500" },
}

export default function GuardPortalPage() {
  const [guardId, setGuardId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [guard, setGuard] = useState<GuardInfo | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [guardOffs, setGuardOffs] = useState<any[]>([])
  const [error, setError] = useState("")
  const [sendingLink, setSendingLink] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [portalLink, setPortalLink] = useState<string | null>(null)
  const [linkEmail, setLinkEmail] = useState<string | null>(null)
  const [allGuards, setAllGuards] = useState<GuardInfo[]>([])
  const [guardsLoaded, setGuardsLoaded] = useState(false)
  const [filteredGuards, setFilteredGuards] = useState<GuardInfo[]>([])

  async function lookupGuard() {
    if (!guardId) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/guard-portal?guard_id=${guardId}`)
      if (res.ok) {
        const data = await res.json()
        setGuard(data.guard)
        setAssignments(data.assignments || [])
        setLeaves(data.leaves || [])
        setLeaveBalance(data.leaveBalance)
        setGuardOffs(data.offs || [])
      } else {
        const err = await res.json()
        setError(err.error || "Guard not found")
        setGuard(null)
      }
    } catch {
      setError("Failed to fetch guard data")
    } finally {
      setLoading(false)
    }
  }

  // Also allow fetching by selecting a guard from a list
  async function loadGuards() {
    if (guardsLoaded) return
    try {
      const res = await fetch("/api/guards")
      if (res.ok) {
        const data = await res.json()
        const guardsArray = Array.isArray(data) ? data : data.guards || []
        setAllGuards(guardsArray)
        setGuardsLoaded(true)
      }
    } catch { /* ignore */ }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    if (!value.trim()) {
      setFilteredGuards([])
      return
    }

    const query = value.toLowerCase()
    const filtered = allGuards.filter((g) => 
      g.id_number?.toLowerCase().includes(query) ||
      g.first_name.toLowerCase().includes(query) ||
      g.last_name.toLowerCase().includes(query) ||
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(query)
    )
    setFilteredGuards(filtered)
  }

  function selectGuardFromSearch(g: GuardInfo) {
    setGuardId(String(g.id))
    setSearchQuery(`${g.first_name} ${g.last_name}`)
    setFilteredGuards([])
  }

  async function sendPortalLink() {
    if (!guardId) {
      setError("Please select a guard first")
      return
    }
    setSendingLink(true)
    setError("")
    setLinkSent(false)
    setPortalLink(null)
    try {
      const res = await fetch("/api/guard-portal/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guard_id: Number(guardId) }),
      })
      if (res.ok) {
        const data = await res.json()
        setLinkSent(true)
        // In production mode, link is sent directly to guard email, no need to display it
        setTimeout(() => setLinkSent(false), 5000)
      } else {
        const err = await res.json()
        setError(err.error || "Failed to send link")
      }
    } catch (err) {
      setError("Failed to send portal link")
    } finally {
      setSendingLink(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Guard Portal</h1>
        <p className="text-muted-foreground">
          View individual guard status, assignments, site info, and leave balance.
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Guard by ID or Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 items-start">
              <div className="flex-1 max-w-md space-y-2 relative">
                <Label>Search Guard</Label>
                <Input
                  placeholder="Enter guard ID or name..."
                  value={searchQuery}
                  onChange={(e) => {
                    handleSearchChange(e.target.value)
                    loadGuards()
                  }}
                  className="w-full"
                />
                
                {/* Search Results Dropdown */}
                {filteredGuards.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-white shadow-lg z-10 max-h-64 overflow-y-auto">
                    {filteredGuards.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => selectGuardFromSearch(g)}
                        className="w-full text-left px-3 py-2 hover:bg-muted flex justify-between items-center border-b last:border-0"
                      >
                        <div>
                          <div className="font-medium">{g.first_name} {g.last_name}</div>
                          <div className="text-xs text-muted-foreground">ID: {g.id_number || g.id}</div>
                        </div>
                        <Badge variant="outline">{g.status}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={lookupGuard} disabled={loading || !guardId} className="mt-8">
                {loading ? "Loading..." : "View Details"}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Guard Details */}
      {guard && (
        <>
          {/* Profile & Status Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  {guard.first_name} {guard.last_name}
                </CardTitle>
                <CardDescription>{guard.title || "Security Guard"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">ID Number:</span>
                    <p className="font-medium">{guard.id_number || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{guard.phone || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{guard.email || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date Joined:</span>
                    <p className="font-medium">{guard.date_joined ? new Date(guard.date_joined).toLocaleDateString() : "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="mt-1">
                      <Badge className={statusLabels[guard.status]?.color || "bg-gray-100 text-gray-700"}>
                        {statusLabels[guard.status]?.label || guard.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Leave Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{leaveBalance?.remaining ?? 0}</div>
                <p className="text-sm text-muted-foreground mt-1">days remaining</p>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allowed:</span>
                    <span className="font-medium">{leaveBalance?.total ?? 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used:</span>
                    <span className="font-medium">{leaveBalance?.used ?? 0} days</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(((leaveBalance?.used ?? 0) / (leaveBalance?.total || 1)) * 100, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Upcoming Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{assignments.length}</div>
                <p className="text-sm text-muted-foreground mt-1">assignments scheduled</p>
                {assignments.length > 0 && (
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">Next:</span>
                    <p className="font-medium">{new Date(assignments[0].date).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">{assignments[0].site_name} - {assignments[0].shift_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Assignments & Leaves */}
          <Tabs defaultValue="assignments">
            <TabsList>
              <TabsTrigger value="assignments" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Assignments ({assignments.length})
              </TabsTrigger>
                <TabsTrigger value="leaves" className="flex items-center gap-2">
                  <CalendarX className="h-4 w-4" />Leaves
                </TabsTrigger>
                <TabsTrigger value="offs" className="flex items-center gap-2">
                  <CalendarOff className="h-4 w-4" />Off Days
                </TabsTrigger>
              </TabsList>

            <TabsContent value="assignments">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No upcoming assignments.
                          </TableCell>
                        </TableRow>
                      ) : (
                        assignments.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{new Date(a.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {a.site_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.shift_color }} />
                                {a.shift_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {a.shift_start?.slice(0, 5)} - {a.shift_end?.slice(0, 5)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  a.status === "completed" ? "bg-green-100 text-green-700" :
                                  a.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                                  a.status === "missed" ? "bg-red-100 text-red-700" :
                                  "bg-gray-100 text-gray-700"
                                }
                              >
                                {a.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaves">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Ops Manager</TableHead>
                        <TableHead>HR</TableHead>
                        <TableHead>Co-CEO</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No leave requests.
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaves.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium text-sm">
                              {new Date(l.start_date).toLocaleDateString()} - {new Date(l.end_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="capitalize">{l.leave_type?.replace("_", " ") || "Annual"}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{l.reason}</TableCell>
                            <TableCell>
                              {l.ops_manager_approved === true ? (
                                <div className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Approved</span></div>
                              ) : l.ops_manager_approved === false ? (
                                <div className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" /><span className="text-xs">Rejected</span></div>
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground"><Clock3 className="h-4 w-4" /><span className="text-xs">Pending</span></div>
                              )}
                            </TableCell>
                            <TableCell>
                              {l.hr_approved === true ? (
                                <div className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Approved</span></div>
                              ) : l.hr_approved === false ? (
                                <div className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" /><span className="text-xs">Rejected</span></div>
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground"><Clock3 className="h-4 w-4" /><span className="text-xs">{l.ops_manager_approved ? "Pending" : "Waiting"}</span></div>
                              )}
                            </TableCell>
                            <TableCell>
                              {l.coceo_approved === true ? (
                                <div className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Approved</span></div>
                              ) : l.coceo_approved === false ? (
                                <div className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" /><span className="text-xs">Rejected</span></div>
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground"><Clock3 className="h-4 w-4" /><span className="text-xs">{l.hr_approved ? "Pending" : "Waiting"}</span></div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                l.status === "approved" ? "bg-green-100 text-green-700" :
                                l.status === "rejected" ? "bg-red-100 text-red-700" :
                                "bg-amber-100 text-amber-700"
                              }>
                                {l.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Off Days Tab */}
            <TabsContent value="offs" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>My Off Days</span>
                    <Badge variant="outline" className="font-normal">
                      {guardOffs.length} scheduled
                    </Badge>
                  </CardTitle>
                  <CardDescription>Your planned off days, rest days, and public holidays</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {guardOffs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <CalendarOff className="h-8 w-8 opacity-30" />
                              <span className="text-sm">No off days scheduled</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        guardOffs.map((off: any, idx: number) => {
                          const d = new Date(off.date)
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6
                          const isPast = d < new Date()
                          return (
                            <TableRow key={off.id} className={isPast ? "opacity-50" : ""}>
                              <TableCell className="text-muted-foreground text-xs font-mono">{idx + 1}</TableCell>
                              <TableCell className="font-medium">
                                {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </TableCell>
                              <TableCell>
                                <span className={`text-sm ${isWeekend ? "text-primary font-medium" : "text-muted-foreground"}`}>
                                  {d.toLocaleDateString("en-US", { weekday: "long" })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  off.reason === "Day Off" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  off.reason === "Rest Day" ? "bg-purple-50 text-purple-700 border-purple-200" :
                                  off.reason === "Weekend Off" ? "bg-teal-50 text-teal-700 border-teal-200" :
                                  off.reason === "Public Holiday" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  "bg-gray-50 text-gray-600 border-gray-200"
                                }>
                                  {off.reason}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{off.notes ?? "—"}</TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
