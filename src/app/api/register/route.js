// src/app/api/register/route.js
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import bcrypt from 'bcrypt';
import { getCurrentUser } from '../utils/get-user';
import { randomUUID } from 'crypto';
import { sendSetPasswordEmail } from '../forgot-password/_email';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const body = await request.json();
  const { username, first_name, last_name, role, email, branchid, created_by_userid } = body;

    if (!username || !first_name || !last_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure created_by_userid matches auth user
    const creatorId = Number(created_by_userid);
    if (!creatorId || creatorId !== Number(authUser.userID)) {
      return NextResponse.json({ error: 'Invalid creator' }, { status: 403 });
    }

    // Enforce role-based creation rules
    const creatorRole = authUser.role;
    if (creatorRole === 'agent') {
      return NextResponse.json({ error: 'Agents are not allowed to create users' }, { status: 403 });
    }
    // Admin can create admin, manager, agent
    // Manager can create manager, agent
    // Agent cannot create users (already blocked above)
    const allowedRoles = creatorRole === 'admin'
      ? ['admin', 'manager', 'agent']
      : creatorRole === 'manager'
        ? ['manager', 'agent']
        : [];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'You are not allowed to create this user role' }, { status: 403 });
    }

  // Generate a random temporary password and hash it (not sent to user)
  const tempPassword = randomUUID();
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(tempPassword, saltRounds);

    // Insert user; email and branch are optional
    const result = await query(
      `INSERT INTO users (username, password_hash, first_name, last_name, role, email, branch_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING user_id, username, first_name, last_name, role, email, branch_id, created_by_user_id`,
      [username, password_hash, first_name, last_name, role, email || null, branchid || null, creatorId]
    );

    const user = result.rows[0];

    // Create a password reset session so user can set their own password via link
    const resetToken = randomUUID();
    const exp = new Date(Date.now() + 15 * 60 * 1000);
    await query(
      `CREATE TABLE IF NOT EXISTS password_reset_sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    );
    await query('INSERT INTO password_reset_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [resetToken, user.user_id, exp]);

    // Compose link from request origin
  const origin = request.headers.get('origin') || request.nextUrl.origin;
    const link = `${origin}/set-password?token=${encodeURIComponent(resetToken)}`;

    // Try sending email; don't fail creation if email fails
    let emailQueued = false;
    if (email) {
      try {
        const res = await sendSetPasswordEmail({ to: email, link, appName: 'MIMS' });
        emailQueued = !!res?.ok;
      } catch (e) {
        console.warn('Failed to send set-password email:', e?.message || e);
      }
    }

    return NextResponse.json({ message: 'User created. A password setup link has been emailed to the user.', user, emailQueued });
  } catch (err) {
    if (err?.code === '23505') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    console.error('Register error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
