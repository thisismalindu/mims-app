import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function POST(request) {
  try {
    const data = await request.json();
    const { savings_account_id, fixed_deposit_account_plan_id, amount, start_date } = data;

    if (!savings_account_id || !fixed_deposit_account_plan_id || !amount || !start_date) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const user = await getCurrentUser(request);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

    if (user.role !== "admin" && user.role !== "manager") {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    // Generate account number: branch_code + 7 digit savings_account_id
    const branchRes = await query(`SELECT branch_id, branch_code FROM branch WHERE branch_id = (SELECT branch_id FROM savings_account WHERE savings_account_id=$1)`, [savings_account_id]);
    if (branchRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid savings account" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const branch_code = branchRes.rows[0].branch_code.padStart(3, "0");
    const account_no = branch_code + String(savings_account_id).padStart(7, "0");

    const result = await query(
      `INSERT INTO fixed_deposit_account
        (savings_account_id, fixed_deposit_account_plan_id, amount, start_date, status, created_by_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', $5, NOW(), NOW())
       RETURNING fixed_deposit_account_id`,
      [savings_account_id, fixed_deposit_account_plan_id, amount, start_date, user.userID]
    );

    return new Response(JSON.stringify({ message: "Fixed Deposit Account created", account_no, account: result.rows[0] }), { status: 201, headers: { "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error creating fixed deposit account:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
