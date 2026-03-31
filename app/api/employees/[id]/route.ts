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

    const updates: string[] = []
    const values: (string | boolean | null)[] = []

    if (body.is_active !== undefined) {
      updates.push('is_active')
      values.push(body.is_active)
    }

    if (body.role) {
      updates.push('role')
      values.push(body.role)
    }

    if (body.phone !== undefined) {
      updates.push('phone')
      values.push(body.phone)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    // Build dynamic update query
    let result
    if (body.is_active !== undefined) {
      result = await sql`
        UPDATE users
        SET is_active = ${body.is_active}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, email, first_name, last_name, role, phone, employee_id, is_active
      `
    } else {
      result = await sql`
        UPDATE users
        SET updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, email, first_name, last_name, role, phone, employee_id, is_active
      `
    }

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ employee: result[0] })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Update employee error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
