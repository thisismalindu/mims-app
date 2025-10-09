import { query } from '@/lib/database';
import pool from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function GET() {
	return new Response(
		JSON.stringify({ success: true, info: 'POST to this endpoint with account_number (or savings_account_id), amount, transaction_type (deposit|withdraw|interest)' }),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
}

// Helper: check if savings_account has an account_number column
async function hasAccountNumberColumn() {
	const res = await query(
		`SELECT column_name FROM information_schema.columns WHERE table_name = 'savings_account' AND column_name = 'account_number'`
	);
	return res.rows.length > 0;
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

		const { account_number, savings_account_id, amount: amountRaw, transaction_type: txTypeRaw, description } = data;

		// validate
		if ((!account_number && !savings_account_id) || !amountRaw || !txTypeRaw) {
			return new Response(JSON.stringify({ success: false, error: 'Missing required fields: account_number or savings_account_id, amount, transaction_type' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
		}

		const amount = Number(amountRaw);
		if (Number.isNaN(amount) || amount <= 0) {
			return new Response(JSON.stringify({ success: false, error: 'Amount must be a positive number' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
		}

		// map transaction type from frontend values to DB enum
		const mapType = (v) => {
			const t = String(v).toLowerCase();
			if (t === 'withdraw' || t === 'withdrawal') return 'withdrawal';
			if (t === 'deposit') return 'deposit';
			if (t === 'interest') return 'interest';
			return null;
		};

		const transaction_type = mapType(txTypeRaw);
		if (!transaction_type) {
			return new Response(JSON.stringify({ success: false, error: 'Invalid transaction_type' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
		}

			// resolve savings_account_id
			let accountId = savings_account_id ? Number(savings_account_id) : null;

			if (!accountId && account_number) {
				// account_number may be cosmetic (BRANCH-SAVINGSID, e.g. 001-000000001).
				// Preference: if the DB actually stores account_number, lookup by it. Otherwise decode the savings id part.
				const hasCol = await hasAccountNumberColumn();
				if (hasCol) {
					const res = await query('SELECT savings_account_id FROM savings_account WHERE account_number = $1', [account_number]);
					if (res.rows.length === 0) {
						return new Response(JSON.stringify({ success: false, error: 'Account not found by account_number' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
					}
					accountId = res.rows[0].savings_account_id;
				} else {
					// parse pattern like '001-000000001' -> take the part after '-' and strip leading zeros
					const parts = String(account_number).trim().split('-');
					const candidate = parts.length > 1 ? parts[parts.length - 1] : parts[0];
					const numeric = candidate.replace(/^0+/, '') || '0';
					if (/^\d+$/.test(numeric)) {
						accountId = Number(numeric);
					} else {
						// also accept raw numeric input
						if (/^\d+$/.test(String(account_number).trim())) {
							accountId = Number(String(account_number).trim());
						} else {
							return new Response(JSON.stringify({ success: false, error: 'Invalid account_number format; expected BRANCH-SAVINGSID or numeric savings_account_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
						}
					}
				}
			}

		if (!accountId) {
			return new Response(JSON.stringify({ success: false, error: 'Unable to resolve savings account id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
		}

		// get current user (performed_by_user_id)
		const currentUser = await getCurrentUser(request);
		const performed_by_user_id = currentUser?.userID || null;

		// run DB transaction: lock row, check balance (for withdrawals), update balance, insert into transaction
		const client = await pool.connect();
		try {
			await client.query('BEGIN');

			// lock the savings account row
			const selRes = await client.query('SELECT balance FROM savings_account WHERE savings_account_id = $1 FOR UPDATE', [accountId]);
			if (selRes.rows.length === 0) {
				await client.query('ROLLBACK');
				return new Response(JSON.stringify({ success: false, error: 'Savings account not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
			}

			const currentBalance = Number(selRes.rows[0].balance || 0);

			let newBalance;
			if (transaction_type === 'deposit') {
				newBalance = currentBalance + amount;
			} else if (transaction_type === 'withdrawal') {
				if (currentBalance < amount) {
					await client.query('ROLLBACK');
					return new Response(JSON.stringify({ success: false, error: 'Insufficient funds' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
				}
				newBalance = currentBalance - amount;
			} else if (transaction_type === 'interest') {
				newBalance = currentBalance + amount;
			}

			// update balance
			await client.query('UPDATE savings_account SET balance = $1 WHERE savings_account_id = $2', [newBalance, accountId]);

			// insert transaction record
			const insertRes = await client.query(
				`INSERT INTO transaction (savings_account_id, fixed_deposit_account_id, transaction_type, amount, performed_by_user_id)
				 VALUES ($1, $2, $3, $4, $5) RETURNING transaction_id, created_at`,
				[accountId, null, transaction_type, amount, performed_by_user_id]
			);

			await client.query('COMMIT');

			return new Response(JSON.stringify({ success: true, transaction: insertRes.rows[0], savings_account_id: accountId, new_balance: newBalance }), { status: 200, headers: { 'Content-Type': 'application/json' } });
		} catch (err) {
			await client.query('ROLLBACK');
			throw err;
		} finally {
			client.release();
		}

	} catch (error) {
		console.error('initiate-transaction error:', error);
		return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
}
