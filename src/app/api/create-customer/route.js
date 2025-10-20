import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const data = await request.json();

    const {
      first_name,
      last_name,
      nic_number,
      date_of_birth,
      phone_number,
      address,
      email,
    } = data;

    // Validate required fields
    if (
      !first_name ||
      !last_name ||
      !nic_number ||
      !date_of_birth ||
      !address
    ) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const user = await getCurrentUser(request);
    const created_by_user_id = user?.userID;
    // Resolve creator's branch
    let branch_id = null;
    if (created_by_user_id) {
      const bres = await query('SELECT branch_id FROM users WHERE user_id = $1', [created_by_user_id]);
      branch_id = bres.rows?.[0]?.branch_id ?? null;
    }


    // Insert into the customer table
    const result = await query(
      `INSERT INTO customer 
        (first_name, last_name, nic_number, date_of_birth, phone_number, address, email, created_by_user_id, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING customer_id, branch_id`,
      [
        first_name,
        last_name,
        nic_number,
        date_of_birth,
        phone_number || null,
        address,
        email || null,
        created_by_user_id || null,
        branch_id,
      ]
    );

    return new Response(
      JSON.stringify({
        message: 'Customer created',
        customer: result.rows[0],
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating customer:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
