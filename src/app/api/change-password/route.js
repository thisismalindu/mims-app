// src/app/api/change-password/route.js
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { query } from '@/lib/database'
import { getCurrentUser } from '@/app/api/utils/get-user'

export async function POST(request) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.userID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json()

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Fetch current password hash
    const res = await query('SELECT password_hash FROM users WHERE user_id = $1', [user.userID])
    const row = res.rows?.[0]
    if (!row) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password
    const ok = await bcrypt.compare(currentPassword, row.password_hash)
    if (!ok) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Avoid no-op reuse (optional)
    const same = await bcrypt.compare(newPassword, row.password_hash)
    if (same) {
      return NextResponse.json({ error: 'New password must be different' }, { status: 400 })
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, user.userID])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('change-password error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
