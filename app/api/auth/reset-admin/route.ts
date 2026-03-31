import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Temporary endpoint to fix admin password - remove after use
export async function GET() {
  try {
    const newHash = await hashPassword('admin123')
    console.log("[v0] New hash generated:", newHash)
    
    await sql`
      UPDATE users 
      SET password_hash = ${newHash}
      WHERE email = 'admin@securityrms.com'
    `
    
    return NextResponse.json({ 
      success: true, 
      message: 'Admin password reset to admin123',
      hash: newHash 
    })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
