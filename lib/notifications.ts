// Notification service for SMS and Email
// SMS: Used for guard assignment notifications
// Email: Used for approval workflow notifications

import { sql } from "@/lib/db"

// SMS Provider interface - can be implemented with Twilio, Africa's Talking, etc.
interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Environment variables for SMS provider (configure in Vercel)
// SMS_PROVIDER: "twilio" | "africas_talking" | "mock"
// SMS_API_KEY: API key for the SMS provider
// SMS_SENDER_ID: Sender ID for SMS

// Environment variables for Email provider
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM

/**
 * Send SMS to a phone number
 */
export async function sendSMS(phone: string, message: string): Promise<SMSResult> {
  const provider = process.env.SMS_PROVIDER || "mock"
  
  // Clean phone number - ensure it has country code
  const cleanPhone = phone.replace(/\s+/g, "").replace(/^0/, "+250")
  
  console.log(`[SMS] Sending to ${cleanPhone}: ${message.substring(0, 50)}...`)
  
  if (provider === "mock" || !process.env.SMS_API_KEY) {
    // Mock mode for development - log and return success
    console.log(`[SMS Mock] Would send to ${cleanPhone}: ${message}`)
    return { success: true, messageId: `mock-${Date.now()}` }
  }
  
  if (provider === "twilio") {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const fromNumber = process.env.TWILIO_PHONE_NUMBER
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: cleanPhone,
            From: fromNumber || "",
            Body: message,
          }),
        }
      )
      
      const data = await response.json()
      if (response.ok) {
        return { success: true, messageId: data.sid }
      }
      return { success: false, error: data.message }
    } catch (error) {
      console.error("[SMS Twilio Error]", error)
      return { success: false, error: "Failed to send SMS" }
    }
  }
  
  // Add more providers as needed (Africa's Talking, etc.)
  return { success: false, error: "Unknown SMS provider" }
}

/**
 * Send Email notification
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const smtpHost = process.env.SMTP_HOST
  
  console.log(`[Email] Sending to ${to}: ${subject}`)
  
  if (!smtpHost || !process.env.SMTP_USER) {
    // Mock mode for development
    console.log(`[Email Mock] Would send to ${to}: ${subject}`)
    return { success: true, messageId: `mock-email-${Date.now()}` }
  }
  
  try {
    // Using nodemailer-style SMTP
    const nodemailer = await import("nodemailer")
    
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@centurion-rms.com",
      to,
      subject,
      html,
    })
    
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("[Email Error]", error)
    return { success: false, error: "Failed to send email" }
  }
}

/**
 * Notify guard of new assignment via SMS
 */
export async function notifyGuardAssignment(
  guardId: number,
  siteName: string,
  shiftName: string,
  date: string
): Promise<SMSResult> {
  // Get guard phone number
  const [guard] = await sql`SELECT first_name, last_name, phone FROM guards WHERE id = ${guardId}`
  
  if (!guard?.phone) {
    return { success: false, error: "Guard has no phone number" }
  }
  
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  
  const message = `CENTURION SECURITY: ${guard.first_name}, you have been assigned to ${siteName} (${shiftName}) on ${formattedDate}. Report on time.`
  
  return sendSMS(guard.phone, message)
}

/**
 * Get users by role for notification
 */
export async function getUsersByRole(role: string): Promise<Array<{ id: number; email: string; first_name: string }>> {
  const users = await sql`
    SELECT id, email, first_name 
    FROM users 
    WHERE role = ${role} AND email IS NOT NULL
  `
  return users as Array<{ id: number; email: string; first_name: string }>
}

/**
 * Notify next approver in workflow
 */
export async function notifyApprovalRequest(
  requestType: "leave" | "assignment_change",
  requestId: number,
  nextApproverRole: string,
  requesterName: string,
  details: string
): Promise<{ sent: number; failed: number }> {
  const approvers = await getUsersByRole(nextApproverRole)
  
  if (approvers.length === 0) {
    console.log(`[Notification] No ${nextApproverRole} users found to notify`)
    return { sent: 0, failed: 0 }
  }
  
  const roleLabels: Record<string, string> = {
    roster_manager: "Roster Manager",
    operations_manager: "Operations Manager",
    hr: "HR",
    coceo: "Co-CEO",
  }
  
  const requestTypeLabels: Record<string, string> = {
    leave: "Leave Request",
    assignment_change: "Assignment Change Request",
  }
  
  const subject = `Action Required: ${requestTypeLabels[requestType]} Pending Your Approval`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Centurion Security RMS</h1>
        </div>
        <div class="content">
          <h2>New ${requestTypeLabels[requestType]} Requires Your Approval</h2>
          <p>A new request has been submitted and requires your attention as ${roleLabels[nextApproverRole] || nextApproverRole}.</p>
          
          <div class="details">
            <p><strong>Request Type:</strong> ${requestTypeLabels[requestType]}</p>
            <p><strong>Requested By:</strong> ${requesterName}</p>
            <p><strong>Details:</strong> ${details}</p>
          </div>
          
          <p>Please log in to the RMS system to review and approve or reject this request.</p>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://centurion-rms.vercel.app"}/dashboard/${requestType === "leave" ? "leaves" : "assignment-change-requests"}" class="button">
            Review Request
          </a>
        </div>
        <div class="footer">
          <p>This is an automated message from Centurion Security RMS</p>
          <p>Please do not reply to this email</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  let sent = 0
  let failed = 0
  
  for (const approver of approvers) {
    const result = await sendEmail(approver.email, subject, html)
    if (result.success) {
      sent++
    } else {
      failed++
    }
  }
  
  console.log(`[Notification] ${requestTypeLabels[requestType]} #${requestId}: Sent ${sent}, Failed ${failed}`)
  return { sent, failed }
}
