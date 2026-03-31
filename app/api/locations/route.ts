import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    await requireRole(['admin', 'manager'])

    const locations = await sql`
      SELECT * FROM locations
      ORDER BY name
    `

    return NextResponse.json({ locations })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Get locations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['admin'])

    const { name, address, city, state, zip_code, phone } = await request.json()

    if (!name || !address || !city || !state) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO locations (name, address, city, state, zip_code, phone)
      VALUES (${name}, ${address}, ${city}, ${state}, ${zip_code || ''}, ${phone || null})
      RETURNING *
    `

    return NextResponse.json({ location: result[0] }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Create location error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
