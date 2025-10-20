import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUser } from '../../utils/get-user';

async function getRequestById(id) {
  const { rows } = await query(
    `SELECT rr.*, rt.key as report_type_key, rt.name as report_type_name
       FROM report_request rr
       JOIN report_type rt ON rt.report_type_id = rr.report_type_id
      WHERE rr.report_request_id = $1`,
    [id]
  );
  return rows[0];
}

async function buildReportData(reqRow) {
  const type = reqRow.report_type_key;
  const p = reqRow.parameters || {};

  if (type === 'agent_transactions') {
    const agentId = Number(p.agentId);
    const start = p.startDate ? new Date(p.startDate) : null;
    const end = p.endDate ? new Date(p.endDate) : null;
    const params = [agentId];
    let where = 't.performed_by_user_id = $1';
    if (start) { params.push(start.toISOString()); where += ` AND transaction_time >= $${params.length}`; }
    if (end) { params.push(new Date(end.getTime() + 24*3600*1000).toISOString()); where += ` AND transaction_time < $${params.length}`; }
    const { rows } = await query(
      `SELECT t.transaction_id, t.transaction_type, t.amount, t.description, t.transaction_time,
              t.savings_account_id, sa.branch_id,
              u.user_id AS agent_id, u.first_name AS agent_first_name, u.last_name AS agent_last_name,
              own.owners
         FROM transaction t
         LEFT JOIN savings_account sa ON sa.savings_account_id = t.savings_account_id
         JOIN users u ON u.user_id = t.performed_by_user_id
         LEFT JOIN LATERAL (
            SELECT array_agg(c.first_name || ' ' || c.last_name) AS owners
              FROM customer_account ca
              JOIN customer c ON c.customer_id = ca.customer_id
             WHERE ca.savings_account_id = t.savings_account_id
         ) own ON true
        WHERE ${where}
        ORDER BY t.transaction_time DESC
        LIMIT 2000`,
      params
    );
    // aggregate summary
    const totals = rows.reduce((acc, r) => {
      acc.count++;
      acc.sum += Number(r.amount);
      return acc;
    }, { count: 0, sum: 0 });
    // Agent context
    const ainfo = await query('SELECT user_id, first_name, last_name, username FROM users WHERE user_id = $1', [agentId]);
    return { title: 'Agent Transactions', totals, rows, context: { agent: ainfo.rows?.[0] || null, dateRange: { start: p.startDate || null, end: p.endDate || null } } };
  }

  if (type === 'account_summary') {
    const accId = Number(p.accountNumber);
    const tx = await query(
      `SELECT t.transaction_id, t.transaction_type, t.amount, t.description, t.transaction_time,
              u.user_id AS agent_id, u.first_name AS agent_first_name, u.last_name AS agent_last_name
         FROM transaction t
         LEFT JOIN users u ON u.user_id = t.performed_by_user_id
        WHERE t.savings_account_id = $1
        ORDER BY t.transaction_time DESC
        LIMIT 2000`,
      [accId]
    );
    const accRes = await query(
      `SELECT sa.savings_account_id, sa.balance, sa.branch_id, sap.name AS plan_name, sa.created_by_user_id,
              u.first_name AS created_by_first_name, u.last_name AS created_by_last_name
         FROM savings_account sa
         LEFT JOIN savings_account_plan sap ON sap.savings_account_plan_id = sa.savings_account_plan_id
         LEFT JOIN users u ON u.user_id = sa.created_by_user_id
        WHERE sa.savings_account_id = $1`,
      [accId]
    );
    const ownersRes = await query(
      `SELECT c.customer_id, c.first_name, c.last_name
         FROM customer_account ca
         JOIN customer c ON c.customer_id = ca.customer_id
        WHERE ca.savings_account_id = $1`,
      [accId]
    );
    return {
      title: 'Account Transaction Summary',
      balance: accRes.rows?.[0]?.balance ?? null,
      rows: tx.rows,
      context: {
        account: accRes.rows?.[0] || null,
        owners: ownersRes.rows,
      }
    };
  }

  if (type === 'active_fds') {
    const { rows } = await query(
      `SELECT f.fixed_deposit_account_id, f.amount, f.start_date, f.next_interest_date, f.status,
              s.savings_account_id, s.branch_id,
              sap.name AS plan_name,
              own.owners
         FROM fixed_deposit_account f
         JOIN savings_account s ON s.savings_account_id = f.savings_account_id
         LEFT JOIN fixed_deposit_account_plan sap ON sap.fixed_deposit_account_plan_id = f.fixed_deposit_account_plan_id
         LEFT JOIN LATERAL (
            SELECT array_agg(c.first_name || ' ' || c.last_name) AS owners
              FROM customer_account ca
              JOIN customer c ON c.customer_id = ca.customer_id
             WHERE ca.savings_account_id = s.savings_account_id
         ) own ON true
        WHERE f.status = 'active'
        ORDER BY f.next_interest_date NULLS LAST
        LIMIT 2000`
    );
    return { title: 'Active Fixed Deposits', rows };
  }

  if (type === 'monthly_interest_summary') {
    // Example aggregation by month and account type
    const { rows } = await query(
      `SELECT date_trunc('month', transaction_time) as month,
              transaction_type,
              COUNT(*) as cnt,
              SUM(amount) as total
         FROM transaction
        WHERE transaction_type = 'interest'
        GROUP BY 1,2
        ORDER BY 1 DESC
        LIMIT 120`
    );
    return { title: 'Monthly Interest Distribution', rows };
  }

  if (type === 'customer_activity') {
    const custId = Number(p.customerId);
    const accs = await query(
      `SELECT ca.savings_account_id
         FROM customer_account ca
        WHERE ca.customer_id = $1`,
      [custId]
    );
    const ids = accs.rows.map(r => r.savings_account_id);
    if (ids.length === 0) return { title: 'Customer Activity', rows: [], context: { customer: null, accounts: [] } };
    const { rows } = await query(
      `SELECT t.transaction_id, t.savings_account_id, t.transaction_type, t.amount, t.description, t.transaction_time,
              u.user_id AS agent_id, u.first_name AS agent_first_name, u.last_name AS agent_last_name
         FROM transaction t
         LEFT JOIN users u ON u.user_id = t.performed_by_user_id
        WHERE t.savings_account_id = ANY($1)
        ORDER BY t.transaction_time DESC
        LIMIT 2000`,
      [ids]
    );
    const cust = await query('SELECT customer_id, first_name, last_name, email, phone_number FROM customer WHERE customer_id = $1', [custId]);
    return { title: 'Customer Activity', rows, context: { customer: cust.rows?.[0] || null, accounts: ids } };
  }

  return { title: 'Unknown Report', rows: [] };
}

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const id = Number(params.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const row = await getRequestById(id);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Authorization: admin can see all; manager only own requests
    if (user.role === 'manager') {
      const uid = user.userID || user.user_id;
      if (String(row.manager_id) !== String(uid)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const data = await buildReportData(row);
    return NextResponse.json({ request: {
      id: row.report_request_id,
      typeKey: row.report_type_key,
      typeName: row.report_type_name,
      status: row.status,
      created_at: row.created_at,
    }, data }, { status: 200 });
  } catch (e) {
    console.error('GET /api/report-requests/[id] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
