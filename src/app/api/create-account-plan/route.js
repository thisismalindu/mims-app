import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      name,
      interest_rate,
      min_balance_required,
      minimum_age_required,
      description,
      status,
    } = data;

    // Validate required fields
    if (!name || !interest_rate || !min_balance_required || !minimum_age_required || !description || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get current user (if needed)
    const user = await getCurrentUser(request);
    const created_by_user_id = user?.userID || null;

    // Insert into database
    const result = await query(
      `INSERT INTO savings_account_plan
        (name, interest_rate, min_balance_required, minimum_age_required, description, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING savings_account_plan_id, name, interest_rate, min_balance_required, minimum_age_required, description, status, created_at`,
      [
        name,
        interest_rate,
        min_balance_required,
        minimum_age_required,
        description,
        status,
      ]
    );

    return new Response(
      JSON.stringify({
        message: 'Savings account plan created successfully',
        accountPlan: result.rows[0],
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating account plan:', error);

    // Handle duplicate plan name
    if (error.code === '23505') {
      return new Response(
        JSON.stringify({ error: 'Account plan name already exists' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
