import { NextResponse } from "next/server";
import { getCurrentUser } from "../utils/get-user";
import { query } from "@/lib/database";

export async function GET(request) {
  try {
    const minimalUser = await getCurrentUser(request);
    console.log("[CurrentUser] Minimal user from auth:", { userID: minimalUser?.userID, role: minimalUser?.role });  // Debug

    if (!minimalUser || !minimalUser.userID) {
      console.warn("[CurrentUser] No user ID - auth failed");
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const userId = minimalUser.userID;

    // Fetch full user details from DB, including branch_id
    const userRes = await query(
      `SELECT user_id, username, first_name, last_name, role, email, branch_id, status, created_at
       FROM users 
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    console.log("[CurrentUser] User query result:", userRes.rows.length);  // Debug

    if (userRes.rows.length === 0) {
      console.warn(`[CurrentUser] No active user found for ID ${userId}`);
      return NextResponse.json({ success: false, error: "User not found or inactive" }, { status: 404 });
    }

    const user = { ...userRes.rows[0], userID: userRes.rows[0].user_id };  // Normalize userID
    console.log("[CurrentUser] Full user:", { userID: user.userID, branch_id: user.branch_id, role: user.role });  // Debug

    // Fetch branch name if branch_id exists
    let branch = null;
    if (user.branch_id) {
      const branchRes = await query(
        `SELECT branch_id, branch_name FROM branch WHERE branch_id = $1 AND status = 'active'`,
        [user.branch_id]
      );
      console.log("[CurrentUser] Branch query result:", branchRes.rows);  // Debug
      if (branchRes.rows.length > 0) {
        branch = branchRes.rows[0];
      } else {
        console.warn(`[CurrentUser] No active branch for id ${user.branch_id}`);
      }
    } else {
      console.warn(`[CurrentUser] User ${user.userID} has no branch_id`);
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        branch,
      },
    });
  } catch (error) {
    console.error("[CurrentUser] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}