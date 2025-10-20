"use client";

import React, { useEffect, useState } from "react";

export default function InterestDistributions({ changePage }) {
  const [accountType, setAccountType] = useState('all');
  const [period, setPeriod] = useState('monthly');
  const [groupBy, setGroupBy] = useState('time');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Fetch user info
  useEffect(() => {
    async function fetchUser() {
      const res = await fetch('/api/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        
        // For managers, always set groupBy to 'time' (no branch option)
        if (userData.role === 'manager') {
          setGroupBy('time');
        }
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [accountType, period, groupBy, year, month, user]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/interest-distributions?accountType=${accountType}&period=${period}&groupBy=${groupBy}&year=${year}`;
      if (month) {
        url += `&month=${month}`;
      }

      const res = await fetch(url);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch interest distributions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (!data) return null;

    const savingsData = data.savings || [];
    const fdData = data.fixed_deposits || [];

    if (savingsData.length === 0 && fdData.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No interest distribution data available for the selected filters
        </div>
      );
    }

    // Calculate max value for scaling
    const maxSavings = savingsData.length > 0 
      ? Math.max(...savingsData.map(d => d.total_interest || 0))
      : 0;
    const maxFd = fdData.length > 0 
      ? Math.max(...fdData.map(d => d.total_interest || 0))
      : 0;
    const maxValue = Math.max(maxSavings, maxFd);

    if (groupBy === 'branch') {
      return renderBranchChart(savingsData, fdData, maxValue);
    } else {
      return renderTimeChart(savingsData, fdData, maxValue);
    }
  };

  const renderBranchChart = (savingsData, fdData, maxValue) => {
    // Combine all unique branch IDs
    const allBranchIds = new Set([
      ...savingsData.map(d => d.branch_id),
      ...fdData.map(d => d.branch_id)
    ]);
    const sortedBranchIds = Array.from(allBranchIds).sort((a, b) => a - b);

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold mb-4">Branch-wise Interest Distribution</h3>
        
        {sortedBranchIds.map(branchId => {
          const savingsBranch = savingsData.find(d => d.branch_id === branchId);
          const fdBranch = fdData.find(d => d.branch_id === branchId);
          const branchName = savingsBranch?.branch_name || fdBranch?.branch_name || `Branch ${branchId}`;

          const savingsAmount = savingsBranch?.total_interest || 0;
          const fdAmount = fdBranch?.total_interest || 0;
          const totalAmount = savingsAmount + fdAmount;

          const savingsWidth = maxValue > 0 ? (savingsAmount / maxValue) * 100 : 0;
          const fdWidth = maxValue > 0 ? (fdAmount / maxValue) * 100 : 0;

          return (
            <div key={branchId} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-800">
                  {branchName} ({String(branchId).padStart(3, '0')})
                </h4>
                <span className="text-lg font-bold text-gray-900">
                  Rs. {totalAmount.toFixed(2)}
                </span>
              </div>

              {(accountType === 'savings' || accountType === 'all') && savingsAmount > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-600">Savings Account Interest</span>
                    <span className="font-semibold">Rs. {savingsAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${savingsWidth}%` }}
                    >
                      {savingsWidth > 15 && (
                        <span className="text-xs text-white font-semibold">
                          {savingsBranch?.transaction_count} txns
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(accountType === 'fd' || accountType === 'all') && fdAmount > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-green-600">Fixed Deposit Interest</span>
                    <span className="font-semibold">Rs. {fdAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${fdWidth}%` }}
                    >
                      {fdWidth > 15 && (
                        <span className="text-xs text-white font-semibold">
                          {fdBranch?.transaction_count} txns
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimeChart = (savingsData, fdData, maxValue) => {
    // Combine all unique time periods
    const allPeriods = new Set([
      ...savingsData.map(d => d.time_period),
      ...fdData.map(d => d.time_period)
    ]);
    const sortedPeriods = Array.from(allPeriods).sort((a, b) => a - b);

    const getLabel = (timePeriod) => {
      if (period === 'monthly' && month) {
        return `Day ${timePeriod}`;
      } else if (period === 'monthly') {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[timePeriod - 1] || timePeriod;
      } else {
        return `Year ${timePeriod}`;
      }
    };

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold mb-4">
          {period === 'monthly' && month 
            ? `Daily Interest Distribution - ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`
            : period === 'monthly'
            ? `Monthly Interest Distribution - ${year}`
            : 'Annual Interest Distribution'
          }
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPeriods.map(timePeriod => {
            const savingsPeriod = savingsData.find(d => d.time_period === timePeriod);
            const fdPeriod = fdData.find(d => d.time_period === timePeriod);

            const savingsAmount = savingsPeriod?.total_interest || 0;
            const fdAmount = fdPeriod?.total_interest || 0;
            const totalAmount = savingsAmount + fdAmount;

            const savingsHeight = maxValue > 0 ? (savingsAmount / maxValue) * 200 : 0;
            const fdHeight = maxValue > 0 ? (fdAmount / maxValue) * 200 : 0;

            return (
              <div key={timePeriod} className="bg-white rounded-lg shadow p-4">
                <div className="text-center mb-3">
                  <h4 className="font-semibold text-gray-800">{getLabel(timePeriod)}</h4>
                  <p className="text-lg font-bold text-gray-900">Rs. {totalAmount.toFixed(2)}</p>
                </div>

                <div className="flex justify-center items-end space-x-4 h-56 pt-4">
                  {(accountType === 'savings' || accountType === 'all') && (
                    <div className="flex flex-col items-center h-full justify-end">
                      <div
                        className="bg-blue-500 w-16 rounded-t-lg flex flex-col items-center justify-end pb-2 transition-all duration-300"
                        style={{ height: `${savingsHeight}px`, minHeight: savingsAmount > 0 ? '30px' : '0px' }}
                      >
                        {savingsAmount > 0 && (
                          <span className="text-xs text-white font-semibold">
                            {savingsPeriod?.transaction_count}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-col items-center">
                        <span className="text-xs text-gray-600 whitespace-nowrap">Savings</span>
                        <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">
                          Rs. {savingsAmount.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )}

                  {(accountType === 'fd' || accountType === 'all') && (
                    <div className="flex flex-col items-center h-full justify-end">
                      <div
                        className="bg-green-500 w-16 rounded-t-lg flex flex-col items-center justify-end pb-2 transition-all duration-300"
                        style={{ height: `${fdHeight}px`, minHeight: fdAmount > 0 ? '30px' : '0px' }}
                      >
                        {fdAmount > 0 && (
                          <span className="text-xs text-white font-semibold">
                            {fdPeriod?.transaction_count}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-col items-center">
                        <span className="text-xs text-gray-600 whitespace-nowrap">FD</span>
                        <span className="text-xs font-semibold text-green-600 whitespace-nowrap">
                          Rs. {fdAmount.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <div className="p-6">
      <a 
        onClick={() => changePage("Dashboard")} 
        className='rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600'
      >
        ⬅ back
      </a>

      <h2 className="mt-10 text-3xl font-bold text-gray-900 mb-6">Interest Distributions</h2>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6 shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Type
            </label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Accounts</option>
              <option value="savings">Savings Only</option>
              <option value="fd">Fixed Deposits Only</option>
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                if (e.target.value === 'annually') {
                  setMonth(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          {/* Group By - Hidden for managers */}
          {user && user.role !== 'manager' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group By
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="time">Time Period</option>
                <option value="branch">Branch</option>
              </select>
            </div>
          )}

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month (only for monthly period with time grouping) */}
          {period === 'monthly' && groupBy === 'time' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month (Optional)
              </label>
              <select
                value={month || ''}
                onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Months</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && renderChart()}
    </div>
  );
}
