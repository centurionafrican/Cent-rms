import { ROLE_PERMISSIONS } from "@/lib/db"

export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] as Record<string, boolean> | undefined
  if (!perms) return false
  return perms[permission] ?? false
}

export function canAdd(role: string): boolean {
  return hasPermission(role, "canAdd")
}

export function canEdit(role: string): boolean {
  return hasPermission(role, "canEdit")
}

export function canDelete(role: string): boolean {
  return hasPermission(role, "canDelete")
}

export function canApproveLeaves(role: string): boolean {
  return hasPermission(role, "canApproveLeaves")
}

export function canAccessSystemUsers(role: string): boolean {
  return hasPermission(role, "canAccessSystemUsers")
}
