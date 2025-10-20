import { NextResponse } from "next/server";
import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

export async function GET(request) {
  try {
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    // Fetch all branches
    const { rows } = await query(
      `SELECT branch_id, branch_name, address 
       FROM branch 
       ORDER BY branch_id ASC`
    );

    return NextResponse.json({ success: true, branches: rows });
  } catch (error) {
    console.error("get-branches error:", error);
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
