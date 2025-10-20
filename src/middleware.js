// src/middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export function middleware(request) {
  console.log('Middleware running for:', request.url);

  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;
  const searchParams = request.nextUrl.searchParams;

  console.log('pathname: ', pathname);
  if (pathname.startsWith('/api/calc-savings-interest')) {
    console.log('✅ Bypassing auth for /api/calc-savings-interest');
    return NextResponse.next();
  }
  // Allow forgot-password API to be called without auth
  if (pathname.startsWith('/api/forgot-password')) {
    console.log('✅ Bypassing auth for /api/forgot-password');
    return NextResponse.next();
  }
  // === Case 1: Login page ===
  if (pathname.startsWith('/login')) {
    if (token) {
      const nextParam = searchParams.get('next');
      return verifyToken(token)
        .then(() => {
          const target = nextParam ? nextParam : '/';
          console.log('Already logged in, redirecting to', target, 'and request url:', request.url);
          return NextResponse.redirect(new URL(target, request.url));
        })
        .catch(() => {
          // Invalid token → let them log in again
          return NextResponse.next();
        });
    }
    console.log('No token, proceeding to /login');
    return NextResponse.next();
  }

  if (pathname.startsWith('/forgot-password')) {
    console.log('Bypassing auth for /forgot-password');
    return NextResponse.next();
  }

  if (pathname.startsWith('/set-password')) {
    console.log('Bypassing auth for /set-password');
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
    .then((payload) => {
      console.log('Token valid, proceeding to ', pathname);
      // Additional guard: prevent agents from accessing /register page directly
      if (pathname.startsWith('/register') && payload?.role === 'agent') {
        console.log('Agent attempting to access /register. Redirecting to home.');
        return NextResponse.redirect(new URL('/', request.url));
      }
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
    '/((?!api/calc-savings-interest|api/login|api/forgot-password|set-password|_next/static|_next/image|favicon.ico).*)',
  ],
};