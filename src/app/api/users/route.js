// src/app/api/users/route.js
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const result = await query(
      `SELECT user_id, username, first_name, last_name, role, status, email, branch_id, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return NextResponse.json({ users: result.rows });
  } catch (err) {
    console.error('GET /api/users error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
