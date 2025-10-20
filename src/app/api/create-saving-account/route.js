import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function POST(request) {
  try {
    const data = await request.json();
    console.log("[CreateSavingAccount] Request body:", data);

    const { account_plan_name, branch_id } = data;
    console.log("[CreateSavingAccount] Params:", { account_plan_name, branch_id });

    if (!account_plan_name) {
      console.warn("[CreateSavingAccount] Missing account plan name");
      return new Response(
        JSON.stringify({ error: "Missing account plan name" }),
        { status: 400 }
      );
    }

    const user = await getCurrentUser(request);
    const created_by_user_id = user?.userID || null;
    console.log("[CreateSavingAccount] Auth user:", { created_by_user_id });

    // Fetch plan ID
    console.log("[CreateSavingAccount] Fetching plan by name:", account_plan_name);
    const planResult = await query(
      `SELECT savings_account_plan_id
       FROM savings_account_plan
       WHERE name = $1 AND status = 'active'`,
      [account_plan_name]
    );
    console.log("[CreateSavingAccount] Plan rows:", planResult.rows.length);

    if (planResult.rows.length === 0) {
      console.warn("[CreateSavingAccount] Invalid or inactive plan:", account_plan_name);
      return new Response(
        JSON.stringify({ error: "Invalid or inactive plan" }),
        { status: 400 }
      );
    }

    const savings_account_plan_id = planResult.rows[0].savings_account_plan_id;
    console.log("[CreateSavingAccount] Resolved plan id:", savings_account_plan_id);

    const effectiveBranchId = branch_id || 1;
    console.log("[CreateSavingAccount] Inserting savings_account with:", {
      savings_account_plan_id,
      branch_id: effectiveBranchId,
      created_by_user_id,
    });

    const result = await query(
      `INSERT INTO savings_account
        (savings_account_plan_id, balance, branch_id, status, created_by_user_id, created_at)
       VALUES ($1, 0, $2, 'active', $3, NOW())
       RETURNING savings_account_id`,
      [savings_account_plan_id, effectiveBranchId, created_by_user_id]
    );
    console.log("[CreateSavingAccount] Inserted account:", result.rows[0]);

    return new Response(
      JSON.stringify({
        message: "Savings account created successfully",
        account: result.rows[0],
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("[CreateSavingAccount] Error creating savings account:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
