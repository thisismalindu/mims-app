import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function POST(request) {
  try {
    const data = await request.json();
    console.log("[CreateSavingAccount] Request body:", data);

    const { account_plan_name, branch_id, ownership_type, customer_id, joint_customer_id } = data || {};
    console.log("[CreateSavingAccount] Params:", { account_plan_name, branch_id, ownership_type, customer_id, joint_customer_id });

    if (!account_plan_name) {
      console.warn("[CreateSavingAccount] Missing account plan name");
      return new Response(JSON.stringify({ success: false, error: "Missing account plan name" }), { status: 400 });
    }

    // Auth and role check
    const user = await getCurrentUser(request);
    if (!user) return new Response(JSON.stringify({ success: false, error: "Authentication required" }), { status: 401 });
    if (!['admin', 'manager', 'agent'].includes(user.role)) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 });
    }
    const created_by_user_id = user?.userID || user?.user_id || null;
    console.log("[CreateSavingAccount] Auth user:", { created_by_user_id, role: user.role });

    // Validate customer ids
    const primaryCustomerId = Number(String(customer_id||'').trim());
    const jointCustomerId = joint_customer_id !== undefined && joint_customer_id !== null && String(joint_customer_id).trim() !== ''
      ? Number(String(joint_customer_id).trim())
      : null;

    if (!primaryCustomerId || Number.isNaN(primaryCustomerId)) {
      return new Response(JSON.stringify({ success: false, error: "Valid customer_id is required" }), { status: 400 });
    }
    if (ownership_type === 'joint') {
      if (!jointCustomerId || Number.isNaN(jointCustomerId)) {
        return new Response(JSON.stringify({ success: false, error: "Valid joint_customer_id is required for joint ownership" }), { status: 400 });
      }
      if (jointCustomerId === primaryCustomerId) {
        return new Response(JSON.stringify({ success: false, error: "joint_customer_id must be different from customer_id" }), { status: 400 });
      }
    }

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
      return new Response(JSON.stringify({ success: false, error: "Invalid or inactive plan" }), { status: 400 });
    }
    const savings_account_plan_id = planResult.rows[0].savings_account_plan_id;
    console.log("[CreateSavingAccount] Resolved plan id:", savings_account_plan_id);

    // Resolve branch: prefer provided branch_id; otherwise derive from primary customer's branch
    let effectiveBranchId = null;
    if (branch_id) {
      const bid = Number(String(branch_id).trim());
      if (!Number.isNaN(bid)) effectiveBranchId = bid;
    }
    if (!effectiveBranchId) {
      const cRes = await query('SELECT branch_id FROM customer WHERE customer_id = $1', [primaryCustomerId]);
      if (cRes.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "Primary customer not found" }), { status: 404 });
      }
      effectiveBranchId = cRes.rows[0].branch_id || 1;
    }

    // If joint, ensure joint customer exists (and optionally same branch)
    if (ownership_type === 'joint' && jointCustomerId) {
      const jRes = await query('SELECT customer_id FROM customer WHERE customer_id = $1', [jointCustomerId]);
      if (jRes.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "Joint customer not found" }), { status: 404 });
      }
    }

    console.log("[CreateSavingAccount] Inserting savings_account with:", { savings_account_plan_id, branch_id: effectiveBranchId, created_by_user_id });

    try {
      // Ensure atomicity
      await query('BEGIN');

      const result = await query(
        `INSERT INTO savings_account
            (savings_account_plan_id, balance, branch_id, status, created_by_user_id, created_at)
         VALUES ($1, 0, $2, 'active', $3, NOW())
         RETURNING savings_account_id, branch_id`,
        [savings_account_plan_id, effectiveBranchId, created_by_user_id]
      );
      const { savings_account_id, branch_id: insertedBranchId } = result.rows[0];
      console.log("[CreateSavingAccount] Inserted account:", result.rows[0]);

      // Link primary customer (for joint ownership, mark as 'joint' too)
      await query(
        `INSERT INTO customer_account (customer_id, savings_account_id, ownership, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [primaryCustomerId, savings_account_id, ownership_type === 'joint' ? 'joint' : 'primary']
      );

      // Link joint customer if provided
      if (ownership_type === 'joint' && jointCustomerId) {
        await query(
          `INSERT INTO customer_account (customer_id, savings_account_id, ownership, created_at)
           VALUES ($1, $2, 'joint', NOW())`,
          [jointCustomerId, savings_account_id]
        );
      }

      await query('COMMIT');

      const account_number = String(insertedBranchId).padStart(3, '0') + String(savings_account_id).padStart(7, '0');

      return new Response(
        JSON.stringify({
          success: true,
          message: "Savings account created successfully",
          savings_account_id,
          account_number,
        }),
        { status: 201 }
      );
    } catch (txErr) {
      try { await query('ROLLBACK'); } catch {}
      console.error('[CreateSavingAccount] Transaction error:', txErr);
      return new Response(JSON.stringify({ success: false, error: 'Failed to create savings account' }), { status: 500 });
    }
  } catch (error) {
    console.error("[CreateSavingAccount] Error creating savings account:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500 });
  }
}
