import { neon } from "@neondatabase/serverless"

let _sql: ReturnType<typeof neon> | null = null

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set. Please add it in the Vars section of the sidebar.")
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql(strings, ...values)
}

export type User = {
  id: number
  email: string
  password_hash: string
  first_name: string
  last_name: string
  role: "admin" | "ceo" | "coceo" | "operations_manager" | "hr" | "roster_manager" | "coordinator"
  is_active: boolean
  created_at: string
  updated_at: string
}

// Role-based page access map
export const ROLE_ACCESS: Record<string, string[]> = {
  admin: [
    "/dashboard",
    "/dashboard/clients",
    "/dashboard/guards",
    "/dashboard/sites",
    "/dashboard/shifts",
    "/dashboard/assignments",
    "/dashboard/assignment-change-requests",
    "/dashboard/guard-offs",
    "/dashboard/attendance",
    "/dashboard/leaves",
    "/dashboard/incidents",
    "/dashboard/guard-portal",
    "/dashboard/reports",
    "/dashboard/users",
  ],
  ceo: [
    "/dashboard",
    "/dashboard/clients",
    "/dashboard/guards",
    "/dashboard/sites",
    "/dashboard/shifts",
    "/dashboard/assignments",
    "/dashboard/assignment-change-requests",
    "/dashboard/guard-offs",
    "/dashboard/attendance",
    "/dashboard/leaves",
    "/dashboard/incidents",
    "/dashboard/guard-portal",
    "/dashboard/reports",
  ],
  coceo: [
    "/dashboard",
    "/dashboard/clients",
    "/dashboard/guards",
    "/dashboard/sites",
    "/dashboard/shifts",
    "/dashboard/assignments",
    "/dashboard/assignment-change-requests",
    "/dashboard/guard-offs",
    "/dashboard/attendance",
    "/dashboard/leaves",
    "/dashboard/incidents",
    "/dashboard/guard-portal",
    "/dashboard/reports",
  ],
  roster_manager: [
    "/dashboard",
    "/dashboard/clients",
    "/dashboard/guards",
    "/dashboard/sites",
    "/dashboard/shifts",
    "/dashboard/assignments",
    "/dashboard/assignment-change-requests",
    "/dashboard/guard-offs",
    "/dashboard/attendance",
    "/dashboard/leaves",
    "/dashboard/incidents",
    "/dashboard/guard-portal",
    "/dashboard/reports",
  ],
  operations_manager: [
    "/dashboard",
    "/dashboard/clients",
    "/dashboard/guards",
    "/dashboard/sites",
    "/dashboard/shifts",
    "/dashboard/assignments",
    "/dashboard/assignment-change-requests",
    "/dashboard/guard-offs",
    "/dashboard/attendance",
    "/dashboard/leaves",
    "/dashboard/incidents",
    "/dashboard/guard-portal",
    "/dashboard/reports",
  ],
  hr: [
    "/dashboard",
    "/dashboard/clients",
    "/dashboard/guards",
    "/dashboard/sites",
    "/dashboard/shifts",
    "/dashboard/assignments",
    "/dashboard/attendance",
    "/dashboard/leaves",
    "/dashboard/incidents",
    "/dashboard/guard-portal",
    "/dashboard/reports",
  ],
  coordinator: [
    "/dashboard",
    "/dashboard/clients",
    "/dashboard/guards",
    "/dashboard/sites",
    "/dashboard/shifts",
    "/dashboard/assignments",
    "/dashboard/assignment-change-requests",
    "/dashboard/guard-offs",
    "/dashboard/attendance",
    "/dashboard/leaves",
    "/dashboard/incidents",
    "/dashboard/guard-portal",
    "/dashboard/reports",
  ],
}

// Role-based action permissions
export const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: {
    canAdd: true,
    canEdit: true,
    canDelete: true,
    canApproveLeaves: true,
    canAccessSystemUsers: true,
  },
  ceo: {
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canApproveLeaves: false,
    canAccessSystemUsers: false,
  },
  coceo: {
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canApproveLeaves: true,
    canAccessSystemUsers: false,
    approvalLevel: "final", // Co-CEO final approval
  },
  roster_manager: {
    canAdd: true,
    canEdit: true,
    canDelete: true,
    canApproveLeaves: false,
    canAccessSystemUsers: false,
  },
  operations_manager: {
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canApproveLeaves: true,
    canAccessSystemUsers: false,
    approvalLevel: "first", // Operations Manager first approval
  },
  hr: {
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canApproveLeaves: true,
    canAccessSystemUsers: false,
    approvalLevel: "second", // HR second approval
  },
  coordinator: {
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canApproveLeaves: false,
    canAccessSystemUsers: false,
  },
}

export function hasAccess(role: string, path: string): boolean {
  const allowedPaths = ROLE_ACCESS[role] || []
  return allowedPaths.some((p) => path === p || path.startsWith(p + "/"))
}

export type Site = {
  id: number
  name: string
  address: string
  client_name: string
  contact_phone: string
  is_active: boolean
  created_at: string
}

export type Guard = {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string | null
  title: string
  guard_title: string | null
  gender: string | null
  id_number: string | null
  status: "recruitment" | "training" | "probation" | "active" | "retired" | "quit" | "dismissed" | "deceased"
  employment_status: string | null
  hire_date: string
  date_joined: string | null
  education_level: string | null
  discipline: string | null
  languages_spoken: string[] | null
  special_skills: string[] | null
  maternity_status: string | null
  annual_leave_days: number
  leave_days_used: number
  created_at: string
  updated_at: string | null
}

export type Shift = {
  id: number
  name: string
  start_time: string
  end_time: string
  color: string
}

export type Assignment = {
  id: number
  guard_id: number
  site_id: number
  shift_id: number
  date: string
  status: "scheduled" | "completed" | "missed" | "relieved"
  reliever_id: number | null
  notes: string | null
  created_at: string
  // Joined fields
  guard_name?: string
  site_name?: string
  shift_name?: string
}

export type Attendance = {
  id: number
  assignment_id: number
  time_in: string | null
  time_out: string | null
  status: "present" | "absent" | "late"
  notes: string | null
  created_at: string
}

export type LeaveRequest = {
  id: number
  guard_id: number
  start_date: string
  end_date: string
  reason: string
  status: "pending" | "approved" | "rejected"
  reviewed_by: number | null
  reviewed_at: string | null
  created_at: string
  guard_name?: string
}

export type Session = {
  id: string
  user_id: number
  expires_at: string
  created_at: string
}
