// src/app/api/session/route.js
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function GET(request) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
    // Standard claims are numeric dates (seconds since epoch)
    const nowSec = Math.floor(Date.now() / 1000)
    const exp = typeof payload.exp === 'number' ? payload.exp : nowSec
    const iat = typeof payload.iat === 'number' ? payload.iat : undefined
    const secondsRemaining = Math.max(exp - nowSec, 0)

    return NextResponse.json({
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      exp,
      iat,
      now: nowSec,
      secondsRemaining,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
