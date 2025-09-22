// src/app/api/me/route.js
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function GET(request) {
  try {
    const token = request.cookies.get('auth_token')?.value
    console.log('*******************token: ', token);
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // verify token
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))

    return NextResponse.json({ username: payload.username })

  } catch (err) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
