import { NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const customer_id = Number(body?.customer_id);
    if (!customer_id) {
      return NextResponse.json({ success: false, error: 'Invalid customer_id' }, { status: 400 });
    }

    // Authorization: admin can delete any; manager can delete customers of their agents; agent can delete own customers
    const uid = authUser.userID || authUser.user_id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      try {
        await client.query("SELECT set_config('app.current_user_id', $1, true)", [String(uid)]);
      } catch {}

      // Verify ownership/visibility depending on role
      let canDelete = false;
      if (authUser.role === 'admin') {
        canDelete = true;
      } else if (authUser.role === 'manager') {
        const { rows } = await client.query(
          `SELECT 1 FROM customer c
           WHERE c.customer_id = $1
             AND c.created_by_user_id IN (SELECT user_id FROM users WHERE created_by_user_id = $2 AND role = 'agent')
           LIMIT 1`,
          [customer_id, uid]
        );
        canDelete = rows.length > 0;
      } else if (authUser.role === 'agent') {
        const { rows } = await client.query(
          `SELECT 1 FROM customer c WHERE c.customer_id = $1 AND c.created_by_user_id = $2 LIMIT 1`,
          [customer_id, uid]
        );
        canDelete = rows.length > 0;
      }

      if (!canDelete) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      // Attempt delete; rely on FK constraints for protection
      await client.query('DELETE FROM customer WHERE customer_id = $1', [customer_id]);
      await client.query('COMMIT');
      return NextResponse.json({ success: true, customer_id });
    } catch (inner) {
      try { await client.query('ROLLBACK'); } catch {}
      if (inner?.code === '23503') {
        return NextResponse.json({ success: false, error: 'Cannot delete customer due to related records' }, { status: 409 });
      }
      const msg = inner?.message || 'Failed to delete customer';
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /api/delete-customer error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
