import { NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const user_id = Number(body?.user_id);
    if (!user_id) {
      return NextResponse.json({ success: false, error: 'Invalid user_id' }, { status: 400 });
    }

    // Prevent deleting yourself
    if (Number(authUser.userID) === user_id) {
      return NextResponse.json({ success: false, error: 'You cannot delete your own account' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      try {
        await client.query("SELECT set_config('app.current_user_id', $1, true)", [String(authUser.userID)]);
      } catch {}

      // Disallow deleting special/root user by username if present
      const { rows } = await client.query('SELECT username FROM users WHERE user_id = $1', [user_id]);
      if (rows.length === 0) {
        throw new Error('User not found');
      }
      const username = rows[0].username;
      if (username === 'root') {
        return NextResponse.json({ success: false, error: 'Cannot delete root user' }, { status: 403 });
      }

      // Attempt delete
      await client.query('DELETE FROM users WHERE user_id = $1', [user_id]);
      await client.query('COMMIT');
      return NextResponse.json({ success: true, user_id });
    } catch (inner) {
      try { await client.query('ROLLBACK'); } catch {}
      // Foreign key violation: 23503
      if (inner?.code === '23503') {
        return NextResponse.json({ success: false, error: 'Cannot delete user due to related records' }, { status: 409 });
      }
      const msg = inner?.message || 'Failed to delete user';
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /api/delete-user error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
