import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function POST(request) {
  try {
    const data = await request.json();
    console.log("[CreateSavingAccount] Request body:", data);

    const { account_plan_name, customer_id, joint_customer_id, ownership_type } = data;  // Ignore frontend branch_id
    console.log("[CreateSavingAccount] Params:", { account_plan_name, customer_id, joint_customer_id, ownership_type });

    if (!account_plan_name || !customer_id || !ownership_type) {
      console.warn("[CreateSavingAccount] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: account_plan_name, customer_id, ownership_type" }),
        { status: 400 }
      );
    }

    if (ownership_type === 'joint' && !joint_customer_id) {
      return new Response(
        JSON.stringify({ error: "joint_customer_id is required for joint ownership" }),
        { status: 400 }
      );
    }

    if (ownership_type === 'primary' && account_plan_name === 'Joint') {
      return new Response(
        JSON.stringify({ error: "Joint plan is only available for joint ownership" }),
        { status: 400 }
      );
    }

    if (ownership_type === 'joint' && account_plan_name !== 'Joint') {
      return new Response(
        JSON.stringify({ error: "Joint ownership requires the Joint plan" }),
        { status: 400 }
      );
    }

    // Validate customers exist and are active
    const customerQuery = `SELECT customer_id, date_of_birth, status FROM customer WHERE customer_id = $1`;
    const primaryCustomer = await query(customerQuery, [customer_id]);
    if (primaryCustomer.rows.length === 0 || primaryCustomer.rows[0].status !== 'active') {
      return new Response(JSON.stringify({ error: "Primary customer not found or inactive" }), { status: 400 });
    }

    let jointCustomer = null;
    if (ownership_type === 'joint') {
      jointCustomer = await query(customerQuery, [joint_customer_id]);
      if (jointCustomer.rows.length === 0 || jointCustomer.rows[0].status !== 'active') {
        return new Response(JSON.stringify({ error: "Joint customer not found or inactive" }), { status: 400 });
      }
      if (customer_id === joint_customer_id) {
        return new Response(JSON.stringify({ error: "Primary and joint customers must be different" }), { status: 400 });
      }
    }

    // Basic age validation (full filtering in frontend, but check min_age here)
    const calculateAge = (dob) => {
      const today = new Date('2025-10-20');  // Fixed to current date
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    const primaryAge = calculateAge(primaryCustomer.rows[0].date_of_birth);
    let minAge = 0;
    if (account_plan_name === 'Children') minAge = 0;
    else if (account_plan_name === 'Teen') minAge = 13;
    else if (account_plan_name === 'Adult' || account_plan_name === 'Joint') minAge = 18;
    else if (account_plan_name === 'Senior') minAge = 60;

    if (primaryAge < minAge) {
      return new Response(JSON.stringify({ error: `Customer age (${primaryAge}) does not meet plan requirements` }), { status: 400 });
    }

    if (ownership_type === 'joint' && account_plan_name === 'Joint') {
      const jointAge = calculateAge(jointCustomer.rows[0].date_of_birth);
      if (jointAge < 18) {
        return new Response(JSON.stringify({ error: `Joint customer age (${jointAge}) must be at least 18` }), { status: 400 });
      }
    }

    // Get minimal user from auth
    const minimalUser = await getCurrentUser(request);
    if (!minimalUser || !minimalUser.userID) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 });
    }

    const userId = minimalUser.userID;
    console.log("[CreateSavingAccount] Auth minimal user:", { userID: userId, role: minimalUser.role });

    // Fetch full user details from DB, including branch_id
    const userRes = await query(
      `SELECT user_id, username, first_name, last_name, role, email, branch_id, status, created_by_user_id
       FROM users 
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    console.log("[CreateSavingAccount] User query result:", userRes.rows.length);

    if (userRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: "User not found or inactive" }), { status: 404 });
    }

    const user = { ...userRes.rows[0], userID: userRes.rows[0].user_id };
    const created_by_user_id = user.userID;
    console.log("[CreateSavingAccount] Full user:", { userID: user.userID, branch_id: user.branch_id, role: user.role });

    // Auto-set branch_id to agent's branch
    const agentBranchId = user.branch_id;
    if (!agentBranchId) {
      console.warn("[CreateSavingAccount] Agent has no branch assigned");
      return new Response(JSON.stringify({ error: "Agent must be assigned to a branch" }), { status: 400 });
    }

    // Validate branch exists and is active
    const branchCheck = await query(
      `SELECT branch_id, branch_name FROM branch WHERE branch_id = $1 AND status = 'active'`,
      [agentBranchId]
    );
    console.log("[CreateSavingAccount] Branch check result:", branchCheck.rows);  // Debug log
    if (branchCheck.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Agent's branch is invalid or inactive" }), { status: 400 });
    }

    console.log("[CreateSavingAccount] Using agent's branch_id:", agentBranchId);

    // Fetch plan ID and details (including max_age for potential future use)
    console.log("[CreateSavingAccount] Fetching plan by name:", account_plan_name);
    const planResult = await query(
      `SELECT savings_account_plan_id, minimum_age_required, maximum_age_required
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

    console.log("[CreateSavingAccount] Inserting savings_account with:", {
      savings_account_plan_id,
      branch_id: agentBranchId,
      created_by_user_id,
    });

    // Insert savings_account as inactive
    const result = await query(
      `INSERT INTO savings_account
        (savings_account_plan_id, balance, branch_id, status, created_by_user_id, created_at)
       VALUES ($1, 0, $2, 'inactive', $3, NOW())
       RETURNING savings_account_id`,
      [savings_account_plan_id, agentBranchId, created_by_user_id]
    );
    console.log("[CreateSavingAccount] Inserted account:", result.rows[0]);

    const savings_account_id = result.rows[0].savings_account_id;

    // Insert into customer_account
    await query(
      `INSERT INTO customer_account (customer_id, savings_account_id, ownership)
       VALUES ($1, $2, 'primary')`,
      [customer_id, savings_account_id]
    );

    if (ownership_type === 'joint') {
      await query(
        `INSERT INTO customer_account (customer_id, savings_account_id, ownership)
         VALUES ($1, $2, 'joint')`,
        [joint_customer_id, savings_account_id]
      );
    }

    console.log("[CreateSavingAccount] Linked customers to account");

    return new Response(
      JSON.stringify({
        message: "Savings account created successfully",
        account: { savings_account_id, status: 'inactive', branch_id: agentBranchId },
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