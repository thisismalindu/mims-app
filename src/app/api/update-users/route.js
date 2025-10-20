import { NextResponse } from 'next/server';
import pool, { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

// Allowed fields we let clients update
const ALLOWED_FIELDS = new Set(['first_name', 'last_name', 'username', 'email', 'role', 'status', 'branch_id']);
const ALLOWED_ROLES = new Set(['admin', 'manager', 'agent']);
const ALLOWED_STATUS = new Set(['active', 'inactive']);

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
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
    }

    // Basic validation and sanitization
    const sanitized = [];
    for (const u of updates) {
      const user_id = Number(u?.user_id);
      if (!user_id) {
        return NextResponse.json({ success: false, error: 'Invalid user_id in updates' }, { status: 400 });
      }
      const patch = {};
      for (const [k, v] of Object.entries(u)) {
        if (k === 'user_id') continue;
        if (!ALLOWED_FIELDS.has(k)) continue; // skip silently
        if (k === 'role') {
          if (typeof v !== 'string' || !ALLOWED_ROLES.has(v)) {
            return NextResponse.json({ success: false, error: `Invalid role for user ${user_id}` }, { status: 400 });
          }
        }
        if (k === 'status') {
          if (typeof v !== 'string' || !ALLOWED_STATUS.has(v)) {
            return NextResponse.json({ success: false, error: `Invalid status for user ${user_id}` }, { status: 400 });
          }
        }
        if (k === 'branch_id') {
          if (v === null || v === undefined || v === '') {
            patch[k] = null;
            continue;
          }
          const bid = Number(v);
          if (!Number.isFinite(bid)) {
            return NextResponse.json({ success: false, error: `Invalid branch_id for user ${user_id}` }, { status: 400 });
          }
          patch[k] = bid;
          continue;
        }
        if (k === 'email') {
          // optional simple validation
          if (v && typeof v === 'string' && v.length > 320) {
            return NextResponse.json({ success: false, error: `Email too long for user ${user_id}` }, { status: 400 });
          }
        }
        patch[k] = v;
      }
      if (Object.keys(patch).length > 0) {
        sanitized.push({ user_id, patch });
      }
    }

    if (sanitized.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    // Execute within a transaction using a single client
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Set app.current_user_id for audit trail if desired
      try {
        await client.query("SELECT set_config('app.current_user_id', $1, true)", [String(authUser.userID)]);
      } catch {}

      const updated = [];
      for (const { user_id, patch } of sanitized) {
        // Trim and basic checks
        if (patch.username !== undefined) {
          if (typeof patch.username !== 'string' || patch.username.trim() === '') {
            throw new Error(`Invalid username for user ${user_id}`);
          }
          patch.username = patch.username.trim();
        }
        if (patch.first_name !== undefined) {
          if (typeof patch.first_name !== 'string' || patch.first_name.trim() === '') {
            throw new Error(`Invalid first_name for user ${user_id}`);
          }
          patch.first_name = patch.first_name.trim();
        }
        if (patch.last_name !== undefined) {
          if (typeof patch.last_name !== 'string' || patch.last_name.trim() === '') {
            throw new Error(`Invalid last_name for user ${user_id}`);
          }
          patch.last_name = patch.last_name.trim();
        }
        if (patch.email !== undefined) {
          if (patch.email === '' || patch.email === null) {
            patch.email = null; // nullable column
          } else if (typeof patch.email === 'string') {
            patch.email = patch.email.trim();
          }
        }

        const fields = Object.keys(patch);
        const setFragments = fields.map((f, i) => `${f} = $${i + 2}`);
        const values = fields.map((f) => patch[f]);

        const sql = `UPDATE users SET ${setFragments.join(', ')} WHERE user_id = $1 RETURNING user_id, username, first_name, last_name, role, status, email, branch_id, created_at`;
        const result = await client.query(sql, [user_id, ...values]);
        if (result.rowCount === 0) {
          throw new Error(`User ${user_id} not found`);
        }
        updated.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, updated });
    } catch (inner) {
      try { await client.query('ROLLBACK'); } catch {}
      if (inner?.code === '23505') {
        // Unique violation (e.g., username/email)
        return NextResponse.json({ success: false, error: 'Duplicate value for unique field (username/email)' }, { status: 409 });
      }
      console.error('POST /api/update-users error in tx:', inner);
      return NextResponse.json({ success: false, error: inner.message || 'Failed to update users' }, { status: 400 });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /api/update-users error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
