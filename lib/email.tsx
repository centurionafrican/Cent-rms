/**
 * Email utility — Microsoft Graph API (plain fetch, no native modules).
 * Sends from no-reply@centuriongrp.rw using app-only auth (client credentials).
 *
 * Required env vars:
 *   M365_TENANT_ID     – Azure AD tenant ID
 *   M365_CLIENT_ID     – App registration client ID
 *   M365_CLIENT_SECRET – App registration client secret
 */

const SENDER_ADDRESS = "no-reply@centuriongrp.rw"
const SENDER_NAME = "Centurion RMS"

export interface EmailAttachment {
  name: string
  contentType: string
  contentBytes: string // base64 encoded
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
}

export interface EmailResult {
  success: boolean
  error?: string
}

async function getAccessToken(): Promise<string> {
  const tenantId = process.env.M365_TENANT_ID
  const clientId = process.env.M365_CLIENT_ID
  const clientSecret = process.env.M365_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing M365_TENANT_ID, M365_CLIENT_ID, or M365_CLIENT_SECRET environment variables")
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }).toString(),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to get access token (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.access_token as string
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, attachments } = options

  try {
    const token = await getAccessToken()

    const message: Record<string, unknown> = {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: [{ emailAddress: { address: to } }],
      from: { emailAddress: { name: SENDER_NAME, address: SENDER_ADDRESS } },
    }

    if (attachments && attachments.length > 0) {
      message.attachments = attachments.map((a) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: a.name,
        contentType: a.contentType,
        contentBytes: a.contentBytes,
      }))
    }

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${SENDER_ADDRESS}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, saveToSentItems: true }),
      }
    )

    if (res.status === 202) {
      return { success: true }
    }

    const errText = await res.text()
    let errMessage = `Graph API error (${res.status})`
    try {
      const errJson = JSON.parse(errText)
      errMessage = errJson?.error?.message || errMessage
    } catch {
      errMessage = errText || errMessage
    }

    console.error("[email] Graph API send failed:", errMessage)
    return { success: false, error: errMessage }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[email] sendEmail error:", message)
    return { success: false, error: message }
  }
}

// ── Email templates ──────────────────────────────────────────────────────────

