import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { sendEmail, incidentReportEmail } from "@/lib/email"

export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { email, subject, additionalNotes } = body

    // Fetch incident details
    const incidents = await sql`
      SELECT 
        i.*,
        s.name as site_name,
        s.address as site_address,
        g.first_name || ' ' || g.last_name as guard_name,
        u.first_name || ' ' || u.last_name as reported_by_name
      FROM incidents i
      LEFT JOIN sites s ON s.id = i.site_id
      LEFT JOIN guards g ON g.id = i.guard_id
      LEFT JOIN users u ON u.id = i.reported_by
      WHERE i.id = ${id}
    `

    if (incidents.length === 0) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    const incident = incidents[0]

    // Build email content for text version
    const emailContent = `
INCIDENT REPORT
===============

Title: ${incident.title}
Type: ${incident.incident_type}
Severity: ${incident.severity}
Status: ${incident.status}

Date/Time: ${new Date(incident.incident_date as string).toLocaleString()}
Site: ${incident.site_name || "N/A"} ${incident.site_address ? `(${incident.site_address})` : ""}
Guard Involved: ${incident.guard_name || "N/A"}
Reported By: ${incident.reported_by_name || "N/A"}

DESCRIPTION
-----------
${incident.description}

${incident.actions_taken ? `
ACTIONS TAKEN
-------------
${incident.actions_taken}
` : ""}

${additionalNotes ? `
ADDITIONAL NOTES
----------------
${additionalNotes}
` : ""}

---
This report was generated automatically by Centurion RMS (Roster Management System)
Report ID: ${incident.id}
Generated at: ${new Date().toLocaleString()}
    `.trim()

    // Send email via Microsoft 365 SMTP
    const result = await sendEmail({
      to: email,
      subject: subject || `Incident Report: ${incident.title}`,
      html: incidentReportEmail({
        title: incident.title,
        incident_type: incident.incident_type,
        severity: incident.severity,
        status: incident.status,
        incident_date: incident.incident_date as string,
        site_name: incident.site_name,
        guard_name: incident.guard_name,
        reported_by_name: incident.reported_by_name,
        description: incident.description,
        actions_taken: incident.actions_taken,
        id: incident.id,
      }, additionalNotes),
      text: emailContent,
    })

    if (!result.success) {
      console.error("Email send failed:", result.error)
    }

    // Update incident with email sent info
    await sql`
      UPDATE incidents 
      SET email_sent = true,
          email_sent_to = ${email},
          email_sent_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    return NextResponse.json({ 
      success: true, 
      message: result.success ? "Email sent successfully" : `Email recorded but sending failed: ${result.error}`,
      emailContent,
      sentTo: email
    })
  } catch (error) {
    console.error("Failed to send incident email:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
