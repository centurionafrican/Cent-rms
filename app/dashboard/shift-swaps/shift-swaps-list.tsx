'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Check, X, ArrowLeftRight } from 'lucide-react'

interface SwapRequest {
  id: string
  requester_id: string
  original_shift_id: string
  target_user_id: string | null
  status: 'pending' | 'approved' | 'denied'
  notes: string | null
  created_at: string
  shift_start: string
  shift_end: string
  location_name: string
  requester_first_name: string
  requester_last_name: string
  target_first_name: string | null
  target_last_name: string | null
  reviewer_first_name: string | null
  reviewer_last_name: string | null
}

interface Shift {
  id: string
  start_time: string
  end_time: string
  location_name: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface ShiftSwapsListProps {
  initialRequests: SwapRequest[]
  userShifts: Shift[]
  employees: Employee[]
  isManager: boolean
  currentUserId: string
}

export function ShiftSwapsList({
  initialRequests,
  userShifts,
  employees,
  isManager,
  currentUserId,
}: ShiftSwapsListProps) {
  const router = useRouter()
  const [requests, setRequests] = useState<SwapRequest[]>(initialRequests)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function handleSubmit() {
    if (!selectedShift) return

    setLoading(true)
    try {
      const res = await fetch('/api/shift-swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_shift_id: selectedShift,
          target_user_id: selectedEmployee || null,
          notes: notes || null,
        }),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        setSelectedShift('')
        setSelectedEmployee('')
        setNotes('')
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to submit swap request:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleReview(requestId: string, status: 'approved' | 'denied') {
    setActionLoading(requestId)
    try {
      const res = await fetch(`/api/shift-swaps/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status } : r))
        )
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to review swap request:', error)
    } finally {
      setActionLoading(null)
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    }
  }

  const otherEmployees = employees.filter((e) => e.id !== currentUserId)

  return (
    <div className="space-y-4">
      {!isManager && (
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={userShifts.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Request Swap
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Request Shift Swap</DialogTitle>
                <DialogDescription>
                  Select a shift you want to swap and optionally choose someone to
                  swap with.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="shift">Your Shift to Swap</Label>
                  <Select value={selectedShift} onValueChange={setSelectedShift}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {userShifts.map((shift) => {
                        const { date, time } = formatDateTime(shift.start_time)
                        const endTime = formatDateTime(shift.end_time).time
                        return (
                          <SelectItem key={shift.id} value={shift.id}>
                            {date} {time} - {endTime} @ {shift.location_name}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="employee">
                    Swap With (Optional)
                  </Label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Anyone available" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anyone">Anyone available</SelectItem>
                      {otherEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason for swap request..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !selectedShift}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            {isManager ? 'All Swap Requests' : 'My Swap Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No shift swap requests found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Swap With</TableHead>
                  <TableHead>Status</TableHead>
                  {isManager && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const { date, time } = formatDateTime(request.shift_start)
                  const endTime = formatDateTime(request.shift_end).time
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.requester_first_name} {request.requester_last_name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{date}</p>
                          <p className="text-muted-foreground">
                            {time} - {endTime}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{request.location_name}</TableCell>
                      <TableCell>
                        {request.target_first_name
                          ? `${request.target_first_name} ${request.target_last_name}`
                          : 'Anyone'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === 'approved'
                              ? 'default'
                              : request.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                      {isManager && (
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleReview(request.id, 'approved')
                                }
                                disabled={actionLoading === request.id}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleReview(request.id, 'denied')
                                }
                                disabled={actionLoading === request.id}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
