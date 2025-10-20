// src/app/api/login/route.js
import { query } from '@/lib/database';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';

async function logFailedLoginAttempt(username) {
    await query(
        'INSERT INTO login_log (username_used, success) VALUES ($1, $2)',
        [username, false]
    );
}

export async function POST(request) {
    const { username, password } = await request.json();

    const result = await query(
        'SELECT * FROM users WHERE username = $1',
        [username]
    );
    const login = result.rows[0];

    if (!login) {
        await logFailedLoginAttempt(username);
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Block login for inactive users
    if (login.status !== 'active') {
        await logFailedLoginAttempt(username);
        return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, login.password_hash);
    if (!isPasswordValid) {
        await logFailedLoginAttempt(username);
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create JWT token using jose
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ 
        userId: login.user_id, 
        username: login.username, 
        role: login.role 
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);

    const response = NextResponse.json({ message: 'Login successful' });

    response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60,
    });

    console.log('userid: ', login.user_id);

    await query(
        'INSERT INTO login_log (user_id, username_used, success) VALUES ($1, $2, $3)',
        [login.user_id, username, true]
    );

    return response;
}