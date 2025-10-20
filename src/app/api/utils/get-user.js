// src/app/api/utils/get-user.js
import { jwtVerify } from 'jose'

export async function getCurrentUser(request) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return null

    // Keep a concise log for debugging (avoid printing secret content in prod)
    console.log('get-user: token present')

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    )

    // Normalize IDs: provide both numeric and original forms to be defensive
    const user_id = Number(payload.userId);
    if (isNaN(user_id)) return null;

    return {
      username: payload.username,
      // both shapes used around the codebase; provide both to avoid undefined
      userID: payload.userId,
      user_id,
      role: payload.role,
    }
  } catch (err) {
    console.debug('get-user: token invalid or missing', err?.message || err)
    return null
  }
}
