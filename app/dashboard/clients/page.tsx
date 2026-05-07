"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, Edit, Trash2, Building2, MapPin, Download, Users, Mail, Phone, ChevronRight } from "lucide-react"
import { authenticatedFetch } from "@/lib/client-fetch"

interface Site {
  id: number
  name: string
  address: string | null
  guards_needed: number
  site_status: string
  contact_person: string | null
  contact_phone: string | null
}

interface Client {
  id: number
  name: string
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  city: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  site_count?: number
  total_guards_needed?: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [viewingClient, setViewingClient] = useState<Client | null>(null)
  const [clientSites, setClientSites] = useState<Site[]>([])
  const [loadingSites, setLoadingSites] = useState(false)
  const [exportingReport, setExportingReport] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: "", contact_person: "", contact_email: "", contact_phone: "", address: "", city: "", notes: "",
  })

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    try {
      const res = await authenticatedFetch("/api/clients")
      if (res.ok) { const data = await res.json(); setClients(data.clients || []) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function openClientDetail(client: Client) {
    setViewingClient(client)
    setLoadingSites(true)
    try {
      const res = await authenticatedFetch(`/api/clients/${client.id}/sites`)
      if (res.ok) { const data = await res.json(); setClientSites(data.sites || []) }
    } catch (e) { console.error(e) } finally { setLoadingSites(false) }
  }

  async function downloadReport() {
    setExportingReport(true)
    try {
      const res = await authenticatedFetch("/api/reports/clients")
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `clients-report-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (e) { console.error(e) } finally { setExportingReport(false) }
  }

  function resetForm() {
    setFormData({ name: "", contact_person: "", contact_email: "", contact_phone: "", address: "", city: "", notes: "" })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await authenticatedFetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) })
      if (res.ok) { setShowCreate(false); resetForm(); fetchClients() }
    } catch (e) { console.error(e) }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingClient) return
    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) })
      if (res.ok) { setEditingClient(null); resetForm(); fetchClients() }
    } catch (e) { console.error(e) }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this client?")) return
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })
      if (res.ok) { setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s }); fetchClients() }
    } catch (e) { console.error(e) }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected client(s)? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/clients/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) { setSelectedIds(new Set()); fetchClients() }
    } catch (e) { console.error(e) } finally { setBulkDeleting(false) }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) { setSelectedIds(new Set()) }
    else { setSelectedIds(new Set(filtered.map((c) => c.id))) }
  }

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  )

  const totalSites = clients.reduce((sum, c) => sum + (Number(c.site_count) || 0), 0)
  const totalGuardsNeeded = clients.reduce((sum, c) => sum + (Number(c.total_guards_needed) || 0), 0)

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage your client companies</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              {bulkDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
            </Button>
          )}
          <Button variant="outline" onClick={downloadReport} disabled={exportingReport}>
            <Download className="h-4 w-4 mr-2" />
            {exportingReport ? "Exporting..." : "Export Report"}
          </Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add Client</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{clients.length}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{clients.filter((c) => c.is_active).length}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sites</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{totalSites}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Guards Needed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">{totalGuardsNeeded}</div></CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>#</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Sites</TableHead>
                <TableHead>Guards Needed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No clients found.</TableCell></TableRow>
              ) : filtered.map((client, idx) => (
                <TableRow
                  key={client.id}
                  className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(client.id) ? "bg-muted/50" : ""}`}
                  onClick={() => openClientDetail(client)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(client.id)}
                      onCheckedChange={() => toggleSelect(client.id)}
                      aria-label={`Select ${client.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                  <TableCell className="font-medium flex items-center gap-1">
                    {client.name}
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </TableCell>
                  <TableCell>{client.contact_person || "-"}</TableCell>
                  <TableCell>{client.contact_phone || "-"}</TableCell>
                  <TableCell>{client.city || "-"}</TableCell>
                  <TableCell><Badge variant="outline">{Number(client.site_count) || 0} sites</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{Number(client.total_guards_needed) || 0} guards</Badge></TableCell>
                  <TableCell>
                    <Badge className={client.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}>
                      {client.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={(e) => {
                        e.stopPropagation()
                        setEditingClient(client)
                        setFormData({ name: client.name, contact_person: client.contact_person || "", contact_email: client.contact_email || "", contact_phone: client.contact_phone || "", address: client.address || "", city: client.city || "", notes: client.notes || "" })
                      }}><Edit className="h-3 w-3" /></Button>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(client.id) }} className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Client Detail Dialog */}
      <Dialog open={!!viewingClient} onOpenChange={(o) => { if (!o) { setViewingClient(null); setClientSites([]) } }}>
        <DialogContent className="sm:max-w-[620px] flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {viewingClient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-5 pr-1">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {viewingClient?.contact_person && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{viewingClient.contact_person}</span>
                </div>
              )}
              {viewingClient?.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{viewingClient.contact_email}</span>
                </div>
              )}
              {viewingClient?.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{viewingClient.contact_phone}</span>
                </div>
              )}
              {viewingClient?.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{viewingClient.city}{viewingClient.address ? ` — ${viewingClient.address}` : ""}</span>
                </div>
              )}
            </div>

            {/* Summary badges */}
            <div className="flex gap-3">
              <Badge variant="outline" className="text-sm py-1 px-3">
                <MapPin className="h-3 w-3 mr-1" />
                {Number(viewingClient?.site_count) || 0} Sites
              </Badge>
              <Badge variant="secondary" className="text-sm py-1 px-3">
                <Users className="h-3 w-3 mr-1" />
                {Number(viewingClient?.total_guards_needed) || 0} Guards Needed
              </Badge>
              <Badge className={`text-sm py-1 px-3 ${viewingClient?.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                {viewingClient?.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* Sites List */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Sites</h3>
              {loadingSites ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              ) : clientSites.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No sites registered for this client.</p>
              ) : (
                <div className="space-y-2">
                  {clientSites.map((site, idx) => (
                    <div key={site.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-muted-foreground font-mono mt-0.5">{idx + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{site.name}</p>
                          {site.address && <p className="text-xs text-muted-foreground">{site.address}</p>}
                          {site.contact_person && <p className="text-xs text-muted-foreground">{site.contact_person} {site.contact_phone ? `· ${site.contact_phone}` : ""}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {site.guards_needed || 0} guards
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${site.site_status === "active" ? "text-green-700 border-green-200" : "text-gray-500"}`}>
                          {site.site_status || "active"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {viewingClient?.notes && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Notes</h3>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">{viewingClient.notes}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => { setViewingClient(null); setClientSites([]) }}>Close</Button>
            <Button onClick={() => {
              if (!viewingClient) return
              setViewingClient(null)
              setClientSites([])
              setEditingClient(viewingClient)
              setFormData({ name: viewingClient.name, contact_person: viewingClient.contact_person || "", contact_email: viewingClient.contact_email || "", contact_phone: viewingClient.contact_phone || "", address: viewingClient.address || "", city: viewingClient.city || "", notes: viewingClient.notes || "" })
            }}>
              <Edit className="h-4 w-4 mr-2" />Edit Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) resetForm() }}>
        <DialogContent className="flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0"><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
            <div className="grid grid-cols-2 gap-4 overflow-y-auto flex-1 pr-1 py-2">
              <div className="col-span-2 space-y-2">
                <Label>Company Name *</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2"><Button type="submit">Create Client</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingClient} onOpenChange={(o) => { if (!o) { setEditingClient(null); resetForm() } }}>
        <DialogContent className="flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0"><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden">
            <div className="grid grid-cols-2 gap-4 overflow-y-auto flex-1 pr-1 py-2">
              <div className="col-span-2 space-y-2">
                <Label>Company Name *</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2"><Button type="submit">Save Changes</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
