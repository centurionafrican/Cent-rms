"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, CalendarX, Search, Check, X, Clock, CircleCheck, CircleX, Trash2 } from "lucide-react"

interface LeaveRequest {
  id: number
  guard_id: number
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  status: string
  reviewed_by: number | null
  reviewed_at: string | null
  created_at: string
  guard_name: string
  guard_phone: string
  reviewed_by_name: string | null
  ops_manager_approved: boolean | null
  ops_manager_approved_by: number | null
  ops_manager_approved_at: string | null
  ops_manager_name: string | null
  hr_approved: boolean | null
  hr_approved_by: number | null
  hr_approved_at: string | null
  hr_name: string | null
  coceo_approved: boolean | null
  coceo_approved_by: number | null
  coceo_approved_at: string | null
  coceo_name: string | null
}

interface Guard {
  id: number
  first_name: string
  last_name: string
}

interface LeavesListProps {
  initialLeaves: LeaveRequest[]
  guards: Guard[]
  currentUserId: number
  currentUserRole: string
}

function ApprovalStep({ label, approved, approverName, approvedAt, isNext, onApprove, onReject }: {
  label: string
  approved: boolean | null
  approverName: string | null
  approvedAt: string | null
  isNext: boolean
  onApprove?: () => void
  onReject?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              {approved === true ? (
                <CircleCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : approved === false ? (
                <CircleX className="h-5 w-5 text-red-600 flex-shrink-0" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
              )}
              <span className={`text-xs whitespace-nowrap ${
                approved === true ? "text-green-700 font-medium" : 
                approved === false ? "text-red-700 font-medium" : 
                "text-muted-foreground"
              }`}>
                {label}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {approved === true ? (
              <span>Approved by {approverName || "Unknown"} on {approvedAt ? new Date(approvedAt).toLocaleString() : "N/A"}</span>
            ) : approved === false ? (
              <span>Rejected by {approverName || "Unknown"}</span>
            ) : (
              <span>Pending {label} approval</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {isNext && approved === null && onApprove && (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={onApprove}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onReject}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function LeavesList({ initialLeaves, guards, currentUserId, currentUserRole }: LeavesListProps) {
  const router = useRouter()
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeaves)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [formData, setFormData] = useState({
    guard_id: "",
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  })

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected leave request(s)? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/leaves/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setLeaves((prev) => prev.filter((l) => !selectedIds.has(l.id)))
        setSelectedIds(new Set())
        router.refresh()
      }
    } catch (error) { console.error(error) } finally { setBulkDeleting(false) }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredLeaves.length) { setSelectedIds(new Set()) }
    else { setSelectedIds(new Set(filteredLeaves.map((l) => l.id))) }
  }

  const filteredLeaves = leaves.filter((l) => {
    if (!shouldShowLeave(l)) return false
    const matchesSearch = l.guard_name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  async function handleSubmit() {
    if (!formData.guard_id || !formData.leave_type || !formData.start_date || !formData.end_date) return

    setLoading(true)
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setIsDialogOpen(false)
        resetForm()
        const data = await fetch("/api/leaves").then(r => r.json())
        setLeaves(data.leaves || [])
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to create leave request:", error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({ guard_id: "", leave_type: "", start_date: "", end_date: "", reason: "" })
  }

  async function handleApproval(id: number, step: string, approved: boolean) {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_step: step, approved }),
      })
      if (res.ok) {
        // Refresh data
        const data = await fetch("/api/leaves").then(r => r.json())
        setLeaves(data.leaves || [])
        router.refresh()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to process approval")
      }
    } catch (error) {
      console.error("Failed to process approval:", error)
    }
  }

  function getDays(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diff = endDate.getTime() - startDate.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
  }

  // Determine what step the user can approve based on their role
  function canApproveStep(leave: LeaveRequest, step: string): boolean {
    if (leave.status === "rejected" || leave.status === "approved") return false
    // operations_manager role = first approval
    if (step === "ops_manager" && currentUserRole === "operations_manager" && leave.ops_manager_approved === null) return true
    // hr role = second approval
    if (step === "hr" && currentUserRole === "hr" && leave.ops_manager_approved === true && leave.hr_approved === null) return true
    // coceo role = final approval
    if (step === "coceo" && currentUserRole === "coceo" && leave.hr_approved === true && leave.coceo_approved === null) return true
    return false
  }

  // Determine which leaves the user should see based on their role
  function shouldShowLeave(leave: LeaveRequest): boolean {
    // Coordinator can only see their own leaves (assuming they're guards, not staff)
    if (currentUserRole === "coordinator") return false
    // Operations Manager sees leaves awaiting their approval or already approved
    if (currentUserRole === "operations_manager") return true
    // HR sees leaves awaiting their approval or already approved
    if (currentUserRole === "hr") return true
    // Co-CEO sees leaves awaiting their approval or already approved
    if (currentUserRole === "coceo") return true
    // CEO can view all leaves (view-only)
    if (currentUserRole === "ceo") return true
    // Roster Manager sees all leaves
    if (currentUserRole === "roster_manager") return true
    // Admin (System Admin) sees all leaves
    if (currentUserRole === "admin") return true
    return true
  }

  function getOverallStatus(leave: LeaveRequest) {
    if (leave.status === "rejected") return { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" }
    if (leave.status === "approved") return { label: "Approved", color: "bg-green-100 text-green-700 border-green-200" }
    if (leave.coceo_approved === true) return { label: "Approved", color: "bg-green-100 text-green-700 border-green-200" }
    if (leave.hr_approved === true) return { label: "Awaiting Co-CEO", color: "bg-purple-100 text-purple-700 border-purple-200" }
    if (leave.ops_manager_approved === true) return { label: "Awaiting HR", color: "bg-blue-100 text-blue-700 border-blue-200" }
    return { label: "Awaiting Ops Mgr", color: "bg-amber-100 text-amber-700 border-amber-200" }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by guard name..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(currentUserRole === "roster_manager" || currentUserRole === "admin") && (
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
                <Trash2 className="h-4 w-4 mr-1" />
                {bulkDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
              </Button>
            )}
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Request Leave</Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Request Leave</DialogTitle>
              <DialogDescription>Submit a leave request for an employee.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Employee *</Label>
                <Select value={formData.guard_id} onValueChange={(value) => setFormData({ ...formData, guard_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {guards.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.first_name} {g.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Leave Type *</Label>
                <Select value={formData.leave_type} onValueChange={(value) => setFormData({ ...formData, leave_type: value })}>
                  <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="emergency">Emergency Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Date *</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>End Date *</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="Reason for leave..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading || !formData.guard_id || !formData.leave_type || !formData.start_date || !formData.end_date}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarX className="h-5 w-5" />
            Leave Requests ({filteredLeaves.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filteredLeaves.length > 0 && selectedIds.size === filteredLeaves.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Ops Manager</TableHead>
                <TableHead>HR</TableHead>
                <TableHead>Co-CEO</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No leave requests found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeaves.map((leave) => {
                  const overall = getOverallStatus(leave)
                  return (
                    <TableRow key={leave.id} className={selectedIds.has(leave.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(leave.id)}
                          onCheckedChange={() => toggleSelect(leave.id)}
                          aria-label={`Select leave for ${leave.guard_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{leave.guard_name}</p>
                          <p className="text-xs text-muted-foreground">{leave.guard_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{leave.leave_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{getDays(leave.start_date, leave.end_date)}</TableCell>
                      <TableCell>
                        <ApprovalStep
                          label="Ops Manager"
                          approved={leave.ops_manager_approved}
                          approverName={leave.ops_manager_name}
                          approvedAt={leave.ops_manager_approved_at}
                          isNext={canApproveStep(leave, "ops_manager")}
                          onApprove={() => handleApproval(leave.id, "ops_manager", true)}
                          onReject={() => handleApproval(leave.id, "ops_manager", false)}
                        />
                      </TableCell>
                      <TableCell>
                        <ApprovalStep
                          label="HR"
                          approved={leave.hr_approved}
                          approverName={leave.hr_name}
                          approvedAt={leave.hr_approved_at}
                          isNext={canApproveStep(leave, "hr")}
                          onApprove={() => handleApproval(leave.id, "hr", true)}
                          onReject={() => handleApproval(leave.id, "hr", false)}
                        />
                      </TableCell>
                      <TableCell>
                        <ApprovalStep
                          label="Co-CEO"
                          approved={leave.coceo_approved}
                          approverName={leave.coceo_name}
                          approvedAt={leave.coceo_approved_at}
                          isNext={canApproveStep(leave, "coceo")}
                          onApprove={() => handleApproval(leave.id, "coceo", true)}
                          onReject={() => handleApproval(leave.id, "coceo", false)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={overall.color}>
                          {overall.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
