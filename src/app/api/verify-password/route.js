import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';
import bcrypt from 'bcrypt';

export async function POST(request) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json().catch(() => null);
    const password = body?.password;
    if (typeof password !== 'string' || password.length === 0) {
      return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
    }

    const { rows } = await query('SELECT password_hash FROM users WHERE user_id = $1', [Number(authUser.userID)]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/verify-password error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
