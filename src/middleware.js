// src/middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export function middleware(request) {
  console.log('Middleware running for:', request.url);

  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  console.log('pathname: ', pathname);

  // === Case 1: Login page ===
  if (pathname.startsWith('/login')) {
    if (token) {
      
      return verifyToken(token)
        .then(() => {
          console.log('Already logged in, redirecting to / and request url:', request.url);
          return NextResponse.redirect(new URL('/', request.url));
        })
        .catch(() => {
          // Invalid token → let them log in again
          return NextResponse.next();
        });
    }
    console.log('No token, proceeding to /login');
    return NextResponse.next();
  }

  // === Case 2: All other routes ===
  if (!token) {
    console.log('No token, redirecting to /login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  console.log('===============================');
  console.log('Token found, verifying...');

  // Verify token using jose
  return verifyToken(token)
    .then(() => {
      console.log('Token valid, proceeding to ', pathname);
      return NextResponse.next();
    })
    .catch((error) => {
      console.log('Token invalid, redirecting to /login:', error.message);
      return NextResponse.redirect(new URL('/login', request.url));
    });
}

// Helper function to verify token with jose
async function verifyToken(token) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export const config = {
  matcher: [
    '/((?!api/login|_next/static|_next/image|favicon.ico).*)',
  ],
};