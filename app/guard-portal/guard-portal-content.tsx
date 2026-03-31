"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Shield, Mail, Loader2, MapPin, Clock, Calendar, User,
  FileText, CheckCircle2, LogOut, Download, Phone, IdCard,
  RefreshCw, AlertCircle,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

interface Guard {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  title: string
  guard_title: string | null
  status: string
  id_number: string | null
  date_joined: string | null
  annual_leave_days: number
  leave_days_used: number
  hire_date: string
  gender: string | null
  discipline: string | null
  address: string | null
  nationality: string | null
}

interface Assignment {
  id: number
  date: string
  site_name: string
  site_address?: string
  shift_name: string
  start_time: string
  end_time: string
  status: string
  reliever_name?: string
  shift_color?: string
  notes?: string
}

interface LeaveRequest {
  id: number
  leave_type: string
  start_date: string
  end_date: string
  status: string
  reason: string
  ops_manager_status?: string
  hr_status?: string
  coceo_status?: string
  created_at: string
}

interface AttendanceRecord {
  id: number
  date: string
  site_name: string | null
  check_in: string | null
  check_out: string | null
  status: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_KEY = "guard_portal_session"

function statusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case "approved": case "present": case "completed": case "scheduled":
      return "bg-green-50 text-green-700 border-green-200"
    case "pending":
      return "bg-yellow-50 text-yellow-700 border-yellow-200"
    case "rejected": case "absent":
      return "bg-red-50 text-red-700 border-red-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtTime(t: string | null) {
  if (!t) return "—"
  try { return new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) } catch { return t }
}

// ── OTP Input (6 boxes) ──────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(6, "").split("").slice(0, 6)

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      const next = digits.map((d, idx) => (idx === i ? "" : d)).join("").trimEnd()
      onChange(next)
      if (i > 0) inputs.current[i - 1]?.focus()
    }
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, "").slice(-1)
    const next = digits.map((d, idx) => (idx === i ? char : d)).join("")
    onChange(next.trimEnd())
    if (char && i < 5) inputs.current[i + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted) { onChange(pasted); inputs.current[Math.min(pasted.length, 5)]?.focus() }
    e.preventDefault()
  }

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          className="w-11 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:border-slate-900 transition-colors bg-white"
          style={{ borderColor: digits[i] ? "#0f172a" : "#d1d5db" }}
        />
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

type View = "email" | "otp" | "portal"

