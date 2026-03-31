import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { ScheduleCalendar } from './schedule-calendar'

async function getShifts(startDate: string, endDate: string) {
  return await sql`
    SELECT s.*, 
           u.first_name, u.last_name, u.email,
           l.name as location_name, l.address as location_address
    FROM shifts s
    JOIN users u ON u.id = s.user_id
    JOIN locations l ON l.id = s.location_id
    WHERE s.start_time >= ${startDate} AND s.start_time <= ${endDate}
    ORDER BY s.start_time
  `
}

async function getEmployees() {
  return await sql`
    SELECT id, first_name, last_name, email, employee_id
    FROM users
    WHERE role = 'employee' AND is_active = true
    ORDER BY first_name, last_name
  `
}

async function getLocations() {
  return await sql`
    SELECT id, name, address, city
    FROM locations
    WHERE is_active = true
    ORDER BY name
  `
}

export default async function SchedulePage() {
  const user = await getSession()
  if (!user) return null

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 13)
  endOfWeek.setHours(23, 59, 59, 999)

  const [shifts, employees, locations] = await Promise.all([
    getShifts(startOfWeek.toISOString(), endOfWeek.toISOString()),
    getEmployees(),
    getLocations(),
  ])

  const isManager = user.role === 'admin' || user.role === 'manager'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
        <p className="text-muted-foreground">
          View and manage shift schedules for all employees.
        </p>
      </div>

      <ScheduleCalendar
        initialShifts={shifts}
        employees={employees}
        locations={locations}
        isManager={isManager}
        currentUserId={user.id}
      />
    </div>
  )
}
