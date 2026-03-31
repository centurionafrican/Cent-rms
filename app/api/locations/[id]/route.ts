import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['admin'])
    const { id } = await params
    const body = await request.json()

    let result
    if (body.is_active !== undefined) {
      result = await sql`
        UPDATE locations
        SET is_active = ${body.is_active}
        WHERE id = ${id}
        RETURNING *
      `
    } else {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ location: result[0] })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Update location error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
