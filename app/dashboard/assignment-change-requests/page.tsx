"use client"

import { useEffect, useState } from "react"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ArrowLeftRight, Plus, Check, X, Play, Clock, CheckCircle2, XCircle, RefreshCw, Search } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ChangeRequest {
  id: number
  assignment_id: number
  requested_by_name: string
  current_guard_name: string
  requested_guard_name: string | null
  ops_manager_name: string | null
  executed_by_name: string | null
  assignment_date: string
  site_name: string
  shift_name: string
  start_time: string
  end_time: string
  reason: string
  status: "pending" | "approved" | "rejected" | "executed"
  ops_notes: string | null
  created_at: string
}

interface Assignment {
  id: number
  guard_name: string
  site_name: string
  shift_name: string
  date: string
}

interface Guard {
  id: number
  first_name: string
  last_name: string
  status: string
}

interface User {
  id: number
  role: string
  first_name: string
  last_name: string
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", className: "bg-blue-50 text-blue-700 border-blue-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
  executed: { label: "Executed", className: "bg-green-50 text-green-700 border-green-200" },
}

export default function AssignmentChangeRequestsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")

  // New request form
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [assignmentSearch, setAssignmentSearch] = useState("")
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [guards, setGuards] = useState<Guard[]>([])
  const [requestedGuardId, setRequestedGuardId] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Ops Manager — approve/reject
  const [reviewRequest, setReviewRequest] = useState<ChangeRequest | null>(null)
  const [opsNotes, setOpsNotes] = useState("")
  const [reviewing, setReviewing] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  // Roster Manager — execute
  const [executeRequest, setExecuteRequest] = useState<ChangeRequest | null>(null)
  const [executeGuardId, setExecuteGuardId] = useState("")
  const [executing, setExecuting] = useState(false)

  const { data: rawRequests, isLoading } = useSWR<ChangeRequest[] | { error: string }>(
    "/api/assignment-change-requests",
    fetcher,
    { refreshInterval: 30000 }
  )
  const requests: ChangeRequest[] = Array.isArray(rawRequests) ? rawRequests : []

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setCurrentUser).catch(() => {})
    fetch("/api/guards?status=active&limit=200").then((r) => r.json()).then((d) => setGuards(Array.isArray(d) ? d : d.guards ?? [])).catch(() => {})
  }, [])

  // Load assignments for the request form (search)
  useEffect(() => {
    if (!isNewOpen) return
    const q = assignmentSearch ? `&search=${encodeURIComponent(assignmentSearch)}` : ""
    fetch(`/api/assignments?limit=50${q}`).then((r) => r.json()).then((d) => {
      setAssignments(Array.isArray(d) ? d : d.assignments ?? [])
    }).catch(() => {})
  }, [isNewOpen, assignmentSearch])

  const role = currentUser?.role ?? ""
  // Show buttons while user is still loading (currentUser === null), hide only if confirmed non-permitted role
  const canRequest  = currentUser === null || ["coordinator", "roster_manager", "admin"].includes(role)
  const canApprove  = currentUser === null || ["operations_manager", "admin"].includes(role)
  const canExecute  = currentUser === null || ["roster_manager", "admin"].includes(role)

  const filtered = requests.filter((r) => {
    const matchTab = tab === "all" || r.status === tab
    const matchSearch = !search || [r.current_guard_name, r.site_name, r.shift_name, r.requested_by_name].some(
      (v) => v?.toLowerCase().includes(search.toLowerCase())
    )
    return matchTab && matchSearch
  })

  async function submitRequest() {
    if (!selectedAssignment || !reason.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/assignment-change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: selectedAssignment.id,
          reason: reason.trim(),
          requested_guard_id: requestedGuardId ? Number(requestedGuardId) : undefined,
        }),
      })
      if (res.ok) {
        setIsNewOpen(false)
        setSelectedAssignment(null)
        setReason("")
        setRequestedGuardId("")
        mutate("/api/assignment-change-requests")
      } else {
        const d = await res.json()
        alert(d.error || "Failed to submit request")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function reviewAction(action: "approve" | "reject") {
    if (!reviewRequest) return
    setReviewing(true)
    try {
      const res = await fetch(`/api/assignment-change-requests/${reviewRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ops_notes: opsNotes.trim() || undefined }),
      })
      if (res.ok) {
        setReviewRequest(null)
        setOpsNotes("")
        setRejectOpen(false)
        mutate("/api/assignment-change-requests")
      } else {
        const d = await res.json()
        alert(d.error || "Failed")
      }
    } finally {
      setReviewing(false)
    }
  }

  async function executeChange() {
    if (!executeRequest || !executeGuardId) return
    setExecuting(true)
    try {
      const res = await fetch(`/api/assignment-change-requests/${executeRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", new_guard_id: Number(executeGuardId) }),
      })
      if (res.ok) {
        setExecuteRequest(null)
        setExecuteGuardId("")
        mutate("/api/assignment-change-requests")
      } else {
        const d = await res.json()
        alert(d.error || "Failed to execute change")
      }
    } finally {
      setExecuting(false)
    }
  }

  const counts = {
    all:      requests.length,
    pending:  requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    executed: requests.filter((r) => r.status === "executed").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assignment Change Requests</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Coordinators submit requests &rarr; Ops Manager approves &rarr; Roster Manager executes
          </p>
        </div>
        {canRequest && (
          <Button onClick={() => setIsNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />New Request
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "pending",  label: "Pending",  icon: Clock,         color: "text-amber-600" },
          { key: "approved", label: "Approved", icon: CheckCircle2,  color: "text-blue-600" },
          { key: "executed", label: "Executed", icon: Play,          color: "text-green-600" },
          { key: "rejected", label: "Rejected", icon: XCircle,       color: "text-red-600" },
        ].map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setTab(key)}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 shrink-0 ${color}`} />
              <div>
                <p className="text-xl font-bold">{counts[key as keyof typeof counts]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Requests</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="px-6 border-b">
              <TabsList className="h-9 bg-transparent gap-1 p-0">
                {(["all","pending","approved","executed","rejected"] as const).map((s) => (
                  <TabsTrigger key={s} value={s} className="capitalize data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 h-9 text-xs">
                    {s} {counts[s] > 0 && <span className="ml-1 bg-muted px-1.5 py-0.5 rounded-full text-[10px]">{counts[s]}</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value={tab} className="m-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />Loading...
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                  <ArrowLeftRight className="h-8 w-8 opacity-30" />
                  No requests found
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Guard</TableHead>
                        <TableHead>Site / Shift</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Suggested Replacement</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((req, idx) => (
                        <TableRow key={req.id}>
                          <TableCell className="text-muted-foreground text-xs font-mono">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{req.current_guard_name}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{req.site_name}</p>
                            <p className="text-xs text-muted-foreground">{req.shift_name} · {req.start_time}–{req.end_time}</p>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(req.assignment_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </TableCell>
                          <TableCell className="text-sm">{req.requested_by_name}</TableCell>
                          <TableCell className="text-sm">{req.requested_guard_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="text-sm truncate" title={req.reason}>{req.reason}</p>
                            {req.ops_notes && <p className="text-xs text-muted-foreground truncate">Ops: {req.ops_notes}</p>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_BADGE[req.status]?.className}>
                              {STATUS_BADGE[req.status]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canApprove && req.status === "pending" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => { setReviewRequest(req); setOpsNotes("") }}>
                                  <Check className="h-3 w-3 mr-1" />Review
                                </Button>
                              )}
                              {canExecute && req.status === "approved" && (
                                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => { setExecuteRequest(req); setExecuteGuardId(String(req.requested_guard_name ? guards.find(g => `${g.first_name} ${g.last_name}` === req.requested_guard_name)?.id ?? "" : "")) }}>
                                  <Play className="h-3 w-3 mr-1" />Execute
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Assignment Change</DialogTitle>
            <DialogDescription>Select the assignment to change and provide a reason. This will be sent to the Operations Manager for approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Search Assignment</Label>
              <Input placeholder="Search by guard, site..." value={assignmentSearch} onChange={(e) => setAssignmentSearch(e.target.value)} />
            </div>
            {assignments.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-auto divide-y">
                {assignments.slice(0, 30).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors text-sm ${selectedAssignment?.id === a.id ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                    onClick={() => setSelectedAssignment(a)}
                  >
                    <p className="font-medium">{a.guard_name}</p>
                    <p className="text-xs text-muted-foreground">{a.site_name} · {a.shift_name} · {new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </button>
                ))}
              </div>
            )}
            {selectedAssignment && (
              <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-sm">
                <p className="font-medium">Selected: {selectedAssignment.guard_name}</p>
                <p className="text-xs text-muted-foreground">{selectedAssignment.site_name} · {selectedAssignment.shift_name} · {new Date(selectedAssignment.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Suggested Replacement Guard <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={requestedGuardId} onValueChange={setRequestedGuardId}>
                <SelectTrigger><SelectValue placeholder="Select a guard..." /></SelectTrigger>
                <SelectContent>
                  {guards.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.first_name} {g.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-red-500">*</span></Label>
              <Textarea placeholder="Explain why this assignment needs to be changed..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancel</Button>
            <Button onClick={submitRequest} disabled={!selectedAssignment || !reason.trim() || submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ops Manager Review Dialog */}
      <Dialog open={!!reviewRequest} onOpenChange={(o) => { if (!o) setReviewRequest(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Change Request</DialogTitle>
            <DialogDescription>Approve or reject this assignment change request.</DialogDescription>
          </DialogHeader>
          {reviewRequest && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 rounded-md p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Guard:</span> <strong>{reviewRequest.current_guard_name}</strong></p>
                <p><span className="text-muted-foreground">Site:</span> {reviewRequest.site_name}</p>
                <p><span className="text-muted-foreground">Shift:</span> {reviewRequest.shift_name} · {reviewRequest.start_time}–{reviewRequest.end_time}</p>
                <p><span className="text-muted-foreground">Date:</span> {new Date(reviewRequest.assignment_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                {reviewRequest.requested_guard_name && <p><span className="text-muted-foreground">Suggested:</span> {reviewRequest.requested_guard_name}</p>}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                <p className="font-medium text-amber-800 mb-1">Reason</p>
                <p className="text-amber-900">{reviewRequest.reason}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea placeholder="Add notes for the Roster Manager..." value={opsNotes} onChange={(e) => setOpsNotes(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewRequest(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={reviewing}>
              <X className="h-4 w-4 mr-1" />Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => reviewAction("approve")} disabled={reviewing}>
              <Check className="h-4 w-4 mr-1" />{reviewing ? "Processing..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Request?</AlertDialogTitle>
            <AlertDialogDescription>This will reject the assignment change request. The coordinator will be notified.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => reviewAction("reject")} disabled={reviewing}>
              {reviewing ? "Rejecting..." : "Yes, Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Roster Manager Execute Dialog */}
      <Dialog open={!!executeRequest} onOpenChange={(o) => { if (!o) setExecuteRequest(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Execute Assignment Change</DialogTitle>
            <DialogDescription>Select the guard to assign. The current guard will be notified of removal and the new guard will be notified of their assignment.</DialogDescription>
          </DialogHeader>
          {executeRequest && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 rounded-md p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Current Guard:</span> <strong>{executeRequest.current_guard_name}</strong></p>
                <p><span className="text-muted-foreground">Site:</span> {executeRequest.site_name}</p>
                <p><span className="text-muted-foreground">Date:</span> {new Date(executeRequest.assignment_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                <p><span className="text-muted-foreground">Shift:</span> {executeRequest.shift_name} · {executeRequest.start_time}–{executeRequest.end_time}</p>
              </div>
              {executeRequest.ops_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                  <p className="font-medium text-blue-800 mb-1">Ops Manager Notes</p>
                  <p className="text-blue-900">{executeRequest.ops_notes}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Assign New Guard <span className="text-red-500">*</span></Label>
                <Select value={executeGuardId} onValueChange={setExecuteGuardId}>
                  <SelectTrigger><SelectValue placeholder="Select replacement guard..." /></SelectTrigger>
                  <SelectContent>
                    {guards.filter((g) => g.status === "active").map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.first_name} {g.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteRequest(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={executeChange} disabled={!executeGuardId || executing}>
              <Play className="h-4 w-4 mr-1" />{executing ? "Executing..." : "Execute Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
