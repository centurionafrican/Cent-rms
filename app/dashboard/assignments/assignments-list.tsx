"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, CalendarCheck, Search, Edit, Trash2, UserPlus, RefreshCw, AlertCircle, List, CalendarDays, ChevronLeft, ChevronRight, Check, X, Sun, Moon, Zap, Calendar } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Helper function to get next Thursday
function getNextThursday(): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7 // 4 = Thursday
  const nextThursday = new Date(today)
  nextThursday.setDate(today.getDate() + daysUntilThursday)
  return nextThursday.toISOString().split("T")[0]
}

interface Assignment {
  id: number
  guard_id: number
  site_id: number
  shift_id: number
  date: string
  status: string
  reliever_id: number | null
  notes: string | null
  position: string | null
  guard_name: string
  guard_phone: string
  site_name: string
  shift_name: string
  shift_start: string
  shift_end: string
  shift_color: string
  reliever_name: string | null
}

interface Guard {
  id: number
  first_name: string
  last_name: string
  title?: string
  gender?: string
  education_level?: string
  discipline?: string
  languages_spoken?: string[]
  status?: string
  guard_title?: string
}

interface Site {
  id: number
  name: string
  guards_needed?: number
}

interface Shift {
  id: number
  name: string
  start_time: string
  end_time: string
  color: string
  shift_type: "day" | "night"
}

// function to get week dates
function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = []
  const start = new Date(startDate)
  start.setDate(start.getDate() - start.getDay()) // Start from Sunday
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(date)
  }
  return dates
}

// Format date for display
function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0]
}

interface AssignmentsListProps {
  initialAssignments: Assignment[]
  guards: Guard[]
  sites: Site[]
  shifts: Shift[]
}

