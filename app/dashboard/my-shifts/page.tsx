import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Calendar } from 'lucide-react'

async function getMyShifts(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return await sql`
    SELECT s.*, l.name as location_name, l.address as location_address
    FROM shifts s
    JOIN locations l ON l.id = s.location_id
    WHERE s.user_id = ${userId}
      AND s.start_time >= ${today.toISOString()}
    ORDER BY s.start_time
    LIMIT 20
  `
}

async function getPastShifts(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return await sql`
    SELECT s.*, l.name as location_name, l.address as location_address
    FROM shifts s
    JOIN locations l ON l.id = s.location_id
    WHERE s.user_id = ${userId}
      AND s.start_time < ${today.toISOString()}
    ORDER BY s.start_time DESC
    LIMIT 10
  `
}

export default async function MyShiftsPage() {
  const user = await getSession()
  if (!user) return null

  const [upcomingShifts, pastShifts] = await Promise.all([
    getMyShifts(user.id),
    getPastShifts(user.id),
  ])

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function getShiftDuration(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    return `${hours.toFixed(1)} hours`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Shifts</h1>
        <p className="text-muted-foreground">
          View your upcoming and past shift assignments.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Shifts
            </CardTitle>
            <CardDescription>Your scheduled shifts</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No upcoming shifts scheduled.
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingShifts.map((shift: Record<string, unknown>) => (
                  <div
                    key={shift.id as string}
                    className="rounded-lg border border-border p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {formatDate(shift.start_time as string)}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(shift.start_time as string)} -{' '}
                          {formatTime(shift.end_time as string)}
                          <span className="ml-2">
                            ({getShiftDuration(shift.start_time as string, shift.end_time as string)})
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          shift.status === 'scheduled'
                            ? 'secondary'
                            : shift.status === 'in_progress'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {(shift.status as string).replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{shift.location_name as string}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {shift.location_address as string}
                    </p>
                    {shift.notes && (
                      <p className="text-sm text-muted-foreground border-t border-border pt-2 mt-2">
                        Note: {shift.notes as string}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Past Shifts
            </CardTitle>
            <CardDescription>Your recent shift history</CardDescription>
          </CardHeader>
          <CardContent>
            {pastShifts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No past shifts found.
              </p>
            ) : (
              <div className="space-y-3">
                {pastShifts.map((shift: Record<string, unknown>) => (
                  <div
                    key={shift.id as string}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(shift.start_time as string).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shift.location_name as string}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatTime(shift.start_time as string)} - {formatTime(shift.end_time as string)}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {(shift.status as string).replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
