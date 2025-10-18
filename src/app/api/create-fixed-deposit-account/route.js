import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('create-fixed-deposit-account body:', body);
    const { savings_account_number, fixed_deposit_account_plan_id, amount } = body || {};

    if (!savings_account_number || !/^\d{10}$/.test(savings_account_number)) {
      console.error('Invalid account number format:', savings_account_number);
      return new Response(JSON.stringify({ success: false, error: 'Invalid account number format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (fixed_deposit_account_plan_id === undefined || fixed_deposit_account_plan_id === null || amount === undefined || amount === null) {
      console.error('Missing required fields:', { fixed_deposit_account_plan_id, amount });
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const planId = Number(String(fixed_deposit_account_plan_id).trim());
    if (isNaN(planId) || !isFinite(planId)) {
      console.error('Invalid plan id (not a number):', fixed_deposit_account_plan_id);
      return new Response(JSON.stringify({ success: false, error: 'Invalid plan id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      console.error('Invalid amount:', amount);
      return new Response(JSON.stringify({ success: false, error: 'Invalid amount' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Extract savings_account_id (last 7 digits)
    const savingsAccountIdStr = savings_account_number.slice(3);
    const savings_account_id = Number(savingsAccountIdStr);
    if (isNaN(savings_account_id)) {
      console.error('Could not parse savings_account_id from number:', savings_account_number);
      return new Response(JSON.stringify({ success: false, error: 'Invalid savings account number' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    console.log('Parsed savings_account_id:', savings_account_id, 'planId:', planId, 'amount:', amt);

    // Get FD plan details using numeric planId
    const planRes = await query('SELECT * FROM fixed_deposit_account_plan WHERE fixed_deposit_account_plan_id = $1', [planId]);
    console.log('Plan query rows:', planRes.rows.length);
    if (planRes.rows.length === 0) {
      console.error('FD plan not found for id:', planId);
      return new Response(JSON.stringify({ success: false, error: 'FD plan not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    const plan = planRes.rows[0];
    if (amt < Number(plan.minimum_amount_required)) {
      console.error('Amount less than minimum required:', amt, plan.minimum_amount_required);
      return new Response(JSON.stringify({ success: false, error: `Amount is less than minimum required (${plan.minimum_amount_required})` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Ensure there is no active fixed deposit for this savings account
    try {
      const existingRes = await query('SELECT fixed_deposit_account_id, status FROM fixed_deposit_account WHERE savings_account_id = $1 AND status = $2', [savings_account_id, 'active']);
      if (existingRes.rows && existingRes.rows.length > 0) {
        console.error('Active fixed deposit exists for savings_account_id:', savings_account_id, existingRes.rows);
        return new Response(JSON.stringify({ success: false, error: 'An active fixed deposit already exists for this savings account' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (err) {
      console.error('Error checking existing fixed deposits:', err);
      return new Response(JSON.stringify({ success: false, error: 'Database error during FD existence check' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Call initiate-transaction API for withdrawal
    let txData;
    try {
      // Build absolute URL: prefer NEXT_PUBLIC_BASE_URL, otherwise derive from request headers
      let base = process.env.NEXT_PUBLIC_BASE_URL || '';
      if (!base) {
        const host = request.headers.get('host');
        const proto = request.headers.get('x-forwarded-proto') || 'http';
        if (host) base = `${proto}://${host}`;
        else base = 'http://localhost:3000';
      }
      const txUrl = new URL('/api/initiate-transaction', base).toString();
      console.log('Calling transaction URL:', txUrl);
      const txRes = await fetch(txUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
        body: JSON.stringify({ account_number: savings_account_number, amount: amt, transaction_type: 'withdraw', description: 'fixed-deposit-init' }),
      });
      txData = await txRes.json();
    } catch (err) {
      console.error('Error calling initiate-transaction:', err);
      return new Response(JSON.stringify({ success: false, error: 'Transaction service error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    console.log('Transaction response:', txData);
    if (!txData || !txData.success) {
      console.error('Transaction failed or returned false:', txData);
      return new Response(JSON.stringify({ success: false, error: txData?.error || 'Transaction failed' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Dates
    const now = new Date();
    const start_date = now.toISOString().slice(0, 10);
    const next_interest_date = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let months = 6;
    if (plan.duration && typeof plan.duration === 'string') {
      const m = plan.duration.match(/(\d+)_months?/);
      if (m) months = Number(m[1]);
    }
    const closing_date = new Date(now.setMonth(now.getMonth() + months)).toISOString().slice(0, 10);

    // Get current user
    const currentUser = await getCurrentUser(request);
    console.log('Current user from getCurrentUser:', currentUser);
    const created_by_user_id = currentUser?.userID || currentUser?.user_id || currentUser?.userId;
    if (!created_by_user_id) {
      console.error('Authentication required - no user id from getCurrentUser');
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Validate params before insert
    if (!savings_account_id || !planId || !amt || !start_date || !next_interest_date || !closing_date) {
      console.error('FD insert param error:', { savings_account_id, planId, amt, start_date, next_interest_date, closing_date, created_by_user_id });
      return new Response(JSON.stringify({ success: false, error: 'Invalid parameters for FD account creation' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      console.log('Inserting FD account with params:', [savings_account_id, planId, amt, start_date, next_interest_date, closing_date, created_by_user_id]);
      const fdRes = await query(
        `INSERT INTO fixed_deposit_account
          (savings_account_id, fixed_deposit_account_plan_id, amount, start_date, next_interest_date, closing_date, status, created_by_user_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, NOW(), NOW())
         RETURNING fixed_deposit_account_id`,
        [savings_account_id, planId, amt, start_date, next_interest_date, closing_date, created_by_user_id]
      );
      console.log('FD insert success:', fdRes.rows);
      return new Response(JSON.stringify({ success: true, message: 'Fixed Deposit Account created', fixed_deposit_account_id: fdRes.rows[0].fixed_deposit_account_id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      console.error('FD insert SQL error:', err, err?.message);
      return new Response(JSON.stringify({ success: false, error: 'Database error: ' + (err?.message || String(err)) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    console.error('Top level error in create-fixed-deposit-account:', err, err?.message);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error: ' + (err?.message || String(err)) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
