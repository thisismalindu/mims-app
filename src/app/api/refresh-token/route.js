// src/app/api/refresh-token/route.js
import { NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

export async function POST(request) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    // Issue a fresh token with the same subject info, new exp
    const newToken = await new SignJWT({ userId: payload.userId, username: payload.username, role: payload.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret)

    const res = NextResponse.json({ success: true })
    res.cookies.set('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60,
    })
    return res
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
