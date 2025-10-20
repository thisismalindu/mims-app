import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function POST(request) {
  try {
    const data = await request.json();
    const { account_plan_name, branch_id } = data;

    if (!account_plan_name) {
      return new Response(
        JSON.stringify({ error: "Missing account plan name" }),
        { status: 400 }
      );
    }

    const user = await getCurrentUser(request);
    const created_by_user_id = user?.userID || null;

    // Fetch plan ID
    const planResult = await query(
      `SELECT savings_account_plan_id
       FROM savings_account_plan
       WHERE name = $1 AND status = 'active'`,
      [account_plan_name]
    );

    if (planResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive plan" }),
        { status: 400 }
      );
    }

    const savings_account_plan_id = planResult.rows[0].savings_account_plan_id;

    // Insert new savings account
    const result = await query(
      `INSERT INTO savings_account
        (savings_account_plan_id, balance, branch_id, status, created_by_user_id, created_at)
       VALUES ($1, 0, $2, 'active', $3, NOW())
       RETURNING savings_account_id`,
      [savings_account_plan_id, branch_id || 1, created_by_user_id]
    );

    return new Response(
      JSON.stringify({
        message: "Savings account created successfully",
        account: result.rows[0],
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating savings account:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
