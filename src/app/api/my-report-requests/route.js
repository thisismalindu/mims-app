import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const uid = user.userID || user.user_id;
    const role = user.role;

    if (!['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let sql = `
      SELECT rr.report_request_id, rr.status, rr.created_at, rr.updated_at,
             rr.parameters, rr.branch_id,
             rt.key as report_type_key, rt.name as report_type_name
        FROM report_request rr
        JOIN report_type rt ON rt.report_type_id = rr.report_type_id
    `;
    const params = [];
    if (role === 'manager') {
      sql += ' WHERE rr.manager_id = $1';
      params.push(uid);
    }
    sql += ' ORDER BY rr.created_at DESC LIMIT 500';

    const { rows } = await query(sql, params);
    return NextResponse.json({ requests: rows }, { status: 200 });
  } catch (e) {
    console.error('GET /api/my-report-requests error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
