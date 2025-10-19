import { NextResponse } from "next/server";
import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

/**
 * Process Fixed Deposit Interest Calculation
 * 
 * This endpoint calculates and credits interest for all active FDs
 * where the next_interest_date has been reached or passed.
 * 
 * Interest Calculation:
 * - Monthly interest based on 30-day cycles
 * - Interest = (FD Amount × Annual Interest Rate × 30) / (365 × 100)
 * - Credited directly to the linked savings account
 * - Each credit is recorded as a separate transaction
 * - next_interest_date is automatically updated to +30 days
 */

export async function POST(request) {
  try {
    // Authentication check - only admin and manager can trigger this
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      return NextResponse.json({ success: false, error: "Access denied. Only admins and managers can process FD interest." }, { status: 403 });
    }

    console.log('🔄 Starting FD interest calculation process...');

    // Get all active FDs where next_interest_date <= today
    // Managers can only process FDs in their branch
    const today = new Date();
    let fdAccountsRes;
    
    if (currentUser.role === 'manager') {
      // Get manager's branch_id
      const managerRes = await query(
        `SELECT branch_id FROM users WHERE user_id = $1`,
        [currentUser.userID]
      );
      
      if (!managerRes.rows[0] || !managerRes.rows[0].branch_id) {
        return NextResponse.json({ 
          success: false, 
          error: "Manager branch information not found" 
        }, { status: 400 });
      }
      
      const managerBranchId = managerRes.rows[0].branch_id;
      
      fdAccountsRes = await query(
        `SELECT 
           fda.fixed_deposit_account_id,
           fda.amount,
           fda.savings_account_id,
           fda.next_interest_date,
           fda.closing_date,
           fdap.interest_rate,
           fdap.name as plan_name,
           sa.branch_id,
           LPAD(sa.branch_id::text, 3, '0') || LPAD(fda.fixed_deposit_account_id::text, 7, '0') as fd_account_number,
           LPAD(sa.branch_id::text, 3, '0') || LPAD(fda.savings_account_id::text, 7, '0') as savings_account_number
         FROM fixed_deposit_account fda
         JOIN fixed_deposit_account_plan fdap ON fda.fixed_deposit_account_plan_id = fdap.fixed_deposit_account_plan_id
         JOIN savings_account sa ON fda.savings_account_id = sa.savings_account_id
         WHERE fda.status = 'active' 
           AND fda.next_interest_date <= $1
           AND sa.branch_id = $2
         ORDER BY fda.fixed_deposit_account_id ASC`,
        [today, managerBranchId]
      );
    } else {
      // Admin can process all FDs
      fdAccountsRes = await query(
        `SELECT 
           fda.fixed_deposit_account_id,
           fda.amount,
           fda.savings_account_id,
           fda.next_interest_date,
           fda.closing_date,
           fdap.interest_rate,
           fdap.name as plan_name,
           sa.branch_id,
           LPAD(sa.branch_id::text, 3, '0') || LPAD(fda.fixed_deposit_account_id::text, 7, '0') as fd_account_number,
           LPAD(sa.branch_id::text, 3, '0') || LPAD(fda.savings_account_id::text, 7, '0') as savings_account_number
         FROM fixed_deposit_account fda
         JOIN fixed_deposit_account_plan fdap ON fda.fixed_deposit_account_plan_id = fdap.fixed_deposit_account_plan_id
         JOIN savings_account sa ON fda.savings_account_id = sa.savings_account_id
         WHERE fda.status = 'active' 
           AND fda.next_interest_date <= $1
         ORDER BY fda.fixed_deposit_account_id ASC`,
        [today]
      );
    }

    const fdAccounts = fdAccountsRes.rows;

    if (fdAccounts.length === 0) {
      console.log('ℹ️ No FDs found requiring interest processing');
      return NextResponse.json({
        success: true,
        message: 'No fixed deposits require interest processing at this time',
        processed: 0,
        results: []
      });
    }

    console.log(`📊 Found ${fdAccounts.length} FD(s) requiring interest processing`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each FD
    for (const fd of fdAccounts) {
      try {
        console.log(`\n💰 Processing FD #${fd.fixed_deposit_account_id} (${fd.fd_account_number})`);

        // Calculate monthly interest using 30-day cycle
        // Formula: Interest = (Amount × Annual Rate × 30) / (365 × 100)
        const amount = Number(fd.amount);
        const annualRate = Number(fd.interest_rate);
        const monthlyInterest = (amount * annualRate * 30) / (365 * 100);

        console.log(`  Amount: Rs. ${amount.toFixed(2)}`);
        console.log(`  Annual Rate: ${annualRate}%`);
        console.log(`  Monthly Interest (30-day): Rs. ${monthlyInterest.toFixed(2)}`);

        // Begin transaction
        await query('BEGIN');

        // Credit interest to linked savings account
        await query(
          `UPDATE savings_account 
           SET balance = balance + $1 
           WHERE savings_account_id = $2`,
          [monthlyInterest, fd.savings_account_id]
        );

        console.log(`  ✅ Credited Rs. ${monthlyInterest.toFixed(2)} to savings account ${fd.savings_account_number}`);

        // Record the interest transaction (FD interest paid to savings account)
        const txRes = await query(
          `INSERT INTO transaction 
           (transaction_type, amount, description, savings_account_id, fixed_deposit_account_id, performed_by_user_id, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING transaction_id, transaction_time`,
          [
            'interest',
            monthlyInterest,
            'FD interest',
            fd.savings_account_id,
            null,
            currentUser.userID,
            'active'
          ]
        );

        const transaction = txRes.rows[0];
        console.log(`  📝 Transaction recorded: ID ${transaction.transaction_id}`);

        // Update next_interest_date to +30 days
        const currentInterestDate = new Date(fd.next_interest_date);
        const nextInterestDate = new Date(currentInterestDate);
        nextInterestDate.setDate(nextInterestDate.getDate() + 30);

        // Don't set next_interest_date beyond closing_date
        let finalNextInterestDate = nextInterestDate;
        if (fd.closing_date) {
          const closingDate = new Date(fd.closing_date);
          if (nextInterestDate > closingDate) {
            finalNextInterestDate = null; // No more interest after closing
            console.log(`  ⚠️ Next interest date would exceed closing date - setting to NULL`);
          }
        }

        await query(
          `UPDATE fixed_deposit_account 
           SET next_interest_date = $1 
           WHERE fixed_deposit_account_id = $2`,
          [finalNextInterestDate, fd.fixed_deposit_account_id]
        );

        if (finalNextInterestDate) {
          console.log(`  📅 Next interest date updated to: ${finalNextInterestDate.toISOString().split('T')[0]}`);
        }

        await query('COMMIT');

        results.push({
          fd_id: fd.fixed_deposit_account_id,
          fd_account_number: fd.fd_account_number,
          savings_account_number: fd.savings_account_number,
          amount: amount,
          interest_credited: monthlyInterest,
          transaction_id: transaction.transaction_id,
          next_interest_date: finalNextInterestDate ? finalNextInterestDate.toISOString().split('T')[0] : null,
          status: 'success'
        });

        successCount++;
        console.log(`  ✅ FD #${fd.fixed_deposit_account_id} processed successfully`);

      } catch (error) {
        await query('ROLLBACK');
        console.error(`  ❌ Error processing FD #${fd.fixed_deposit_account_id}:`, error);
        
        results.push({
          fd_id: fd.fixed_deposit_account_id,
          fd_account_number: fd.fd_account_number,
          error: error.message,
          status: 'error'
        });

        errorCount++;
      }
    }

    console.log(`\n✅ FD Interest Processing Complete`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${fdAccounts.length}`);

    return NextResponse.json({
      success: true,
      message: `Processed ${successCount} of ${fdAccounts.length} fixed deposits`,
      processed: successCount,
      errors: errorCount,
      total: fdAccounts.length,
      results
    });

  } catch (error) {
    console.error('❌ FD interest processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during FD interest processing',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint for information
export async function GET() {
  return NextResponse.json({
    success: true,
    info: 'POST to this endpoint to process FD interest calculations. Only admins and managers can trigger this process.',
    calculation: 'Monthly Interest = (FD Amount × Annual Interest Rate × 30) / (365 × 100)',
    cycle: '30-day periods',
    crediting: 'Interest is credited directly to the linked savings account',
    transactions: 'Each interest credit is recorded as a separate transaction'
  });
}
