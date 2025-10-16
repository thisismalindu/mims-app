import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const data = await request.json();

    const { branch_name, address, phone_number, email, opening_hours } = data;

    if (!branch_name || !address) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await getCurrentUser(request);
    const created_by_user_id = user?.userID || null;

    // Insert into branch table
    const result = await query(
      `INSERT INTO branch (branch_name, address, phone_number) VALUES ($1, $2, $3) RETURNING branch_id`,
      [branch_name, address, phone_number || null]
    );

    return new Response(
      JSON.stringify({ message: 'Branch created', branch: result.rows[0] }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating branch:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
