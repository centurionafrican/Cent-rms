"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Pencil, Trash2, Search, Users, CalendarX, UserCheck, Upload, FileText, X, Mail, Download, CheckCircle, AlertCircle } from "lucide-react"

const STATUS_OPTIONS = [
  { value: "recruitment", label: "Recruitment", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "training", label: "Training", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "probation", label: "Probation", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "active", label: "Full Active", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "retired", label: "Retired", color: "bg-gray-100 text-gray-600 border-gray-200" },
  { value: "quit", label: "Quit", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "dismissed", label: "Dismissed", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "deceased", label: "Deceased", color: "bg-gray-200 text-gray-800 border-gray-300" },
]

function getStatusBadge(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) || { label: status, color: "bg-gray-100 text-gray-700 border-gray-200" }
}

interface Attachment { url: string; filename: string; type: string; size: number; uploaded_at: string }

type Guard = {
  id: number; first_name: string; last_name: string; email: string | null; phone: string | null
  title: string | null; id_number: string | null; hire_date: string | null; date_joined: string | null
  status: string; annual_leave_days: number; leave_days_used: number; attachments: Attachment[] | null; created_at: string
  guard_title?: string | null; gender?: string | null; education_level?: string | null; languages_spoken?: string[] | null; discipline?: string | null; special_skills?: string[] | null; maternity_status?: string | null
}

