// src/app/api/forgot-password/verify-otp/route.js
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { query } from '@/lib/database'

export async function POST(request) {
  try {
    const { username, otp } = await request.json().catch(() => ({}))
    if (!username || !otp) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const ures = await query('SELECT user_id FROM users WHERE username = $1', [username])
    const user = ures.rows?.[0]
    if (!user) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

    const tres = await query(
      `SELECT id, otp_hash, expires_at, used FROM password_reset_tokens
       WHERE user_id = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.user_id]
    )
    const tokenRow = tres.rows?.[0]
    if (!tokenRow) return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })

    const ok = await bcrypt.compare(otp, tokenRow.otp_hash)
    if (!ok) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

    const resetToken = randomUUID()
    // Store reset token with short TTL (15 min)
    await query(
      `CREATE TABLE IF NOT EXISTS password_reset_sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    )
    const exp = new Date(Date.now() + 15 * 60 * 1000)
    await query('INSERT INTO password_reset_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [resetToken, user.user_id, exp])

    // Mark OTP row as used to prevent reuse
    await query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenRow.id])

    return NextResponse.json({ success: true, resetToken })
  } catch (e) {
    console.error('verify-otp error:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
