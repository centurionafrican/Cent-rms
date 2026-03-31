import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const availability = await sql`
      SELECT * FROM availability
      WHERE user_id = ${user.id}
      ORDER BY day_of_week, start_time
    `

    return NextResponse.json({ availability })
  } catch (error) {
    console.error('Get availability error:', error)
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

    const { availability } = await request.json()

    if (!Array.isArray(availability)) {
      return NextResponse.json(
        { error: 'Invalid availability data' },
        { status: 400 }
      )
    }

    // Delete existing availability
    await sql`DELETE FROM availability WHERE user_id = ${user.id}`

    // Insert new availability
    for (const item of availability) {
      await sql`
        INSERT INTO availability (user_id, day_of_week, start_time, end_time, is_available)
        VALUES (
          ${user.id}, 
          ${item.day_of_week}, 
          ${item.start_time}::time, 
          ${item.end_time}::time, 
          ${item.is_available}
        )
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save availability error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
