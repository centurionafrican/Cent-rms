import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { ShiftSwapsList } from './shift-swaps-list'

async function getSwapRequests(userId: string, role: string) {
  if (role === 'employee') {
    return await sql`
      SELECT sw.*, 
             s.start_time as shift_start, s.end_time as shift_end,
             l.name as location_name,
             req.first_name as requester_first_name, req.last_name as requester_last_name,
             tgt.first_name as target_first_name, tgt.last_name as target_last_name,
             rev.first_name as reviewer_first_name, rev.last_name as reviewer_last_name
      FROM shift_swap_requests sw
      JOIN shifts s ON s.id = sw.original_shift_id
      JOIN locations l ON l.id = s.location_id
      JOIN users req ON req.id = sw.requester_id
      LEFT JOIN users tgt ON tgt.id = sw.target_user_id
      LEFT JOIN users rev ON rev.id = sw.reviewed_by
      WHERE sw.requester_id = ${userId} OR sw.target_user_id = ${userId}
      ORDER BY sw.created_at DESC
    `
  }

  return await sql`
    SELECT sw.*, 
           s.start_time as shift_start, s.end_time as shift_end,
           l.name as location_name,
           req.first_name as requester_first_name, req.last_name as requester_last_name,
           tgt.first_name as target_first_name, tgt.last_name as target_last_name,
           rev.first_name as reviewer_first_name, rev.last_name as reviewer_last_name
    FROM shift_swap_requests sw
    JOIN shifts s ON s.id = sw.original_shift_id
    JOIN locations l ON l.id = s.location_id
    JOIN users req ON req.id = sw.requester_id
    LEFT JOIN users tgt ON tgt.id = sw.target_user_id
    LEFT JOIN users rev ON rev.id = sw.reviewed_by
    ORDER BY 
      CASE WHEN sw.status = 'pending' THEN 0 ELSE 1 END,
      sw.created_at DESC
  `
}

async function getUserShifts(userId: string) {
  const today = new Date().toISOString()
  return await sql`
    SELECT s.*, l.name as location_name
    FROM shifts s
    JOIN locations l ON l.id = s.location_id
    WHERE s.user_id = ${userId} 
      AND s.start_time >= ${today}
      AND s.status = 'scheduled'
    ORDER BY s.start_time
  `
}

async function getEmployees() {
  return await sql`
    SELECT id, first_name, last_name, email
    FROM users
    WHERE role = 'employee' AND is_active = true
    ORDER BY first_name, last_name
  `
}

export default async function ShiftSwapsPage() {
  const user = await getSession()
  if (!user) return null

  const [swapRequests, userShifts, employees] = await Promise.all([
    getSwapRequests(user.id, user.role),
    getUserShifts(user.id),
    getEmployees(),
  ])

  const isManager = user.role === 'admin' || user.role === 'manager'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Shift Swaps</h1>
        <p className="text-muted-foreground">
          {isManager
            ? 'Review and manage shift swap requests.'
            : 'Request to swap shifts with other employees.'}
        </p>
      </div>

      <ShiftSwapsList
        initialRequests={swapRequests}
        userShifts={userShifts}
        employees={employees}
        isManager={isManager}
        currentUserId={user.id}
      />
    </div>
  )
}
