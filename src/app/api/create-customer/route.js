import { query } from '@/lib/database';

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
      // created_by_agent_id,
    } = data;

    // Validate required fields
    if (
      !first_name ||
      !last_name ||
      !nic_number ||
      !date_of_birth ||
      !address //||
      // !created_by_agent_id
    ) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert into the customer table
    const result = await query(
      `INSERT INTO customer 
        (first_name, last_name, nic_number, date_of_birth, phone_number, address, email, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING customer_id`,
      [
        first_name,
        last_name,
        nic_number,
        date_of_birth,
        phone_number || null,
        address,
        email || null,
        5
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
