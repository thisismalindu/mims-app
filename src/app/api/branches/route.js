// src/app/api/branches/route.js
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and managers should see branches in this app
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await query(
      `SELECT branch_id, branch_name, address, phone_number, status, created_at
       FROM branch
       ORDER BY branch_name ASC`
    );

    return NextResponse.json({ branches: result.rows });
  } catch (err) {
    console.error('GET /api/branches error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
