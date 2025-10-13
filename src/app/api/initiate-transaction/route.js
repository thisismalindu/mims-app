import { query } from '@/lib/database';
import pool from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

// GET for info
export async function GET() {
  return new Response(
    JSON.stringify({
      success: true,
      info: 'POST to this endpoint with account_number (10 digits), amount, transaction_type (deposit|withdraw)',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(request) {
  try {
    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    let data;

    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form.entries());
    }

    console.log('🔄 Transaction request received:', { data, contentType });

    const { account_number, amount: amountRaw, transaction_type: txTypeRaw, description } = data;

    // Basic validation
    if (!account_number || !amountRaw || !txTypeRaw) {
      console.log('❌ Validation failed: Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: account_number, amount, transaction_type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const amount = Number(amountRaw);
    if (Number.isNaN(amount) || amount <= 0) {
      console.log('❌ Validation failed: Invalid amount:', amountRaw);
      return new Response(
        JSON.stringify({ success: false, error: 'Amount must be a positive number' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate account number format (10 digits)
    if (!/^\d{10}$/.test(String(account_number).trim())) {
      console.log('❌ Validation failed: Invalid account number format:', account_number);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid account number format. Expected 10 digits (3 for branch, 7 for account).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract branch_id and savings_account_id
    const normalized = String(account_number).trim();
    const branchId = Number(normalized.slice(0, 3));      // first 3 digits
    const savingsAccountId = Number(normalized.slice(3)); // last 7 digits

    console.log('📊 Parsed account details:', { branchId, savingsAccountId, amount });

    // Map transaction type
    const mapType = (v) => {
      const t = String(v).toLowerCase();
      if (t === 'withdraw' || t === 'withdrawal') return 'withdrawal';
      if (t === 'deposit') return 'deposit';
      return null;
    };

    const transaction_type = mapType(txTypeRaw);
    if (!transaction_type) {
      console.log('❌ Validation failed: Invalid transaction type:', txTypeRaw);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid transaction type. Only deposit or withdraw allowed.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Transaction type validated:', transaction_type);

    // Get current agent (who performs the transaction)
    const currentUser = await getCurrentUser(request);
    const performed_by_user_id = currentUser?.userID || null;

    console.log('👤 Current user:', { performed_by_user_id, userRole: currentUser?.role });

    if (!performed_by_user_id) {
      console.log('❌ Authentication failed: No user ID found');
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check account exists, active, belongs to agent, and get min_balance_required
    console.log('🔍 Checking account exists and permissions...');
    const accountCheckQuery = `
      SELECT sa.savings_account_id, sa.balance, sa.status, sa.branch_id, sa.created_by_user_id,
             sap.min_balance_required
      FROM savings_account sa
      JOIN savings_account_plan sap ON sa.savings_account_plan_id = sap.savings_account_plan_id
      WHERE sa.savings_account_id = $1 AND sa.branch_id = $2
    `;
    const accRes = await query(accountCheckQuery, [savingsAccountId, branchId]);

    if (accRes.rows.length === 0) {
      console.log('❌ Account not found:', { savingsAccountId, branchId });
      return new Response(
        JSON.stringify({ success: false, error: 'Account not found for this branch' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const account = accRes.rows[0];
    console.log('✅ Account found:', { 
      accountId: account.savings_account_id, 
      currentBalance: account.balance, 
      status: account.status,
      minBalance: account.min_balance_required,
      createdBy: account.created_by_user_id
    });

    // Ensure account is active
    if (account.status !== 'active') {
      console.log('❌ Account not active:', account.status);
      return new Response(
        JSON.stringify({ success: false, error: 'Account is not active' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ensure same agent created this account
    if (String(account.created_by_user_id) !== String(performed_by_user_id)) {
      console.log('❌ Permission denied: Agent mismatch', { 
        accountCreatedBy: account.created_by_user_id, 
        currentAgent: performed_by_user_id 
      });
      return new Response(
        JSON.stringify({ success: false, error: 'You can only perform transactions for customers you created' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔒 Starting database transaction...');

    // Begin DB transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log('✅ Database transaction started');

      // Lock the row to prevent race conditions
      const lockRes = await client.query(
        'SELECT balance FROM savings_account WHERE savings_account_id = $1 FOR UPDATE',
        [savingsAccountId]
      );

      const currentBalance = Number(lockRes.rows[0].balance || 0);
      const minBalance = Number(account.min_balance_required || 0);
      let newBalance;

      console.log('💰 Current balance locked:', currentBalance);

      if (transaction_type === 'deposit') {
        newBalance = currentBalance + amount;
        console.log('💵 Processing deposit:', { currentBalance, amount, newBalance });
      } else if (transaction_type === 'withdrawal') {
        newBalance = currentBalance - amount;
        console.log('💸 Processing withdrawal:', { currentBalance, amount, newBalance, minBalance });

        // Check minimum balance requirement
        if (newBalance < minBalance) {
          console.log('❌ Insufficient funds: Balance would be below minimum', { newBalance, minBalance });
          await client.query('ROLLBACK');
          return new Response(
            JSON.stringify({
              success: false,
              error: `Withdrawal denied. Account must maintain minimum balance of ${minBalance}`,
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      console.log('💾 Updating account balance...');
      // Update balance
      await client.query(
        `UPDATE savings_account SET balance = $1 WHERE savings_account_id = $2`,
        [newBalance, savingsAccountId]
      );

      console.log('📝 Creating transaction record...');
      // Insert transaction
      const txRes = await client.query(
        `INSERT INTO transaction (savings_account_id, fixed_deposit_account_id, transaction_type, amount, performed_by_user_id, status)
         VALUES ($1, NULL, $2, $3, $4, 'active')
         RETURNING transaction_id, created_at`,
        [savingsAccountId, transaction_type, amount, performed_by_user_id]
      );

      await client.query('COMMIT');
      console.log('✅ Transaction committed successfully:', { 
        transactionId: txRes.rows[0].transaction_id,
        newBalance 
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Transaction completed successfully',
          transaction: txRes.rows[0],
          new_balance: newBalance,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ DB transaction error - rolled back:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Internal server error during transaction' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    } finally {
      client.release();
      console.log('🔓 Database connection released');
    }
  } catch (error) {
    console.error('❌ initiate-transaction error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
