// mims-app/src/app/api/auth/logout/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  const response = NextResponse.json({ message: 'Logged out' });

  // Clear the cookie by setting maxAge: 0 and same path used to set it
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',    // MUST match the path used when setting the cookie
    maxAge: 0,
  });

  return response;
}
