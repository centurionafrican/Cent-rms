"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Search, AlertTriangle, Mail, Eye, CheckCircle, Upload, FileImage, Shield } from "lucide-react"

type Attachment = {
  url: string
  name: string
  type: string
  size: number
}

type Incident = {
  id: number
  title: string
  description: string
  incident_type: string
  severity: string
  site_id: number | null
  guard_id: number | null
  reported_by: number | null
  incident_date: string
  status: string
  actions_taken: string | null
  attachment_url: string | null
  attachments: Attachment[] | null
  notified_parties: string[] | null
  resolution_notes: string | null
  email_sent: boolean
  email_sent_to: string | null
  email_sent_at: string | null
  created_at: string
  site_name?: string
  guard_name?: string
  reported_by_name?: string
}

type Site = { id: number; name: string }
type Guard = { id: number; first_name: string; last_name: string }

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [guards, setGuards] = useState<Guard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [isResolveOpen, setIsResolveOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [showAllIncidents, setShowAllIncidents] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    incident_type: "security_breach",
    severity: "medium",
    site_id: "",
    guard_id: "",
    incident_date: new Date().toISOString().slice(0, 16),
    status: "open",
    actions_taken: "",
    attachment_url: "",
    attachments: [] as Attachment[],
    notified_parties: [] as string[],
    resolution_notes: "",
  })
  const [emailData, setEmailData] = useState({
    email: "",
    subject: "",
    additionalNotes: "",
  })
  const [saving, setSaving] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [incidentsRes, sitesRes, guardsRes] = await Promise.all([
        fetch("/api/incidents"),
        fetch("/api/sites"),
        fetch("/api/guards"),
      ])
      const [incidentsData, sitesData, guardsData] = await Promise.all([
        incidentsRes.json(),
        sitesRes.json(),
        guardsRes.json(),
      ])
      setIncidents(incidentsData)
      setSites(sitesData)
      setGuards(guardsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const newAttachments: Attachment[] = []
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (res.ok) {
          const data = await res.json()
          newAttachments.push({ url: data.url, name: data.filename, type: data.type, size: data.size })
        }
      }
      setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }))
    } catch (error) {
      console.error("Upload failed:", error)
      alert("File upload failed. Please try again.")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  function removeAttachment(index: number) {
    setFormData((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }))
  }

  function getFileIcon(type: string) {
    if (type.startsWith("image/")) return "Image"
    if (type === "application/pdf") return "PDF"
    if (type.includes("word") || type.includes("document")) return "DOC"
    if (type.startsWith("video/")) return "Video"
    return "File"
  }

  function handleNotifiedChange(party: string, checked: boolean) {
    if (checked) {
      setFormData({ ...formData, notified_parties: [...formData.notified_parties, party] })
    } else {
      setFormData({ ...formData, notified_parties: formData.notified_parties.filter(p => p !== party) })
    }
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          site_id: formData.site_id ? parseInt(formData.site_id) : null,
          guard_id: formData.guard_id ? parseInt(formData.guard_id) : null,
          notified_parties: formData.notified_parties.length > 0 ? formData.notified_parties : null,
          attachments: formData.attachments.length > 0 ? formData.attachments : null,
        }),
      })
      if (res.ok) {
        setIsCreateOpen(false)
        resetForm()
        fetchData()
      }
    } catch (error) {
      console.error("Failed to create incident:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!selectedIncident) return
    setSaving(true)
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          site_id: formData.site_id ? parseInt(formData.site_id) : null,
          guard_id: formData.guard_id ? parseInt(formData.guard_id) : null,
          notified_parties: formData.notified_parties.length > 0 ? formData.notified_parties : null,
          attachments: formData.attachments.length > 0 ? formData.attachments : null,
        }),
      })
      if (res.ok) {
        setIsEditOpen(false)
        setSelectedIncident(null)
        resetForm()
        fetchData()
      }
    } catch (error) {
      console.error("Failed to update incident:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleResolve() {
    if (!selectedIncident) return
    setSaving(true)
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedIncident,
          status: "resolved",
          resolution_notes: formData.resolution_notes,
        }),
      })
      if (res.ok) {
        setIsResolveOpen(false)
        setSelectedIncident(null)
        setFormData({ ...formData, resolution_notes: "" })
        fetchData()
      }
    } catch (error) {
      console.error("Failed to resolve incident:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedIncident) return
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}`, { method: "DELETE" })
      if (res.ok) {
        setIsDeleteOpen(false)
        setSelectedIncident(null)
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(selectedIncident.id); return s })
        fetchData()
      }
    } catch (error) { console.error("Failed to delete incident:", error) }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected incident(s)? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/incidents/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setIncidents((prev) => prev.filter((i) => !selectedIds.has(i.id)))
        setSelectedIds(new Set())
      }
    } catch (error) { console.error(error) } finally { setBulkDeleting(false) }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function toggleSelectAll(list: Incident[]) {
    if (selectedIds.size === list.length) { setSelectedIds(new Set()) }
    else { setSelectedIds(new Set(list.map((i) => i.id))) }
  }

  async function handleSendEmail() {
    if (!selectedIncident) return
    setSendingEmail(true)
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailData.email,
          subject: emailData.subject || `Incident Report: ${selectedIncident.title}`,
          additionalNotes: emailData.additionalNotes,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        setIsEmailOpen(false)
        setEmailData({ email: "", subject: "", additionalNotes: "" })
        fetchData()
      } else {
        alert(data.error || "Failed to send email")
      }
    } catch (error) {
      console.error("Failed to send email:", error)
      alert("Failed to send email")
    } finally {
      setSendingEmail(false)
    }
  }

  function resetForm() {
    setFormData({
      title: "",
      description: "",
      incident_type: "security_breach",
      severity: "medium",
      site_id: "",
      guard_id: "",
      incident_date: new Date().toISOString().slice(0, 16),
      status: "open",
      actions_taken: "",
      attachment_url: "",
      attachments: [],
      notified_parties: [],
      resolution_notes: "",
    })
  }

  function openEditDialog(incident: Incident) {
    setSelectedIncident(incident)
    setFormData({
      title: incident.title,
      description: incident.description,
      incident_type: incident.incident_type,
      severity: incident.severity,
      site_id: incident.site_id?.toString() || "",
      guard_id: incident.guard_id?.toString() || "",
      incident_date: new Date(incident.incident_date).toISOString().slice(0, 16),
      status: incident.status,
      actions_taken: incident.actions_taken || "",
      attachment_url: incident.attachment_url || "",
      attachments: incident.attachments || [],
      notified_parties: incident.notified_parties || [],
      resolution_notes: incident.resolution_notes || "",
    })
    setIsEditOpen(true)
  }

  function openViewDialog(incident: Incident) {
    setSelectedIncident(incident)
    setIsViewOpen(true)
  }

  function openEmailDialog(incident: Incident) {
    setSelectedIncident(incident)
    setEmailData({
      email: "",
      subject: `Incident Report: ${incident.title}`,
      additionalNotes: "",
    })
    setIsEmailOpen(true)
  }

  function openResolveDialog(incident: Incident) {
    setSelectedIncident(incident)
    setFormData({ ...formData, resolution_notes: incident.resolution_notes || "" })
    setIsResolveOpen(true)
  }

  const filteredIncidents = incidents.filter(
    (incident) =>
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.incident_type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openIncidents = incidents.filter((i) => i.status === "open").length
  const criticalIncidents = incidents.filter((i) => i.severity === "critical").length

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500 text-white"
      case "high": return "bg-orange-500 text-white"
      case "medium": return "bg-yellow-500 text-white"
      case "low": return "bg-green-500 text-white"
      default: return ""
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-100 text-red-800"
      case "investigating": return "bg-yellow-100 text-yellow-800"
      case "resolved": return "bg-green-100 text-green-800"
      case "closed": return "bg-gray-100 text-gray-800"
      default: return ""
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground">Report and manage security incidents</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Report Incident
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Badge className="bg-red-100 text-red-800">Open</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIncidents}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <Badge className="bg-red-500 text-white">Critical</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalIncidents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.filter((i) => i.status === "resolved").length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Incidents</CardTitle>
          <CardDescription>View and manage reported incidents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Notified</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No incidents found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (showAllIncidents ? filteredIncidents : filteredIncidents.slice(0, 3)).map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {incident.title}
                            {incident.attachment_url && (
                              <FileImage className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{incident.incident_type.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(incident.severity)}>
                            {incident.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{incident.site_name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {incident.notified_parties && incident.notified_parties.length > 0 ? (
                              incident.notified_parties.map((party) => (
                                <Badge key={party} variant="outline" className="text-xs">
                                  {party}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-xs">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(incident.status)}>
                            {incident.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(incident.incident_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openViewDialog(incident)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {incident.status !== "resolved" && incident.status !== "closed" && (
                            <Button variant="ghost" size="icon" onClick={() => openResolveDialog(incident)} title="Resolve">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEmailDialog(incident)} title="Send Email">
                            <Mail className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(incident)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedIncident(incident); setIsDeleteOpen(true); }} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {filteredIncidents.length > 3 && (
                <div className="flex items-center justify-center py-4 border-t">
                  <Button variant="outline" onClick={() => setShowAllIncidents(!showAllIncidents)}>
                    {showAllIncidents ? "Show Less" : `View More (${filteredIncidents.length - 3} more)`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Edit Incident" : "Report New Incident"}</DialogTitle>
            <DialogDescription>
              {isEditOpen ? "Update the incident details." : "Fill in the details of the security incident."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief incident title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="incident_type">Type *</Label>
                <Select value={formData.incident_type} onValueChange={(value) => setFormData({ ...formData, incident_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security_breach">Security Breach</SelectItem>
                    <SelectItem value="theft">Theft</SelectItem>
                    <SelectItem value="vandalism">Vandalism</SelectItem>
                    <SelectItem value="trespassing">Trespassing</SelectItem>
                    <SelectItem value="assault">Assault</SelectItem>
                    <SelectItem value="fire">Fire</SelectItem>
                    <SelectItem value="medical">Medical Emergency</SelectItem>
                    <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                    <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="site_id">Site</Label>
                <Select value={formData.site_id} onValueChange={(value) => setFormData({ ...formData, site_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id.toString()}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guard_id">Guard Involved</Label>
                <Select value={formData.guard_id} onValueChange={(value) => setFormData({ ...formData, guard_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select guard" /></SelectTrigger>
                  <SelectContent>
                    {guards.map((guard) => (
                      <SelectItem key={guard.id} value={guard.id.toString()}>
                        {guard.first_name} {guard.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="incident_date">Date & Time *</Label>
                <Input
                  id="incident_date"
                  type="datetime-local"
                  value={formData.incident_date}
                  onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                />
              </div>
              {isEditOpen && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the incident"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actions_taken">Actions Taken</Label>
              <Textarea
                id="actions_taken"
                value={formData.actions_taken}
                onChange={(e) => setFormData({ ...formData, actions_taken: e.target.value })}
                placeholder="What actions have been taken?"
                rows={2}
              />
            </div>

            {/* Notified Parties */}
            <div className="space-y-2">
              <Label>Notified Parties</Label>
              <div className="flex flex-wrap gap-4 p-3 border rounded-md">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-client"
                    checked={formData.notified_parties.includes("Client")}
                    onCheckedChange={(checked) => handleNotifiedChange("Client", checked as boolean)}
                  />
                  <label htmlFor="notify-client" className="text-sm cursor-pointer">Client</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-supervisor"
                    checked={formData.notified_parties.includes("Supervisor")}
                    onCheckedChange={(checked) => handleNotifiedChange("Supervisor", checked as boolean)}
                  />
                  <label htmlFor="notify-supervisor" className="text-sm cursor-pointer">Supervisor</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-police"
                    checked={formData.notified_parties.includes("Police")}
                    onCheckedChange={(checked) => handleNotifiedChange("Police", checked as boolean)}
                  />
                  <label htmlFor="notify-police" className="text-sm cursor-pointer">Police</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-management"
                    checked={formData.notified_parties.includes("Management")}
                    onCheckedChange={(checked) => handleNotifiedChange("Management", checked as boolean)}
                  />
                  <label htmlFor="notify-management" className="text-sm cursor-pointer">Management</label>
                </div>
              </div>
            </div>

            {/* Attachments - Multiple files */}
            <div className="space-y-2">
              <Label>Attachments (PDF, Word, Images, Video)</Label>
              {formData.attachments.length > 0 && (
                <div className="space-y-2">
                  {formData.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="shrink-0 text-xs">{getFileIcon(att.type)}</Badge>
                        <span className="text-sm truncate">{att.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{(att.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                        </a>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAttachment(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-2 border-dashed rounded-md p-4">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? "Uploading..." : "Click to upload files (PDF, Word, Images, Video)"}
                  </span>
                  <span className="text-xs text-muted-foreground">You can select multiple files</span>
                  <Input
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    multiple
                  />
                </label>
              </div>
            </div>

            {isEditOpen && formData.status === "resolved" && (
              <div className="space-y-2">
                <Label htmlFor="resolution_notes">Resolution Notes</Label>
                <Textarea
                  id="resolution_notes"
                  value={formData.resolution_notes}
                  onChange={(e) => setFormData({ ...formData, resolution_notes: e.target.value })}
                  placeholder="How was the incident resolved?"
                  rows={2}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={isEditOpen ? handleUpdate : handleCreate} disabled={saving || !formData.title || !formData.description}>
              {saving ? "Saving..." : isEditOpen ? "Update Incident" : "Report Incident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Incident</DialogTitle>
            <DialogDescription>
              Mark this incident as resolved and add resolution notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{selectedIncident?.title}</p>
                <p className="text-sm text-muted-foreground">{selectedIncident?.incident_type.replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolution_notes">Resolution Notes *</Label>
              <Textarea
                id="resolution_notes"
                value={formData.resolution_notes}
                onChange={(e) => setFormData({ ...formData, resolution_notes: e.target.value })}
                placeholder="Describe how the incident was resolved..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveOpen(false)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={saving || !formData.resolution_notes}>
              {saving ? "Resolving..." : "Mark as Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedIncident.title}</h3>
                <div className="flex gap-2">
                  <Badge className={getSeverityColor(selectedIncident.severity)}>{selectedIncident.severity}</Badge>
                  <Badge className={getStatusColor(selectedIncident.status)}>{selectedIncident.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{selectedIncident.incident_type.replace(/_/g, " ")}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(selectedIncident.incident_date).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Site:</span> {selectedIncident.site_name || "N/A"}</div>
                <div><span className="text-muted-foreground">Guard:</span> {selectedIncident.guard_name || "N/A"}</div>
              </div>
              <div>
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedIncident.description}</p>
              </div>
              {selectedIncident.actions_taken && (
                <div>
                  <h4 className="font-medium mb-1">Actions Taken</h4>
                  <p className="text-sm text-muted-foreground">{selectedIncident.actions_taken}</p>
                </div>
              )}
              {selectedIncident.notified_parties && selectedIncident.notified_parties.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Notified Parties</h4>
                  <div className="flex gap-2">
                    {selectedIncident.notified_parties.map((party) => (
                      <Badge key={party} variant="outline">{party}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedIncident.attachments && selectedIncident.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Attachments ({selectedIncident.attachments.length})</h4>
                  <div className="space-y-2">
                    {selectedIncident.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-muted rounded-md">
                        <Badge variant="outline" className="shrink-0">
                          {att.type?.startsWith("image/") ? "Image" : att.type === "application/pdf" ? "PDF" : att.type?.includes("word") ? "DOC" : "File"}
                        </Badge>
                        <span className="text-sm truncate flex-1">{att.name}</span>
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">View / Download</Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedIncident.attachment_url && !selectedIncident.attachments?.length && (
                <div>
                  <h4 className="font-medium mb-1">Legacy Attachment</h4>
                  <a href={selectedIncident.attachment_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">View Attachment</a>
                </div>
              )}
              {selectedIncident.resolution_notes && (
                <div className="p-3 bg-green-50 rounded-md">
                  <h4 className="font-medium mb-1 text-green-800">Resolution Notes</h4>
                  <p className="text-sm text-green-700">{selectedIncident.resolution_notes}</p>
                </div>
              )}
              {selectedIncident.email_sent && (
                <div className="text-sm text-muted-foreground">
                  Email sent to {selectedIncident.email_sent_to} on {new Date(selectedIncident.email_sent_at!).toLocaleString()}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Incident Report</DialogTitle>
            <DialogDescription>Send this incident report via email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email *</Label>
              <Input
                id="email"
                type="email"
                value={emailData.email}
                onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                value={emailData.additionalNotes}
                onChange={(e) => setEmailData({ ...emailData, additionalNotes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail || !emailData.email}>
              {sendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incident</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this incident? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