export function AssignmentsList({ initialAssignments, guards, sites, shifts }: AssignmentsListProps) {
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRelieverDialogOpen, setIsRelieverDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [filterFromDate, setFilterFromDate] = useState(new Date().toISOString().split("T")[0])
  const [filterToDate, setFilterToDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
  const [relieverId, setRelieverId] = useState("")
  const [bulkRelievingSiteId, setBulkRelievingSiteId] = useState("")
  const [bulkRelievingCount, setBulkRelievingCount] = useState("1")
  const [bulkRelievingGuards, setBulkRelievingGuards] = useState<Guard[]>([])
  
  // Bulk relief selection state
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>([])
  const [isBulkRelieveDialogOpen, setIsBulkRelieveDialogOpen] = useState(false)
  const [bulkRelieveGuardId, setBulkRelieveGuardId] = useState("")
  const [isBulkRelieving, setIsBulkRelieving] = useState(false)
  const [suggestedRelievers, setSuggestedRelievers] = useState<Guard[]>([])
  const [isLoadingSuggestedRelievers, setIsLoadingSuggestedRelievers] = useState(false)
  
  // Bulk status change state
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false)
  const [bulkStatusValue, setBulkStatusValue] = useState("")
  const [isBulkStatusChanging, setIsBulkStatusChanging] = useState(false)
  
  // Pending reliever assignments state
  const [pendingRelieversCount, setPendingRelieversCount] = useState(0)
  const [isPendingRelieversOpen, setIsPendingRelieversOpen] = useState(false)
  
  // Filter state for auto assignment
  const [filterJobTitle, setFilterJobTitle] = useState("")
  const [filterGender, setFilterGender] = useState("")
  const [filterEducationLevel, setFilterEducationLevel] = useState("")
  const [filterDisciplineRecord, setFilterDisciplineRecord] = useState("")
  const [filterLanguages, setFilterLanguages] = useState("")

  const [formData, setFormData] = useState({
    guard_id: "",
    site_id: "",
    shift_id: "",
    date: new Date().toISOString().split("T")[0],
    date_from: new Date().toISOString().split("T")[0],
    date_to: new Date().toISOString().split("T")[0],
    notes: "",
    position: "",
  })

  const [isRotationDialogOpen, setIsRotationDialogOpen] = useState(false)
  const [rotationDate, setRotationDate] = useState(getNextThursday())
  const [rotationLoading, setRotationLoading] = useState(false)

  // Bulk assignment state
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkData, setBulkData] = useState({
    site_id: "",
    shift_id: "",
    date_from: new Date().toISOString().split("T")[0],
    date_to: new Date().toISOString().split("T")[0],
    count: "",
    position: "",
  })
  const [bulkGuardFilters, setBulkGuardFilters] = useState({
    title: "",
    gender: "",
    level: "",
    discipline: "",
    language: "",
    specialSkills: "",
    maternalStatus: "",
  })
  const [bulkResult, setBulkResult] = useState<{ assigned: number; total: number } | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "week">("list")
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date()
    today.setDate(today.getDate() - today.getDay()) // Start from Sunday
    return today
  })
  const [weekAssignments, setWeekAssignments] = useState<Assignment[]>([])
  const [weekLoading, setWeekLoading] = useState(false)

  const weekDates = getWeekDates(weekStart)

  // Fetch assignments on mount and when view mode changes
  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch("/api/assignments")
        if (res.ok) {
          const data = await res.json()
          setAssignments(data.assignments || [])
        }
      } catch (error) {
        console.error("Failed to fetch assignments:", error)
      }
    }

    if (viewMode === "list") {
      fetchAssignments()
    }
  }, [viewMode])

  // Fetch assignments for the selected week
  useEffect(() => {
    async function fetchWeekAssignments() {
      setWeekLoading(true)
      try {
        const startDate = formatDateKey(weekDates[0])
        const endDate = formatDateKey(weekDates[6])
        const res = await fetch(`/api/assignments?from=${startDate}&to=${endDate}`)
        if (res.ok) {
          const data = await res.json()
          setWeekAssignments(data.assignments || [])
        }
      } catch (error) {
        console.error("Failed to fetch week assignments:", error)
      } finally {
        setWeekLoading(false)
      }
    }
    if (viewMode === "week") {
      fetchWeekAssignments()
    }
  }, [weekStart, viewMode])

  // Helper to normalize date to YYYY-MM-DD format in LOCAL timezone
  function normalizeDate(rawDate: string): string {
    if (!rawDate) return ""
    // Parse the date and get the local date representation
    const date = new Date(rawDate)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Group assignments by date and then by guard for weekly view
  const assignmentsByDateAndGuard = weekAssignments.reduce((acc, a) => {
    const dateKey = normalizeDate(a.date)
    if (!acc[dateKey]) acc[dateKey] = {}
    if (!acc[dateKey][a.guard_id]) acc[dateKey][a.guard_id] = []
    acc[dateKey][a.guard_id].push(a)
    return acc
  }, {} as Record<string, Record<number, Assignment[]>>)

  // Get unique guards from week assignments
  const assignedGuards = Array.from(new Set(weekAssignments.map(a => a.guard_id))).map(guardId => {
    const assignment = weekAssignments.find(a => a.guard_id === guardId)
    return { id: guardId, name: assignment?.guard_name || "Unknown" }
  })

  function goToPreviousWeek() {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() - 7)
    setWeekStart(newStart)
  }

  function goToNextWeek() {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() + 7)
    setWeekStart(newStart)
  }

  function goToCurrentWeek() {
    const today = new Date()
    today.setDate(today.getDate() - today.getDay())
    setWeekStart(today)
  }

  const filteredAssignments = assignments.filter((a) => {
    const q = search.toLowerCase().trim()
    const matchesSearch = !q || `${a.guard_name} ${a.site_name} ${a.shift_name} ${a.position ?? ""} ${a.status}`
      .toLowerCase()
      .includes(q)
    // When searching, skip date filter so all loaded records are reachable
    const matchesDateRange = q ? true : (a.date >= filterFromDate && a.date <= filterToDate)
    return matchesSearch && matchesDateRange
  })

  async function handleSubmit() {
    if (!formData.guard_id || !formData.site_id || !formData.shift_id || !formData.date_from) {
      return
    }

    setLoading(true)
    try {
      // Generate all dates in the range
      const dates: string[] = []
      const start = new Date(formData.date_from)
      const end = new Date(formData.date_to || formData.date_from)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0])
      }

      // Create assignment for each date
      for (const date of dates) {
        const res = await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, date }),
        })

        if (!res.ok) {
          console.error(`Failed to create assignment for ${date}`)
        }
      }

      setIsDialogOpen(false)
      resetForm()
      // Reload assignments
      const data = await fetch("/api/assignments").then(r => r.json())
      setAssignments(data.assignments || [])
      router.refresh()
    } catch (error) {
      console.error("Failed to create assignment:", error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      guard_id: "",
      site_id: "",
      shift_id: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    })
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this assignment?")) return

    try {
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" })
      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== id))
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to delete assignment:", error)
    }
  }

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        )
      }
    } catch (error) {
      console.error("Failed to update status:", error)
    }
  }

  async function handleAddReliever() {
    if (!selectedAssignment || !relieverId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/assignments/${selectedAssignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reliever_id: Number(relieverId) }),
      })
      if (res.ok) {
        const relieverGuard = guards.find((g) => g.id === Number(relieverId))
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === selectedAssignment.id
              ? { ...a, reliever_id: Number(relieverId), reliever_name: `${relieverGuard?.first_name} ${relieverGuard?.last_name}` }
              : a
          )
        )
        setIsRelieverDialogOpen(false)
        setRelieverId("")
        setSelectedAssignment(null)
      }
    } catch (error) {
      console.error("Failed to add reliever:", error)
      alert("Failed to add reliever. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkRelieve() {
    if (selectedAssignmentIds.length === 0 || !bulkRelieveGuardId) {
      alert("Please select at least one assignment and a reliever")
      return
    }

    setIsBulkRelieving(true)
    const relieverAssignments = []
    
    try {
      for (const assignmentId of selectedAssignmentIds) {
        // Update assignment with reliever
        const res = await fetch(`/api/assignments/${assignmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reliever_id: Number(bulkRelieveGuardId) }),
        })

        if (res.ok) {
          const relieverGuard = guards.find((g) => g.id === Number(bulkRelieveGuardId))
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === assignmentId
                ? { ...a, reliever_id: Number(bulkRelieveGuardId), reliever_name: `${relieverGuard?.first_name} ${relieverGuard?.last_name}` }
                : a
            )
          )
          
          // Create auto-assignment for the reliever
          try {
            const autoRes = await fetch("/api/assignments/create-from-relief", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                relievedAssignmentId: assignmentId,
                relieverId: Number(bulkRelieveGuardId),
              }),
            })
            
            if (autoRes.ok) {
              const autoAssignmentData = await autoRes.json()
              relieverAssignments.push(autoAssignmentData.assignment)
            }
          } catch (autoErr) {
            console.error("Failed to create auto-assignment:", autoErr)
          }
        }
      }

      // Show count of pending assignments
      setPendingRelieversCount(relieverAssignments.length)
      
      // Show notification
      alert(
        `Successfully assigned ${selectedAssignmentIds.length} relievers. ` +
        `${relieverAssignments.length} auto-assignment${relieverAssignments.length !== 1 ? "s" : ""} created.`
      )
      
      setIsBulkRelieveDialogOpen(false)
      setSelectedAssignmentIds([])
      setBulkRelieveGuardId("")
      
      // Show pending assignments confirmation if any
      if (relieverAssignments.length > 0) {
        setIsPendingRelieversOpen(true)
      }
    } catch (error) {
      console.error("Failed to bulk relieve:", error)
      alert("Failed to assign relievers. Please try again.")
    } finally {
      setIsBulkRelieving(false)
    }
  }

  async function loadSuggestedRelievers() {
    if (selectedAssignmentIds.length === 0) return
    
    setIsLoadingSuggestedRelievers(true)
    try {
      // Find available guards with no conflicts on those dates
      let availableGuards = guards.filter(g => {
        if (g.status === "dismissed" || g.status === "quit") return false
        
        // Check if guard is available for all selected assignments
        return selectedAssignmentIds.every(assignmentId => {
          const assignment = assignments.find(a => a.id === assignmentId)
          if (!assignment) return false
          
          // Check for conflicts on the same date
          const conflictingAssignment = assignments.find(a => 
            a.guard_id === g.id &&
            a.id !== assignmentId &&
            a.date === assignment.date
          )
          
          return !conflictingAssignment
        })
      })
      
      // Apply filters
      if (filterJobTitle) {
        availableGuards = availableGuards.filter(g => 
          g.title?.toLowerCase().includes(filterJobTitle.toLowerCase())
        )
      }
      if (filterGender) {
        availableGuards = availableGuards.filter(g => 
          g.gender?.toLowerCase() === filterGender.toLowerCase()
        )
      }
      if (filterEducationLevel) {
        availableGuards = availableGuards.filter(g => 
          g.education_level?.toLowerCase().includes(filterEducationLevel.toLowerCase())
        )
      }
      if (filterDisciplineRecord) {
        availableGuards = availableGuards.filter(g => 
          g.discipline?.toLowerCase().includes(filterDisciplineRecord.toLowerCase())
        )
      }
      if (filterLanguages) {
        availableGuards = availableGuards.filter(g => {
          const languages = Array.isArray(g.languages_spoken) ? g.languages_spoken : []
          return languages.some(lang => lang?.toLowerCase().includes(filterLanguages.toLowerCase()))
        })
      }
      
      setSuggestedRelievers(availableGuards.slice(0, 5))
      if (availableGuards.length > 0) {
        setBulkRelieveGuardId(String(availableGuards[0].id))
      }
    } catch (error) {
      console.error("Failed to load suggested relievers:", error)
    } finally {
      setIsLoadingSuggestedRelievers(false)
    }
  }

  function toggleAssignmentSelection(id: number) {
    setSelectedAssignmentIds((prev) =>
      prev.includes(id) ? prev.filter((aid) => aid !== id) : [...prev, id]
    )
  }

  function selectAllVisibleAssignments() {
    if (selectedAssignmentIds.length === filteredAssignments.length) {
      setSelectedAssignmentIds([])
    } else {
      setSelectedAssignmentIds(filteredAssignments.map((a) => a.id))
    }
  }

  async function handleBulkStatusChange() {
    if (selectedAssignmentIds.length === 0 || !bulkStatusValue) {
      alert("Please select at least one assignment and a status")
      return
    }

    setIsBulkStatusChanging(true)
    try {
      for (const assignmentId of selectedAssignmentIds) {
        await fetch(`/api/assignments/${assignmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: bulkStatusValue }),
        })
      }

      setAssignments((prev) =>
        prev.map((a) =>
          selectedAssignmentIds.includes(a.id) ? { ...a, status: bulkStatusValue } : a
        )
      )

      alert(`Successfully updated status for ${selectedAssignmentIds.length} assignments`)
      setIsBulkStatusDialogOpen(false)
      setSelectedAssignmentIds([])
      setBulkStatusValue("")
    } catch (error) {
      console.error("Failed to update status:", error)
      alert("Failed to update status. Please try again.")
    } finally {
      setIsBulkStatusChanging(false)
    }
  }

  async function handleBulkAssignRelievers() {
    if (!bulkRelievingSiteId || !bulkRelievingCount || bulkRelievingGuards.length === 0) {
      alert("Please select site and at least one guard")
      return
    }

    setLoading(true)
    try {
      const count = parseInt(bulkRelievingCount)
      let guardIndex = 0

      // Get assignments for this site that need relievers
      const unrelievedAssignments = assignments.filter(
        a => a.site_id === Number(bulkRelievingSiteId) && !a.reliever_id && a.status === "scheduled"
      )

      // Assign relievers in a round-robin fashion
      for (let i = 0; i < Math.min(count, unrelievedAssignments.length); i++) {
        const assignment = unrelievedAssignments[i]
        const relieverGuard = bulkRelievingGuards[guardIndex % bulkRelievingGuards.length]

        const res = await fetch(`/api/assignments/${assignment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reliever_id: relieverGuard.id }),
        })

        if (res.ok) {
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === assignment.id
                ? { ...a, reliever_id: relieverGuard.id, reliever_name: `${relieverGuard.first_name} ${relieverGuard.last_name}` }
                : a
            )
          )
        }
        guardIndex++
      }

      alert(`Successfully assigned ${Math.min(count, unrelievedAssignments.length)} relievers`)
      setIsRelieverDialogOpen(false)
      setBulkRelievingSiteId("")
      setBulkRelievingCount("1")
      setBulkRelievingGuards([])
    } catch (error) {
      console.error("Failed to bulk assign relievers:", error)
      alert("Failed to assign relievers. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleSiteSelectForReliever(siteId: string) {
    setBulkRelievingSiteId(siteId)
    // Get active guards
    setBulkRelievingGuards(guards.filter(g => g.status !== "inactive"))
  }

  async function handleRotation() {
    setRotationLoading(true)
    try {
      const res = await fetch("/api/assignments/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: rotationDate }),
      })

      if (res.ok) {
        const result = await res.json()
        alert(`Rotation completed! ${result.rotatedCount} assignments rotated for ${rotationDate}.`)
        setIsRotationDialogOpen(false)
        // Reload assignments
        const data = await fetch("/api/assignments").then(r => r.json())
        setAssignments(data.assignments || [])
        router.refresh()
      } else {
        const error = await res.json()
        alert(`Rotation failed: ${error.error}`)
      }
    } catch (error) {
      console.error("Failed to rotate shifts:", error)
      alert("Failed to rotate shifts. Please try again.")
    } finally {
      setRotationLoading(false)
    }
  }

  async function handleBulkAssign() {
    if (!bulkData.site_id || !bulkData.shift_id || !bulkData.date_from) return

    setBulkLoading(true)
    setBulkResult(null)
    try {
      const res = await fetch("/api/assignments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: Number(bulkData.site_id),
          shift_id: Number(bulkData.shift_id),
          date_from: bulkData.date_from,
          date_to: bulkData.date_to || bulkData.date_from,
          auto_assign: true,
          guards_needed: bulkData.count ? Number(bulkData.count) : undefined,
          position: bulkData.position || null,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        setBulkResult({ assigned: result.guards || 0, total: result.guards || 0 })
        alert(result.message || `Successfully created ${result.created} assignments`)
        // Reload assignments
        const data = await fetch("/api/assignments").then(r => r.json())
        setAssignments(data.assignments || [])
        router.refresh()
      } else {
        const error = await res.json()
        alert(`Bulk assign failed: ${error.error}`)
      }
    } catch (error) {
      console.error("Failed to bulk assign:", error)
      alert("Failed to bulk assign. Please try again.")
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guard, site, shift..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-background border border-input rounded-md px-3 py-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
              className="border-0 p-0 h-auto focus-visible:ring-0"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
              className="border-0 p-0 h-auto focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Thursday Rotation Button */}
          <AlertDialog open={isRotationDialogOpen} onOpenChange={setIsRotationDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100">
                <RefreshCw className="mr-2 h-4 w-4" />
                Rotation
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-amber-600" />
                  Thursday Shift Rotation
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <span className="block">This will rotate all assignments for the selected date:</span>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Guards on <strong className="text-foreground">Day Shift</strong> will be moved to <strong className="text-foreground">Night Shift</strong></li>
                      <li>Guards on <strong className="text-foreground">Night Shift</strong> will be moved to <strong className="text-foreground">Day Shift</strong></li>
                    </ul>
                    <div className="pt-2">
                      <Label className="text-foreground">Rotation Date</Label>
                      <Input
                        type="date"
                        value={rotationDate}
                        onChange={(e) => setRotationDate(e.target.value)}
                        className="mt-1"
                      />
                      <span className="text-xs text-muted-foreground mt-1 block">
                        Next Thursday: {getNextThursday()}
                      </span>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRotation}
                  disabled={rotationLoading}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {rotationLoading ? "Rotating..." : "Confirm Rotation"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Single Assignment Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Single Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] flex flex-col max-h-[90vh]">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Create Assignment
                </DialogTitle>
                <DialogDescription>
                  Assign a guard to a site and shift
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-1">
                <div className="grid gap-2">
                  <Label className="font-semibold">Select Guard *</Label>
                  <Select
                    value={formData.guard_id || ""}
                    onValueChange={(value) => {
                      const selectedGuard = guards.find(g => g.id === Number(value))
                      setFormData({ 
                        ...formData, 
                        guard_id: value 
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a guard from the list" />
                    </SelectTrigger>
                    <SelectContent>
                      {guards.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.first_name} {g.last_name} - {g.guard_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Job Title</Label>
                    <Input disabled value={formData.guard_id ? guards.find(g => g.id === Number(formData.guard_id))?.title || "" : ""} placeholder="Auto-filled" className="bg-muted/50" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Gender</Label>
                    <Input disabled value={formData.guard_id ? guards.find(g => g.id === Number(formData.guard_id))?.gender || "" : ""} placeholder="Auto-filled" className="bg-muted/50" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Education Level</Label>
                    <Input disabled value={formData.guard_id ? guards.find(g => g.id === Number(formData.guard_id))?.education_level || "" : ""} placeholder="Auto-filled" className="bg-muted/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Discipline Level</Label>
                    <Input disabled value={formData.guard_id ? guards.find(g => g.id === Number(formData.guard_id))?.discipline || "" : ""} placeholder="Auto-filled" className="bg-muted/50" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Languages Spoken</Label>
                    <Input disabled value={formData.guard_id ? (guards.find(g => g.id === Number(formData.guard_id))?.languages_spoken || []).join(", ") : ""} placeholder="Auto-filled" className="bg-muted/50" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Special Skills</Label>
                  <Input disabled value={formData.guard_id ? Array.isArray(guards.find(g => g.id === Number(formData.guard_id))?.special_skills) ? guards.find(g => g.id === Number(formData.guard_id))?.special_skills.join(", ") : guards.find(g => g.id === Number(formData.guard_id))?.special_skills || "" : ""} placeholder="Auto-filled" className="bg-muted/50" />
                </div>
                {formData.guard_id && guards.find(g => g.id === Number(formData.guard_id))?.gender?.toLowerCase() === "female" && (
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Maternal Status</Label>
                    <Input disabled value={guards.find(g => g.id === Number(formData.guard_id))?.maternity_status || ""} placeholder="Auto-filled" className="bg-muted/50" />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label className="font-semibold">Security Site Location *</Label>
                  <Select
                    value={formData.site_id || ""}
                    onValueChange={(value) => setFormData({ ...formData, site_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select the site for assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="font-semibold">Shift Schedule *</Label>
                  <Select
                    value={formData.shift_id || ""}
                    onValueChange={(value) => setFormData({ ...formData, shift_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select the work shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts.map((sh) => (
                        <SelectItem key={sh.id} value={String(sh.id)}>
                          {sh.name} ({sh.start_time} - {sh.end_time})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="font-semibold">Position at Site</Label>
                  <Select
                    value={formData.position || "none"}
                    onValueChange={(value) => setFormData({ ...formData, position: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="Gate">Gate</SelectItem>
                      <SelectItem value="Patrol">Patrol</SelectItem>
                      <SelectItem value="Control Room">Control Room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="font-semibold">Assignment Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-muted-foreground">Additional Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any special instructions or notes..."
                  />
                </div>
              </div>
              <DialogFooter className="flex-shrink-0 border-t pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !formData.guard_id || !formData.site_id || !formData.shift_id || !formData.date}
                >
                  {loading ? "Creating..." : "Create Assignment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Auto Assignment Dialog */}
          <Dialog open={isBulkDialogOpen} onOpenChange={(open) => {
            setIsBulkDialogOpen(open)
            if (!open) { setBulkResult(null) }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-primary/5 border-primary/30 text-primary hover:bg-primary/10">
                <Zap className="mr-2 h-4 w-4" />
                Auto Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] flex flex-col max-h-[90vh]">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Bulk Auto-Assignment
                </DialogTitle>
                <DialogDescription>
                  Automatically assign available guards to multiple sites and shifts.
                </DialogDescription>
              </DialogHeader>
              {bulkResult ? (
                <div className="py-4">
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {bulkResult}
                    </AlertDescription>
                  </Alert>
                  <Button onClick={() => setIsBulkDialogOpen(false)} className="w-full">
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-1">
                    <div className="grid gap-2">
                      <Label>Site *</Label>
                      <Select
                        value={bulkData.site_id || ""}
                        onValueChange={(v) => setBulkData({ ...bulkData, site_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Shift *</Label>
                      <Select
                        value={bulkData.shift_id || ""}
                        onValueChange={(v) => setBulkData({ ...bulkData, shift_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {shifts.map((sh) => (
                            <SelectItem key={sh.id} value={String(sh.id)}>
                              {sh.name} ({sh.start_time} - {sh.end_time})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>From Date *</Label>
                        <Input
                          type="date"
                          value={bulkData.date_from}
                          onChange={(e) => setBulkData({ ...bulkData, date_from: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>To Date</Label>
                        <Input
                          type="date"
                          value={bulkData.date_to}
                          onChange={(e) => setBulkData({ ...bulkData, date_to: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Leave same as From Date for single day</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Number of Guards *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={bulkData.count}
                        onChange={(e) => setBulkData({ ...bulkData, count: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Position at Site</Label>
                      <Select
                        value={bulkData.position || "none"}
                        onValueChange={(v) => setBulkData({ ...bulkData, position: v === "none" ? "" : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select position..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          <SelectItem value="Gate">Gate</SelectItem>
                          <SelectItem value="Patrol">Patrol</SelectItem>
                          <SelectItem value="Control Room">Control Room</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-sm mb-3">Filter Guards By:</h4>
                      <div className="grid grid-cols-2 gap-3">

                        {/* Guard Title */}
                        <div className="grid gap-2">
                          <Label className="text-sm">Guard Title</Label>
                          <Select value={bulkGuardFilters.title || "all"} onValueChange={(v) => setBulkGuardFilters({ ...bulkGuardFilters, title: v === "all" ? "" : v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="All titles" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All titles</SelectItem>
                              <SelectItem value="Coordinator">Coordinator</SelectItem>
                              <SelectItem value="Supervisor">Supervisor</SelectItem>
                              <SelectItem value="Team Leader">Team Leader</SelectItem>
                              <SelectItem value="Security Guard">Security Guard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Gender */}
                        <div className="grid gap-2">
                          <Label className="text-sm">Gender</Label>
                          <Select value={bulkGuardFilters.gender || "all"} onValueChange={(v) => setBulkGuardFilters({ ...bulkGuardFilters, gender: v === "all" ? "" : v, maternalStatus: "" })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="All genders" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All genders</SelectItem>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Education Level */}
                        <div className="grid gap-2">
                          <Label className="text-sm">Education Level</Label>
                          <Select value={bulkGuardFilters.level || "all"} onValueChange={(v) => setBulkGuardFilters({ ...bulkGuardFilters, level: v === "all" ? "" : v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="All levels" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All levels</SelectItem>
                              <SelectItem value="Master's Degree">Master's Degree</SelectItem>
                              <SelectItem value="Bachelor's Degree">Bachelor's Degree</SelectItem>
                              <SelectItem value="Advanced Level (A Level)">Advanced Level (A Level)</SelectItem>
                              <SelectItem value="Ordinary Level (O Level)">Ordinary Level (O Level)</SelectItem>
                              <SelectItem value="Primary Education">Primary Education</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Discipline Level */}
                        <div className="grid gap-2">
                          <Label className="text-sm">Discipline Level</Label>
                          <Select value={bulkGuardFilters.discipline || "all"} onValueChange={(v) => setBulkGuardFilters({ ...bulkGuardFilters, discipline: v === "all" ? "" : v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="All disciplines" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All disciplines</SelectItem>
                              <SelectItem value="Excellent">Excellent</SelectItem>
                              <SelectItem value="Very Good">Very Good</SelectItem>
                              <SelectItem value="Good">Good</SelectItem>
                              <SelectItem value="Needs Improvement">Needs Improvement</SelectItem>
                              <SelectItem value="Under Review">Under Review</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Languages Spoken */}
                        <div className="grid gap-2">
                          <Label className="text-sm">Languages Spoken</Label>
                          <Select value={bulkGuardFilters.language || "all"} onValueChange={(v) => setBulkGuardFilters({ ...bulkGuardFilters, language: v === "all" ? "" : v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="All languages" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All languages</SelectItem>
                              <SelectItem value="English">English</SelectItem>
                              <SelectItem value="French">French</SelectItem>
                              <SelectItem value="Kiswahili">Kiswahili</SelectItem>
                              <SelectItem value="Kinyarwanda">Kinyarwanda</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Special Skills */}
                        <div className="grid gap-2">
                          <Label className="text-sm">Special Skills</Label>
                          <Select value={bulkGuardFilters.specialSkills || "all"} onValueChange={(v) => setBulkGuardFilters({ ...bulkGuardFilters, specialSkills: v === "all" ? "" : v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="All skills" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All skills</SelectItem>
                              <SelectItem value="CPO (Close Protection Officer)">CPO (Close Protection Officer)</SelectItem>
                              <SelectItem value="Control Room Operations">Control Room Operations</SelectItem>
                              <SelectItem value="None">No Special Skills</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Maternity Status — only when Female is selected */}
                        {bulkGuardFilters.gender === "Female" && (
                          <div className="grid gap-2 col-span-2">
                            <Label className="text-sm">Maternity Status</Label>
                            <Select value={bulkGuardFilters.maternalStatus || "all"} onValueChange={(v) => setBulkGuardFilters({ ...bulkGuardFilters, maternalStatus: v === "all" ? "" : v })}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="Not Pregnant">Not Pregnant</SelectItem>
                                <SelectItem value="Pregnant">Pregnant</SelectItem>
                                <SelectItem value="On Maternity Leave">On Maternity Leave</SelectItem>
                                <SelectItem value="Returned from Maternity Leave">Returned from Maternity Leave</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex-shrink-0 border-t pt-4">
                    <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkAssign}
                      disabled={bulkLoading || !bulkData.site_id || !bulkData.shift_id || !bulkData.date_from || !bulkData.count}
                    >
                      {bulkLoading ? "Assigning..." : "Auto-Assign"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Bulk Reliever Assignment Dialog */}
        <Dialog open={isRelieverDialogOpen} onOpenChange={setIsRelieverDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Auto-Assign Relievers</DialogTitle>
              <DialogDescription>
                Bulk assign relievers to multiple assignments at once
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Select Site</Label>
                <Select value={bulkRelievingSiteId} onValueChange={handleSiteSelectForReliever}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {bulkRelievingSiteId && (
                <>
                  <div>
                    <Label>Active Guards Available</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {bulkRelievingGuards.length} active guards ready to be assigned as relievers
                    </div>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {bulkRelievingGuards.map((g) => (
                        <div key={g.id} className="text-sm p-2 bg-muted rounded">
                          {g.first_name} {g.last_name}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="count">Number of Assignments to Assign Relievers</Label>
                    <Input
                      id="count"
                      type="number"
                      min="1"
                      value={bulkRelievingCount}
                      onChange={(e) => setBulkRelievingCount(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRelieverDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkAssignRelievers}
                disabled={loading || !bulkRelievingSiteId || !bulkRelievingCount || bulkRelievingGuards.length === 0}
              >
                {loading ? "Assigning..." : "Auto-Assign Relievers"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Relief Selected Dialog */}
        <Dialog open={isBulkRelieveDialogOpen} onOpenChange={setIsBulkRelieveDialogOpen}>
          <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Assign Reliever to Selected</DialogTitle>
              <DialogDescription>
                Assign the same reliever to {selectedAssignmentIds.length} selected assignment{selectedAssignmentIds.length !== 1 ? "s" : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 flex-1 overflow-y-auto">
              {/* Filter Guards By Section */}
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <Label className="text-sm font-semibold">Filter Guards By</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Job Title</Label>
                    <Input
                      placeholder="Filter by title..."
                      value={filterJobTitle}
                      onChange={(e) => setFilterJobTitle(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Gender</Label>
                    <Select value={filterGender || "all"} onValueChange={(v) => setFilterGender(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Discipline Level</Label>
                    <Input
                      placeholder="Filter by level..."
                      value={filterEducationLevel}
                      onChange={(e) => setFilterEducationLevel(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Special Skills</Label>
                    <Input
                      placeholder="Filter by skills..."
                      value={filterDisciplineRecord}
                      onChange={(e) => setFilterDisciplineRecord(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Languages Spoken</Label>
                    <Input
                      placeholder="Filter by language..."
                      value={filterLanguages}
                      onChange={(e) => setFilterLanguages(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Selected Guard Details in Filter Section */}
                {bulkRelieveGuardId && suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId)) && (
                  <div className="border-t pt-4 mt-4 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground">Selected Guard Details</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Job Title</p>
                        <p className="text-xs bg-white p-2 rounded border">{suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.title || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Gender</p>
                        <p className="text-xs bg-white p-2 rounded border">{suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.gender || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Education Level</p>
                        <p className="text-xs bg-white p-2 rounded border">{suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.education_level || "N/A"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Discipline Level</p>
                        <p className="text-xs bg-white p-2 rounded border">{suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.discipline || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Languages Spoken</p>
                        <p className="text-xs bg-white p-2 rounded border overflow-hidden text-ellipsis">{Array.isArray(suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.languages_spoken) ? suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.languages_spoken.join(", ") : suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.languages_spoken || "N/A"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Special Skills</p>
                        <p className="text-xs bg-white p-2 rounded border">{Array.isArray(suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.special_skills) ? suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.special_skills.join(", ") : suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.special_skills || "Auto-filled"}</p>
                      </div>
                      {suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.gender?.toLowerCase() === "female" && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Maternal Status</p>
                          <p className="text-xs bg-white p-2 rounded border">{suggestedRelievers.find(g => g.id === Number(bulkRelieveGuardId))?.maternity_status || "N/A"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isLoadingSuggestedRelievers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : suggestedRelievers.length > 0 ? (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">Suggested Available Guards</Label>
                  <div className="space-y-2 mb-4">
                    {suggestedRelievers.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setBulkRelieveGuardId(String(g.id))}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          bulkRelieveGuardId === String(g.id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-sm">{g.first_name} {g.last_name}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <p className="text-xs text-muted-foreground"><span className="font-semibold">Discipline Level:</span> {g.discipline || "N/A"}</p>
                          <p className="text-xs text-muted-foreground"><span className="font-semibold">Education:</span> {g.education_level || "N/A"}</p>
                          <p className="text-xs text-muted-foreground"><span className="font-semibold">Special Skills:</span> {Array.isArray(g.special_skills) ? g.special_skills.join(", ") : g.special_skills || "N/A"}</p>
                          {g.gender?.toLowerCase() === "female" && (
                            <p className="text-xs text-muted-foreground"><span className="font-semibold">Maternal Status:</span> {g.maternity_status || "N/A"}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              
              <div>
                <Label>Or Select Another Guard</Label>
                <Select value={bulkRelieveGuardId} onValueChange={setBulkRelieveGuardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a guard" />
                  </SelectTrigger>
                  <SelectContent>
                    {guards.filter(g => g.status !== "dismissed" && g.status !== "quit").map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.first_name} {g.last_name} {g.status && `(${g.status})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 border-t pt-4">
              <Button variant="outline" onClick={() => setIsBulkRelieveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkRelieve}
                disabled={isBulkRelieving || !bulkRelieveGuardId}
              >
                {isBulkRelieving ? "Assigning..." : "Assign Reliever"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Status Change Dialog */}
        <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change Status for Selected</DialogTitle>
              <DialogDescription>
                Update the status for {selectedAssignmentIds.length} selected assignment{selectedAssignmentIds.length !== 1 ? "s" : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>New Status</Label>
                <Select value={bulkStatusValue} onValueChange={setBulkStatusValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkStatusChange}
                disabled={isBulkStatusChanging || !bulkStatusValue}
              >
                {isBulkStatusChanging ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Auto-Assignment Confirmation Dialog */}
        <Dialog open={isPendingRelieversOpen} onOpenChange={setIsPendingRelieversOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pending Reliever Assignments</DialogTitle>
              <DialogDescription>
                {pendingRelieversCount} reliever{pendingRelieversCount !== 1 ? "s" : ""} need{pendingRelieversCount === 1 ? "s" : ""} to be assigned. Review and confirm assignments below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Scroll down to review reliever assignments with the same site, shift, and date requirements from relieved guards.</p>
              {/* Pending assignments will be populated here */}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPendingRelieversOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsPendingRelieversOpen(false)}>
                Confirm & Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "week")} className="w-full">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                Assignments ({filteredAssignments.length})
              </CardTitle>
              <TabsList>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="week" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Weekly
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <TabsContent value="list" className="mt-0">
              {selectedAssignmentIds.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">{selectedAssignmentIds.length} assignment{selectedAssignmentIds.length !== 1 ? "s" : ""} selected</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => {
                      setIsBulkStatusDialogOpen(true)
                    }} className="bg-amber-600 hover:bg-amber-700">
                      Change Status
                    </Button>
                    <Button size="sm" onClick={() => {
                      setFilterJobTitle("")
                      setFilterGender("")
                      setFilterEducationLevel("")
                      setFilterDisciplineRecord("")
                      setFilterLanguages("")
                      loadSuggestedRelievers()
                      setIsBulkRelieveDialogOpen(true)
                    }} className="bg-blue-600 hover:bg-blue-700">
                      Assign Reliever to Selected
                    </Button>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedAssignmentIds.length > 0}
                        onCheckedChange={selectAllVisibleAssignments}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Guard</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="space-y-2">
                          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40" />
                          <p className="text-muted-foreground font-medium">No assignments found</p>
                          <p className="text-sm text-muted-foreground">Try adjusting your date range or search filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments.map((assignment) => (
                      <TableRow key={assignment.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="w-12">
                          <Checkbox 
                            checked={selectedAssignmentIds.includes(assignment.id)}
                            onCheckedChange={() => toggleAssignmentSelection(assignment.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Date(assignment.date).toLocaleDateString("en-US", { 
                            weekday: "short", 
                            month: "short", 
                            day: "numeric" 
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{assignment.guard_name}</p>
                            <p className="text-xs text-muted-foreground">{assignment.guard_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{assignment.site_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: assignment.shift_color }}
                            />
                            <span>{assignment.shift_name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({assignment.shift_start} - {assignment.shift_end})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.position
                            ? <Badge variant="outline" className="text-xs">{assignment.position}</Badge>
                            : <span className="text-muted-foreground text-xs">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Select
                            value={assignment.status}
                            onValueChange={(value) => updateStatus(assignment.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <Badge
                                variant={
                                  assignment.status === "completed"
                                    ? "default"
                                    : assignment.status === "scheduled"
                                    ? "secondary"
                                    : assignment.status === "missed"
                                    ? "destructive"
                                    : "outline"
                                }
                                className={
                                  assignment.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : ""
                                }
                              >
                                {assignment.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="missed">Missed</SelectItem>
                              <SelectItem value="relieved">Relieved</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 hover:text-blue-700 border-blue-200"
                                  onClick={() => {
                                    setSelectedAssignment(assignment)
                                    setIsRelieverDialogOpen(true)
                                  }}
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Set Reliever</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="week" className="mt-0">
              {/* Week Navigation */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <span className="font-medium">
                  {weekDates[0].toLocaleDateString("en-US", { month: "long", day: "numeric" })} - {weekDates[6].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* Weekly Roster Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background min-w-[150px]">Guard</TableHead>
                      {weekDates.map((date) => (
                        <TableHead key={formatDateKey(date)} className="min-w-[140px] text-center">
                          <div className={`${formatDateKey(date) === new Date().toISOString().split("T")[0] ? "text-primary font-bold" : ""}`}>
                            {formatShortDate(date)}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Loading week data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : assignedGuards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No assignments found for this week.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedGuards.map((guard) => (
                        <TableRow key={guard.id}>
                          <TableCell className="sticky left-0 bg-background font-medium">
                            {guard.name}
                          </TableCell>
                          {weekDates.map((date) => {
                            const dateKey = formatDateKey(date)
                            const dayAssignments = assignmentsByDateAndGuard[dateKey]?.[guard.id] || []
                            const isToday = dateKey === new Date().toISOString().split("T")[0]
                            return (
                              <TableCell key={dateKey} className={`p-2 text-center ${isToday ? "bg-primary/5" : ""}`}>
                                {dayAssignments.length === 0 ? (
                                  <div className="flex justify-center">
                                    <X className="h-5 w-5 text-muted-foreground/30" />
                                  </div>
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex flex-col items-center gap-1 cursor-pointer">
                                          {dayAssignments.map((a) => (
                                            <div key={a.id} className="flex items-center gap-1">
                                              <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: a.shift_color || "#22c55e" }}
                                              >
                                                {a.shift_name?.toLowerCase().includes("night") ? (
                                                  <Moon className="h-3 w-3 text-white" />
                                                ) : (
                                                  <Sun className="h-3 w-3 text-white" />
                                                )}
                                              </div>
                                              {a.status === "completed" && (
                                                <Check className="h-4 w-4 text-green-600" />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        {dayAssignments.map((a) => (
                                          <div key={a.id} className="text-xs space-y-1 p-1">
                                            <div className="font-semibold">{a.site_name}</div>
                                            <div>{a.shift_name}: {a.shift_start?.slice(0, 5)} - {a.shift_end?.slice(0, 5)}</div>
                                            <div className="capitalize">Status: {a.status}</div>
                                            {a.reliever_name && <div className="text-amber-500">Reliever: {a.reliever_name}</div>}
                                          </div>
                                        ))}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span className="font-medium">Shifts:</span>
                {shifts.map((shift) => (
                  <div key={shift.id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: shift.color || "#6b7280" }}
                    />
                    <span>{shift.name}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}
