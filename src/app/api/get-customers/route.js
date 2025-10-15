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

    // If admin, return recent customers; otherwise restrict to customers created by the user (agent/manager)
    let sql;
    let params = [];

    if (currentUser.role === 'admin') {
      sql = `SELECT customer_id, first_name, last_name, nic_number, phone_number, email, status
             FROM customer
             ORDER BY created_at DESC
             LIMIT 500`;
    } else {
      // ensure we reference the correct property from getCurrentUser (userID)
      const userId = currentUser.userID || currentUser.user_id;
      sql = `SELECT customer_id, first_name, last_name, nic_number, phone_number, email, status
             FROM customer
             WHERE created_by_user_id = $1
             ORDER BY created_at DESC
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
