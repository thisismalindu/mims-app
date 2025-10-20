import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    console.log('get-customer-accounts: User:', user);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const customerId = Number(searchParams.get('customerId'));
    console.log('get-customer-accounts: customerId:', customerId);
    if (!Number.isInteger(customerId)) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // Load customer and basic auth context
    const cres = await query('SELECT customer_id, branch_id, created_by_user_id FROM customer WHERE customer_id = $1', [customerId]);
    console.log('get-customer-accounts: Customer query result:', cres.rows);
    const customer = cres.rows?.[0];
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const uid = user.userID || user.user_id;
    console.log('get-customer-accounts: User ID:', uid, 'Role:', user.role);
    if (user.role === 'manager') {
      // Manager can only view customers in their branch
      const mres = await query('SELECT branch_id FROM users WHERE user_id = $1', [uid]);
      console.log('get-customer-accounts: Manager query result:', mres.rows);
      const mgr = mres.rows?.[0];
      if (!mgr || mgr.branch_id == null || String(mgr.branch_id) !== String(customer.branch_id)) {
        console.log('get-customer-accounts: Forbidden for manager');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (user.role === 'agent') {
      // Agent can only view their own customers
      console.log('get-customer-accounts: Checking agent ownership:', customer.created_by_user_id, 'vs', uid);
      if (String(customer.created_by_user_id) !== String(uid)) {
        console.log('get-customer-accounts: Forbidden for agent');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } // admin allowed

    // Savings accounts for the customer
    console.log('get-customer-accounts: Querying savings accounts for customerId:', customerId);
    const savingsRes = await query(
      `SELECT DISTINCT sa.savings_account_id,
              LPAD(sa.branch_id::text, 3, '0') || LPAD(sa.savings_account_id::text, 7, '0') AS account_number,
              sap.name AS plan_name
         FROM customer_account ca
         JOIN savings_account sa ON sa.savings_account_id = ca.savings_account_id
         LEFT JOIN savings_account_plan sap ON sap.savings_account_plan_id = sa.savings_account_plan_id
        WHERE ca.customer_id = $1
        ORDER BY sa.savings_account_id`,
      [customerId]
    );
    console.log('get-customer-accounts: Savings accounts result:', savingsRes.rows);

    // Fixed deposits linked to any of the customer's savings accounts
    console.log('get-customer-accounts: Querying fixed deposits for customerId:', customerId);
    const fdRes = await query(
      `SELECT fda.fixed_deposit_account_id,
              fdap.name AS plan_name
         FROM fixed_deposit_account fda
         JOIN fixed_deposit_account_plan fdap ON fdap.fixed_deposit_account_plan_id = fda.fixed_deposit_account_plan_id
        WHERE fda.savings_account_id IN (
              SELECT ca.savings_account_id FROM customer_account ca WHERE ca.customer_id = $1
        )
        ORDER BY fda.fixed_deposit_account_id`,
      [customerId]
    );
    console.log('get-customer-accounts: Fixed deposits result:', fdRes.rows);

    return NextResponse.json({
      savingsAccounts: savingsRes.rows,
      fixedDeposits: fdRes.rows,
    }, { status: 200 });
  } catch (e) {
    console.error('GET /api/get-customer-accounts error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
