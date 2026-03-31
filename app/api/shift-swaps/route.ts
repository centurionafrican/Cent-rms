import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let requests
    if (user.role === 'employee') {
      requests = await sql`
        SELECT sw.*, 
               s.start_time as shift_start, s.end_time as shift_end,
               l.name as location_name,
               req.first_name as requester_first_name, req.last_name as requester_last_name,
               tgt.first_name as target_first_name, tgt.last_name as target_last_name,
               rev.first_name as reviewer_first_name, rev.last_name as reviewer_last_name
        FROM shift_swap_requests sw
        JOIN shifts s ON s.id = sw.original_shift_id
        JOIN locations l ON l.id = s.location_id
        JOIN users req ON req.id = sw.requester_id
        LEFT JOIN users tgt ON tgt.id = sw.target_user_id
        LEFT JOIN users rev ON rev.id = sw.reviewed_by
        WHERE sw.requester_id = ${user.id} OR sw.target_user_id = ${user.id}
        ORDER BY sw.created_at DESC
      `
    } else {
      requests = await sql`
        SELECT sw.*, 
               s.start_time as shift_start, s.end_time as shift_end,
               l.name as location_name,
               req.first_name as requester_first_name, req.last_name as requester_last_name,
               tgt.first_name as target_first_name, tgt.last_name as target_last_name,
               rev.first_name as reviewer_first_name, rev.last_name as reviewer_last_name
        FROM shift_swap_requests sw
        JOIN shifts s ON s.id = sw.original_shift_id
        JOIN locations l ON l.id = s.location_id
        JOIN users req ON req.id = sw.requester_id
        LEFT JOIN users tgt ON tgt.id = sw.target_user_id
        LEFT JOIN users rev ON rev.id = sw.reviewed_by
        ORDER BY 
          CASE WHEN sw.status = 'pending' THEN 0 ELSE 1 END,
          sw.created_at DESC
      `
    }

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Get shift swaps error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { original_shift_id, target_user_id, notes } = await request.json()

    if (!original_shift_id) {
      return NextResponse.json(
        { error: 'Shift is required' },
        { status: 400 }
      )
    }

    // Verify the shift belongs to the user
    const shift = await sql`
      SELECT * FROM shifts WHERE id = ${original_shift_id} AND user_id = ${user.id}
    `

    if (shift.length === 0) {
      return NextResponse.json(
        { error: 'Shift not found or not yours' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO shift_swap_requests (requester_id, original_shift_id, target_user_id, notes)
      VALUES (${user.id}, ${original_shift_id}, ${target_user_id === 'anyone' ? null : target_user_id}, ${notes})
      RETURNING *
    `

    return NextResponse.json({ request: result[0] }, { status: 201 })
  } catch (error) {
    console.error('Create shift swap error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
