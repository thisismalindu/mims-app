// src/app/api/get-transactions/route.js
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getCurrentUser } from '../utils/get-user'

export const runtime = 'nodejs'

function toInt(v, def = undefined) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

export async function GET(request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const type = url.searchParams.get('type') // deposit | withdrawal | interest
    const accountKind = url.searchParams.get('accountKind') // savings | fd
    const from = url.searchParams.get('from') // ISO date
    const to = url.searchParams.get('to') // ISO date
    const minAmount = url.searchParams.get('minAmount')
    const maxAmount = url.searchParams.get('maxAmount')
    const search = url.searchParams.get('search') // id/desc partial
    const branchIdParam = toInt(url.searchParams.get('branchId'))
    const limit = Math.min(toInt(url.searchParams.get('limit'), 500) || 500, 2000)

    // Determine manager branch if applicable
    let managerBranchId = null
    if (user.role === 'manager') {
      const r = await query('SELECT branch_id FROM users WHERE user_id = $1', [user.userID])
      managerBranchId = r.rows?.[0]?.branch_id || null
    }

    const clauses = []
    const params = []

    // Role-based scoping
    if (user.role === 'agent') {
      params.push(Number(user.userID))
      clauses.push(`t.performed_by_user_id = $${params.length}`)
    } else if (user.role === 'manager') {
      if (managerBranchId != null) {
        params.push(Number(managerBranchId))
        clauses.push(`COALESCE(sa.branch_id, sab.branch_id) = $${params.length}`)
      } else {
        // If no branch on manager, return empty result to be safe
        return NextResponse.json({ transactions: [] })
      }
    } else if (user.role === 'admin') {
      if (branchIdParam) {
        params.push(branchIdParam)
        clauses.push(`COALESCE(sa.branch_id, sab.branch_id) = $${params.length}`)
      }
    }

    // Filters
    if (type && ['deposit','withdrawal','interest'].includes(type)) {
      params.push(type)
      clauses.push(`t.transaction_type = $${params.length}`)
    }
    if (accountKind && ['savings','fd'].includes(accountKind)) {
      if (accountKind === 'savings') clauses.push('t.savings_account_id IS NOT NULL')
      if (accountKind === 'fd') clauses.push('t.fixed_deposit_account_id IS NOT NULL')
    }
    if (from) {
      params.push(from)
      clauses.push(`t.transaction_time >= $${params.length}`)
    }
    if (to) {
      params.push(to)
      clauses.push(`t.transaction_time <= $${params.length}`)
    }
    if (minAmount) {
      params.push(Number(minAmount))
      clauses.push(`t.amount >= $${params.length}`)
    }
    if (maxAmount) {
      params.push(Number(maxAmount))
      clauses.push(`t.amount <= $${params.length}`)
    }
    if (search && search.trim()) {
      const q = search.trim()
      // allow id match or description ILIKE
      const maybeId = Number(q)
      if (Number.isFinite(maybeId)) {
        params.push(maybeId)
        clauses.push(`t.transaction_id = $${params.length}`)
      } else {
        params.push(`%${q}%`)
        clauses.push(`t.description ILIKE $${params.length}`)
      }
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    const sql = `
      SELECT
        t.transaction_id,
        t.transaction_time,
        t.transaction_type,
        t.amount,
        t.description,
        t.performed_by_user_id,
        u.username AS performer_username,
        COALESCE(sa.branch_id, sab.branch_id) AS branch_id,
        b.branch_name,
        CASE WHEN t.savings_account_id IS NOT NULL THEN 'savings' ELSE 'fd' END AS account_kind,
        t.savings_account_id,
        t.fixed_deposit_account_id
      FROM transaction t
      LEFT JOIN users u ON u.user_id = t.performed_by_user_id
      LEFT JOIN savings_account sa ON sa.savings_account_id = t.savings_account_id
      LEFT JOIN fixed_deposit_account fda ON fda.fixed_deposit_account_id = t.fixed_deposit_account_id
      LEFT JOIN savings_account sab ON sab.savings_account_id = fda.savings_account_id
      LEFT JOIN branch b ON b.branch_id = COALESCE(sa.branch_id, sab.branch_id)
      ${where}
      ORDER BY t.transaction_time DESC
      LIMIT ${limit}
    `

    const res = await query(sql, params)
    return NextResponse.json({ transactions: res.rows || [] })
  } catch (e) {
    console.error('get-transactions error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
