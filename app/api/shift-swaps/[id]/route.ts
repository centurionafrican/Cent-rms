import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(['admin', 'manager'])
    const { id } = await params
    const { status } = await request.json()

    if (!['approved', 'denied'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE shift_swap_requests
      SET status = ${status},
          reviewed_by = ${user.id},
          reviewed_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    // If approved, we could also update the shift assignment here
    // For now, managers will manually reassign the shift

    return NextResponse.json({ request: result[0] })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Review shift swap error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
