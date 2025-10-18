import { query } from '@/lib/database';
import { getCurrentUser } from '../utils/get-user';

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('POST /api/request-report - request body:', data);

    const { manager_id, report_type, start_date, end_date } = data;
    console.log('POST /api/request-report - parsed fields:', { manager_id, report_type, start_date, end_date });

    // ✅ Validate required fields
    if (!manager_id || !report_type) {
      console.log('POST /api/request-report - validation failed: missing manager_id or report_type', { manager_id, report_type });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: manager_id or report_type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Identify the logged-in user (optional)
    const user = await getCurrentUser(request);
    console.log('POST /api/request-report - currentUser:', user);

    const requested_by_user_id = user?.userID || null;
    console.log('POST /api/request-report - requested_by_user_id:', requested_by_user_id);

    // ✅ Insert the report request into the table
    const sql = `INSERT INTO report_request 
        (manager_id, report_type, date_requested, status, requested_by_user_id, start_date, end_date)
       VALUES ($1, $2, NOW(), 'pending', $3, $4, $5)
       RETURNING report_id`;
    const params = [manager_id, report_type, requested_by_user_id, start_date || null, end_date || null];
    console.log('POST /api/request-report - executing query:', sql, 'params:', params);

    const result = await query(sql, params);
    console.log('POST /api/request-report - query result:', result?.rows?.[0]);

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
    try {
      // attempt to log request body if available
      // note: in some cases `data` may be undefined if parsing failed
      console.error('Request context at error (may be undefined):', typeof data !== 'undefined' ? data : 'no request body available');
    } catch (e) {
      // ignore any secondary logging errors
      console.error('Additional logging failed:', e);
    }
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
