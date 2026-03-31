"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Clock, Edit, Trash2 } from "lucide-react"
import type { Shift } from "@/lib/db"

interface ShiftsListProps {
  initialShifts: Shift[]
}

export function ShiftsList({ initialShifts }: ShiftsListProps) {
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>(initialShifts)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    start_time: "08:00",
    end_time: "16:00",
    color: "#8b5cf6",
  })

  async function handleSubmit() {
    if (!formData.name || !formData.start_time || !formData.end_time) {
      return
    }

    setLoading(true)
    try {
      const url = editingShift ? `/api/shifts/${editingShift.id}` : "/api/shifts"
      const method = editingShift ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const data = await res.json()
        if (editingShift) {
          setShifts((prev) =>
            prev.map((s) => (s.id === editingShift.id ? data.shift : s))
          )
        } else {
          setShifts((prev) => [...prev, data.shift])
        }
        setIsDialogOpen(false)
        resetForm()
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to save shift:", error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      start_time: "08:00",
      end_time: "16:00",
      color: "#8b5cf6",
    })
    setEditingShift(null)
  }

  function openEditDialog(shift: Shift) {
    setEditingShift(shift)
    setFormData({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      color: shift.color,
    })
    setIsDialogOpen(true)
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this shift?")) return
    try {
      const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" })
      if (res.ok) {
        setShifts((prev) => prev.filter((s) => s.id !== id))
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s })
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to delete shift:", error)
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected shift(s)? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/shifts/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setShifts((prev) => prev.filter((s) => !selectedIds.has(s.id)))
        setSelectedIds(new Set())
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to bulk delete shifts:", error)
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function toggleSelectAll() {
    if (selectedIds.size === shifts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(shifts.map((s) => s.id)))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
            <Trash2 className="h-4 w-4 mr-1" />
            {bulkDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
          </Button>
        )}
        <div className="ml-auto">
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {editingShift ? "Edit Shift" : "Add New Shift"}
              </DialogTitle>
              <DialogDescription>
                {editingShift
                  ? "Update shift details."
                  : "Create a new shift schedule."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Shift Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Day Shift, Night Shift"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !formData.name ||
                  !formData.start_time ||
                  !formData.end_time
                }
              >
                {loading ? "Saving..." : editingShift ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Schedules ({shifts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={shifts.length > 0 && selectedIds.size === shifts.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Shift Name</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No shifts created yet.
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift) => {
                  const start = new Date(`2000-01-01T${shift.start_time}`)
                  const end = new Date(`2000-01-01T${shift.end_time}`)
                  let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                  if (hours < 0) hours += 24
                  return (
                    <TableRow key={shift.id} className={selectedIds.has(shift.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(shift.id)}
                          onCheckedChange={() => toggleSelect(shift.id)}
                          aria-label={`Select ${shift.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: shift.color }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{shift.name}</TableCell>
                      <TableCell>{shift.start_time}</TableCell>
                      <TableCell>{shift.end_time}</TableCell>
                      <TableCell>{hours} hours</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(shift)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(shift.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