function emailWrapper(title: string, body: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Centurion RMS</h1>
        <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">${title}</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;background:#fff;">
        ${body}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px;">
        <p style="color:#9ca3af;font-size:11px;margin:0;">
          Centurion Group Ltd &nbsp;|&nbsp; no-reply@centuriongrp.rw<br>
          Do not reply to this email.
        </p>
      </div>
    </div>
  `
}

export function guardPortalAccessEmail(guardName: string, magicLink: string): string {
  return emailWrapper("Guard Portal Access", `
    <p style="color:#111827;">Hello <strong>${guardName}</strong>,</p>
    <p style="color:#374151;">You have been granted access to the Guard Portal. Click the button below to view your profile and information:</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${magicLink}" style="background:#0f172a;color:#fff;padding:13px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;font-size:15px;">
        Access Guard Portal
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;">This link is valid for 7 days and can only be used once. Do not share it with anyone.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;border-radius:6px;margin-top:16px;">
      <p style="margin:0;color:#64748b;font-size:12px;"><strong>Having trouble?</strong> Copy and paste this URL into your browser:</p>
      <p style="margin:8px 0 0;word-break:break-all;color:#0f172a;font-size:12px;font-family:monospace;">${magicLink}</p>
    </div>
  `)
}

export function guardPortalLoginEmail(guardName: string, magicLink: string): string {
  return emailWrapper("Guard Portal Login Link", `
    <p style="color:#111827;">Hello <strong>${guardName}</strong>,</p>
    <p style="color:#374151;">You requested access to your Guard Portal. Click the button below to sign in:</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${magicLink}" style="background:#0f172a;color:#fff;padding:13px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;font-size:15px;">
        Access My Portal
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;">This link is valid for 7 days and can only be used once.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;border-radius:6px;margin-top:16px;">
      <p style="margin:0;color:#64748b;font-size:12px;"><strong>Having trouble?</strong> Copy and paste this URL:</p>
      <p style="margin:8px 0 0;word-break:break-all;color:#0f172a;font-size:12px;font-family:monospace;">${magicLink}</p>
    </div>
  `)
}

export function guardOtpEmail(guardName: string, otpCode: string): string {
  return emailWrapper("Your Portal Verification Code", `
    <p style="color:#111827;">Hello <strong>${guardName}</strong>,</p>
    <p style="color:#374151;">Use the code below to access your Guard Portal. This code expires in <strong>10 minutes</strong>.</p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:#f1f5f9;border:2px solid #0f172a;border-radius:10px;padding:16px 40px;">
        <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:10px;color:#0f172a;font-family:monospace;">${otpCode}</p>
      </div>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;">Enter this code on the Guard Portal login page.</p>
    <p style="color:#ef4444;font-size:12px;text-align:center;margin-top:8px;">If you did not request this code, please ignore this email.</p>
  `)
}

export interface AssignmentNotificationData {
  guardName: string
  siteName: string
  shiftName: string
  shiftStart: string
  shiftEnd: string
  date: string
  portalUrl: string
}

export function assignmentNotificationEmail(data: AssignmentNotificationData): string {
  const displayDate = new Date(data.date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
  return emailWrapper("New Assignment Notification", `
    <p style="color:#111827;">Hello <strong>${data.guardName}</strong>,</p>
    <p style="color:#374151;">You have been assigned to a shift. Here are the details:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:8px;overflow:hidden;">
      <tr style="background:#0f172a;">
        <td colspan="2" style="padding:10px 16px;color:#fff;font-weight:700;font-size:14px;">Assignment Details</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 16px;color:#64748b;font-size:13px;width:130px;">Date</td>
        <td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${displayDate}</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 16px;color:#64748b;font-size:13px;">Site</td>
        <td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.siteName}</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 16px;color:#64748b;font-size:13px;">Shift</td>
        <td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.shiftName}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;">Time</td>
        <td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.shiftStart} – ${data.shiftEnd}</td>
      </tr>
    </table>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.portalUrl}" style="background:#0f172a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;font-size:14px;">
        View My Portal
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;">Log in to your portal to view all your assignments and details.</p>
  `)
}

// ── Assignment Change Request emails ────────────────────────────────────────

export function assignmentChangeRequestEmail(data: {
  opsManagerName: string
  coordinatorName: string
  guardName: string
  siteName: string
  shiftName: string
  date: string
  reason: string
  requestedGuardName?: string
  reviewUrl: string
}): string {
  const displayDate = new Date(data.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  return emailWrapper("Assignment Change Request — Action Required", `
    <p style="color:#111827;">Hello <strong>${data.opsManagerName}</strong>,</p>
    <p style="color:#374151;">A coordinator has submitted an assignment change request that requires your approval.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:8px;overflow:hidden;">
      <tr style="background:#0f172a;"><td colspan="2" style="padding:10px 16px;color:#fff;font-weight:700;font-size:14px;">Request Details</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;width:160px;">Requested By</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.coordinatorName}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;">Current Guard</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.guardName}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;">Site</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.siteName}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;">Date</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${displayDate}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;">Shift</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.shiftName}</td></tr>
      ${data.requestedGuardName ? `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;">Suggested Replacement</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.requestedGuardName}</td></tr>` : ""}
    </table>
    <div style="background:#fff8ed;border:1px solid #f59e0b;padding:14px 16px;border-radius:8px;margin-bottom:20px;">
      <h3 style="margin:0 0 6px;color:#92400e;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">Reason</h3>
      <p style="margin:0;color:#374151;font-size:13px;">${data.reason}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.reviewUrl}" style="background:#0f172a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;font-size:14px;">Review Request</a>
    </div>
  `)
}

export function assignmentChangeApprovedEmail(data: {
  rosterManagerName: string
  coordinatorName: string
  guardName: string
  siteName: string
  shiftName: string
  date: string
  opsNotes?: string
  executeUrl: string
}): string {
  const displayDate = new Date(data.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  return emailWrapper("Assignment Change Request Approved — Please Execute", `
    <p style="color:#111827;">Hello <strong>${data.rosterManagerName}</strong>,</p>
    <p style="color:#374151;">An assignment change request has been <strong style="color:#16a34a;">approved</strong> by the Operations Manager and is ready for you to execute.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:8px;overflow:hidden;">
      <tr style="background:#0f172a;"><td colspan="2" style="padding:10px 16px;color:#fff;font-weight:700;font-size:14px;">Assignment Details</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;width:160px;">Current Guard</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.guardName}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;">Site</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.siteName}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;">Date</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${displayDate}</td></tr>
      <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Shift</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.shiftName}</td></tr>
    </table>
    ${data.opsNotes ? `<div style="background:#f0fdf4;border:1px solid #86efac;padding:14px 16px;border-radius:8px;margin-bottom:20px;"><h3 style="margin:0 0 6px;color:#166534;font-size:13px;">Ops Manager Notes</h3><p style="margin:0;color:#166534;font-size:13px;">${data.opsNotes}</p></div>` : ""}
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.executeUrl}" style="background:#16a34a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;font-size:14px;">Execute Change</a>
    </div>
  `)
}

export function assignmentChangedGuardEmail(data: {
  guardName: string
  siteName: string
  shiftName: string
  date: string
  action: "assigned" | "removed"
  portalUrl: string
}): string {
  const displayDate = new Date(data.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  const isAssigned = data.action === "assigned"
  return emailWrapper(isAssigned ? "New Assignment — You Have Been Assigned" : "Assignment Update — Shift Change", `
    <p style="color:#111827;">Hello <strong>${data.guardName}</strong>,</p>
    ${isAssigned
      ? `<p style="color:#374151;">You have been <strong style="color:#16a34a;">assigned</strong> to the following shift:</p>`
      : `<p style="color:#374151;">Please note that you have been <strong style="color:#dc2626;">removed</strong> from the following assignment:</p>`
    }
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:8px;overflow:hidden;">
      <tr style="background:${isAssigned ? "#16a34a" : "#dc2626"};"><td colspan="2" style="padding:10px 16px;color:#fff;font-weight:700;font-size:14px;">${isAssigned ? "Assignment Details" : "Removed Assignment Details"}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;width:130px;">Date</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${displayDate}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;">Site</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.siteName}</td></tr>
      <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Shift</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.shiftName}</td></tr>
    </table>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.portalUrl}" style="background:#0f172a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;font-size:14px;">View My Portal</a>
    </div>
  `)
}

export function guardOffNotificationEmail(data: {
  guardName: string
  date: string
  reason: string
  notes?: string
  portalUrl: string
}): string {
  const displayDate = new Date(data.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  return emailWrapper("Day Off Scheduled", `
    <p style="color:#111827;">Hello <strong>${data.guardName}</strong>,</p>
    <p style="color:#374151;">A day off has been scheduled for you:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:8px;overflow:hidden;">
      <tr style="background:#0f172a;"><td colspan="2" style="padding:10px 16px;color:#fff;font-weight:700;font-size:14px;">Off Day Details</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 16px;color:#64748b;font-size:13px;width:130px;">Date</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${displayDate}</td></tr>
      <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Type</td><td style="padding:10px 16px;color:#111827;font-weight:600;font-size:13px;">${data.reason}</td></tr>
    </table>
    ${data.notes ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;border-radius:8px;margin-bottom:16px;"><p style="margin:0;color:#374151;font-size:13px;"><strong>Note:</strong> ${data.notes}</p></div>` : ""}
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.portalUrl}" style="background:#0f172a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;font-size:14px;">View My Schedule</a>
    </div>
  `)
}

export interface IncidentData {
  id: number
  title: string
  incident_type: string
  severity: string
  status: string
  incident_date: string
  site_name?: string
  guard_name?: string
  reported_by_name?: string
  description: string
  actions_taken?: string
}

export function incidentReportEmail(incident: IncidentData, additionalNotes?: string): string {
  const severityColor =
    incident.severity === "critical" ? "#dc2626" :
    incident.severity === "high" ? "#ea580c" : "#16a34a"

  return emailWrapper(`Incident Report — ${incident.title}`, `
    <div style="background:#f3f4f6;padding:14px 16px;border-radius:8px;margin-bottom:20px;border-left:4px solid ${severityColor};">
      <h2 style="margin:0 0 8px;color:#111827;font-size:17px;">${incident.title}</h2>
      <p style="margin:4px 0;font-size:13px;color:#374151;"><strong>Type:</strong> ${incident.incident_type}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Severity:</strong> <span style="color:${severityColor};font-weight:700;text-transform:uppercase;">${incident.severity}</span></p>
      <p style="margin:4px 0;font-size:13px;color:#374151;"><strong>Status:</strong> ${incident.status}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">Date / Time</td><td style="padding:6px 0;font-weight:500;font-size:13px;">${new Date(incident.incident_date).toLocaleString()}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Site</td><td style="padding:6px 0;font-weight:500;font-size:13px;">${incident.site_name || "N/A"}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Guard Involved</td><td style="padding:6px 0;font-weight:500;font-size:13px;">${incident.guard_name || "N/A"}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Reported By</td><td style="padding:6px 0;font-weight:500;font-size:13px;">${incident.reported_by_name || "N/A"}</td></tr>
    </table>
    <div style="background:#fff;border:1px solid #e5e7eb;padding:14px 16px;border-radius:8px;margin-bottom:14px;">
      <h3 style="margin:0 0 8px;color:#111827;font-size:14px;">Description</h3>
      <p style="white-space:pre-wrap;margin:0;color:#374151;font-size:13px;">${incident.description}</p>
    </div>
    ${incident.actions_taken ? `
    <div style="background:#ecfdf5;border:1px solid #10b981;padding:14px 16px;border-radius:8px;margin-bottom:14px;">
      <h3 style="margin:0 0 8px;color:#065f46;font-size:14px;">Actions Taken</h3>
      <p style="white-space:pre-wrap;margin:0;color:#065f46;font-size:13px;">${incident.actions_taken}</p>
    </div>` : ""}
    ${additionalNotes ? `
    <div style="background:#fef3c7;border:1px solid #f59e0b;padding:14px 16px;border-radius:8px;margin-bottom:14px;">
      <h3 style="margin:0 0 8px;color:#92400e;font-size:14px;">Additional Notes</h3>
      <p style="white-space:pre-wrap;margin:0;color:#92400e;font-size:13px;">${additionalNotes}</p>
    </div>` : ""}
    <p style="color:#9ca3af;font-size:11px;margin-top:16px;">Report ID: #${incident.id} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
  `)
}
