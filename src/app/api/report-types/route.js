import { query } from '@/lib/database'

export async function GET() {
  try {
    const res = await query('SELECT report_type_id, key, name, description FROM report_type ORDER BY report_type_id');
    return new Response(JSON.stringify({ types: res.rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('GET /api/report-types error', e);
    return new Response(JSON.stringify({ error: 'Failed to load report types' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
