import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { AssignmentsList } from "./assignments-list"

async function getAssignments() {
  const result = await sql`
    SELECT 
      a.*,
      g.first_name || ' ' || g.last_name as guard_name,
      g.phone as guard_phone,
      s.name as site_name,
      sh.name as shift_name,
      sh.start_time as shift_start,
      sh.end_time as shift_end,
      sh.color as shift_color,
      r.first_name || ' ' || r.last_name as reliever_name
    FROM assignments a
    JOIN guards g ON g.id = a.guard_id
    JOIN sites s ON s.id = a.site_id
    JOIN shifts sh ON sh.id = a.shift_id
    LEFT JOIN guards r ON r.id = a.reliever_id
    WHERE a.date >= NOW() - INTERVAL '30 days'
    ORDER BY a.date DESC, sh.start_time
    LIMIT 1000
  `
  return result || []
}

async function getGuards() {
  return await sql`
    SELECT id, first_name, last_name, status, title, gender, education_level, discipline, languages_spoken, guard_title, special_skills, maternity_status
    FROM guards 
    WHERE status != 'dismissed' AND status != 'quit'
    ORDER BY first_name, last_name
  `
}

async function getSites() {
  return await sql`SELECT id, name, guards_needed FROM sites WHERE is_active = true AND site_status = 'active' ORDER BY name`
}

async function getShifts() {
  return await sql`SELECT id, name, start_time, end_time, color FROM shifts ORDER BY start_time`
}

export default async function AssignmentsPage() {
  const user = await getSession()
  if (!user) return null

  const [assignments, guards, sites, shifts] = await Promise.all([
    getAssignments(),
    getGuards(),
    getSites(),
    getShifts(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assignments</h1>
        <p className="text-muted-foreground">
          Assign guards to sites and shifts.
        </p>
      </div>

      <AssignmentsList 
        initialAssignments={assignments || []} 
        guards={guards || []}
        sites={sites || []}
        shifts={shifts || []}
      />
    </div>
  )
}
