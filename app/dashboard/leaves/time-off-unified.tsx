"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Search, Check, X, Clock } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Guard {
  id: number
  first_name: string
  last_name: string
}

interface GuardOff {
  id: number
  guard_id: number
  guard_name: string
  date: string
  reason: string
  notes: string | null
  created_at: string
}

interface LeaveRequest {
  id: number
  guard_id: number
  guard_name: string
  guard_phone: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  status: string
  roster_manager_verified: boolean
  ops_manager_approved: boolean | null
  ops_manager_approved_by: number | null
  ops_manager_approved_at: string | null
  hr_approved: boolean | null
  hr_approved_by: number | null
  hr_approved_at: string | null
  coceo_approved: boolean | null
  coceo_approved_by: number | null
  coceo_approved_at: string | null
  created_at: string
  roster_manager_name: string | null
  ops_manager_name: string | null
  hr_name: string | null
  coceo_name: string | null
}

const LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Personal Leave", "Unpaid Leave"]
const OFF_REASONS = ["Day Off", "Rest Day", "Weekend Off", "Public Holiday", "Other"]

const REASON_COLORS: Record<string, string> = {
  "Day Off":        "bg-blue-50 text-blue-700 border-blue-200",
  "Rest Day":       "bg-purple-50 text-purple-700 border-purple-200",
  "Weekend Off":    "bg-teal-50 text-teal-700 border-teal-200",
  "Public Holiday": "bg-amber-50 text-amber-700 border-amber-200",
  "Other":          "bg-gray-50 text-gray-600 border-gray-200",
}

