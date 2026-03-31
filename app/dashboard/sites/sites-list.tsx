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
import { Plus, MapPin, Phone, Search, Edit, Trash2 } from "lucide-react"
import type { Site } from "@/lib/db"

interface SitesListProps {
  initialSites: Site[]
}

export function SitesList({ initialSites }: SitesListProps) {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>(initialSites)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    client_name: "",
    contact_phone: "",
    is_active: true,
  })

  const filteredSites = sites.filter((s) =>
    `${s.name} ${s.address} ${s.client_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  async function handleSubmit() {
    if (!formData.name || !formData.address || !formData.client_name) {
      return
    }

    setLoading(true)
    try {
      const url = editingSite ? `/api/sites/${editingSite.id}` : "/api/sites"
      const method = editingSite ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const data = await res.json()
        if (editingSite) {
          setSites((prev) =>
            prev.map((s) => (s.id === editingSite.id ? data.site : s))
          )
        } else {
          setSites((prev) => [...prev, data.site])
        }
        setIsDialogOpen(false)
        resetForm()
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to save site:", error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      address: "",
      client_name: "",
      contact_phone: "",
      is_active: true,
    })
    setEditingSite(null)
  }

  function openEditDialog(site: Site) {
    setEditingSite(site)
    setFormData({
      name: site.name,
      address: site.address,
      client_name: site.client_name,
      contact_phone: site.contact_phone || "",
      is_active: site.is_active,
    })
    setIsDialogOpen(true)
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this site?")) return
    try {
      const res = await fetch(`/api/sites/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSites((prev) => prev.filter((s) => s.id !== id))
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s })
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to delete site:", error)
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected site(s)? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/sites/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setSites((prev) => prev.filter((s) => !selectedIds.has(s.id)))
        setSelectedIds(new Set())
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to bulk delete sites:", error)
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredSites.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredSites.map((s) => s.id)))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
              <Trash2 className="h-4 w-4 mr-1" />
              {bulkDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Site
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingSite ? "Edit Site" : "Add New Site"}
              </DialogTitle>
              <DialogDescription>
                {editingSite
                  ? "Update site information."
                  : "Register a new security location."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Site Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Main Office Building"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Full address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) =>
                      setFormData({ ...formData, client_name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="is_active">Status</Label>
                <Select
                  value={formData.is_active ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value === "active" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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
                  !formData.address ||
                  !formData.client_name
                }
              >
                {loading ? "Saving..." : editingSite ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            All Sites ({filteredSites.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filteredSites.length > 0 && selectedIds.size === filteredSites.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Site Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No sites found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSites.map((site) => (
                  <TableRow key={site.id} className={selectedIds.has(site.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(site.id)}
                        onCheckedChange={() => toggleSelect(site.id)}
                        aria-label={`Select ${site.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {site.address}
                    </TableCell>
                    <TableCell>{site.client_name}</TableCell>
                    <TableCell>
                      {site.contact_phone ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {site.contact_phone}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={site.is_active ? "default" : "secondary"}
                        className={
                          site.is_active ? "bg-green-100 text-green-700" : ""
                        }
                      >
                        {site.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(site)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(site.id)}
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
