"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, MapPin, Eye, Users, ChevronRight, Download } from "lucide-react"

const SITE_STATUS_OPTIONS = [
  { value: "on_survey", label: "On Survey", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "inactive", label: "Inactive", color: "bg-gray-100 text-gray-600 border-gray-200" },
]

type Client = { id: number; name: string }

type Site = {
  id: number
  name: string
  address: string | null
  contact_person: string | null
  contact_phone: string | null
  is_active: boolean
  client_id: number | null
  client_name: string | null
  site_status: string
  guards_needed: number
  created_at: string
}

type SiteGuard = {
  guard_id: number
  guard_name: string
  phone: string
  status: string
  date_from: string
  date_to: string
  shift_name: string
  days_assigned: number
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [siteGuards, setSiteGuards] = useState<SiteGuard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false)
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [showAllSites, setShowAllSites] = useState(false)
  const [loadingGuards, setLoadingGuards] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [formData, setFormData] = useState({
    name: "", address: "", contact_person: "", contact_phone: "",
    client_id: "", site_status: "active", guards_needed: "1",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSites(); fetchClients() }, [])

  async function fetchSites() {
    try {
      const res = await fetch("/api/sites")
      const data = await res.json()
      setSites(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients")
      if (res.ok) { const data = await res.json(); setClients(data.clients || []) }
    } catch (e) { console.error(e) }
  }

  async function fetchSiteGuards(siteId: number) {
    setLoadingGuards(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/guards`)
      if (res.ok) {
        const data = await res.json()
        setSiteGuards(data.guards || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoadingGuards(false) }
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const res = await fetch("/api/sites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData, client_id: formData.client_id ? Number(formData.client_id) : null,
          guards_needed: Number(formData.guards_needed) || 1, is_active: formData.site_status !== "inactive",
        }),
      })
      if (res.ok) { setIsCreateOpen(false); resetForm(); fetchSites() }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function handleUpdate() {
    if (!selectedSite) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sites/${selectedSite.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData, client_id: formData.client_id ? Number(formData.client_id) : null,
          guards_needed: Number(formData.guards_needed) || 1, is_active: formData.site_status !== "inactive",
        }),
      })
      if (res.ok) { setIsEditOpen(false); setSelectedSite(null); resetForm(); fetchSites() }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!selectedSite) return
    try {
      const res = await fetch(`/api/sites/${selectedSite.id}`, { method: "DELETE" })
      if (res.ok) { setIsDeleteOpen(false); setSelectedSite(null); fetchSites() }
    } catch (e) { console.error(e) }
  }

  function resetForm() {
    setFormData({ name: "", address: "", contact_person: "", contact_phone: "", client_id: "", site_status: "active", guards_needed: "1" })
  }

  function openEdit(site: Site) {
    setSelectedSite(site)
    setFormData({
      name: site.name, address: site.address || "", contact_person: site.contact_person || "",
      contact_phone: site.contact_phone || "", client_id: site.client_id ? String(site.client_id) : "",
      site_status: site.site_status || "active", guards_needed: String(site.guards_needed || 1),
    })
    setIsEditOpen(true)
  }

  function openDrillDown(site: Site) {
    setSelectedSite(site)
    fetchSiteGuards(site.id)
    setIsDrillDownOpen(true)
  }

  async function downloadExcel() {
    if (!selectedSite) return
    setIsExporting(true)
    try {
      const response = await fetch(`/api/sites/${selectedSite.id}/export-guards`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${selectedSite.name}_guards_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error("Export failed:", e)
    } finally {
      setIsExporting(false)
    }
  }

  const filtered = sites.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === "all" || s.site_status === statusFilter
    return matchSearch && matchStatus
  })

  const displayedSites = showAllSites ? filtered : filtered.slice(0, 5)

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Site Name *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Client</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Contact Person</Label>
          <Input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Contact Phone</Label>
          <Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Site Status</Label>
          <Select value={formData.site_status} onValueChange={(v) => setFormData({ ...formData, site_status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SITE_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Guards Needed</Label>
          <Input type="number" min="1" value={formData.guards_needed} onChange={(e) => setFormData({ ...formData, guards_needed: e.target.value })} />
        </div>
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sites</h1>
          <p className="text-muted-foreground">Manage security locations and client sites</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Site</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sites</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{sites.length}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{sites.filter((s) => s.site_status === "active").length}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Survey</CardTitle>
            <Eye className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{sites.filter((s) => s.site_status === "on_survey").length}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Guards Needed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{sites.filter((s) => s.site_status === "active").reduce((sum, s) => sum + (s.guards_needed || 1), 0)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Sites</CardTitle><CardDescription>Security locations linked to clients</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search sites or clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {SITE_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Guards Needed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSites.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">No sites found.</TableCell></TableRow>
                ) : displayedSites.map((site) => {
                  const statusOpt = SITE_STATUS_OPTIONS.find((s) => s.value === site.site_status)
                  return (
                    <TableRow key={site.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDrillDown(site)}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.client_name || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{site.address || "-"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {site.contact_person && <div>{site.contact_person}</div>}
                          {site.contact_phone && <div className="text-muted-foreground">{site.contact_phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusOpt?.color || ""}>{statusOpt?.label || site.site_status}</Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline">{site.guards_needed || 1}</Badge></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(site)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedSite(site); setIsDeleteOpen(true) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 5 && !showAllSites && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => setShowAllSites(true)}>
              View More ({filtered.length - 5} more)
            </Button>
          )}
          {showAllSites && filtered.length > 5 && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => setShowAllSites(false)}>
              Show Less
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Site Drill-Down Modal */}
      <Dialog open={isDrillDownOpen} onOpenChange={setIsDrillDownOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedSite?.name}</DialogTitle>
            <DialogDescription>
              Complete site details and guard assignments
            </DialogDescription>
          </DialogHeader>
          
          {selectedSite && (
            <div className="space-y-6">
              {/* Site Details Card */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Client</p>
                    <p className="text-sm font-medium">{selectedSite.client_name || "Not assigned"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <Badge className={SITE_STATUS_OPTIONS.find((s) => s.value === selectedSite.site_status)?.color}>
                      {SITE_STATUS_OPTIONS.find((s) => s.value === selectedSite.site_status)?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Guards Needed per Shift</p>
                    <p className="text-sm font-medium">{selectedSite.guards_needed}</p>
                  </div>
                </div>
                
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">{selectedSite.address || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Contact Person</p>
                    <p className="text-sm font-medium">{selectedSite.contact_person || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Contact Phone</p>
                    <p className="text-sm font-medium font-mono">{selectedSite.contact_phone || "Not provided"}</p>
                  </div>
                </div>
              </div>

              {/* Guard Assignments Section */}
              <div className="border-t pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Current Assignments</h3>
                  <p className="text-sm text-muted-foreground">{siteGuards.length} guard{siteGuards.length !== 1 ? "s" : ""} assigned</p>
                </div>
                
                {loadingGuards ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : siteGuards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No guards currently assigned to this site.</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Guard Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Assignment Period</TableHead>
                          <TableHead>Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {siteGuards.map((guard, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{guard.guard_name}</TableCell>
                            <TableCell className="font-mono text-sm">{guard.phone}</TableCell>
                            <TableCell><Badge>{guard.status}</Badge></TableCell>
                            <TableCell>{guard.shift_name}</TableCell>
                            <TableCell className="text-sm">
                              {new Date(guard.date_from).toLocaleDateString()} to {new Date(guard.date_to).toLocaleDateString()}
                            </TableCell>
                            <TableCell><Badge variant="outline">{guard.days_assigned} days</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDrillDownOpen(false)}>Close</Button>
            {siteGuards.length > 0 && (
              <Button onClick={downloadExcel} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export to Excel"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add New Site</DialogTitle><DialogDescription>Create a new security site and link it to a client.</DialogDescription></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !formData.name}>{saving ? "Creating..." : "Create Site"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Site</DialogTitle><DialogDescription>Update site details.</DialogDescription></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{selectedSite?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
