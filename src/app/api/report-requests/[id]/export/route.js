import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../utils/get-user';
import { query } from '@/lib/database';
import { buildReportData } from '../route';

async function getRequestById(id) {
  const { rows } = await query(
    `SELECT rr.*, rt.key as report_type_key, rt.name as report_type_name
       FROM report_request rr
       JOIN report_type rt ON rt.report_type_id = rr.report_type_id
      WHERE rr.report_request_id = $1`,
    [id]
  );
  return rows[0];
}

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const id = Number(params.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const row = await getRequestById(id);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.role === 'manager') {
      const uid = user.userID || user.user_id;
      if (String(row.manager_id) !== String(uid)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Generate data
    const data = await buildReportData(row);
    const rows = Array.isArray(data.rows) ? data.rows : [];
    if (rows.length === 0) {
      return new Response('\uFEFF', { // BOM for Excel
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="report-${id}.csv"`,
        }
      });
    }

    const headers = Object.keys(rows[0]);
    const escape = (v) => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return '"' + s.replaceAll('"', '""') + '"';
      return s;
    };
    const lines = [];
    lines.push(headers.join(','));
    for (const r of rows) {
      lines.push(headers.map(h => escape(r[h])).join(','));
    }
    const csv = '\uFEFF' + lines.join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="report-${id}.csv"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    console.error('GET /api/report-requests/[id]/export error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
