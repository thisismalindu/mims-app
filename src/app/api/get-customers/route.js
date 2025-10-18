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
      sql = `SELECT customer_id, first_name, last_name, nic_number, phone_number, email, status
             FROM customer
             ORDER BY first_name ASC, last_name ASC
             LIMIT 500`;
    } else if (currentUser.role === 'manager') {
      // Manager sees customers created by agents who belong to them
      const userId = currentUser.userID || currentUser.user_id;
      sql = `SELECT customer_id, first_name, last_name, nic_number, phone_number, email, status
             FROM customer
             WHERE created_by_user_id IN (
               SELECT user_id FROM users WHERE created_by_user_id = $1 AND role = 'agent'
             )
             ORDER BY first_name ASC, last_name ASC
             LIMIT 500`;
      params = [userId];
    } else {
      // Agent sees only their own customers
      const userId = currentUser.userID || currentUser.user_id;
      sql = `SELECT customer_id, first_name, last_name, nic_number, phone_number, email, status
             FROM customer
             WHERE created_by_user_id = $1
             ORDER BY first_name ASC, last_name ASC
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
