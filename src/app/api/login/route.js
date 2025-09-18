// src/app/api/login/route.js
import { query } from '@/lib/database';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const { username, password } = await request.json();

    const result = await query(
        'SELECT * FROM login_details WHERE username = $1',
        [username]
    );
    const login = result.rows[0];

    if (!login) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, login.password_hash);
    if (!isPasswordValid) {
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
        'INSERT INTO login (user_id) VALUES ($1)',
        [login.user_id]
    );

    return response;
}