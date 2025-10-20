import { query } from '@/lib/database';

export async function POST(req) {
  try {
    console.log('=== Starting interest calculation ===');

    // 🔹 Calculate previous full month range
    const today = new Date();
    let prevMonth = today.getMonth();
    let prevYear = today.getFullYear();

    if (prevMonth === 0) {
      prevMonth = 11;
      prevYear -= 1;
    } else {
      prevMonth -= 1;
    }

    const monthNum = prevMonth + 1;
    const startStr = `${prevYear}-${String(monthNum).padStart(2, '0')}-01`;
    const daysInMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    const endStr = `${prevYear}-${String(monthNum).padStart(2, '0')}-${daysInMonth}`;

    console.log(`Calculating interest for ${startStr} → ${endStr}`);

    // 1️⃣ Get all active savings accounts
    const accountsRes = await query(`
      SELECT sa.savings_account_id, sa.balance, sap.interest_rate
      FROM savings_account sa
      JOIN savings_account_plan sap
        ON sa.savings_account_plan_id = sap.savings_account_plan_id
      WHERE sa.status = 'active'
    `);

    if (!accountsRes.rows.length) {
      console.log('⚠️ No active accounts found.');
      return new Response(
        JSON.stringify({ success: true, message: 'No active accounts found.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let skipped = 0;

    for (const acc of accountsRes.rows) {
      const { savings_account_id, interest_rate, balance } = acc;
      console.log(`\nProcessing Account ${savings_account_id} (Rate: ${interest_rate}%, Balance: ${balance})`);

      if (interest_rate <= 0) {
        console.log('⏩ Skipping account with non-positive interest rate.');
        skipped++;
        continue;
      }

      // 2️⃣ Skip if interest already credited this month
      const checkRes = await query(
        `
        SELECT COUNT(*) AS cnt
        FROM transaction
        WHERE savings_account_id = $1
          AND transaction_type = 'interest'
          AND transaction_time::date BETWEEN $2::date AND $3::date
        `,
        [savings_account_id, startStr, endStr]
      );

      if (Number(checkRes.rows[0].cnt) > 0) {
        console.log('⚠️ Interest already credited this month. Skipping.');
        skipped++;
        continue;
      }

      // 3️⃣ Compute opening balance (sum of all transactions before this month)
      const openingRes = await query(
        `
        SELECT COALESCE(SUM(
          CASE t.transaction_type
            WHEN 'deposit' THEN t.amount
            WHEN 'withdrawal' THEN -t.amount
            WHEN 'interest' THEN t.amount
            ELSE 0
          END
        ), 0) AS total_before
        FROM transaction t
        WHERE t.savings_account_id = $1
          AND t.transaction_time::date < $2::date
          AND t.status = 'active'
        `,
        [savings_account_id, startStr]
      );

      let opening_balance = Number(openingRes.rows[0].total_before);

      // If no previous transactions exist, use the account balance as opening balance
      if (opening_balance === 0) {
        opening_balance = Number(balance);
      }

      console.log(`Opening Balance: ${opening_balance}`);
      console.log('Raw query result:', openingRes.rows[0]);

      if (opening_balance <= 0) {
        console.log('⏩ No valid balance found for interest.');
        skipped++;
        continue;
      }

      // 4️⃣ Compute monthly interest (average daily balance)
      const interestRes = await query(
        `
        WITH days AS (
          SELECT generate_series($1::date, $2::date, '1 day'::interval) AS day
        ),
        daily_balances AS (
          SELECT 
            d.day,
            $3 + COALESCE(SUM(
              CASE t.transaction_type
                WHEN 'deposit' THEN t.amount
                WHEN 'withdrawal' THEN -t.amount
                WHEN 'interest' THEN t.amount
                ELSE 0
              END
            ), 0) AS end_of_day_balance
          FROM days d
          LEFT JOIN transaction t ON t.savings_account_id = $4
            AND t.transaction_time::date >= $1::date
            AND t.transaction_time::date <= d.day
            AND t.status = 'active'
          GROUP BY d.day
        )
        SELECT COALESCE(SUM(
          GREATEST(end_of_day_balance, 0) * ($5 / 100.0 / 365)
        ), 0) AS total_interest
        FROM daily_balances
        `,
        [startStr, endStr, opening_balance, savings_account_id, interest_rate]
      );

      let interest = Number(interestRes.rows[0].total_interest);

      if (interest <= 0 && opening_balance > 0) {
        interest = (opening_balance * (interest_rate / 100) * (daysInMonth / 365));
        console.log(`💡 Fallback interest (no transactions): ${interest.toFixed(2)}`);
      }

      if (interest <= 0) {
        console.log('⏩ No interest accrued this month.');
        skipped++;
        continue;
      }

      // 5️⃣ Record transaction and update balance
      try {
        await query('BEGIN');

        await query(
          `
          INSERT INTO transaction
            (savings_account_id, transaction_type, amount, description, transaction_time, status)
          VALUES ($1, 'interest', $2, 'Interest Credited (Auto)', NOW(), 'active')
        `,
          [savings_account_id, interest]
        );

        await query(
          `
          UPDATE savings_account
          SET balance = balance + $1, updated_at = NOW()
          WHERE savings_account_id = $2
        `,
          [interest, savings_account_id]
        );

        await query('COMMIT');
        console.log(`✅ Credited ${interest.toFixed(2)} interest to account ${savings_account_id}.`);
        processed++;
      } catch (error) {
        await query('ROLLBACK');
        console.error(`❌ Transaction failed for ${savings_account_id}:`, error.message);
        skipped++;
      }
    }

    console.log('=== Interest Calculation Completed ===');
    return new Response(
      JSON.stringify({
        success: true,
        message: `Interest calculation complete. Processed: ${processed}, Skipped: ${skipped}. Month: ${startStr} → ${endStr}.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('💥 Interest calculation error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message, stack: err.stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
