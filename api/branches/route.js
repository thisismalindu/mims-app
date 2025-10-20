import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUser } from '../../src/app/api/utils/get-user';

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Only admins and managers should see branches
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const result = await query(
      `SELECT branch_id, branch_name, address, phone_number, status, created_at
       FROM branch
       ORDER BY branch_name ASC`
    );

    return NextResponse.json({ success: true, branches: result.rows });
  } catch (err) {
    console.error('GET /api/branches error:', err);
    return NextResponse.json({ success: false, error: 'Server error', details: err.message }, { status: 500 });
  }
}
