import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { sendEmail, guardOffNotificationEmail } from "@/lib/email"

// GET — list offs (roster_manager sees all, guard sees own)
export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const guardId = searchParams.get("guard_id")
    const from    = searchParams.get("from")
    const to      = searchParams.get("to")

    if (user.role === "guard") {
      // Guard sees only their own offs
      const guard = await sql`SELECT id FROM guards WHERE user_id = ${user.id} LIMIT 1`
      if (!guard.length) return NextResponse.json([])
      const rows = await sql`
        SELECT go.*, g.first_name || ' ' || g.last_name AS guard_name
        FROM guard_offs go JOIN guards g ON g.id = go.guard_id
        WHERE go.guard_id = ${guard[0].id}
        ORDER BY go.date DESC
      `
      return NextResponse.json(rows)
    }

    // Staff — can filter by guard / date range
    let rows
    if (guardId && from && to) {
      rows = await sql`
        SELECT go.*, g.first_name || ' ' || g.last_name AS guard_name
        FROM guard_offs go JOIN guards g ON g.id = go.guard_id
        WHERE go.guard_id = ${guardId} AND go.date >= ${from}::date AND go.date <= ${to}::date
        ORDER BY go.date
      `
    } else if (guardId) {
      rows = await sql`
        SELECT go.*, g.first_name || ' ' || g.last_name AS guard_name
        FROM guard_offs go JOIN guards g ON g.id = go.guard_id
        WHERE go.guard_id = ${guardId}
        ORDER BY go.date DESC
      `
    } else if (from && to) {
      rows = await sql`
        SELECT go.*, g.first_name || ' ' || g.last_name AS guard_name
        FROM guard_offs go JOIN guards g ON g.id = go.guard_id
        WHERE go.date >= ${from}::date AND go.date <= ${to}::date
        ORDER BY go.date, g.first_name
      `
    } else {
      rows = await sql`
        SELECT go.*, g.first_name || ' ' || g.last_name AS guard_name
        FROM guard_offs go JOIN guards g ON g.id = go.guard_id
        ORDER BY go.date DESC
        LIMIT 200
      `
    }

    return NextResponse.json(rows)
  } catch (error) {
    console.error("[guard-offs GET]", error)
    return NextResponse.json({ error: "Failed to fetch offs" }, { status: 500 })
  }
}

// POST — roster manager or admin creates off day(s)
export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user || !["roster_manager", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Only Roster Managers can plan offs" }, { status: 403 })
    }

    const body = await request.json()
    // Support single off or bulk { guard_id, dates: [], reason, notes }
    const { guard_id, dates, date, reason, notes } = body
    const datesArray: string[] = dates ?? (date ? [date] : [])

    if (!guard_id || datesArray.length === 0 || !reason?.trim()) {
      return NextResponse.json({ error: "guard_id, at least one date, and reason are required" }, { status: 400 })
    }

    const [guard] = await sql`SELECT * FROM guards WHERE id = ${guard_id}`
    if (!guard) return NextResponse.json({ error: "Guard not found" }, { status: 404 })

    const created = []
    for (const d of datesArray) {
      try {
        const [row] = await sql`
          INSERT INTO guard_offs (guard_id, date, reason, notes, created_by)
          VALUES (${guard_id}, ${d}::date, ${reason.trim()}, ${notes ?? null}, ${user.id})
          ON CONFLICT (guard_id, date) DO UPDATE SET reason = EXCLUDED.reason, notes = EXCLUDED.notes
          RETURNING *
        `
        created.push(row)
      } catch { /* skip duplicates */ }
    }

    // Notify guard by email if they have one
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://centuriongrp.rw"
    if (guard.email && created.length > 0) {
      for (const off of created) {
        await sendEmail({
          to: guard.email,
          subject: `Day Off Scheduled — ${new Date(off.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
          html: guardOffNotificationEmail({
            guardName: `${guard.first_name} ${guard.last_name}`,
            date: off.date,
            reason: off.reason,
            notes: off.notes ?? undefined,
            portalUrl: `${appUrl}/guard-portal`,
          }),
        })
      }
    }

    return NextResponse.json({ created: created.length, offs: created }, { status: 201 })
  } catch (error) {
    console.error("[guard-offs POST]", error)
    return NextResponse.json({ error: "Failed to create offs" }, { status: 500 })
  }
}

// DELETE — remove a specific off day
export async function DELETE(request: Request) {
  try {
    const user = await getSession()
    if (!user || !["roster_manager", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await sql`DELETE FROM guard_offs WHERE id = ${Number(id)}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[guard-offs DELETE]", error)
    return NextResponse.json({ error: "Failed to delete off" }, { status: 500 })
  }
}