export default function GuardsPage() {
  const [guards, setGuards] = useState<Guard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkStatus, setBulkStatus] = useState("")
  const [bulkLoading, setBulkLoading] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  
  // Pagination
  const [showAll, setShowAll] = useState(false)

  // Guard portal send link
  const [sendingLinkId, setSendingLinkId] = useState<number | null>(null)
  const [linkSentId, setLinkSentId] = useState<number | null>(null)
  const [bulkSendingLinks, setBulkSendingLinks] = useState(false)
  const [bulkSendResult, setBulkSendResult] = useState<{ sent: number; failed: number } | null>(null)

  // Import
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; details: { imported: string[]; skipped: { row: number; reason: string }[] } } | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", phone: "", title: "Security Guard",
    status: "recruitment", id_number: "", annual_leave_days: "21", date_joined: new Date().toISOString().split("T")[0],
    guard_title: "", gender: "", education_level: "", languages_spoken: [] as string[], discipline: "Excellent", special_skills: [] as string[], maternity_status: "Not Applicable",
  })

  useEffect(() => { fetchGuards() }, [])

  async function fetchGuards() {
    try {
      const res = await fetch("/api/guards")
      const data = await res.json()
      setGuards(Array.isArray(data) ? data : data.guards || [])
    } catch (error) { console.error("Failed to fetch guards:", error) }
    finally { setLoading(false) }
  }

  function resetForm() {
    setFormData({ first_name: "", last_name: "", email: "", phone: "", title: "Security Guard", status: "recruitment", id_number: "", annual_leave_days: "21", date_joined: new Date().toISOString().split("T")[0], guard_title: "", gender: "", education_level: "", languages_spoken: [], discipline: "Excellent", special_skills: [], maternity_status: "Not Applicable" })
    setPendingFiles([])
  }

  async function handleUploadFile(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "guards")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (res.ok) {
        const data = await res.json()
        setPendingFiles((prev) => [...prev, { url: data.url, filename: data.filename, type: data.type, size: data.size, uploaded_at: new Date().toISOString() }])
      } else { alert("Upload failed") }
    } catch (e) { console.error(e) } finally { setUploading(false) }
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const allAttachments = [...pendingFiles]
      const res = await fetch("/api/guards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, annual_leave_days: Number.parseInt(formData.annual_leave_days) || 21, attachments: JSON.stringify(allAttachments) }),
      })
      if (res.ok) { setIsCreateOpen(false); resetForm(); fetchGuards() }
    } catch (error) { console.error(error) }
    finally { setSaving(false) }
  }

  async function handleUpdate() {
    if (!selectedGuard) return
    setSaving(true)
    try {
      const existingAttachments = selectedGuard.attachments || []
      const allAttachments = [...existingAttachments, ...pendingFiles]
      const res = await fetch(`/api/guards/${selectedGuard.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, annual_leave_days: Number.parseInt(formData.annual_leave_days) || 21, attachments: JSON.stringify(allAttachments) }),
      })
      if (res.ok) { setIsEditOpen(false); setSelectedGuard(null); resetForm(); fetchGuards() }
    } catch (error) { console.error(error) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!selectedGuard) return
    try {
      const res = await fetch(`/api/guards/${selectedGuard.id}`, { method: "DELETE" })
      if (res.ok) { setIsDeleteOpen(false); setSelectedGuard(null); fetchGuards() }
    } catch (error) { console.error(error) }
  }

  async function handleBulkDelete() {
    setBulkLoading(true)
    try {
      const res = await fetch("/api/guards/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setGuards((prev) => prev.filter((g) => !selectedIds.has(g.id)))
        setSelectedIds(new Set())
        setIsBulkDeleteOpen(false)
      }
    } catch (e) { console.error(e) } finally { setBulkLoading(false) }
  }

  async function handleBulkStatusChange() {
    if (!bulkStatus || selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      const res = await fetch("/api/guards/bulk-status", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guard_ids: Array.from(selectedIds), new_status: bulkStatus }),
      })
      if (res.ok) {
        const result = await res.json()
        alert(result.message)
        setSelectedIds(new Set()); setBulkStatus(""); fetchGuards()
      }
    } catch (e) { console.error(e) } finally { setBulkLoading(false) }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  function selectAllFiltered() {
    const ids = filtered.map((g) => g.id)
    const allSelected = ids.every((id) => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(ids))
  }

  function openEdit(guard: Guard) {
    setSelectedGuard(guard)
    setFormData({ first_name: guard.first_name, last_name: guard.last_name, email: guard.email || "", phone: guard.phone || "", title: guard.title || "Security Guard", status: guard.status, id_number: guard.id_number || "", annual_leave_days: String(guard.annual_leave_days || 21), date_joined: guard.date_joined || "", guard_title: guard.guard_title || "", gender: guard.gender || "", education_level: guard.education_level || "", languages_spoken: guard.languages_spoken || [], discipline: guard.discipline || "Excellent", special_skills: guard.special_skills || [], maternity_status: guard.maternity_status || "Not Applicable" })
    setPendingFiles([])
    setIsEditOpen(true)
  }

  async function handleBulkSendLinks() {
    const ids = Array.from(selectedIds)
    const withEmail = guards.filter((g) => ids.includes(g.id) && g.email)
    if (withEmail.length === 0) { alert("None of the selected guards have an email address."); return }
    if (!confirm(`Send portal access link to ${withEmail.length} guard(s) with email addresses?`)) return
    setBulkSendingLinks(true)
    setBulkSendResult(null)
    try {
      const res = await fetch("/api/guard-portal/bulk-send-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guard_ids: withEmail.map((g) => g.id) }),
      })
      const data = await res.json()
      if (res.ok) {
        setBulkSendResult({ sent: data.sent, failed: data.failed })
        setTimeout(() => setBulkSendResult(null), 6000)
      } else { alert(`Failed to send links: ${data.error}`) }
    } catch (e) { console.error(e); alert("Network error sending portal links.") }
    finally { setBulkSendingLinks(false) }
  }

  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append("file", importFile)
      const res = await fetch("/api/guards/import", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok) { setImportResult(data); fetchGuards() }
      else { alert(`Import failed: ${data.error}`) }
    } catch (e) { console.error(e); alert("Network error during import.") }
    finally { setImporting(false) }
  }

  async function downloadTemplate() {
    // xlsx exports as a namespace — use * as, never { default: ... }
    const XLSX = await import("xlsx").then((m) => m.default ?? m)

    // ── Column definitions ─────────────────────────────────────────────────
    const COLUMNS: { key: string; label: string; example: string; dropdown?: string[] }[] = [
      { key: "first_name",        label: "First Name *",                   example: "John" },
      { key: "last_name",         label: "Last Name *",                    example: "Doe" },
      { key: "email",             label: "Email",                          example: "john.doe@example.com" },
      { key: "phone",             label: "Phone",                          example: "+250700000000" },
      { key: "id_number",         label: "ID Number",                      example: "1198780123456789" },
      { key: "date_joined",       label: "Date Joined (YYYY-MM-DD)",       example: "2024-01-15" },
      { key: "title",             label: "Job Title",                      example: "Security Guard" },
      { key: "guard_title",       label: "Guard Title",                    example: "Team Leader",
        dropdown: ["Coordinator", "Supervisor", "Team Leader", "Security Guard"] },
      { key: "status",            label: "Status",                         example: "active",
        dropdown: ["recruitment", "training", "active", "inactive", "suspended", "terminated"] },
      { key: "gender",            label: "Gender",                         example: "Male",
        dropdown: ["Male", "Female"] },
      { key: "education_level",   label: "Education Level",                example: "Bachelor's Degree",
        dropdown: ["Master's Degree", "Bachelor's Degree", "Advanced Level (A Level)", "Ordinary Level (O Level)", "Primary Education"] },
      { key: "discipline",        label: "Discipline",                     example: "Excellent",
        dropdown: ["Excellent", "Very Good", "Good", "Needs Improvement", "Under Review"] },
      { key: "maternity_status",  label: "Maternity Status",               example: "Not Applicable",
        dropdown: ["Not Applicable", "Not Pregnant", "Pregnant", "On Maternity Leave", "Returned from Maternity Leave"] },
      { key: "languages_spoken",  label: "Languages Spoken (pipe-sep.)",   example: "English|Kinyarwanda" },
      { key: "special_skills",    label: "Special Skills (pipe-sep.)",     example: "CPO (Close Protection Officer)" },
      { key: "annual_leave_days", label: "Annual Leave Days",              example: "21" },
    ]

    const ROW_COUNT = 500
    const COL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

    // ── Build workbook ─────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new()

    // Hidden Options sheet — each dropdown col gets its own column
    const dropdownCols = COLUMNS.filter((c) => c.dropdown)
    const maxOptRows = Math.max(...dropdownCols.map((c) => c.dropdown!.length))
    const optData: string[][] = []
    for (let r = 0; r < maxOptRows; r++) {
      optData.push(dropdownCols.map((c) => c.dropdown![r] ?? ""))
    }
    const optWs = XLSX.utils.aoa_to_sheet(optData)
    optWs["!cols"] = dropdownCols.map((c) => ({ wch: Math.max(...c.dropdown!.map((v) => v.length)) + 2 }))
    XLSX.utils.book_append_sheet(wb, optWs, "Options")

    // Main import sheet — row 1 header, row 2 example, rows 3-500 blank
    const headerRow  = COLUMNS.map((c) => c.label)
    const exampleRow = COLUMNS.map((c) => c.example)
    const blankRows: string[][] = Array.from({ length: ROW_COUNT - 1 }, () => Array(COLUMNS.length).fill(""))
    const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow, ...blankRows])
    ws["!cols"]   = COLUMNS.map((c) => ({ wch: Math.max(c.label.length, c.example.length, 20) + 2 }))
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activeCell: "A2", sqref: "A2" }

    // Inject <dataValidations> XML directly — SheetJS writes ws["!xml"] verbatim
    // after </sheetData>, which is exactly where Excel expects dataValidations.
    const dvEntries = dropdownCols.map((col) => {
      const mainIdx = COLUMNS.findIndex((c) => c.key === col.key)
      const optIdx  = dropdownCols.findIndex((c) => c.key === col.key)
      const mainCol = COL_LETTERS[mainIdx]
      const optCol  = COL_LETTERS[optIdx]
      const count   = col.dropdown!.length
      const sqref   = `${mainCol}2:${mainCol}${ROW_COUNT + 1}`
      // formula1 references the hidden Options sheet
      const f1 = `Options!$${optCol}$1:$${optCol}$${count}`
      return (
        `<dataValidation type="list" allowBlank="1" showDropDown="0" ` +
        `showErrorMessage="1" errorStyle="stop" ` +
        `errorTitle="Invalid value" ` +
        `error="Please select a value from the dropdown list." ` +
        `sqref="${sqref}">` +
        `<formula1>${f1}</formula1>` +
        `</dataValidation>`
      )
    })
    ws["!xml"] = `<dataValidations count="${dvEntries.length}">${dvEntries.join("")}</dataValidations>`

    XLSX.utils.book_append_sheet(wb, ws, "Guards Import")

    // Hide the Options sheet
    if (!wb.Workbook) wb.Workbook = { Sheets: [], Views: [] }
    wb.Workbook.Sheets = wb.SheetNames.map((name) => ({
      name,
      Hidden: name === "Options" ? 1 : 0,
    }))

    // Write and trigger browser download
    const buf  = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = "guards_import_template.xlsx"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSendPortalLink(guard: Guard) {
    if (!guard.email) {
      alert("This guard has no email address on file.")
      return
    }
    setSendingLinkId(guard.id)
    setLinkSentId(null)
    try {
      const res = await fetch("/api/guard-portal/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guard_id: guard.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setLinkSentId(guard.id)
        setTimeout(() => setLinkSentId(null), 4000)
      } else {
        alert(`Failed to send portal link: ${data.error || "Unknown error"}`)
      }
    } catch (e) {
      alert("Network error sending portal link.")
      console.error(e)
    } finally {
      setSendingLinkId(null)
    }
  }

  const filtered = guards.filter((g) => {
    const q = searchQuery.toLowerCase()
    const matchSearch = `${g.first_name} ${g.last_name} ${g.email || ""} ${g.phone || ""} ${g.id_number || ""}`.toLowerCase().includes(q)
    const matchStatus = statusFilter === "all" || g.status === statusFilter
    return matchSearch && matchStatus
  })

  const activeCount = guards.filter((g) => g.status === "active").length
  const inTraining = guards.filter((g) => ["recruitment", "training", "probation"].includes(g.status)).length
  const departed = guards.filter((g) => ["retired", "quit", "dismissed", "deceased"].includes(g.status)).length

  const attachmentSection = (
    <div className="space-y-3">
      <Label>Attachments (Certificates, IDs, Documents)</Label>
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUploadFile(e.target.files[0]) }} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading..." : "Upload File"}
        </Button>
        <span className="text-xs text-muted-foreground">Max 10MB per file. PDF, Word, JPG, PNG</span>
      </div>
      {/* Existing attachments on edit */}
      {selectedGuard?.attachments?.map((att, i) => (
        <div key={`existing-${i}`} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <a href={att.url} target="_blank" rel="noreferrer" className="text-primary underline flex-1 truncate">{att.filename}</a>
          <span className="text-xs text-muted-foreground shrink-0">{(att.size / 1024).toFixed(0)}KB</span>
        </div>
      ))}
      {/* Newly uploaded files */}
      {pendingFiles.map((f, i) => (
        <div key={`new-${i}`} className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <FileText className="h-4 w-4 text-green-600 shrink-0" />
          <span className="flex-1 truncate">{f.filename}</span>
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
        </div>
      ))}
    </div>
  )

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>First Name *</Label><Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} /></div>
        <div className="space-y-2"><Label>Last Name *</Label><Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>ID Number</Label><Input value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} placeholder="ID Number" /></div>
        <div className="space-y-2"><Label>Date Joined</Label><Input type="date" value={formData.date_joined} onChange={(e) => setFormData({ ...formData, date_joined: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Guard Title</Label>
          <Select value={formData.guard_title} onValueChange={(v) => setFormData({ ...formData, guard_title: v })}>
            <SelectTrigger><SelectValue placeholder="Select title" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Coordinator">Coordinator</SelectItem>
              <SelectItem value="Supervisor">Supervisor</SelectItem>
              <SelectItem value="Team Leader">Team Leader</SelectItem>
              <SelectItem value="Security Guard">Security Guard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v, maternity_status: v === 'Female' ? formData.maternity_status : 'Not Applicable' })}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Education Level</Label>
          <Select value={formData.education_level} onValueChange={(v) => setFormData({ ...formData, education_level: v })}>
            <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Master's Degree">Master's Degree</SelectItem>
              <SelectItem value="Bachelor's Degree">Bachelor's Degree</SelectItem>
              <SelectItem value="Advanced Level (A Level)">Advanced Level (A Level)</SelectItem>
              <SelectItem value="Ordinary Level (O Level)">Ordinary Level (O Level)</SelectItem>
              <SelectItem value="Primary Education">Primary Education</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Discipline</Label>
          <Select value={formData.discipline} onValueChange={(v) => setFormData({ ...formData, discipline: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Excellent">Excellent</SelectItem>
              <SelectItem value="Very Good">Very Good</SelectItem>
              <SelectItem value="Good">Good</SelectItem>
              <SelectItem value="Needs Improvement">Needs Improvement</SelectItem>
              <SelectItem value="Under Review">Under Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Special Skills (Multi-Select)</Label>
          <div className="space-y-2 border rounded-md p-2">
            {["CPO (Close Protection Officer)", "Control Room Operations"].map((skill) => (
              <div key={skill} className="flex items-center">
                <Checkbox checked={formData.special_skills.includes(skill)} onCheckedChange={(checked) => setFormData({ ...formData, special_skills: checked ? [...formData.special_skills, skill] : formData.special_skills.filter(s => s !== skill) })} />
                <label className="ml-2 text-sm cursor-pointer">{skill}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Languages Spoken (Multi-Select)</Label>
        <div className="space-y-2 border rounded-md p-2">
          {["English", "French", "Kiswahili", "Kinyarwanda"].map((lang) => (
            <div key={lang} className="flex items-center">
              <Checkbox checked={formData.languages_spoken.includes(lang)} onCheckedChange={(checked) => setFormData({ ...formData, languages_spoken: checked ? [...formData.languages_spoken, lang] : formData.languages_spoken.filter(l => l !== lang) })} />
              <label className="ml-2 text-sm cursor-pointer">{lang}</label>
            </div>
          ))}
        </div>
      </div>
      {formData.gender === 'Female' && (
        <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <Label className="text-blue-900">Maternity Status</Label>
          <Select value={formData.maternity_status} onValueChange={(v) => setFormData({ ...formData, maternity_status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Not Pregnant">Not Pregnant</SelectItem>
              <SelectItem value="Pregnant">Pregnant</SelectItem>
              <SelectItem value="On Maternity Leave">On Maternity Leave</SelectItem>
              <SelectItem value="Returned from Maternity Leave">Returned from Maternity Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Status Phase</Label>
        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Annual Leave Days</Label><Input type="number" min="0" value={formData.annual_leave_days} onChange={(e) => setFormData({ ...formData, annual_leave_days: e.target.value })} /></div>
      {attachmentSection}
    </div>
  )

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Guards</h1>
          <p className="text-muted-foreground">Manage your security personnel</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setImportFile(null); setImportResult(null); setIsImportOpen(true) }}>
            <Upload className="mr-2 h-4 w-4" />Import CSV
          </Button>
          <Button onClick={() => { resetForm(); setSelectedGuard(null); setIsCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Add Guard
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Guards</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{guards.length}</div></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Full Active</CardTitle><UserCheck className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{activeCount}</div></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">In Pipeline</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{inTraining}</div><p className="text-xs text-muted-foreground">Recruitment / Training / Probation</p></CardContent></Card>
        <Card className="border-l-4 border-l-red-500"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Departed</CardTitle><CalendarX className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-gray-500">{departed}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>All Guards</CardTitle>
              <CardDescription>Security personnel across all lifecycle phases</CardDescription>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex-wrap">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="w-[150px] h-8"><SelectValue placeholder="Change status..." /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
                </Select>
                <Button size="sm" onClick={handleBulkStatusChange} disabled={!bulkStatus || bulkLoading}>
                  {bulkLoading ? "Updating..." : "Apply"}
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button size="sm" variant="outline" onClick={handleBulkSendLinks} disabled={bulkSendingLinks} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Mail className="h-3.5 w-3.5 mr-1" />
                  {bulkSendingLinks ? "Sending..." : "Send Portal Link"}
                </Button>
                {bulkSendResult && (
                  <span className="text-xs flex items-center gap-1 text-green-700">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {bulkSendResult.sent} sent{bulkSendResult.failed > 0 ? `, ${bulkSendResult.failed} failed` : ""}
                  </span>
                )}
                <div className="w-px h-5 bg-border mx-1" />
                <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteOpen(true)} disabled={bulkLoading}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete ({selectedIds.size})
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name, ID, phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses ({guards.length})</SelectItem>
                {STATUS_OPTIONS.map((s) => {
                  const count = guards.filter((g) => g.status === s.value).length
                  return <SelectItem key={s.value} value={s.value}>{s.label} ({count})</SelectItem>
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={filtered.length > 0 && filtered.every((g) => selectedIds.has(g.id))} onCheckedChange={() => selectAllFiltered()} />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Leave Balance</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center">No guards found.</TableCell></TableRow>
                ) : (filtered.slice(0, showAll ? filtered.length : 3)).map((guard) => {
                  const badge = getStatusBadge(guard.status)
                  const leaveRemaining = (guard.annual_leave_days || 21) - (guard.leave_days_used || 0)
                  const attachments = guard.attachments || []
                  return (
                    <TableRow key={guard.id} className={selectedIds.has(guard.id) ? "bg-primary/5" : ""}>
                      <TableCell><Checkbox checked={selectedIds.has(guard.id)} onCheckedChange={() => toggleSelect(guard.id)} /></TableCell>
                <TableCell>
                  <div className="font-medium">{guard.first_name} {guard.last_name}</div>
                  <div className="text-xs text-muted-foreground">{guard.guard_title || guard.title || "Security Guard"}</div>
                </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{guard.id_number || "-"}</TableCell>
                      <TableCell>
                        <div className="text-sm">{guard.phone || "-"}</div>
                        {guard.email && <div className="text-xs text-muted-foreground">{guard.email}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className={badge.color}>{badge.label}</Badge></TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${leaveRemaining <= 3 ? "text-red-600" : ""}`}>{leaveRemaining}</span>
                        <span className="text-xs text-muted-foreground"> / {guard.annual_leave_days || 21}d</span>
                      </TableCell>
                      <TableCell>
                        {attachments.length > 0 ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2">
                                <FileText className="h-3.5 w-3.5" />{attachments.length}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {attachments.map((att, i) => (
                                <DropdownMenuItem key={i} asChild>
                                  <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5" />{att.filename}
                                  </a>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : <span className="text-xs text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={guard.email ? `Send portal link to ${guard.email}` : "No email — cannot send portal link"}
                          disabled={sendingLinkId === guard.id || !guard.email}
                          onClick={() => handleSendPortalLink(guard)}
                          className={linkSentId === guard.id ? "text-green-600" : guard.email ? "text-blue-600 hover:text-blue-700" : "opacity-30"}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(guard)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedGuard(guard); setIsDeleteOpen(true) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {filtered.length > 3 && (
              <div className="flex items-center justify-center py-4 border-t">
                <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                  {showAll ? "Show Less" : `View More (${filtered.length - 3} more)`}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Guard</DialogTitle>
            <DialogDescription>Register a new security guard and attach certificates.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !formData.first_name || !formData.last_name}>
              {saving ? "Creating..." : "Create Guard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { resetForm(); setSelectedGuard(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Guard</DialogTitle>
            <DialogDescription>Update guard information, status phase, and attachments.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {selectedGuard?.first_name} {selectedGuard?.last_name} from the system.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Import CSV Dialog */}
      <Dialog open={isImportOpen} onOpenChange={(open) => { setIsImportOpen(open); if (!open) { setImportFile(null); setImportResult(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Guards from CSV</DialogTitle>
            <DialogDescription>Upload a CSV file to add multiple guards at once. Download the template to see the required format.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full border-dashed">
              <Download className="mr-2 h-4 w-4" />Download CSV Template
            </Button>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => importFileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setImportFile(f) }}
            >
              <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setImportFile(e.target.files[0]) }} />
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              {importFile ? (
                <div>
                  <p className="font-medium text-sm">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium">Click to select or drag & drop</p>
                  <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx) or CSV (.csv)</p>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 rounded p-3">
              <p className="font-medium">Required columns: <code>first_name</code>, <code>last_name</code></p>
              <p>All other columns match the Add Guard form: email, phone, id_number, date_joined, title, guard_title, gender, education_level, discipline, languages_spoken, special_skills, maternity_status, status, annual_leave_days</p>
              <p className="text-amber-700">For multi-value fields (languages_spoken, special_skills) separate values with a pipe: <code>English|Kinyarwanda</code></p>
            </div>
            {importResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span><strong>{importResult.imported}</strong> guard(s) imported successfully</span>
                </div>
                {importResult.skipped > 0 && (
                  <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p><strong>{importResult.skipped}</strong> row(s) skipped</p>
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {importResult.details.skipped.slice(0, 5).map((s, i) => <li key={i}>Row {s.row}: {s.reason}</li>)}
                        {importResult.skipped > 5 && <li>...and {importResult.skipped - 5} more</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Close</Button>
            <Button onClick={handleImport} disabled={!importFile || importing}>
              {importing ? "Importing..." : "Import Guards"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} guard{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} selected guard{selectedIds.size > 1 ? "s" : ""} and all their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkLoading ? "Deleting..." : `Delete ${selectedIds.size} guard${selectedIds.size > 1 ? "s" : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
