import { NextResponse } from "next/server";
import { query } from "@/lib/database";
import { getCurrentUser } from "../utils/get-user";

/**
 * Interest Distributions API
 * 
 * Returns aggregated interest distribution data with various filters:
 * - Branch-wise distribution
 * - Monthly/Annually aggregated
 * - Savings accounts only (monthly)
 * - Fixed deposit accounts only (monthly/annually)
 * 
 * Query parameters:
 * - accountType: 'savings', 'fd', or 'all' (default: 'all')
 * - period: 'monthly' or 'annually' (default: 'monthly')
 * - groupBy: 'branch' or 'time' (default: 'time')
 * - year: specific year (default: current year)
 * - month: specific month 1-12 (optional, only for monthly period)
 */

export async function GET(request) {
  try {
    // Authentication required
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const accountType = searchParams.get('accountType') || 'all'; // 'savings', 'fd', 'all'
    const period = searchParams.get('period') || 'monthly'; // 'monthly', 'annually'
    const groupBy = searchParams.get('groupBy') || 'time'; // 'branch', 'time'
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')) : null;

    console.log(`📊 Fetching interest distributions: accountType=${accountType}, period=${period}, groupBy=${groupBy}, year=${year}, month=${month}`);

    let result = {};

    // Branch-wise distribution
    if (groupBy === 'branch') {
      result = await getBranchWiseDistribution(accountType, period, year, month, currentUser);
    } 
    // Time-based distribution (monthly or annually)
    else {
      result = await getTimeBasedDistribution(accountType, period, year, month, currentUser);
    }

    return NextResponse.json({
      success: true,
      data: result,
      filters: {
        accountType,
        period,
        groupBy,
        year,
        month
      }
    });

  } catch (error) {
    console.error('❌ Interest distributions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error fetching interest distributions',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

async function getBranchWiseDistribution(accountType, period, year, month, currentUser) {
  let whereClause = "WHERE t.transaction_type = 'interest' AND t.status = 'active'";
  let dateFilter = "";

  // Date filtering
  if (period === 'monthly' && month) {
    dateFilter = `AND EXTRACT(YEAR FROM t.transaction_time) = ${year} 
                  AND EXTRACT(MONTH FROM t.transaction_time) = ${month}`;
  } else if (period === 'annually') {
    dateFilter = `AND EXTRACT(YEAR FROM t.transaction_time) = ${year}`;
  } else {
    dateFilter = `AND EXTRACT(YEAR FROM t.transaction_time) = ${year}`;
  }

  whereClause += ` ${dateFilter}`;

  // Role-based filtering
  if (currentUser.role === 'manager') {
    const managerRes = await query(`SELECT branch_id FROM users WHERE user_id = $1`, [currentUser.userID]);
    if (managerRes.rows[0]) {
      const branchId = managerRes.rows[0].branch_id;
      whereClause += ` AND b.branch_id = ${branchId}`;
    }
  }

  let savingsData = [];
  let fdData = [];

  // Get savings account interest by branch
  if (accountType === 'savings' || accountType === 'all') {
    const savingsQuery = `
      SELECT 
        b.branch_id,
        b.branch_name,
        b.address,
        COUNT(DISTINCT t.transaction_id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_interest
      FROM transaction t
      JOIN savings_account sa ON t.savings_account_id = sa.savings_account_id
      JOIN branch b ON sa.branch_id = b.branch_id
      ${whereClause}
      GROUP BY b.branch_id, b.branch_name, b.address
      ORDER BY b.branch_id ASC
    `;

    const savingsRes = await query(savingsQuery);
    savingsData = savingsRes.rows.map(row => ({
      branch_id: row.branch_id,
      branch_name: row.branch_name,
      address: row.address,
      transaction_count: parseInt(row.transaction_count),
      total_interest: parseFloat(row.total_interest)
    }));
  }

  // Get FD interest by branch (credited to savings accounts but originating from FDs)
  if (accountType === 'fd' || accountType === 'all') {
    // FD interest is recorded as interest transactions on savings accounts
    // We need to identify FD-related interest by description
    const fdQuery = `
      SELECT 
        b.branch_id,
        b.branch_name,
        b.address,
        COUNT(DISTINCT t.transaction_id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_interest
      FROM transaction t
      JOIN savings_account sa ON t.savings_account_id = sa.savings_account_id
      JOIN branch b ON sa.branch_id = b.branch_id
      ${whereClause}
      AND t.description = 'FD interest'
      GROUP BY b.branch_id, b.branch_name, b.address
      ORDER BY b.branch_id ASC
    `;

    const fdRes = await query(fdQuery);
    fdData = fdRes.rows.map(row => ({
      branch_id: row.branch_id,
      branch_name: row.branch_name,
      address: row.address,
      transaction_count: parseInt(row.transaction_count),
      total_interest: parseFloat(row.total_interest)
    }));
  }

  return {
    savings: savingsData,
    fixed_deposits: fdData
  };
}

async function getTimeBasedDistribution(accountType, period, year, month, currentUser) {
  let whereClause = "WHERE t.transaction_type = 'interest' AND t.status = 'active'";
  let groupByClause = "";
  let selectClause = "";

  // Role-based filtering
  if (currentUser.role === 'manager') {
    const managerRes = await query(`SELECT branch_id FROM users WHERE user_id = $1`, [currentUser.userID]);
    if (managerRes.rows[0]) {
      const branchId = managerRes.rows[0].branch_id;
      whereClause += ` AND b.branch_id = ${branchId}`;
    }
  }

  if (period === 'monthly') {
    if (month) {
      // Specific month - group by day
      whereClause += ` AND EXTRACT(YEAR FROM t.transaction_time) = ${year} 
                       AND EXTRACT(MONTH FROM t.transaction_time) = ${month}`;
      selectClause = "EXTRACT(DAY FROM t.transaction_time) as time_period";
      groupByClause = "GROUP BY EXTRACT(DAY FROM t.transaction_time)";
    } else {
      // Full year - group by month
      whereClause += ` AND EXTRACT(YEAR FROM t.transaction_time) = ${year}`;
      selectClause = "EXTRACT(MONTH FROM t.transaction_time) as time_period";
      groupByClause = "GROUP BY EXTRACT(MONTH FROM t.transaction_time)";
    }
  } else {
    // Annually - group by year
    selectClause = "EXTRACT(YEAR FROM t.transaction_time) as time_period";
    groupByClause = "GROUP BY EXTRACT(YEAR FROM t.transaction_time)";
  }

  let savingsData = [];
  let fdData = [];

  // Get savings account interest over time
  if (accountType === 'savings' || accountType === 'all') {
    const savingsQuery = `
      SELECT 
        ${selectClause},
        COUNT(DISTINCT t.transaction_id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_interest
      FROM transaction t
      JOIN savings_account sa ON t.savings_account_id = sa.savings_account_id
      JOIN branch b ON sa.branch_id = b.branch_id
      ${whereClause}
      ${groupByClause}
      ORDER BY time_period ASC
    `;

    const savingsRes = await query(savingsQuery);
    savingsData = savingsRes.rows.map(row => ({
      time_period: parseInt(row.time_period),
      transaction_count: parseInt(row.transaction_count),
      total_interest: parseFloat(row.total_interest)
    }));
  }

  // Get FD interest over time
  if (accountType === 'fd' || accountType === 'all') {
    const fdQuery = `
      SELECT 
        ${selectClause},
        COUNT(DISTINCT t.transaction_id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_interest
      FROM transaction t
      JOIN savings_account sa ON t.savings_account_id = sa.savings_account_id
      JOIN branch b ON sa.branch_id = b.branch_id
      ${whereClause}
      AND t.description = 'FD interest'
      ${groupByClause}
      ORDER BY time_period ASC
    `;

    const fdRes = await query(fdQuery);
    fdData = fdRes.rows.map(row => ({
      time_period: parseInt(row.time_period),
      transaction_count: parseInt(row.transaction_count),
      total_interest: parseFloat(row.total_interest)
    }));
  }

  return {
    savings: savingsData,
    fixed_deposits: fdData
  };
}
