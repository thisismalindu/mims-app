// src/app/api/forgot-password/request-otp/route.js
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { query } from '@/lib/database'

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}

export async function POST(request) {
  const { username } = await request.json().catch(() => ({}))
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  try {
    await ensureTable()
    const res = await query('SELECT user_id, email FROM users WHERE username = $1', [username])
    const user = res.rows?.[0]

    // Always respond success to avoid username enumeration
    if (user) {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const hash = await bcrypt.hash(code, 10)
      const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      await query(
        'INSERT INTO password_reset_tokens (user_id, otp_hash, expires_at) VALUES ($1, $2, $3)',
        [user.user_id, hash, expires]
      )
      console.log(`[forgot-password] OTP for ${username}:`, code)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('request-otp error:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
