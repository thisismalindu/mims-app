import { NextResponse } from 'next/server';
import pool, { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

// Fields allowed to be updated on customer
const ALLOWED_FIELDS = new Set([
  'first_name',
  'last_name',
  'nic_number',
  'phone_number',
  'email',
  'status'
]);
const ALLOWED_STATUS = new Set(['active', 'inactive']);

export async function POST(request) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
    }

    // sanitize and validate patches
    const sanitized = [];
    for (const u of updates) {
      const customer_id = Number(u?.customer_id);
      if (!customer_id) {
        return NextResponse.json({ success: false, error: 'Invalid customer_id in updates' }, { status: 400 });
      }
      const patch = {};
      for (const [k, v] of Object.entries(u)) {
        if (k === 'customer_id') continue;
        if (!ALLOWED_FIELDS.has(k)) continue; // silently skip unknown fields
        if (k === 'status') {
          if (typeof v !== 'string' || !ALLOWED_STATUS.has(v)) {
            return NextResponse.json({ success: false, error: `Invalid status for customer ${customer_id}` }, { status: 400 });
          }
        }
        if (k === 'email') {
          if (v === '' || v === null) {
            patch[k] = null;
            continue;
          }
          if (v && typeof v === 'string' && v.length > 320) {
            return NextResponse.json({ success: false, error: `Email too long for customer ${customer_id}` }, { status: 400 });
          }
        }
        if (k === 'phone_number') {
          if (v && typeof v === 'string' && v.length > 32) {
            return NextResponse.json({ success: false, error: `Phone number too long for customer ${customer_id}` }, { status: 400 });
          }
        }
        if (typeof v === 'string') {
          patch[k] = v.trim();
        } else {
          patch[k] = v;
        }
      }
      if (Object.keys(patch).length > 0) {
        sanitized.push({ customer_id, patch });
      }
    }

    if (sanitized.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // For auditing; ignore if function doesn't exist
      try { await client.query("SELECT set_config('app.current_user_id', $1, true)", [String(authUser.userID)]); } catch {}

      const updated = [];
      for (const { customer_id, patch } of sanitized) {
        // authorization: ensure the authUser can update this customer
        let authSql;
        let authParams;
        if (authUser.role === 'admin') {
          authSql = 'SELECT customer_id FROM customer WHERE customer_id = $1';
          authParams = [customer_id];
        } else if (authUser.role === 'manager') {
          // manager can update customers created by their agents
          authSql = `SELECT c.customer_id
                     FROM customer c
                     JOIN users a ON a.user_id = c.created_by_user_id
                     WHERE c.customer_id = $1 AND a.created_by_user_id = $2 AND a.role = 'agent'`;
          authParams = [customer_id, authUser.userID];
        } else if (authUser.role === 'agent') {
          // agent can update only their customers
          authSql = 'SELECT customer_id FROM customer WHERE customer_id = $1 AND created_by_user_id = $2';
          authParams = [customer_id, authUser.userID];
        } else {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        const authRes = await client.query(authSql, authParams);
        if (authRes.rowCount === 0) {
          throw new Error(`Forbidden to update customer ${customer_id}`);
        }

        const fields = Object.keys(patch);
        const setFragments = fields.map((f, i) => `${f} = $${i + 2}`);
        const values = fields.map((f) => patch[f]);
        const sql = `UPDATE customer SET ${setFragments.join(', ')} WHERE customer_id = $1
                     RETURNING customer_id, first_name, last_name, nic_number, phone_number, email, status, created_by_user_id`;
        const result = await client.query(sql, [customer_id, ...values]);
        if (result.rowCount === 0) throw new Error(`Customer ${customer_id} not found`);
        updated.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, updated });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      const msg = e?.message || 'Failed to update customers';
      const status = msg.startsWith('Forbidden') ? 403 : 400;
      return NextResponse.json({ success: false, error: msg }, { status });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /api/update-customers error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
