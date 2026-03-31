'use client'

import { useState } from 'react'
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
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Shift {
  id: string
  user_id: string
  location_id: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  first_name: string
  last_name: string
  location_name: string
  location_address: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  employee_id: string | null
}

interface Location {
  id: string
  name: string
  address: string
  city: string
}

interface ScheduleCalendarProps {
  initialShifts: Shift[]
  employees: Employee[]
  locations: Location[]
  isManager: boolean
  currentUserId: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function ScheduleCalendar({
  initialShifts,
  employees,
  locations,
  isManager,
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>(initialShifts)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('16:00')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const weekStart = new Date(currentDate)
  weekStart.setDate(currentDate.getDate() - currentDate.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    return day
  })

  function previousWeek() {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() - 7)
    setCurrentDate(newDate)
    fetchShifts(newDate)
  }

  function nextWeek() {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + 7)
    setCurrentDate(newDate)
    fetchShifts(newDate)
  }

  function goToToday() {
    setCurrentDate(new Date())
    fetchShifts(new Date())
  }

  async function fetchShifts(date: Date) {
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay())
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    try {
      const res = await fetch(
        `/api/shifts?start=${start.toISOString()}&end=${end.toISOString()}`
      )
      if (res.ok) {
        const data = await res.json()
        setShifts(data.shifts)
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
    }
  }

  async function handleCreateShift() {
    if (!selectedEmployee || !selectedLocation || !selectedDate) return

    setLoading(true)
    try {
      const startDateTime = `${selectedDate}T${startTime}:00`
      const endDateTime = `${selectedDate}T${endTime}:00`

      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedEmployee,
          location_id: selectedLocation,
          start_time: startDateTime,
          end_time: endDateTime,
          notes: notes || null,
        }),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        resetForm()
        fetchShifts(currentDate)
      }
    } catch (error) {
      console.error('Failed to create shift:', error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setSelectedEmployee('')
    setSelectedLocation('')
    setSelectedDate('')
    setStartTime('08:00')
    setEndTime('16:00')
    setNotes('')
  }

  function getShiftsForDay(date: Date) {
    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.start_time)
      return (
        shiftDate.getFullYear() === date.getFullYear() &&
        shiftDate.getMonth() === date.getMonth() &&
        shiftDate.getDate() === date.getDate()
      )
    })
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={previousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-lg font-medium">
            {weekStart.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
            })}{' '}
            -{' '}
            {weekDays[6].toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        {isManager && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Shift</DialogTitle>
                <DialogDescription>
                  Assign a shift to an employee at a location.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="employee">Employee</Label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={selectedLocation}
                    onValueChange={setSelectedLocation}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <input
                    type="date"
                    id="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((hour) => (
                          <SelectItem
                            key={hour}
                            value={`${hour.toString().padStart(2, '0')}:00`}
                          >
                            {hour === 0
                              ? '12:00 AM'
                              : hour < 12
                              ? `${hour}:00 AM`
                              : hour === 12
                              ? '12:00 PM'
                              : `${hour - 12}:00 PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Select value={endTime} onValueChange={setEndTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((hour) => (
                          <SelectItem
                            key={hour}
                            value={`${hour.toString().padStart(2, '0')}:00`}
                          >
                            {hour === 0
                              ? '12:00 AM'
                              : hour < 12
                              ? `${hour}:00 AM`
                              : hour === 12
                              ? '12:00 PM'
                              : `${hour - 12}:00 PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special instructions..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateShift}
                  disabled={
                    loading ||
                    !selectedEmployee ||
                    !selectedLocation ||
                    !selectedDate
                  }
                >
                  {loading ? 'Creating...' : 'Create Shift'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'min-h-[200px] rounded-lg border border-border bg-card p-2',
              isToday(day) && 'border-primary bg-primary/5'
            )}
          >
            <div
              className={cn(
                'mb-2 text-center',
                isToday(day) && 'text-primary'
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p
                className={cn(
                  'text-lg font-semibold',
                  isToday(day) && 'text-primary'
                )}
              >
                {day.getDate()}
              </p>
            </div>
            <div className="space-y-1">
              {getShiftsForDay(day).map((shift) => (
                <Card
                  key={shift.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-2">
                    <p className="text-xs font-medium text-foreground truncate">
                      {shift.first_name} {shift.last_name}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5" />
                      <span className="truncate">{shift.location_name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      <span>
                        {formatTime(shift.start_time)} -{' '}
                        {formatTime(shift.end_time)}
                      </span>
                    </div>
                    <Badge
                      variant={
                        shift.status === 'scheduled'
                          ? 'secondary'
                          : shift.status === 'in_progress'
                          ? 'default'
                          : shift.status === 'completed'
                          ? 'outline'
                          : 'destructive'
                      }
                      className="mt-1 text-[9px] px-1 py-0"
                    >
                      {shift.status.replace('_', ' ')}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
