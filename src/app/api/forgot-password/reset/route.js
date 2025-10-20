// src/app/api/forgot-password/reset/route.js
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { query } from '@/lib/database'

export async function POST(request) {
  try {
    const { resetToken, newPassword, confirmPassword } = await request.json().catch(() => ({}))
    if (!resetToken || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const sres = await query('SELECT user_id, expires_at FROM password_reset_sessions WHERE token = $1', [resetToken])
    const session = sres.rows?.[0]
    if (!session) return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 })
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Reset token expired' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, session.user_id])
    // Invalidate the reset session token
    await query('DELETE FROM password_reset_sessions WHERE token = $1', [resetToken])

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('reset password error:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
