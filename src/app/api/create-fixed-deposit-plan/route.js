import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const data = await request.json();

    const {
      name,
      duration,
      interest_rate,
      minimum_amount_required,
      description,
    } = data;

    if (!name || !duration || !interest_rate || !minimum_amount_required) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await getCurrentUser(request);
    console.log('currentUser:', user);

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    await query(
      `INSERT INTO fixed_deposit_account_plan 
        (name, duration, interest_rate, minimum_amount_required, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [name, duration, interest_rate, minimum_amount_required, description || null]
    );

    return Response.json({ message: 'Fixed Deposit Plan created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating fixed deposit plan:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
