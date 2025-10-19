import { NextResponse } from "next/server";
import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function GET(request) {
  try {
    // 🔹 Get the logged-in user
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    // If admin, return all customers; if manager, return customers created by agents under them; if agent, return only their own customers
    let sql;
    let params = [];

    if (currentUser.role === 'admin') {
      sql = `SELECT 
               c.customer_id, 
               c.first_name, 
               c.last_name, 
               c.nic_number, 
               c.phone_number, 
               c.email, 
               c.status,
               c.created_by_user_id,
               u.first_name as agent_first_name,
               u.last_name as agent_last_name,
               MIN(sa.branch_id) as branch_id,
               ARRAY_AGG(DISTINCT LPAD(sa.branch_id::text, 3, '0') || LPAD(sa.savings_account_id::text, 7, '0')) 
                 FILTER (WHERE sa.savings_account_id IS NOT NULL) as account_numbers
             FROM customer c
             LEFT JOIN users u ON c.created_by_user_id = u.user_id
             LEFT JOIN customer_account ca ON c.customer_id = ca.customer_id
             LEFT JOIN savings_account sa ON ca.savings_account_id = sa.savings_account_id
             GROUP BY c.customer_id, c.first_name, c.last_name, c.nic_number, 
                      c.phone_number, c.email, c.status, c.created_by_user_id,
                      u.first_name, u.last_name
             ORDER BY c.first_name ASC, c.last_name ASC
             LIMIT 500`;
    } else if (currentUser.role === 'manager') {
      // Manager sees customers created by agents who belong to them
      const userId = currentUser.userID || currentUser.user_id;
      sql = `SELECT 
               c.customer_id, 
               c.first_name, 
               c.last_name, 
               c.nic_number, 
               c.phone_number, 
               c.email, 
               c.status,
               c.created_by_user_id,
               u.first_name as agent_first_name,
               u.last_name as agent_last_name,
               MIN(sa.branch_id) as branch_id,
               ARRAY_AGG(DISTINCT LPAD(sa.branch_id::text, 3, '0') || LPAD(sa.savings_account_id::text, 7, '0')) 
                 FILTER (WHERE sa.savings_account_id IS NOT NULL) as account_numbers
             FROM customer c
             LEFT JOIN users u ON c.created_by_user_id = u.user_id
             LEFT JOIN customer_account ca ON c.customer_id = ca.customer_id
             LEFT JOIN savings_account sa ON ca.savings_account_id = sa.savings_account_id
             WHERE c.created_by_user_id IN (
               SELECT user_id FROM users WHERE created_by_user_id = $1 AND role = 'agent'
             )
             GROUP BY c.customer_id, c.first_name, c.last_name, c.nic_number, 
                      c.phone_number, c.email, c.status, c.created_by_user_id,
                      u.first_name, u.last_name
             ORDER BY c.first_name ASC, c.last_name ASC
             LIMIT 500`;
      params = [userId];
    } else {
      // Agent sees only their own customers
      const userId = currentUser.userID || currentUser.user_id;
      sql = `SELECT 
               c.customer_id, 
               c.first_name, 
               c.last_name, 
               c.nic_number, 
               c.phone_number, 
               c.email, 
               c.status,
               c.created_by_user_id,
               MIN(sa.branch_id) as branch_id,
               ARRAY_AGG(DISTINCT LPAD(sa.branch_id::text, 3, '0') || LPAD(sa.savings_account_id::text, 7, '0')) 
                 FILTER (WHERE sa.savings_account_id IS NOT NULL) as account_numbers
             FROM customer c
             LEFT JOIN customer_account ca ON c.customer_id = ca.customer_id
             LEFT JOIN savings_account sa ON ca.savings_account_id = sa.savings_account_id
             WHERE c.created_by_user_id = $1
             GROUP BY c.customer_id, c.first_name, c.last_name, c.nic_number, 
                      c.phone_number, c.email, c.status, c.created_by_user_id
             ORDER BY c.first_name ASC, c.last_name ASC
             LIMIT 500`;
      params = [userId];
    }

    const { rows } = await query(sql, params);

    return NextResponse.json({ success: true, customers: rows });
  } catch (error) {
    console.error("get-customers error:", error);
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
