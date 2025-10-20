import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    console.log('Received POST request for report');
    const body = await request.json();
    console.log('Request body:', body);
    const { report_type_key, parameters } = body || {};

    // Identify user and ensure they are a manager
    const user = await getCurrentUser(request);
    console.log('Current user:', user);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    if (user.role !== 'manager' && user.role !== 'admin') {
      console.log('User not authorized for report request:', user.role);
      return new Response(JSON.stringify({ error: 'Forbidden: only managers or admins can request reports' }), { status: 403 });
    }

    // Resolve manager and branch
    const mres = await query('SELECT user_id, role, branch_id FROM users WHERE user_id = $1', [user.userID]);
    console.log('Manager query result:', mres.rows);
    const me = mres.rows?.[0];
    if (!me) {
      console.log('User not found in DB:', user.userID);
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Validate report type exists, auto-seed known keys if missing
    let tres = await query('SELECT report_type_id FROM report_type WHERE key = $1', [report_type_key]);
    console.log('Report type query result:', tres.rows);
    let t = tres.rows?.[0];
    if (!t) {
      const known = {
        agent_transactions: { name: 'Agent Transactions', description: 'Transactions performed by an agent in a date range' },
        account_summary: { name: 'Account Summary', description: 'Transactions and details for a savings account' },
        active_fds: { name: 'Active Fixed Deposits', description: 'List of active fixed deposits' },
        monthly_interest_summary: { name: 'Monthly Interest Summary', description: 'Interest transaction aggregation by month' },
        customer_activity: { name: 'Customer Activity', description: 'All activity across a customer\'s accounts' },
        branch_daily_summary: { name: 'Branch Daily Summary', description: 'Daily totals by transaction type in a branch' },
        dormant_accounts: { name: 'Dormant Accounts', description: 'Accounts with no activity for N days' },
        fd_maturity_schedule: { name: 'FD Maturity Schedule', description: 'Upcoming fixed deposit maturity/interest dates' }
      };
      const seed = known[report_type_key];
      if (!seed) {
        console.log('Invalid report type:', report_type_key);
        return new Response(JSON.stringify({ error: 'Invalid report type' }), { status: 400 });
      }
      const ins = await query(
        'INSERT INTO report_type (key, name, description) VALUES ($1, $2, $3) RETURNING report_type_id',
        [report_type_key, seed.name, seed.description]
      );
      t = ins.rows?.[0];
    }

    // Authorize parameters based on report type
    const params = parameters || {};
    console.log('Parameters:', params);

    // If the report is for an agent, ensure agent is in same branch
    if (report_type_key === 'agent_transactions' && params.agentId) {
      const ares = await query('SELECT user_id, branch_id, role FROM users WHERE user_id = $1', [params.agentId]);
      console.log('Agent query result:', ares.rows);
      const agent = ares.rows?.[0];
      if (!agent || agent.role !== 'agent') {
        console.log('Invalid agent:', params.agentId);
        return new Response(JSON.stringify({ error: 'Invalid agent' }), { status: 400 });
      }
      if (me.branch_id == null || agent.branch_id == null || String(agent.branch_id) !== String(me.branch_id)) {
        console.log('Agent not in manager branch:', agent.branch_id, me.branch_id);
        return new Response(JSON.stringify({ error: 'Agent not in your branch' }), { status: 403 });
      }

      // Optional date validation
      if (params.startDate && params.endDate) {
        const sd = new Date(params.startDate);
        const ed = new Date(params.endDate);
        console.log('Date range:', sd, ed);
        if (isNaN(sd.getTime()) || isNaN(ed.getTime()) || sd > ed) {
          console.log('Invalid date range:', params.startDate, params.endDate);
          return new Response(JSON.stringify({ error: 'Invalid date range' }), { status: 400 });
        }
      }
    }

  if (report_type_key === 'account_summary' && params.accountNumber) {
      const accId = Number(params.accountNumber);
      console.log('Account number:', accId);
      if (!Number.isInteger(accId)) {
        console.log('Invalid account number:', params.accountNumber);
        return new Response(JSON.stringify({ error: 'Invalid account number' }), { status: 400 });
      }
      const ares = await query('SELECT savings_account_id, branch_id FROM savings_account WHERE savings_account_id = $1', [accId]);
      console.log('Account query result:', ares.rows);
      const acc = ares.rows?.[0];
      if (!acc) {
        console.log('Account not found:', accId);
        return new Response(JSON.stringify({ error: 'Account not found' }), { status: 404 });
      }
      if (me.branch_id == null || acc.branch_id == null || String(acc.branch_id) !== String(me.branch_id)) {
        console.log('Account not in manager branch:', acc.branch_id, me.branch_id);
        return new Response(JSON.stringify({ error: 'Account not in your branch' }), { status: 403 });
      }
    }

  if (report_type_key === 'customer_activity' && params.customerId) {
    // Branch daily summary: manager/admin only, date required, auto-scoped to manager branch
    if (report_type_key === 'branch_daily_summary') {
      if (!parameters?.date) {
        return new Response(JSON.stringify({ error: 'date is required' }), { status: 400 });
      }
      // no extra validation needed; uses manager's branch
    }

    // Dormant accounts: daysWithoutActivity optional, numeric; scoped to manager branch
    if (report_type_key === 'dormant_accounts') {
      if (parameters?.daysWithoutActivity && !Number.isFinite(Number(parameters.daysWithoutActivity))) {
        return new Response(JSON.stringify({ error: 'daysWithoutActivity must be a number' }), { status: 400 });
      }
    }

    // FD maturity schedule: optional startDate/endDate
    if (report_type_key === 'fd_maturity_schedule') {
      if (parameters?.startDate && isNaN(new Date(parameters.startDate).getTime())) {
        return new Response(JSON.stringify({ error: 'Invalid startDate' }), { status: 400 });
      }
      if (parameters?.endDate && isNaN(new Date(parameters.endDate).getTime())) {
        return new Response(JSON.stringify({ error: 'Invalid endDate' }), { status: 400 });
      }
      if (parameters?.startDate && parameters?.endDate && new Date(parameters.startDate) > new Date(parameters.endDate)) {
        return new Response(JSON.stringify({ error: 'startDate must be before endDate' }), { status: 400 });
      }
    }
      const custId = Number(params.customerId);
      console.log('Customer id:', custId);
      if (!Number.isInteger(custId)) {
        console.log('Invalid customer id:', params.customerId);
        return new Response(JSON.stringify({ error: 'Invalid customer id' }), { status: 400 });
      }
      const cres = await query('SELECT customer_id, branch_id FROM customer WHERE customer_id = $1', [custId]);
      console.log('Customer query result:', cres.rows);
      const cust = cres.rows?.[0];
      if (!cust) {
        console.log('Customer not found:', custId);
        return new Response(JSON.stringify({ error: 'Customer not found' }), { status: 404 });
      }
      if (me.branch_id == null || cust.branch_id == null || String(cust.branch_id) !== String(me.branch_id)) {
        console.log('Customer not in manager branch:', cust.branch_id, me.branch_id);
        return new Response(JSON.stringify({ error: 'Customer not in your branch' }), { status: 403 });
      }
    }

    // Save request
    console.log('Saving report request:', {
      report_type_id: t.report_type_id,
      parameters: params,
      requested_by_user_id: me.user_id,
      manager_id: me.user_id,
      branch_id: me.branch_id
    });
    const ires = await query(
      `INSERT INTO report_request (report_type_id, parameters, requested_by_user_id, manager_id, branch_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING report_request_id`,
      [t.report_type_id, params, me.user_id, me.user_id, me.branch_id]
    );
    console.log('Insert result:', ires.rows);

    return new Response(JSON.stringify({ success: true, report_request_id: ires.rows[0].report_request_id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error creating report request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
