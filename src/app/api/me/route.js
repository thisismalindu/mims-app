// src/app/api/me/route.js
import { NextResponse } from 'next/server'
import { getCurrentUser } from '../utils/get-user'

export async function GET(request) {
  const user = await getCurrentUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(user)
}
