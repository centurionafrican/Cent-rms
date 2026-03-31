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
        SELECT t.*, u.first_name, u.last_name,
               r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
        FROM time_off_requests t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN users r ON r.id = t.reviewed_by
        WHERE t.user_id = ${user.id}
        ORDER BY t.created_at DESC
      `
    } else {
      requests = await sql`
        SELECT t.*, u.first_name, u.last_name,
               r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
        FROM time_off_requests t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN users r ON r.id = t.reviewed_by
        ORDER BY 
          CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
          t.created_at DESC
      `
    }

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Get time off error:', error)
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

    const { start_date, end_date, reason } = await request.json()

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO time_off_requests (user_id, start_date, end_date, reason)
      VALUES (${user.id}, ${start_date}, ${end_date}, ${reason})
      RETURNING *
    `

    const fullRequest = await sql`
      SELECT t.*, u.first_name, u.last_name
      FROM time_off_requests t
      JOIN users u ON u.id = t.user_id
      WHERE t.id = ${result[0].id}
    `

    return NextResponse.json({ request: fullRequest[0] }, { status: 201 })
  } catch (error) {
    console.error('Create time off error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