function getStatusColor(status: string) {
  switch (status) {
    case "approved": return "bg-green-100 text-green-800 border-green-200"
    case "rejected": return "bg-red-100 text-red-800 border-red-200"
    case "pending": return "bg-amber-100 text-amber-800 border-amber-200"
    default: return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

interface TimeOffUnifiedProps {
  initialLeaves: LeaveRequest[]
  initialOffs: GuardOff[]
  guards: Guard[]
  currentUserId?: string | number
  currentUserRole: string
  isRosterManager: boolean
  isOpsManager: boolean
}

export function TimeOffUnified({
  initialLeaves,
  initialOffs,
  guards,
  currentUserId,
  currentUserRole,
  isRosterManager,
  isOpsManager,
}: TimeOffUnifiedProps) {
  const [activeTab, setActiveTab] = useState("leaves")
  const [search, setSearch] = useState("")
  const [isOffOpen, setIsOffOpen] = useState(false)
  const [isLeaveOpen, setIsLeaveOpen] = useState(false)
  const [deleteOffId, setDeleteOffId] = useState<number | null>(null)
  const [selectedLeaveForApproval, setSelectedLeaveForApproval] = useState<LeaveRequest | null>(null)
  const [approvalNotes, setApprovalNotes] = useState("")
  const [approvingStep, setApprovingStep] = useState<"roster" | "ops">("roster")

  // Form states
  const [formGuardId, setFormGuardId] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formReason, setFormReason] = useState("Day Off")
  const [formNotes, setFormNotes] = useState("")
  const [submittingOff, setSubmittingOff] = useState(false)

  const [formLeaveGuardId, setFormLeaveGuardId] = useState("")
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")
  const [formLeaveType, setFormLeaveType] = useState("Annual Leave")
  const [formLeaveReason, setFormLeaveReason] = useState("")
  const [submittingLeave, setSubmittingLeave] = useState(false)

  // Use SWR to keep data in sync
  const { data: leaves = initialLeaves, mutate: mutateLeaves } = useSWR("/api/leave-requests", fetcher, {
    fallbackData: initialLeaves,
    revalidateOnFocus: false,
  })
  const { data: offs = initialOffs, mutate: mutateOffs } = useSWR("/api/guard-offs", fetcher, {
    fallbackData: initialOffs,
    revalidateOnFocus: false,
  })

  async function handleAddOff(e: React.FormEvent) {
    e.preventDefault()
    if (!formGuardId || !formDate) return

    setSubmittingOff(true)
    try {
      const res = await fetch("/api/guard-offs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guard_id: parseInt(formGuardId),
          date: formDate,
          reason: formReason,
          notes: formNotes,
        }),
      })
      if (res.ok) {
        setIsOffOpen(false)
        setFormGuardId("")
        setFormDate("")
        setFormReason("Day Off")
        setFormNotes("")
        mutateOffs()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingOff(false)
    }
  }

  async function handleDeleteOff(id: number) {
    try {
      const res = await fetch(`/api/guard-offs/${id}`, { method: "DELETE" })
      if (res.ok) {
        setDeleteOffId(null)
        mutateOffs()
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleAddLeave(e: React.FormEvent) {
    e.preventDefault()
    if (!formLeaveGuardId || !formStartDate || !formEndDate) return

    setSubmittingLeave(true)
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guard_id: parseInt(formLeaveGuardId),
          start_date: formStartDate,
          end_date: formEndDate,
          leave_type: formLeaveType,
          reason: formLeaveReason,
        }),
      })
      if (res.ok) {
        setIsLeaveOpen(false)
        setFormLeaveGuardId("")
        setFormStartDate("")
        setFormEndDate("")
        setFormLeaveType("Annual Leave")
        setFormLeaveReason("")
        mutateLeaves()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingLeave(false)
    }
  }

  async function handleLeaveApproval(approved: boolean) {
    if (!selectedLeaveForApproval) return

    try {
      let endpoint = ""
      if (approvingStep === "roster") {
        endpoint = "/api/leave-requests/roster-approve"
      } else if (approvingStep === "ops") {
        endpoint = "/api/leave-requests/ops-approve"
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_id: selectedLeaveForApproval.id,
          approved,
          notes: approvalNotes,
        }),
      })
      if (res.ok) {
        setSelectedLeaveForApproval(null)
        setApprovalNotes("")
        mutateLeaves()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredOffs = offs.filter((off) =>
    `${off.guard_name} ${off.date} ${off.reason}`.toLowerCase().includes(search.toLowerCase())
  )

  const filteredLeaves = leaves.filter((leave) =>
    `${leave.guard_name} ${leave.leave_type} ${leave.reason}`.toLowerCase().includes(search.toLowerCase())
  )

  const pendingRosterReview = leaves.filter((l) => !l.roster_manager_verified)
  const pendingOpsApproval = leaves.filter((l) => l.roster_manager_verified && !l.ops_manager_approved)

  return (
    <div className="space-y-6">
      {/* Approval Queue Cards */}
      {isRosterManager && pendingRosterReview.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Roster Manager Review ({pendingRosterReview.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800">You have leave requests pending your review and approval.</p>
          </CardContent>
        </Card>
      )}

      {isOpsManager && pendingOpsApproval.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Operations Manager Approval ({pendingOpsApproval.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800">Roster Manager has verified these leave requests. They await your approval.</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="offs">Guard Off Days</TabsTrigger>
        </TabsList>

        {/* Leave Requests Tab */}
        <TabsContent value="leaves" className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leave requests..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => setIsLeaveOpen(true)}><Plus className="h-4 w-4 mr-2" />Request Leave</Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guard</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approvals</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaves.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No leave requests found.</TableCell></TableRow>
                  ) : (
                    filteredLeaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell>
                          <div className="font-medium">{leave.guard_name}</div>
                          <div className="text-xs text-muted-foreground">{leave.guard_phone}</div>
                        </TableCell>
                        <TableCell>{leave.leave_type}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{leave.reason || "-"}</TableCell>
                        <TableCell><Badge className={getStatusColor(leave.status)}>{leave.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1 text-xs">
                            <div className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium ${leave.roster_manager_verified ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`} title="Roster Manager">
                              {leave.roster_manager_verified ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              RM
                            </div>
                            <div className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium ${leave.ops_manager_approved ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`} title="Operations Manager">
                              {leave.ops_manager_approved ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              OPS
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {!leave.roster_manager_verified && isRosterManager && (
                            <Button variant="outline" size="sm" onClick={() => {
                              setSelectedLeaveForApproval(leave)
                              setApprovingStep("roster")
                            }}>
                              <Clock className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                          )}
                          {leave.roster_manager_verified && !leave.ops_manager_approved && isOpsManager && (
                            <Button variant="outline" size="sm" onClick={() => {
                              setSelectedLeaveForApproval(leave)
                              setApprovingStep("ops")
                            }}>
                              <Clock className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guard Off Days Tab */}
        <TabsContent value="offs" className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search off days..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => setIsOffOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Off Day</Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guard Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No off days found.</TableCell></TableRow>
                  ) : (
                    filteredOffs.map((off) => (
                      <TableRow key={off.id}>
                        <TableCell className="font-medium">{off.guard_name}</TableCell>
                        <TableCell>{new Date(off.date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge className={REASON_COLORS[off.reason] || REASON_COLORS["Other"]}>{off.reason}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{off.notes || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setDeleteOffId(off.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Off Day Dialog */}
      <Dialog open={isOffOpen} onOpenChange={setIsOffOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Guard Off Day</DialogTitle></DialogHeader>
          <form onSubmit={handleAddOff} className="space-y-4">
            <div className="space-y-2">
              <Label>Guard *</Label>
              <Select value={formGuardId} onValueChange={setFormGuardId}>
                <SelectTrigger><SelectValue placeholder="Select guard" /></SelectTrigger>
                <SelectContent>
                  {guards.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>
                      {g.first_name} {g.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={formReason} onValueChange={setFormReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OFF_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Additional notes..." />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOffOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingOff}>{submittingOff ? "Adding..." : "Add Off Day"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Leave Request Dialog */}
      <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Leave</DialogTitle></DialogHeader>
          <form onSubmit={handleAddLeave} className="space-y-4">
            <div className="space-y-2">
              <Label>Guard *</Label>
              <Select value={formLeaveGuardId} onValueChange={setFormLeaveGuardId}>
                <SelectTrigger><SelectValue placeholder="Select guard" /></SelectTrigger>
                <SelectContent>
                  {guards.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>
                      {g.first_name} {g.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leave Type *</Label>
              <Select value={formLeaveType} onValueChange={setFormLeaveType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={formLeaveReason} onChange={(e) => setFormLeaveReason(e.target.value)} placeholder="Reason for leave..." />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLeaveOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingLeave}>{submittingLeave ? "Requesting..." : "Request Leave"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Approval Dialog */}
      <Dialog open={!!selectedLeaveForApproval} onOpenChange={(o) => { if (!o) setSelectedLeaveForApproval(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvingStep === "roster" ? "Roster Manager Review - Leave Request" : "Operations Manager Approval - Leave Request"}
            </DialogTitle>
            <DialogDescription>
              {approvingStep === "roster" 
                ? "Review and verify the leave request. Approval allows the Operations Manager to proceed."
                : "Provide final approval for this verified leave request."}
            </DialogDescription>
          </DialogHeader>
          {selectedLeaveForApproval && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Guard</p>
                  <p className="font-medium">{selectedLeaveForApproval.guard_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Leave Type</p>
                  <p className="font-medium">{selectedLeaveForApproval.leave_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Start Date</p>
                  <p className="font-medium">{new Date(selectedLeaveForApproval.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">End Date</p>
                  <p className="font-medium">{new Date(selectedLeaveForApproval.end_date).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedLeaveForApproval.reason && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm">{selectedLeaveForApproval.reason}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Approval Notes</Label>
                <Textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} placeholder="Add notes..." className="min-h-20" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleLeaveApproval(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={() => handleLeaveApproval(true)}>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Off Day Alert */}
      <AlertDialog open={!!deleteOffId} onOpenChange={(o) => { if (!o) setDeleteOffId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Off Day</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogDescription>Are you sure you want to delete this off day record? This cannot be undone.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteOffId && handleDeleteOff(deleteOffId)} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
