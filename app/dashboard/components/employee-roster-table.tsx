"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Users } from "lucide-react"
import Link from "next/link"

type Guard = Record<string, unknown>

const INITIAL_ROWS = 5

export function EmployeeRosterTable({ guards }: { guards: Guard[] }) {
  const [expanded, setExpanded] = useState(false)

  const visible = expanded ? guards : guards.slice(0, INITIAL_ROWS)
  const hiddenCount = guards.length - INITIAL_ROWS

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead>Time In</TableHead>
            <TableHead>Time Out</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                  <span>No employees found. Add your first employee to get started.</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            visible.map((guard, index) => (
              <TableRow key={guard.id as number} className="hover:bg-muted/40 transition-colors">
                <TableCell className="text-muted-foreground text-sm w-8">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">
                    {guard.first_name as string} {guard.last_name as string}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground">
                    {(guard.guard_title as string) || (guard.title as string) || "Security Guard"}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {(guard.phone as string) || "—"}
                </TableCell>
                <TableCell>
                  {guard.shift_name ? (
                    <Badge variant="outline" className="text-xs">{guard.shift_name as string}</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                      Unassigned
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {guard.time_in
                    ? new Date(guard.time_in as string).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm">
                  {guard.time_out
                    ? new Date(guard.time_out as string).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      guard.attendance_status === "present"
                        ? "bg-green-100 text-green-700"
                        : guard.attendance_status === "absent"
                        ? "bg-red-100 text-red-700"
                        : guard.attendance_status === "late"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    }
                    variant="secondary"
                  >
                    {(guard.attendance_status as string) || (guard.status as string) || "active"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Footer: Show More / Show Less + View All */}
      {guards.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t mt-2">
          <div>
            {guards.length > INITIAL_ROWS && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-1"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show {hiddenCount} more guard{hiddenCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}
          </div>
          <Link href="/dashboard/guards">
            <Button variant="outline" size="sm" className="gap-1">
              <Users className="h-4 w-4" />
              View All Guards
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
