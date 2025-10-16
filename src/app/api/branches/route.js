import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const result = await query('SELECT branch_id, branch_name, address, phone_number, status, created_at FROM branch ORDER BY branch_id DESC');

    return new Response(JSON.stringify({ branches: result.rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Error fetching branches', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
