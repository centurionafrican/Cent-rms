import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { TimeOffList } from './time-off-list'

async function getTimeOffRequests(userId: string, role: string) {
  if (role === 'employee') {
    return await sql`
      SELECT t.*, u.first_name, u.last_name,
             r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
      FROM time_off_requests t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN users r ON r.id = t.reviewed_by
      WHERE t.user_id = ${userId}
      ORDER BY t.created_at DESC
    `
  }

  return await sql`
    SELECT t.*, u.first_name, u.last_name,
           r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
    FROM time_off_requests t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN users r ON r.id = t.reviewed_by
    ORDER BY 
      CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
      t.created_at DESC
  `
}

export default async function TimeOffPage() {
  const user = await getSession()
  if (!user) return null

  const requests = await getTimeOffRequests(user.id, user.role)
  const isManager = user.role === 'admin' || user.role === 'manager'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Time Off Requests</h1>
        <p className="text-muted-foreground">
          {isManager
            ? 'Review and manage employee time off requests.'
            : 'Submit and track your time off requests.'}
        </p>
      </div>

      <TimeOffList
        initialRequests={requests}
        isManager={isManager}
        currentUserId={user.id}
      />
    </div>
  )
}
