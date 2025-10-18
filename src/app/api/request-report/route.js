import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const data = await request.json();

    const { manager_id, report_type, start_date, end_date } = data;

    // ✅ Validate required fields
    if (!manager_id || !report_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: manager_id or report_type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log("****/api/request-report/: currentUser:", await getCurrentUser(request));

    // ✅ Identify the logged-in user (optional)
    const user = await getCurrentUser(request);
    const requested_by_user_id = user?.userID || null;

    // ✅ Insert the report request into the table
    const result = await query(
      `INSERT INTO report_request 
        (manager_id, report_type, date_requested, status, requested_by_user_id, start_date, end_date)
       VALUES ($1, $2, NOW(), 'pending', $3, $4, $5)
       RETURNING report_id`,
      [manager_id, report_type, requested_by_user_id, start_date || null, end_date || null]
    );

    // ✅ Return success response
    return new Response(
      JSON.stringify({
        message: 'Report request created successfully',
        report: result.rows[0],
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating report request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
