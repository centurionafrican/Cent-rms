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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Users, Mail, Phone, Search, Edit, Trash2 } from "lucide-react"
import type { Guard } from "@/lib/db"

interface EmployeesListProps {
  initialGuards: Guard[]
}

export function EmployeesList({ initialGuards }: EmployeesListProps) {
  const router = useRouter()
  const [guards, setGuards] = useState<Guard[]>(initialGuards)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [formData, setFormData] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    title: "Security Guard",
    status: "active" as "active" | "inactive" | "on_leave",
    hire_date: new Date().toISOString().split("T")[0],
  })

  const filteredGuards = guards.filter((g) =>
    `${g.first_name} ${g.last_name} ${g.email} ${g.phone}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  async function handleSubmit() {
    if (!formData.first_name || !formData.last_name || !formData.phone) {
      return
    }

    setLoading(true)
    try {
      const url = editingGuard ? `/api/guards/${editingGuard.id}` : "/api/guards"
      const method = editingGuard ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const data = await res.json()
        if (editingGuard) {
          setGuards((prev) =>
            prev.map((g) => (g.id === editingGuard.id ? data.guard : g))
          )
        } else {
          setGuards((prev) => [...prev, data.guard])
        }
        setIsDialogOpen(false)
        resetForm()
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to save guard:", error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      employee_id: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address: "",
      title: "Security Guard",
      status: "active",
      hire_date: new Date().toISOString().split("T")[0],
    })
    setEditingGuard(null)
  }

  function openEditDialog(guard: Guard) {
    setEditingGuard(guard)
    setFormData({
      employee_id: guard.employee_id,
      first_name: guard.first_name,
      last_name: guard.last_name,
      email: guard.email || "",
      phone: guard.phone,
      address: guard.address || "",
      title: guard.title,
      status: guard.status,
      hire_date: guard.hire_date?.split("T")[0] || "",
    })
    setIsDialogOpen(true)
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this employee?")) return
    try {
      const res = await fetch(`/api/guards/${id}`, { method: "DELETE" })
      if (res.ok) {
        setGuards((prev) => prev.filter((g) => g.id !== id))
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s })
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to delete guard:", error)
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected employee(s)? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/guards/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setGuards((prev) => prev.filter((g) => !selectedIds.has(g.id)))
        setSelectedIds(new Set())
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to bulk delete guards:", error)
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredGuards.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredGuards.map((g) => g.id)))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {bulkDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
          <Button onClick={() => router.push("/dashboard/guards")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Guard
            </Button>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingGuard ? "Edit Employee" : "Add New Employee"}
              </DialogTitle>
              <DialogDescription>
                {editingGuard
                  ? "Update employee information."
                  : "Register a new security guard."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input
                    id="employee_id"
                    value={formData.employee_id}
                    onChange={(e) =>
                      setFormData({ ...formData, employee_id: e.target.value })
                    }
                    placeholder="e.g., EMP001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Title/Position</Label>
                  <Select
                    value={formData.title}
                    onValueChange={(value) =>
                      setFormData({ ...formData, title: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Security Guard">Security Guard</SelectItem>
                      <SelectItem value="Senior Guard">Senior Guard</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Team Lead">Team Lead</SelectItem>
                      <SelectItem value="Coordinator">Coordinator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Street address, city, and postal code"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive" | "on_leave") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) =>
                    setFormData({ ...formData, hire_date: e.target.value })
                  }
                />
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
                  !formData.first_name ||
                  !formData.last_name ||
                  !formData.phone
                }
              >
                {loading ? "Saving..." : editingGuard ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Employees ({filteredGuards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filteredGuards.length > 0 && selectedIds.size === filteredGuards.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuards.map((guard) => (
                  <TableRow key={guard.id} className={selectedIds.has(guard.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(guard.id)}
                        onCheckedChange={() => toggleSelect(guard.id)}
                        aria-label={`Select ${guard.first_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {guard.employee_id || "-"}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {guard.first_name} {guard.last_name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {guard.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {guard.email}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {guard.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{guard.guard_title || guard.title || "-"}</span>
                        {guard.guard_title && guard.title && guard.guard_title !== guard.title && (
                          <span className="text-xs text-muted-foreground">{guard.title}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {guard.hire_date
                        ? new Date(guard.hire_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          guard.status === "active"
                            ? "default"
                            : guard.status === "on_leave"
                            ? "secondary"
                            : "destructive"
                        }
                        className={
                          guard.status === "active"
                            ? "bg-green-100 text-green-700"
                            : ""
                        }
                      >
                        {guard.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(guard)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(guard.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
