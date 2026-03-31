import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { AttendanceList } from "./attendance-list"

async function getAttendance() {
  return await sql`
    SELECT 
      att.*,
      a.date,
      a.guard_id,
      g.first_name || ' ' || g.last_name as guard_name,
      g.phone as guard_phone,
      s.name as site_name,
      sh.name as shift_name,
      sh.start_time as shift_start,
      sh.end_time as shift_end
    FROM attendance att
    JOIN assignments a ON a.id = att.assignment_id
    JOIN guards g ON g.id = a.guard_id
    JOIN sites s ON s.id = a.site_id
    JOIN shifts sh ON sh.id = a.shift_id
    ORDER BY a.date DESC, att.time_in DESC
  `
}

async function getTodayAssignments() {
  const today = new Date().toISOString().split("T")[0]
  return await sql`
    SELECT 
      a.*,
      g.first_name || ' ' || g.last_name as guard_name,
      s.name as site_name,
      sh.name as shift_name,
      att.id as attendance_id,
      att.time_in,
      att.time_out,
      att.status as attendance_status
    FROM assignments a
    JOIN guards g ON g.id = a.guard_id
    JOIN sites s ON s.id = a.site_id
    JOIN shifts sh ON sh.id = a.shift_id
    LEFT JOIN attendance att ON att.assignment_id = a.id
    WHERE a.date = ${today}
    ORDER BY sh.start_time
  `
}

export default async function AttendancePage() {
  const user = await getSession()
  if (!user) return null

  const [attendance, todayAssignments] = await Promise.all([
    getAttendance(),
    getTodayAssignments(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Time & Attendance</h1>
        <p className="text-muted-foreground">
          Track guard clock-in and clock-out times.
        </p>
      </div>

      <AttendanceList 
        initialAttendance={attendance} 
        todayAssignments={todayAssignments}
      />
    </div>
  )
}
