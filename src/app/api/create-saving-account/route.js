import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function POST(request) {
  try {
    const data = await request.json();
    console.log("[CreateSavingAccount] Request body:", data);

    const { account_plan_name, customer_id, joint_customer_id, ownership_type } = data || {};
    console.log("[CreateSavingAccount] Params:", { account_plan_name, customer_id, joint_customer_id, ownership_type });

    // Basic presence validation
    if (!account_plan_name || !customer_id || !ownership_type) {
      console.warn("[CreateSavingAccount] Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: account_plan_name, customer_id, ownership_type" }),
        { status: 400 }
      );
    }

    // Ownership + plan consistency
    if (ownership_type === "joint" && !joint_customer_id) {
      return new Response(JSON.stringify({ success: false, error: "joint_customer_id is required for joint ownership" }), { status: 400 });
    }
    if (ownership_type === "primary" && account_plan_name === "Joint") {
      return new Response(JSON.stringify({ success: false, error: "Joint plan is only available for joint ownership" }), { status: 400 });
    }
    if (ownership_type === "joint" && account_plan_name !== "Joint") {
      return new Response(JSON.stringify({ success: false, error: "Joint ownership requires the Joint plan" }), { status: 400 });
    }

    // Authn + role
    const authUser = await getCurrentUser(request);
    if (!authUser) return new Response(JSON.stringify({ success: false, error: "Authentication required" }), { status: 401 });
    if (!["admin", "manager", "agent"].includes(authUser.role)) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 });
    }
    const created_by_user_id = authUser.userID ?? authUser.user_id ?? null;
    console.log("[CreateSavingAccount] Auth user:", { created_by_user_id, role: authUser.role });

    // Load full user (for branch_id)
    const userRes = await query(
      `SELECT user_id, role, branch_id, status
       FROM users
       WHERE user_id = $1 AND status = 'active'`,
      [created_by_user_id]
    );
    if (!userRes.rows.length) {
      return new Response(JSON.stringify({ success: false, error: "User not found or inactive" }), { status: 404 });
    }
    const user = userRes.rows[0];
    const agentBranchId = user.branch_id;
    if (!agentBranchId) {
      console.warn("[CreateSavingAccount] Creator has no branch assigned");
      return new Response(JSON.stringify({ success: false, error: "Creator must be assigned to a branch" }), { status: 400 });
    }

    // Validate branch is active
    const branchCheck = await query(
      `SELECT branch_id FROM branch WHERE branch_id = $1 AND status = 'active'`,
      [agentBranchId]
    );
    if (!branchCheck.rows.length) {
      return new Response(JSON.stringify({ success: false, error: "Creator's branch is invalid or inactive" }), { status: 400 });
    }

    // Parse customer ids
    const primaryCustomerId = Number(String(customer_id).trim());
    const jointCustomerId =
      ownership_type === "joint" && joint_customer_id !== undefined && String(joint_customer_id).trim() !== ""
        ? Number(String(joint_customer_id).trim())
        : null;

    if (!Number.isInteger(primaryCustomerId)) {
      return new Response(JSON.stringify({ success: false, error: "Valid customer_id is required" }), { status: 400 });
    }
    if (ownership_type === "joint") {
      if (!Number.isInteger(jointCustomerId)) {
        return new Response(JSON.stringify({ success: false, error: "Valid joint_customer_id is required for joint ownership" }), { status: 400 });
      }
      if (jointCustomerId === primaryCustomerId) {
        return new Response(JSON.stringify({ success: false, error: "joint_customer_id must be different from customer_id" }), { status: 400 });
      }
    }

    // Validate customers exist and are active
    const customerSql = `SELECT customer_id, date_of_birth, status, branch_id FROM customer WHERE customer_id = ANY($1::bigint[])`;
    const toCheck = ownership_type === "joint" ? [primaryCustomerId, jointCustomerId] : [primaryCustomerId];
    const custRes = await query(customerSql, [toCheck]);
    if (custRes.rows.length !== toCheck.length || custRes.rows.some(c => c.status !== "active")) {
      return new Response(JSON.stringify({ success: false, error: "Customer not found or inactive" }), { status: 400 });
    }

    // Agents/managers must only create accounts for customers in their branch
    if (authUser.role !== "admin") {
      const anyMismatch = custRes.rows.some(c => c.branch_id !== agentBranchId);
      if (anyMismatch) {
        return new Response(JSON.stringify({ success: false, error: "Customers must belong to your branch" }), { status: 403 });
      }
    }

    // Age validation (basic; can be moved to plan metadata)
    const dobMap = new Map(custRes.rows.map(c => [c.customer_id, c.date_of_birth]));
    const calculateAge = (dob) => {
      const today = new Date(); // use current date
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };
    const primaryAge = calculateAge(dobMap.get(primaryCustomerId));
    let minAge = 0;
    if (account_plan_name === "Children") minAge = 0;
    else if (account_plan_name === "Teen") minAge = 13;
    else if (account_plan_name === "Adult" || account_plan_name === "Joint") minAge = 18;
    else if (account_plan_name === "Senior") minAge = 60;
    if (primaryAge < minAge) {
      return new Response(JSON.stringify({ success: false, error: `Customer age (${primaryAge}) does not meet plan requirements` }), { status: 400 });
    }
    if (ownership_type === "joint" && account_plan_name === "Joint") {
      const jointAge = calculateAge(dobMap.get(jointCustomerId));
      if (jointAge < 18) {
        return new Response(JSON.stringify({ success: false, error: `Joint customer age (${jointAge}) must be at least 18` }), { status: 400 });
      }
    }

    // Resolve plan id
    console.log("[CreateSavingAccount] Fetching plan by name:", account_plan_name);
    const planResult = await query(
      `SELECT savings_account_plan_id
       FROM savings_account_plan
       WHERE name = $1 AND status = 'active'`,
      [account_plan_name]
    );
    if (!planResult.rows.length) {
      console.warn("[CreateSavingAccount] Invalid or inactive plan:", account_plan_name);
      return new Response(JSON.stringify({ success: false, error: "Invalid or inactive plan" }), { status: 400 });
    }
    const savings_account_plan_id = planResult.rows[0].savings_account_plan_id;

    console.log("[CreateSavingAccount] Inserting savings_account with:", {
      savings_account_plan_id,
      branch_id: agentBranchId,
      created_by_user_id,
    });

    try {
      await query("BEGIN");

      // Insert account as active
      const accRes = await query(
        `INSERT INTO savings_account
          (savings_account_plan_id, balance, branch_id, status, created_by_user_id, created_at)
         VALUES ($1, 0, $2, 'active', $3, NOW())
         RETURNING savings_account_id, branch_id`,
        [savings_account_plan_id, agentBranchId, created_by_user_id]
      );
      const { savings_account_id, branch_id } = accRes.rows[0];

      // Link owners
      const ownershipForPrimary = ownership_type === "joint" ? "joint" : "primary";
      await query(
        `INSERT INTO customer_account (customer_id, savings_account_id, ownership, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [primaryCustomerId, savings_account_id, ownershipForPrimary]
      );
      if (ownership_type === "joint") {
        await query(
          `INSERT INTO customer_account (customer_id, savings_account_id, ownership, created_at)
           VALUES ($1, $2, 'joint', NOW())`,
          [jointCustomerId, savings_account_id]
        );
      }

      await query("COMMIT");

      // Compute a display account number (branch padded + account id padded)
      const account_number = String(branch_id).padStart(3, "0") + String(savings_account_id).padStart(7, "0");

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
      try { await query("ROLLBACK"); } catch {}
      console.error("[CreateSavingAccount] Transaction error:", txErr);
      return new Response(JSON.stringify({ success: false, error: "Failed to create savings account" }), { status: 500 });
    }
  } catch (error) {
    console.error("[CreateSavingAccount] Error creating savings account:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500 });
  }
}