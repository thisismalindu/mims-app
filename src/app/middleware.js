import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export function middleware(request) {
  // Get the token from the cookie
  const token = request.cookies.get('auth_token')?.value;

  // Define paths that require authentication
  const protectedPaths = ['/api/agents', '/api/customers', '/api/accounts']; // Add your protected API routes
  const isProtectedApiRoute = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isProtectedApiRoute) {
    if (!token) {
      return NextResponse.json({ error: 'Access denied. No token provided.' }, { status: 401 });
    }

    try {
      // Verify the token
      jwt.verify(token, process.env.JWT_SECRET);
      // If valid, let the request continue
      return NextResponse.next();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
    }
  }

  // For all other requests, just continue
  return NextResponse.next();
}

// Specify which paths this middleware should run on
export const config = {
  matcher: ['/api/:path*'], // Run on all API routes
};