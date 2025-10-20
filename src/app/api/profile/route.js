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
      SELECT u.username AS name, u.email, u.role, b.branch_name AS branch
      FROM users u
      LEFT JOIN branch b ON u.branch_id = b.branch_id
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