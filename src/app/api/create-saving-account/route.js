import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const data = await request.json();

    const {
      customer_id,
      account_name,
      initial_deposit,
      interest_rate,
      account_type,
    } = data;

    // Validate required fields
    if (!customer_id || !account_name || !initial_deposit || !interest_rate || !account_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log("****/api/create-saving-account/: currentUser: ", await getCurrentUser(request));

    const user = await getCurrentUser(request);
    const created_by_user_id = user?.userID;

    // Insert into saving_account table
    const result = await query(
      `INSERT INTO saving_account 
        (customer_id, account_name, balance, interest_rate, account_type, created_by_user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING account_id`,
      [
        customer_id,
        account_name,
        initial_deposit,
        interest_rate,
        account_type,
        created_by_user_id || null,
      ]
    );

    return new Response(
      JSON.stringify({
        message: 'Saving account created successfully',
        account: result.rows[0],
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating saving account:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
