// src/app/api/forgot-password/request-otp/route.js
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { randomUUID } from 'crypto'
import { sendSetPasswordEmail } from '../_email'

async function ensureSessionTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '***'
  const [local, domain] = email.split('@')
  const visible = Math.min(4, local.length)
  const maskedLocal = `${local.slice(0, visible)}***`
  return `${maskedLocal}@${domain}`
}

export async function POST(request) {
  const { username } = await request.json().catch(() => ({}))
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  try {
    await ensureSessionTable()
    const res = await query('SELECT user_id, email FROM users WHERE username = $1', [username])
    const user = res.rows?.[0]

    if (!user) {
      return NextResponse.json({ error: 'No account found with that username' }, { status: 404 })
    }

    // Basic rate limiting: max 3 reset links in a rolling 15 minutes per user
    await query(`
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
        requested_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    const windowMinutes = 15
    const limit = 3
    const r = await query(
      // Use make_interval to avoid bad string concat
      'SELECT COUNT(*)::int AS cnt FROM password_reset_requests WHERE user_id = $1 AND requested_at > NOW() - make_interval(mins => $2::int)',
      [user.user_id, windowMinutes]
    )
    if ((r.rows?.[0]?.cnt || 0) >= limit) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }
    await query('INSERT INTO password_reset_requests (user_id) VALUES ($1)', [user.user_id])

    // Create reset session and email a link
    const resetToken = randomUUID()
    const exp = new Date(Date.now() + 15 * 60 * 1000)
    await query('INSERT INTO password_reset_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [resetToken, user.user_id, exp])

    const origin = request.headers.get('origin') || request.nextUrl.origin
    const link = `${origin}/set-password?token=${encodeURIComponent(resetToken)}`

    // Email link (best-effort)
    try {
      if (user.email) {
        console.log('Sending set-password email to', user.email)
        await sendSetPasswordEmail({ to: user.email, link, appName: 'MIMS' })
      }
    } catch (err) {
      console.warn('Failed to send set-password email:', err?.message || err)
    }

    const maskedEmail = maskEmail(user.email)
    return NextResponse.json({ success: true, maskedEmail })
  } catch (e) {
    console.error('request-otp error:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
