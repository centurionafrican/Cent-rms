import { NextResponse } from 'next/server'
import { requireRole, hashPassword } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    await requireRole(['admin', 'manager'])

    const employees = await sql`
      SELECT id, email, first_name, last_name, role, phone, employee_id, hire_date, is_active, created_at
      FROM users
      WHERE role IN ('employee', 'manager')
      ORDER BY 
        CASE role WHEN 'manager' THEN 0 ELSE 1 END,
        first_name, last_name
    `

    return NextResponse.json({ employees })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Get employees error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['admin'])

    const { email, password, first_name, last_name, role, phone, employee_id } =
      await request.json()

    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    const password_hash = await hashPassword(password)

    const result = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role, phone, employee_id, hire_date)
      VALUES (
        ${email.toLowerCase()}, 
        ${password_hash}, 
        ${first_name}, 
        ${last_name}, 
        ${role || 'employee'}, 
        ${phone || null}, 
        ${employee_id || null},
        CURRENT_DATE
      )
      RETURNING id, email, first_name, last_name, role, phone, employee_id, hire_date, is_active, created_at
    `

    return NextResponse.json({ employee: result[0] }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Create employee error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
