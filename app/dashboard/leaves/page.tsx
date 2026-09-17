import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { LeavesList } from "./leaves-list"

async function getLeaveRequests() {
  return await sql`
    SELECT 
      lr.*,
      g.first_name || ' ' || g.last_name as guard_name,
      g.phone as guard_phone,
      u1.first_name || ' ' || u1.last_name as roster_manager_name,
      u2.first_name || ' ' || u2.last_name as ops_manager_name,
      u3.first_name || ' ' || u3.last_name as hr_name,
      u4.first_name || ' ' || u4.last_name as coceo_name
    FROM leave_requests lr
    JOIN guards g ON g.id = lr.guard_id
    LEFT JOIN users u1 ON u1.id = lr.roster_manager_id
    LEFT JOIN users u2 ON u2.id = lr.ops_manager_approved_by
    LEFT JOIN users u3 ON u3.id = lr.hr_approved_by
    LEFT JOIN users u4 ON u4.id = lr.coceo_approved_by
    ORDER BY 
      CASE WHEN lr.status = 'pending' THEN 0 ELSE 1 END,
      lr.created_at DESC
  `
}

async function getGuards() {
  return await sql`SELECT id, first_name, last_name FROM guards WHERE status = 'active' ORDER BY first_name`
}

export default async function LeavesPage() {
  const session = await getSession()
  const [leaveRequests, guards] = await Promise.all([
    getLeaveRequests(),
    getGuards(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leave Requests</h1>
        <p className="text-muted-foreground">
          Manage employee leave requests with multi-level approval (Roster Manager → Ops Manager → HR → Co-CEO).
        </p>
      </div>

      <LeavesList 
        initialLeaves={leaveRequests} 
        guards={guards}
        currentUserId={session?.id}
        currentUserRole={session?.role || "admin"}
      />
    </div>
  )
}
