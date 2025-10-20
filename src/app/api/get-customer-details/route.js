import { NextResponse } from "next/server";
import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function GET(request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");

    if (!customerId) {
      return NextResponse.json({ success: false, error: "customer_id is required" }, { status: 400 });
    }

    // Get customer details with creator information
    const customerRes = await query(
      `SELECT 
         c.customer_id, 
         c.first_name, 
         c.last_name, 
         c.nic_number, 
         c.gender, 
         c.address, 
         c.phone_number, 
         c.email, 
         c.date_of_birth, 
         c.status, 
         c.created_at,
         c.created_by_user_id,
         u.first_name as creator_first_name,
         u.last_name as creator_last_name,
         u.role as creator_role
       FROM customer c
       LEFT JOIN users u ON c.created_by_user_id = u.user_id
       WHERE c.customer_id = $1`,
      [customerId]
    );

    if (customerRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const customer = customerRes.rows[0];

    // Get all savings accounts for this customer with generated account numbers
    const savingsRes = await query(
      `SELECT 
         sa.savings_account_id,
         sa.balance,
         sa.status,
         sa.branch_id,
         sa.created_at,
         sap.name as plan_name,
         sap.interest_rate,
         ca.ownership,
         LPAD(sa.branch_id::text, 3, '0') || LPAD(sa.savings_account_id::text, 7, '0') as account_number
       FROM savings_account sa
       JOIN customer_account ca ON sa.savings_account_id = ca.savings_account_id
       JOIN savings_account_plan sap ON sa.savings_account_plan_id = sap.savings_account_plan_id
       WHERE ca.customer_id = $1
       ORDER BY sa.savings_account_id ASC`,
      [customerId]
    );

    // Get all fixed deposit accounts for this customer with generated account numbers
    const fdRes = await query(
      `SELECT 
         fda.fixed_deposit_account_id,
         fda.amount,
         fda.start_date,
         fda.closing_date,
         fda.next_interest_date,
         fda.status,
         fdap.name as plan_name,
         fdap.interest_rate,
         fdap.duration,
         LPAD(sa.branch_id::text, 3, '0') || LPAD(fda.savings_account_id::text, 7, '0') as savings_account_number,
         LPAD(sa.branch_id::text, 3, '0') || LPAD(fda.fixed_deposit_account_id::text, 7, '0') as fd_account_number
       FROM fixed_deposit_account fda
       JOIN savings_account sa ON fda.savings_account_id = sa.savings_account_id
       JOIN customer_account ca ON sa.savings_account_id = ca.savings_account_id
       JOIN fixed_deposit_account_plan fdap ON fda.fixed_deposit_account_plan_id = fdap.fixed_deposit_account_plan_id
       WHERE ca.customer_id = $1
       ORDER BY fda.fixed_deposit_account_id ASC`,
      [customerId]
    );

    return NextResponse.json({
      success: true,
      customer,
      savings_accounts: savingsRes.rows,
      fixed_deposit_accounts: fdRes.rows,
    });
  } catch (error) {
    console.error("get-customer-details error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
