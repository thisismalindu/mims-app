import { NextResponse } from "next/server";
import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function GET(request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountType = searchParams.get("type"); // 'savings' or 'fd'
    const accountId = searchParams.get("account_id");

    if (!accountType || !accountId) {
      return NextResponse.json({ success: false, error: "type and account_id are required" }, { status: 400 });
    }

    if (accountType === 'savings') {
      // Get savings account details
      const accountRes = await query(
        `SELECT 
           sa.savings_account_id,
           sa.balance,
           sa.status,
           sa.branch_id,
           sa.created_at,
           sap.name as plan_name,
           sap.interest_rate,
           sap.min_balance_required,
           LPAD(sa.branch_id::text, 3, '0') || LPAD(sa.savings_account_id::text, 7, '0') as account_number
         FROM savings_account sa
         JOIN savings_account_plan sap ON sa.savings_account_plan_id = sap.savings_account_plan_id
         WHERE sa.savings_account_id = $1`,
        [accountId]
      );

      if (accountRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
      }

      const account = accountRes.rows[0];

      // Get all customers associated with this account
      const customersRes = await query(
        `SELECT 
           c.customer_id,
           c.first_name,
           c.last_name,
           c.nic_number,
           ca.ownership
         FROM customer c
         JOIN customer_account ca ON c.customer_id = ca.customer_id
         WHERE ca.savings_account_id = $1
         ORDER BY ca.ownership DESC, c.customer_id ASC`,
        [accountId]
      );

      // Get recent 10 transactions with description
      const transactionsRes = await query(
        `SELECT 
           transaction_id,
           transaction_type,
           amount,
           description,
           transaction_time,
           status
         FROM transaction
         WHERE savings_account_id = $1
         ORDER BY transaction_time DESC
         LIMIT 10`,
        [accountId]
      );

      return NextResponse.json({
        success: true,
        account_type: 'savings',
        account,
        customers: customersRes.rows,
        transactions: transactionsRes.rows,
      });

    } else if (accountType === 'fd') {
      // Get fixed deposit account details
      const accountRes = await query(
        `SELECT 
           fda.fixed_deposit_account_id,
           fda.amount,
           fda.start_date,
           fda.closing_date,
           fda.next_interest_date,
           fda.status,
           fda.savings_account_id,
           fdap.name as plan_name,
           fdap.interest_rate,
           fdap.duration,
           sa.branch_id,
           LPAD(sa.branch_id::text, 3, '0') || LPAD(fda.fixed_deposit_account_id::text, 7, '0') as fd_account_number,
           LPAD(sa.branch_id::text, 3, '0') || LPAD(fda.savings_account_id::text, 7, '0') as savings_account_number
         FROM fixed_deposit_account fda
         JOIN fixed_deposit_account_plan fdap ON fda.fixed_deposit_account_plan_id = fdap.fixed_deposit_account_plan_id
         JOIN savings_account sa ON fda.savings_account_id = sa.savings_account_id
         WHERE fda.fixed_deposit_account_id = $1`,
        [accountId]
      );

      if (accountRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Fixed deposit account not found" }, { status: 404 });
      }

      let account = accountRes.rows[0];

      // Auto-close FD if closing date has passed
      if (account.status === 'active' && account.closing_date) {
        const closingDate = new Date(account.closing_date);
        const today = new Date();
        
        if (closingDate <= today) {
          console.log(`Auto-closing expired FD ${accountId}, transferring balance to savings account ${account.savings_account_id}`);
          
          try {
            // Begin transaction to close FD and transfer balance
            await query('BEGIN');

            // Update FD status to inactive
            await query(
              `UPDATE fixed_deposit_account 
               SET status = 'inactive' 
               WHERE fixed_deposit_account_id = $1`,
              [accountId]
            );

            // Transfer FD amount to savings account
            await query(
              `UPDATE savings_account 
               SET balance = balance + $1 
               WHERE savings_account_id = $2`,
              [account.amount, account.savings_account_id]
            );

            // Record the transfer transaction (reference savings account where amount is transferred)
            await query(
              `INSERT INTO transaction 
               (transaction_type, amount, description, savings_account_id, fixed_deposit_account_id, status) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                'transfer',
                account.amount,
                'FD closure transfer',
                account.savings_account_id,
                null,
                'active'
              ]
            );

            await query('COMMIT');

            // Update local account object to reflect closure
            account.status = 'inactive';

            console.log(`FD ${accountId} auto-closed successfully, amount ${account.amount} transferred to savings account ${account.savings_account_id}`);
          } catch (err) {
            await query('ROLLBACK');
            console.error('Error auto-closing FD:', err);
            // Continue with the response even if auto-closure fails
          }
        }
      }

      // Get customers from the linked savings account
      const customersRes = await query(
        `SELECT 
           c.customer_id,
           c.first_name,
           c.last_name,
           c.nic_number,
           ca.ownership
         FROM customer c
         JOIN customer_account ca ON c.customer_id = ca.customer_id
         WHERE ca.savings_account_id = $1
         ORDER BY ca.ownership DESC, c.customer_id ASC`,
        [account.savings_account_id]
      );

      // Get transactions for this FD (only if at least one exists) with description
      const transactionsRes = await query(
        `SELECT 
           transaction_id,
           transaction_type,
           amount,
           description,
           transaction_time,
           status
         FROM transaction
         WHERE fixed_deposit_account_id = $1
         ORDER BY transaction_time DESC
         LIMIT 10`,
        [accountId]
      );

      return NextResponse.json({
        success: true,
        account_type: 'fd',
        account,
        customers: customersRes.rows,
        transactions: transactionsRes.rows,
      });
    } else {
      return NextResponse.json({ success: false, error: "Invalid account type" }, { status: 400 });
    }

  } catch (error) {
    console.error("get-account-details error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
