import { query } from '@/lib/database';

export async function POST(request) {
  try {
    const { savings_account_number } = await request.json();
    if (!savings_account_number || !/^\d{10}$/.test(savings_account_number)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid account number format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // Extract savings_account_id (last 7 digits, strip leading zeros)
    const savingsAccountId = String(Number(savings_account_number.slice(3))).padStart(1, '0');
    // Query for account and customer name
    const sql = `
      SELECT sa.savings_account_id, sa.balance, sa.branch_id, sa.status,
             c.first_name, c.last_name
      FROM savings_account sa
      JOIN customer_account ca ON sa.savings_account_id = ca.savings_account_id
      JOIN customer c ON ca.customer_id = c.customer_id
      WHERE sa.savings_account_id = $1
    `;
    const res = await query(sql, [Number(savingsAccountId)]);
    if (res.rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Account not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const acc = res.rows[0];
    // Validate branch prefix (first 3 digits) matches the account's branch_id
    const branchPrefixStr = savings_account_number.slice(0, 3);
    const branchPrefix = Number(branchPrefixStr);
    if (isNaN(branchPrefix)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid branch prefix in account number' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (acc.branch_id == null || Number(acc.branch_id) !== branchPrefix) {
      console.error('Branch prefix mismatch:', { providedPrefix: branchPrefix, accountBranchId: acc.branch_id });
      return new Response(
        JSON.stringify({ success: false, error: 'Account number does not belong to the expected branch' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        account_number: savings_account_number,
        savings_account_id: acc.savings_account_id,
        customer_name: `${acc.first_name} ${acc.last_name}`,
        balance: acc.balance,
        branch_id: acc.branch_id,
        status: acc.status,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
