// src/app/api/utils/get-user.js
import { jwtVerify } from 'jose'

export async function getCurrentUser(request) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return null

    console.log('****/api/utils/get-user: Token: ', token)

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    )
    const userId = Number(payload.userId) 
    if (isNaN(userId)) return null  

    return {
      username: payload.username,
      userID: payload.userId,
      role: payload.role,
    }
  } catch {
    return null
  }
}
