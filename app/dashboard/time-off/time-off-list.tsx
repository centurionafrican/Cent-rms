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
import { Plus, Check, X, Calendar } from 'lucide-react'

interface TimeOffRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  reason: string | null
  status: 'pending' | 'approved' | 'denied'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  first_name: string
  last_name: string
  reviewer_first_name: string | null
  reviewer_last_name: string | null
}

interface TimeOffListProps {
  initialRequests: TimeOffRequest[]
  isManager: boolean
  currentUserId: string
}

export function TimeOffList({
  initialRequests,
  isManager,
}: TimeOffListProps) {
  const router = useRouter()
  const [requests, setRequests] = useState<TimeOffRequest[]>(initialRequests)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function handleSubmit() {
    if (!startDate || !endDate) return

    setLoading(true)
    try {
      const res = await fetch('/api/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          reason: reason || null,
        }),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        setStartDate('')
        setEndDate('')
        setReason('')
        router.refresh()
        const data = await res.json()
        setRequests((prev) => [data.request, ...prev])
      }
    } catch (error) {
      console.error('Failed to submit request:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleReview(requestId: string, status: 'approved' | 'denied') {
    setActionLoading(requestId)
    try {
      const res = await fetch(`/api/time-off/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId ? { ...r, status } : r
          )
        )
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to review request:', error)
    } finally {
      setActionLoading(null)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function getDayCount(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diff = endDate.getTime() - startDate.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Request Time Off
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Request Time Off</DialogTitle>
              <DialogDescription>
                Submit a new time off request for review.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="start-date">Start Date</Label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-date">End Date</Label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Vacation, personal, medical, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !startDate || !endDate}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isManager ? 'All Time Off Requests' : 'My Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No time off requests found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isManager && <TableHead>Employee</TableHead>}
                  <TableHead>Dates</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  {isManager && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    {isManager && (
                      <TableCell className="font-medium">
                        {request.first_name} {request.last_name}
                      </TableCell>
                    )}
                    <TableCell>
                      {formatDate(request.start_date)} -{' '}
                      {formatDate(request.end_date)}
                    </TableCell>
                    <TableCell>
                      {getDayCount(request.start_date, request.end_date)} day
                      {getDayCount(request.start_date, request.end_date) > 1
                        ? 's'
                        : ''}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {request.reason || '-'}
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
                              onClick={() => handleReview(request.id, 'approved')}
                              disabled={actionLoading === request.id}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReview(request.id, 'denied')}
                              disabled={actionLoading === request.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
