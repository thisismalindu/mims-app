// src/app/api/register/route.js
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import bcrypt from 'bcrypt';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username, password, first_name, last_name, role, email, branchid, created_by_userid } = body;

    if (!username || !password || !first_name || !last_name || !role) {
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

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user; email and branch are optional
    const result = await query(
      `INSERT INTO users (username, password_hash, first_name, last_name, role, email, branch_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING user_id, username, first_name, last_name, role, email, branch_id, created_by_user_id`,
      [username, password_hash, first_name, last_name, role, email || null, branchid || null, creatorId]
    );

    const user = result.rows[0];
    return NextResponse.json({ message: 'User created', user });
  } catch (err) {
    if (err?.code === '23505') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    console.error('Register error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
