import { NextResponse } from "next/server";
import { getCurrentUser } from "../utils/get-user";
import { query } from "@/lib/database";

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    console.log('Fetched user in profile:', user); // Debug log

    if (!user.username) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 400 });
    }

    const result = await query(
      `
      SELECT 
        u.user_id,
        u.username, 
        u.first_name,
        u.last_name,
        u.email, 
        u.role, 
        u.status,
        u.branch_id,
        u.created_at,
        u.created_by_user_id,
        b.branch_name,
        b.address as branch_address,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name,
        creator.role as created_by_role,
        (SELECT COUNT(*) FROM customer WHERE created_by_user_id = u.user_id) as total_customers_created,
        (SELECT COUNT(*) FROM users WHERE created_by_user_id = u.user_id AND role = 'agent') as total_agents_created
      FROM users u
      LEFT JOIN branch b ON u.branch_id = b.branch_id
      LEFT JOIN users creator ON u.created_by_user_id = creator.user_id
      WHERE u.username = $1
      `,
      [user.username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Profile route error:', err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}