import { query } from '@/lib/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { username, password } = await request.json();

  // 1. Find the login details by username
  const result = await query(
    'SELECT * FROM login_details WHERE username = $1',
    [username]
  );
  const login = result.rows[0];

  if (!login) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // 2. Compare the provided password with the stored hash
  const isPasswordValid = await bcrypt.compare(password, login.password_hash);
  if (!isPasswordValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // 3. Create a JWT token with user details
  const token = jwt.sign(
    { 
      userId: login.user_id,
      username: login.username,
      role: login.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 4. Return the token to the frontend
  const response = NextResponse.json({ message: 'Login successful' });
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60,
  });

  return response;
}
