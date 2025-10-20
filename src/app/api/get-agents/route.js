import { NextResponse } from "next/server";
import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function GET(request) {
  try {
    // Get the logged-in user
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    // Only managers and admins can view agents
    if (!['admin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    let sql;
    let params = [];

    if (currentUser.role === 'admin') {
      // Admin can see all agents with their customer count and creator info
      sql = `
        SELECT 
          u.user_id, 
          u.username,
          u.first_name,
          u.last_name,
          u.role,
          u.email, 
          u.status,
          u.branch_id,
          u.created_by_user_id,
          creator.first_name as creator_first_name,
          creator.last_name as creator_last_name,
          u.created_at,
          COUNT(c.customer_id) as customer_count
        FROM users u
        LEFT JOIN customer c ON u.user_id = c.created_by_user_id
        LEFT JOIN users creator ON u.created_by_user_id = creator.user_id
        WHERE u.role = 'agent'
        GROUP BY u.user_id, u.username, u.first_name, u.last_name, u.role, u.email, u.status, u.branch_id, u.created_by_user_id, creator.first_name, creator.last_name, u.created_at
        ORDER BY u.user_id ASC
        LIMIT 500
      `;
    } else {
      // Manager can only see agents they created with their customer count (no creator info)
      const userId = currentUser.user_id || currentUser.userID;
      if (!userId) {
        console.error('get-agents: missing user id on currentUser', { currentUser });
        return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
      }
      sql = `
        SELECT 
          u.user_id, 
          u.username,
          u.first_name,
          u.last_name,
          u.role,
          u.email, 
          u.status,
          u.branch_id,
          u.created_at,
          COUNT(c.customer_id) as customer_count
        FROM users u
        LEFT JOIN customer c ON u.user_id = c.created_by_user_id
        WHERE u.role = 'agent' AND u.created_by_user_id = $1
        GROUP BY u.user_id, u.username, u.first_name, u.last_name, u.role, u.email, u.status, u.branch_id, u.created_at
        ORDER BY u.user_id ASC
        LIMIT 500
      `;
      params = [userId];
    }

    try {
      const { rows } = await query(sql, params);
      return NextResponse.json({ success: true, agents: rows });
    } catch (err) {
      console.error('get-agents: DB query failed', { err: err?.message || err, sql, params });
      throw err;
    }
  } catch (error) {
    console.error("get-agents error:", error);
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