export default function GuardPortalContent({ tokenFromUrl }: { tokenFromUrl: string | null }) {
  const [view, setView] = useState<View>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)

  const [guard, setGuard] = useState<Guard | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY)
    if (saved) loadSession(saved)
  }, [])

  // Handle legacy magic-link token in URL
  useEffect(() => {
    if (tokenFromUrl) verifyMagicToken(tokenFromUrl)
  }, [tokenFromUrl])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  async function verifyMagicToken(token: string) {
    setLoading(true)
    try {
      const res = await fetch("/api/guard-portal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        const data = await res.json()
        setGuard(data.guard)
        setAssignments(data.assignments || [])
        setLeaves(data.leaves || [])
        setAttendance(data.attendance || [])
        setView("portal")
      } else {
        setError("This link has expired. Please log in with your email.")
      }
    } catch { setError("Failed to verify link.") }
    finally { setLoading(false) }
  }

  async function loadSession(token: string) {
    setLoading(true)
    try {
      const res = await fetch("/api/guard-portal/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: token }),
      })
      if (res.ok) {
        const data = await res.json()
        setGuard(data.guard)
        setAssignments(data.assignments || [])
        setLeaves(data.leaves || [])
        setAttendance(data.attendance || [])
        setSessionToken(token)
        setView("portal")
      } else {
        localStorage.removeItem(SESSION_KEY)
      }
    } catch { localStorage.removeItem(SESSION_KEY) }
    finally { setLoading(false) }
  }

  async function requestOtp() {
    if (!email) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/guard-portal/otp-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setView("otp")
        setResendCooldown(60)
      } else {
        setError("Could not send code. Please check your email and try again.")
      }
    } catch { setError("Network error. Please try again.") }
    finally { setLoading(false) }
  }

  async function verifyOtp() {
    if (otp.length < 6) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/guard-portal/otp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (res.ok && data.session_token) {
        localStorage.setItem(SESSION_KEY, data.session_token)
        await loadSession(data.session_token)
      } else {
        setError(data.error || "Invalid code. Please try again.")
      }
    } catch { setError("Network error. Please try again.") }
    finally { setLoading(false) }
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY)
    setView("email")
    setGuard(null)
    setAssignments([])
    setLeaves([])
    setAttendance([])
    setEmail("")
    setOtp("")
    setError("")
    setSessionToken(null)
  }

  function downloadReport() {
    if (!guard) return
    const today = new Date().toLocaleDateString("en-GB")

    const upcomingAssignments = assignments.filter(a => new Date(a.date) >= new Date())
    const approvedLeave = leaves.filter(l => l.status === "approved")
    const leaveRemaining = (guard.annual_leave_days || 21) - (guard.leave_days_used || 0)

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Guard Portal Report — ${guard.first_name} ${guard.last_name}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111; font-size: 13px; }
  .header { background: #0f172a; color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 4px 0 0; color: #94a3b8; font-size: 12px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .field { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
  .field label { font-size: 11px; color: #64748b; display: block; }
  .field span { font-size: 13px; font-weight: 600; color: #111; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0f172a; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #16a34a; }
  .badge-yellow { background: #fef9c3; color: #a16207; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
</head><body>
<div class="header">
  <h1>Centurion RMS — Guard Portal Report</h1>
  <p>Generated on ${today} &nbsp;|&nbsp; Confidential</p>
</div>

<div class="section">
  <div class="section-title">Personal Information</div>
  <div class="grid">
    <div class="field"><label>Full Name</label><span>${guard.first_name} ${guard.last_name}</span></div>
    <div class="field"><label>ID Number</label><span>${guard.id_number || "N/A"}</span></div>
    <div class="field"><label>Email</label><span>${guard.email || "N/A"}</span></div>
    <div class="field"><label>Phone</label><span>${guard.phone || "N/A"}</span></div>
    <div class="field"><label>Title</label><span>${guard.guard_title || guard.title || "Security Guard"}</span></div>
    <div class="field"><label>Status</label><span>${guard.status}</span></div>
    <div class="field"><label>Gender</label><span>${guard.gender || "N/A"}</span></div>
    <div class="field"><label>Nationality</label><span>${guard.nationality || "N/A"}</span></div>
    <div class="field"><label>Date Joined</label><span>${guard.date_joined ? fmt(guard.date_joined) : "N/A"}</span></div>
    <div class="field"><label>Address</label><span>${guard.address || "N/A"}</span></div>
    <div class="field"><label>Leave Balance</label><span>${leaveRemaining} / ${guard.annual_leave_days} days remaining</span></div>
    <div class="field"><label>Discipline</label><span>${guard.discipline || "None"}</span></div>
  </div>
</div>

${upcomingAssignments.length > 0 ? `
<div class="section">
  <div class="section-title">Upcoming Assignments (${upcomingAssignments.length})</div>
  <table>
    <thead><tr><th>Date</th><th>Site</th><th>Shift</th><th>Time</th><th>Status</th></tr></thead>
    <tbody>
      ${upcomingAssignments.map(a => `
        <tr>
          <td>${fmt(a.date)}</td>
          <td>${a.site_name}</td>
          <td>${a.shift_name}</td>
          <td>${a.start_time} – ${a.end_time}</td>
          <td><span class="badge badge-green">${a.status}</span></td>
        </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

${approvedLeave.length > 0 ? `
<div class="section">
  <div class="section-title">Approved Leave Requests</div>
  <table>
    <thead><tr><th>Type</th><th>From</th><th>To</th><th>Status</th></tr></thead>
    <tbody>
      ${approvedLeave.map(l => `
        <tr>
          <td>${l.leave_type}</td>
          <td>${fmt(l.start_date)}</td>
          <td>${fmt(l.end_date)}</td>
          <td><span class="badge badge-green">${l.status}</span></td>
        </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

${attendance.length > 0 ? `
<div class="section">
  <div class="section-title">Recent Attendance</div>
  <table>
    <thead><tr><th>Date</th><th>Site</th><th>Check In</th><th>Check Out</th><th>Status</th></tr></thead>
    <tbody>
      ${attendance.slice(0, 20).map(a => `
        <tr>
          <td>${fmt(a.date)}</td>
          <td>${a.site_name || "N/A"}</td>
          <td>${fmtTime(a.check_in)}</td>
          <td>${fmtTime(a.check_out)}</td>
          <td><span class="badge ${a.status === "present" ? "badge-green" : "badge-red"}">${a.status}</span></td>
        </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

<div class="footer">Centurion Group Ltd &nbsp;|&nbsp; no-reply@centuriongrp.rw &nbsp;|&nbsp; This report is for the named guard only.</div>
</body></html>`

    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `guard-report-${guard.first_name}-${guard.last_name}-${today.replace(/\//g, "-")}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading && view !== "portal") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400">Please wait...</p>
        </div>
      </div>
    )
  }

  // ── Email step ────────────────────────────────────────────────────────────

  if (view === "email") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Guard Portal</h1>
            <p className="text-slate-400 mt-1 text-sm">Enter your registered email to sign in</p>
          </div>

          <Card className="border-0 shadow-2xl">
            <CardContent className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                  disabled={loading}
                  className="h-11"
                />
              </div>
              <Button
                onClick={requestOtp}
                disabled={loading || !email}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <><Mail className="mr-2 h-4 w-4" />Send Verification Code</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                A 6-digit code will be sent to your registered email address.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── OTP step ──────────────────────────────────────────────────────────────

  if (view === "otp") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Check your email</h1>
            <p className="text-slate-400 mt-1 text-sm">
              We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
            </p>
          </div>

          <Card className="border-0 shadow-2xl">
            <CardContent className="p-6 space-y-5">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-medium text-center block">Enter verification code</Label>
                <OtpInput value={otp} onChange={setOtp} />
              </div>

              <Button
                onClick={verifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Access Portal"}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => { setView("email"); setOtp(""); setError("") }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change email
                </button>
                <button
                  onClick={() => { setOtp(""); setError(""); setResendCooldown(60); requestOtp() }}
                  disabled={resendCooldown > 0 || loading}
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── Portal ────────────────────────────────────────────────────────────────

  const upcomingAssignments = assignments.filter(a => new Date(a.date) >= new Date(new Date().toDateString()))
  const pastAssignments = assignments.filter(a => new Date(a.date) < new Date(new Date().toDateString()))
  const leaveRemaining = (guard?.annual_leave_days || 21) - (guard?.leave_days_used || 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-slate-900 text-white sticky top-0 z-10 shadow">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-slate-300" />
            <div>
              <p className="font-semibold text-sm leading-none">Guard Portal</p>
              <p className="text-slate-400 text-xs mt-0.5">{guard?.first_name} {guard?.last_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={downloadReport}
              className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white text-xs h-8">
              <Download className="h-3.5 w-3.5 mr-1" />
              Download Report
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLogout}
              className="text-slate-400 hover:text-white hover:bg-slate-800 h-8">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Profile card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Full Name", value: `${guard?.first_name} ${guard?.last_name}`, icon: <User className="h-3.5 w-3.5" /> },
                { label: "ID Number", value: guard?.id_number || "N/A", icon: <IdCard className="h-3.5 w-3.5" /> },
                { label: "Phone", value: guard?.phone || "N/A", icon: <Phone className="h-3.5 w-3.5" /> },
                { label: "Email", value: guard?.email || "N/A", icon: <Mail className="h-3.5 w-3.5" /> },
                { label: "Title", value: guard?.guard_title || guard?.title || "Security Guard", icon: <Shield className="h-3.5 w-3.5" /> },
                { label: "Gender", value: guard?.gender || "N/A", icon: null },
                { label: "Date Joined", value: guard?.date_joined ? fmt(guard.date_joined) : "N/A", icon: <Calendar className="h-3.5 w-3.5" /> },
                { label: "Status", value: guard?.status || "N/A", icon: null, badge: true },
              ].map(({ label, value, icon, badge }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
                  {badge ? (
                    <Badge variant="outline" className={statusBadgeClass(value)}>{value}</Badge>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">{value}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Upcoming Shifts", value: upcomingAssignments.length, icon: <Calendar className="h-5 w-5 text-blue-600" />, color: "text-blue-600" },
            { label: "Total Assignments", value: assignments.length, icon: <MapPin className="h-5 w-5 text-slate-600" />, color: "text-slate-700" },
            { label: "Leave Remaining", value: `${leaveRemaining} days`, icon: <FileText className="h-5 w-5 text-emerald-600" />, color: "text-emerald-600" },
            { label: "Attendance Records", value: attendance.length, icon: <Clock className="h-5 w-5 text-amber-600" />, color: "text-amber-600" },
          ].map(({ label, value, icon, color }) => (
            <Card key={label} className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100">{icon}</div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="upcoming">Upcoming ({upcomingAssignments.length})</TabsTrigger>
            <TabsTrigger value="past">Past Assignments</TabsTrigger>
            <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          {/* Upcoming */}
          <TabsContent value="upcoming">
            <Card className="shadow-sm">
              <CardContent className="p-0">
                {upcomingAssignments.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No upcoming assignments</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Site</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingAssignments.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{fmt(a.date)}</TableCell>
                            <TableCell>
                              <div>{a.site_name}</div>
                              {a.site_address && <div className="text-xs text-muted-foreground">{a.site_address}</div>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {a.shift_color && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.shift_color }} />}
                                {a.shift_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{a.start_time} – {a.end_time}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusBadgeClass(a.status)}>{a.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Past */}
          <TabsContent value="past">
            <Card className="shadow-sm">
              <CardContent className="p-0">
                {pastAssignments.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No past assignments</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Site</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pastAssignments.map((a) => (
                          <TableRow key={a.id} className="opacity-75">
                            <TableCell className="font-medium">{fmt(a.date)}</TableCell>
                            <TableCell>{a.site_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {a.shift_color && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.shift_color }} />}
                                {a.shift_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{a.start_time} – {a.end_time}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusBadgeClass(a.status)}>{a.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaves */}
          <TabsContent value="leaves">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Leave Balance</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    <span className="text-lg font-bold text-emerald-600">{leaveRemaining}</span>
                    /{guard?.annual_leave_days} days remaining
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.max(0, (leaveRemaining / (guard?.annual_leave_days || 21)) * 100)}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {leaves.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No leave requests</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Ops</TableHead>
                        <TableHead>HR</TableHead>
                        <TableHead>Co-CEO</TableHead>
                        <TableHead>Overall</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.leave_type}</TableCell>
                          <TableCell>{fmt(l.start_date)}</TableCell>
                          <TableCell>{fmt(l.end_date)}</TableCell>
                          <TableCell><Badge variant="outline" className={statusBadgeClass(l.ops_manager_status || "pending")} style={{fontSize:"11px"}}>{l.ops_manager_status || "pending"}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className={statusBadgeClass(l.hr_status || "pending")} style={{fontSize:"11px"}}>{l.hr_status || "pending"}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className={statusBadgeClass(l.coceo_status || "pending")} style={{fontSize:"11px"}}>{l.coceo_status || "pending"}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className={statusBadgeClass(l.status)}>{l.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance">
            <Card className="shadow-sm">
              <CardContent className="p-0">
                {attendance.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No attendance records</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Site</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{fmt(r.date)}</TableCell>
                            <TableCell>{r.site_name || "N/A"}</TableCell>
                            <TableCell className="text-sm">{fmtTime(r.check_in)}</TableCell>
                            <TableCell className="text-sm">{fmtTime(r.check_out)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusBadgeClass(r.status)}>{r.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
