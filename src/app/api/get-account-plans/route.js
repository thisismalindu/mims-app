import { query } from '@/lib/database';

export async function GET() {
  try {
    const result = await query(
      `SELECT savings_account_plan_id, name, interest_rate, min_balance_required, minimum_age_required, status
       FROM savings_account_plan
       WHERE status = 'active'
       ORDER BY name ASC`
    );

    return new Response(
      JSON.stringify({ plans: result.rows }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching account plans:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch account plans' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
