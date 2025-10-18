import { query } from '@/lib/database';

export async function GET() {
  try {
    console.log('Fetching fixed deposit plans...');
  const res = await query('SELECT fixed_deposit_account_plan_id, name, duration, interest_rate, minimum_amount_required FROM fixed_deposit_account_plan ORDER BY name ASC');
    return new Response(
      JSON.stringify({ success: true, plans: res.rows }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
