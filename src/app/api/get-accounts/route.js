import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    console.log('get-accounts: user:', user?.userID || user?.user_id, 'role:', user?.role);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const uid = user.userID || user.user_id;

    // Build role-scoped filters
    let savingsSql;
    let savingsParams = [];
    let fdSql;
    let fdParams = [];

    if (user.role === 'admin') {
      savingsSql = `
        SELECT sa.savings_account_id,
               LPAD(sa.branch_id::text, 3, '0') || LPAD(sa.savings_account_id::text, 7, '0') AS account_number,
               sap.name AS plan_name,
               COALESCE(
                 (
                   SELECT string_agg(CONCAT(c.first_name,' ',c.last_name), ', ' ORDER BY ca.ownership DESC, c.customer_id)
                     FROM customer_account ca
                     JOIN customer c ON c.customer_id = ca.customer_id
                    WHERE ca.savings_account_id = sa.savings_account_id
                 ),
                 ''
               ) AS holders
          FROM savings_account sa
          LEFT JOIN savings_account_plan sap ON sap.savings_account_plan_id = sa.savings_account_plan_id
         ORDER BY sa.savings_account_id
         LIMIT 5000`;
      fdSql = `
        SELECT fda.fixed_deposit_account_id,
               fdap.name AS plan_name,
               COALESCE(
                 (
                   SELECT string_agg(CONCAT(c.first_name,' ',c.last_name), ', ' ORDER BY ca.ownership DESC, c.customer_id)
                     FROM customer_account ca
                     JOIN customer c ON c.customer_id = ca.customer_id
                     JOIN savings_account sa2 ON sa2.savings_account_id = ca.savings_account_id
                    WHERE sa2.savings_account_id = fda.savings_account_id
                 ),
                 ''
               ) AS holders
          FROM fixed_deposit_account fda
          JOIN fixed_deposit_account_plan fdap ON fdap.fixed_deposit_account_plan_id = fda.fixed_deposit_account_plan_id
         ORDER BY fda.fixed_deposit_account_id
         LIMIT 5000`;
    } else if (user.role === 'manager') {
      // Fetch manager branch
      const mres = await query('SELECT branch_id FROM users WHERE user_id = $1', [uid]);
      const mgr = mres.rows?.[0];
      console.log('get-accounts: manager branch:', mgr?.branch_id);
      if (!mgr || mgr.branch_id == null) return NextResponse.json({ error: 'Manager branch not set' }, { status: 400 });
      savingsSql = `
        SELECT sa.savings_account_id,
               LPAD(sa.branch_id::text, 3, '0') || LPAD(sa.savings_account_id::text, 7, '0') AS account_number,
               sap.name AS plan_name,
               COALESCE(
                 (
                   SELECT string_agg(CONCAT(c.first_name,' ',c.last_name), ', ' ORDER BY ca.ownership DESC, c.customer_id)
                     FROM customer_account ca
                     JOIN customer c ON c.customer_id = ca.customer_id
                    WHERE ca.savings_account_id = sa.savings_account_id
                 ),
                 ''
               ) AS holders
          FROM savings_account sa
          LEFT JOIN savings_account_plan sap ON sap.savings_account_plan_id = sa.savings_account_plan_id
         WHERE sa.branch_id = $1
         ORDER BY sa.savings_account_id
         LIMIT 5000`;
      savingsParams = [mgr.branch_id];
      fdSql = `
        SELECT fda.fixed_deposit_account_id,
               fdap.name AS plan_name,
               COALESCE(
                 (
                   SELECT string_agg(CONCAT(c.first_name,' ',c.last_name), ', ' ORDER BY ca.ownership DESC, c.customer_id)
                     FROM customer_account ca
                     JOIN customer c ON c.customer_id = ca.customer_id
                    WHERE ca.savings_account_id = sa.savings_account_id
                 ),
                 ''
               ) AS holders
          FROM fixed_deposit_account fda
          JOIN fixed_deposit_account_plan fdap ON fdap.fixed_deposit_account_plan_id = fda.fixed_deposit_account_plan_id
          JOIN savings_account sa ON sa.savings_account_id = fda.savings_account_id
         WHERE sa.branch_id = $1
         ORDER BY fda.fixed_deposit_account_id
         LIMIT 5000`;
      fdParams = [mgr.branch_id];
    } else if (user.role === 'agent') {
      // Accounts tied to customers created by this agent
      savingsSql = `
        SELECT DISTINCT sa.savings_account_id,
               LPAD(sa.branch_id::text, 3, '0') || LPAD(sa.savings_account_id::text, 7, '0') AS account_number,
               sap.name AS plan_name,
               COALESCE(
                 (
                   SELECT string_agg(CONCAT(c.first_name,' ',c.last_name), ', ' ORDER BY ca.ownership DESC, c.customer_id)
                     FROM customer_account ca
                     JOIN customer c ON c.customer_id = ca.customer_id
                    WHERE ca.savings_account_id = sa.savings_account_id
                 ),
                 ''
               ) AS holders
          FROM savings_account sa
          LEFT JOIN savings_account_plan sap ON sap.savings_account_plan_id = sa.savings_account_plan_id
         WHERE EXISTS (
                 SELECT 1
                   FROM customer_account ca
                   JOIN customer c ON c.customer_id = ca.customer_id
                  WHERE ca.savings_account_id = sa.savings_account_id
                    AND c.created_by_user_id = $1
               )
         ORDER BY sa.savings_account_id
         LIMIT 5000`;
      savingsParams = [uid];
      fdSql = `
        SELECT DISTINCT fda.fixed_deposit_account_id,
               fdap.name AS plan_name,
               COALESCE(
                 (
                   SELECT string_agg(CONCAT(c.first_name,' ',c.last_name), ', ' ORDER BY ca.ownership DESC, c.customer_id)
                     FROM customer_account ca
                     JOIN customer c ON c.customer_id = ca.customer_id
                     JOIN savings_account sa2 ON sa2.savings_account_id = ca.savings_account_id
                    WHERE sa2.savings_account_id = fda.savings_account_id
                 ),
                 ''
               ) AS holders
          FROM fixed_deposit_account fda
          JOIN fixed_deposit_account_plan fdap ON fdap.fixed_deposit_account_plan_id = fda.fixed_deposit_account_plan_id
         WHERE fda.savings_account_id IN (
                 SELECT sa.savings_account_id
                   FROM savings_account sa
                  WHERE EXISTS (
                        SELECT 1
                          FROM customer_account ca
                          JOIN customer c ON c.customer_id = ca.customer_id
                         WHERE ca.savings_account_id = sa.savings_account_id
                           AND c.created_by_user_id = $1
                  )
               )
         ORDER BY fda.fixed_deposit_account_id
         LIMIT 5000`;
      fdParams = [uid];
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('get-accounts: querying savings accounts');
    const savingsRes = await query(savingsSql, savingsParams);
    console.log('get-accounts: savings count:', savingsRes.rows.length);
    console.log('get-accounts: querying fixed deposits');
    const fdRes = await query(fdSql, fdParams);
    console.log('get-accounts: fd count:', fdRes.rows.length);

    return NextResponse.json({
      savingsAccounts: savingsRes.rows,
      fixedDeposits: fdRes.rows,
    }, { status: 200 });
  } catch (e) {
    console.error('GET /api/get-accounts error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
