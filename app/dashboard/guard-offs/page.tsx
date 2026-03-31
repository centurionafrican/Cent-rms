"use client"

import { useEffect, useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarOff, Plus, Trash2, Search, ChevronLeft, ChevronRight, Calendar } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface GuardOff {
  id: number
  guard_id: number
  guard_name: string
  date: string
  reason: string
  notes: string | null
  created_at: string
}

interface Guard {
  id: number
  first_name: string
  last_name: string
  status: string
}

const REASONS = ["Day Off", "Rest Day", "Weekend Off", "Public Holiday", "Other"]

const REASON_COLORS: Record<string, string> = {
  "Day Off":        "bg-blue-50 text-blue-700 border-blue-200",
  "Rest Day":       "bg-purple-50 text-purple-700 border-purple-200",
  "Weekend Off":    "bg-teal-50 text-teal-700 border-teal-200",
  "Public Holiday": "bg-amber-50 text-amber-700 border-amber-200",
  "Other":          "bg-gray-50 text-gray-600 border-gray-200",
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function GuardOffsPage() {
  const [currentUser, setCurrentUser]     = useState<{ role: string } | null>(null)
  const [guards, setGuards]               = useState<Guard[]>([])
  const [filterGuardId, setFilterGuardId] = useState("")
  const [search, setSearch]               = useState("")
  const [viewMode, setViewMode]           = useState<"list" | "calendar">("list")
  const [calYear, setCalYear]             = useState(new Date().getFullYear())
  const [calMonth, setCalMonth]           = useState(new Date().getMonth())

  // Form
  const [isOpen, setIsOpen]           = useState(false)
  const [formGuardId, setFormGuardId] = useState("")
  const [formDates, setFormDates]     = useState<string[]>([])
  const [formDate, setFormDate]       = useState("")
  const [formReason, setFormReason]   = useState("Day Off")
  const [formNotes, setFormNotes]     = useState("")
  const [submitting, setSubmitting]   = useState(false)
  const [deleteId, setDeleteId]       = useState<number | null>(null)

  const guardParam = filterGuardId ? `&guard_id=${filterGuardId}` : ""
  const { data: offs = [], isLoading } = useSWR<GuardOff[]>(
    `/api/guard-offs?limit=500${guardParam}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setCurrentUser).catch(() => {})
    fetch("/api/guards?limit=500").then((r) => r.json()).then((d) => {
      const g = Array.isArray(d) ? d : d.guards ?? []
      setGuards(g.filter((x: Guard) => x.status === "active"))
    }).catch(() => {})
  }, [])

  const canManage = currentUser === null || ["roster_manager", "admin"].includes(currentUser.role)

  const filtered = offs.filter((o) => {
    if (search && !o.guard_name.toLowerCase().includes(search.toLowerCase()) && !o.reason.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Calendar helpers
  const calDays = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const monthOffsMap: Record<string, GuardOff[]> = {}
  offs.forEach((o) => {
    const d = o.date.split("T")[0]
    if (!monthOffsMap[d]) monthOffsMap[d] = []
    monthOffsMap[d].push(o)
  })

  function addDate() {
    if (!formDate || formDates.includes(formDate)) return
    setFormDates((prev) => [...prev, formDate].sort())
    setFormDate("")
  }

  async function submit() {
    if (!formGuardId || formDates.length === 0 || !formReason) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/guard-offs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guard_id: Number(formGuardId), dates: formDates, reason: formReason, notes: formNotes.trim() || undefined }),
      })
      if (res.ok) {
        setIsOpen(false)
        setFormGuardId("")
        setFormDates([])
        setFormDate("")
        setFormReason("Day Off")
        setFormNotes("")
        mutate(`/api/guard-offs?limit=500${guardParam}`)
      } else {
        const d = await res.json()
        alert(d.error || "Failed")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteOff() {
    if (!deleteId) return
    await fetch(`/api/guard-offs?id=${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    mutate(`/api/guard-offs?limit=500${guardParam}`)
  }

  const monthName = new Date(calYear, calMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guard Off Days</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Plan and manage off days, rest days, and public holidays for guards</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <button className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setViewMode("list")}>
              <CalendarOff className="h-3.5 w-3.5" />List
            </button>
            <button className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setViewMode("calendar")}>
              <Calendar className="h-3.5 w-3.5" />Calendar
            </button>
          </div>
          {canManage && (
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Plan Off Day
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search guard, reason..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterGuardId || "all"} onValueChange={(v) => setFilterGuardId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="All guards" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All guards</SelectItem>
            {guards.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>{g.first_name} {g.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} off day{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {viewMode === "calendar" ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{monthName}</CardTitle>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1)
                }}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1)
                }}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="bg-muted text-center text-xs font-medium py-2 text-muted-foreground">{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-background min-h-[80px]" />
              ))}
              {Array.from({ length: calDays }).map((_, i) => {
                const day = i + 1
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const dayOffs = monthOffsMap[dateStr] ?? []
                const isToday = dateStr === new Date().toISOString().split("T")[0]
                return (
                  <div key={day} className={`bg-background min-h-[80px] p-1.5 ${isToday ? "ring-2 ring-inset ring-primary" : ""}`}>
                    <p className={`text-xs font-medium mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</p>
                    {dayOffs.slice(0, 3).map((o) => (
                      <div key={o.id} className="text-[10px] rounded px-1 py-0.5 mb-0.5 truncate bg-primary/10 text-primary" title={`${o.guard_name} — ${o.reason}`}>
                        {o.guard_name.split(" ")[0]}
                      </div>
                    ))}
                    {dayOffs.length > 3 && <p className="text-[10px] text-muted-foreground">+{dayOffs.length - 3} more</p>}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                <CalendarOff className="h-8 w-8 opacity-30" />No off days found
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Guard</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Notes</TableHead>
                      {canManage && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((off, idx) => {
                      const d = new Date(off.date)
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6
                      return (
                        <TableRow key={off.id}>
                          <TableCell className="text-muted-foreground text-xs font-mono">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{off.guard_name}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium ${isWeekend ? "text-primary" : "text-muted-foreground"}`}>
                              {d.toLocaleDateString("en-US", { weekday: "long" })}
                              {isWeekend && " (Weekend)"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={REASON_COLORS[off.reason] ?? ""}>{off.reason}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{off.notes ?? "—"}</TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(off.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan Off Day Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Plan Off Day(s)</DialogTitle>
            <DialogDescription>Schedule one or more off days for a guard. The guard will be notified by email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Guard <span className="text-red-500">*</span></Label>
              <Select value={formGuardId} onValueChange={setFormGuardId}>
                <SelectTrigger><SelectValue placeholder="Select guard..." /></SelectTrigger>
                <SelectContent>
                  {guards.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.first_name} {g.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Off Day Type <span className="text-red-500">*</span></Label>
              <Select value={formReason} onValueChange={setFormReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Add Date(s)</Label>
              <div className="flex gap-2">
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="flex-1" />
                <Button type="button" variant="outline" onClick={addDate} disabled={!formDate}>Add</Button>
              </div>
              {formDates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formDates.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                      {new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      <button type="button" onClick={() => setFormDates((prev) => prev.filter((x) => x !== d))} className="hover:text-destructive">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea placeholder="Any additional notes..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!formGuardId || formDates.length === 0 || submitting}>
              {submitting ? "Saving..." : `Plan ${formDates.length || ""} Off Day${formDates.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Off Day?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the scheduled off day. The guard will not be automatically notified of this removal.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={deleteOff}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
