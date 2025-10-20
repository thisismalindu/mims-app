"use client";

import React, { useEffect, useState } from "react";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Current user for role-based UI (branch filter shown to admin)
  const [currentUser, setCurrentUser] = useState(null);
  const [branches, setBranches] = useState([]);

  // Filters aligned to Customers.jsx style
  const [selectedBranch, setSelectedBranch] = useState(""); // admin only
  const [searchType, setSearchType] = useState("id"); // id | description | type | account_id | agent_id | branch_id
  const [searchQuery, setSearchQuery] = useState("");

  const pulseClass = "animate-pulse";

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/me');
        if (res.ok) setCurrentUser(await res.json());
      } catch {}
    };
    fetchMe();
  }, []);

  useEffect(() => {
    const fetchBranches = async () => {
      if (currentUser?.role !== 'admin') return;
      try {
        const res = await fetch('/api/get-branches');
        if (res.ok) {
          const data = await res.json();
          setBranches(data.branches || []);
        }
      } catch {}
    };
    fetchBranches();
  }, [currentUser]);

  const buildQuery = () => {
    const params = new URLSearchParams();
    // Only branch is passed to server (admin); all other filters are client-side like Customers.jsx
    if (currentUser?.role === 'admin' && selectedBranch) {
      params.set('branchId', String(selectedBranch));
    }
    return params.toString();
  };

  const fetchTx = async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = buildQuery();
      const res = await fetch(`/api/get-transactions${qs ? `?${qs}` : ''}`);
  const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch transactions');
  const list = data.transactions || [];
  setAllTransactions(list);
  setTransactions(list);
    } catch (e) {
      setError(e.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and on branch/currentUser change
  useEffect(() => {
    fetchTx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, currentUser?.role]);

  // Client-side filtering to mirror Customers.jsx
  useEffect(() => {
    let filtered = allTransactions;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      switch (searchType) {
        case 'id':
          filtered = filtered.filter(t => String(t.transaction_id).includes(q));
          break;
        case 'description':
          filtered = filtered.filter(t => (t.description || '').toLowerCase().includes(q));
          break;
        case 'type': {
          // accept full word or prefix e.g., dep, with, int
          filtered = filtered.filter(t => (t.transaction_type || '').toLowerCase().includes(q));
          break;
        }
        case 'account_id': {
          filtered = filtered.filter(t =>
            String(t.savings_account_id || '').includes(q) || String(t.fixed_deposit_account_id || '').includes(q)
          );
          break;
        }
        case 'agent_id': {
          filtered = filtered.filter(t =>
            String(t.performed_by_user_id || '').includes(q) || (t.performer_username || '').toLowerCase().includes(q)
          );
          break;
        }
        case 'branch_id': {
          filtered = filtered.filter(t =>
            String(t.branch_id || '').includes(q) || (t.branch_name || '').toLowerCase().includes(q)
          );
          break;
        }
        default:
          break;
      }
    }
    setTransactions(filtered);
  }, [searchType, searchQuery, allTransactions]);

  const clearSearch = () => setSearchQuery('');

  const goBack = () => {
    try {
      window.location.replace('/?page=Dashboard');
    } catch {}
  };

  if (loading) {
    return (
      <div className="px-6 py-8">
        {/* back link placeholder */}
        <div className={`h-4 w-16 bg-gray-200 rounded ${pulseClass}`} />

        {/* Single card skeleton to mirror final UI */}
        <div className="bg-white rounded-xl p-6 shadow mt-6">
          {/* Header: title + right placeholder */}
          <div className="flex items-center justify-between mb-4">
            <div className={`h-7 w-56 bg-gray-200 rounded ${pulseClass}`} />
            <div className={`h-8 w-28 bg-gray-200 rounded ${pulseClass}`} />
          </div>

          {/* One-line filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-shrink-0">
              <div className={`h-4 w-28 bg-gray-200 rounded mb-2 ${pulseClass}`} />
              <div className={`h-9 w-64 bg-gray-200 rounded ${pulseClass}`} />
            </div>
            <div className="flex-shrink-0">
              <div className={`h-4 w-24 bg-gray-200 rounded mb-2 ${pulseClass}`} />
              <div className={`h-9 w-48 bg-gray-200 rounded ${pulseClass}`} />
            </div>
            <div className="flex-grow">
              <div className={`h-4 w-14 bg-gray-200 rounded mb-2 ${pulseClass}`} />
              <div className={`h-9 w-full bg-gray-200 rounded ${pulseClass}`} />
            </div>
            <div className="hidden md:flex items-end">
              <div className={`h-9 w-20 bg-gray-200 rounded ${pulseClass}`} />
            </div>
          </div>

          {/* Count line */}
          <div className="mt-2">
            <div className={`h-4 w-80 bg-gray-200 rounded ${pulseClass}`} />
          </div>

          {/* Table skeleton: 8 columns for transactions */}
          <div className="overflow-x-auto mt-4">
            <div className="w-full border border-gray-200 rounded-lg">
              <div className="bg-gray-50 p-3">
                <div className="grid grid-cols-8 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`h-4 bg-gray-200 rounded ${pulseClass}`} />
                  ))}
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {Array.from({ length: 6 }).map((_, r) => (
                  <div key={r} className="grid grid-cols-8 gap-3 p-3">
                    {Array.from({ length: 8 }).map((_, c) => (
                      <div key={c} className={`h-4 bg-gray-200 rounded ${pulseClass}`} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">Error: {error}</div>
    );
  }

  return (
    <div className="px-6 py-8">
      <a
        onClick={goBack}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back
      </a>

      <div className="bg-white rounded-xl p-6 shadow text-gray-800 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Transactions</h2>
        </div>

        {/* Filters (Customers.jsx-like layout) */}
        <div className="mt-3 bg-white">
          <div className="flex flex-col md:flex-row gap-4">
            {currentUser?.role === 'admin' && (
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Branch:</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="block w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.branch_name} ({String(branch.branch_id).padStart(3, '0')})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search By:</label>
              <select
                value={searchType}
                onChange={(e) => { setSearchType(e.target.value); setSearchQuery(''); }}
                className="block w-full md:w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              >
                <option value="id">Transaction ID</option>
                <option value="description">Description</option>
                <option value="type">Type (deposit/withdrawal/interest)</option>
                <option value="account_id">Account ID</option>
                <option value="agent_id">Agent</option>
                <option value="branch_id">Branch</option>
              </select>
            </div>
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchType === 'id' ? 'Enter transaction ID...' :
                  searchType === 'description' ? 'Enter description...' :
                  searchType === 'type' ? 'Enter type (deposit/withdrawal/interest)...' :
                  searchType === 'account_id' ? 'Enter account ID...' :
                  searchType === 'agent_id' ? 'Enter agent user id/username...' :
                  'Enter branch id/name...'
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>
            {searchQuery && (
              <div className="flex items-end">
                <button onClick={clearSearch} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition font-medium">Clear</button>
              </div>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-600">Showing {transactions.length} of {allTransactions.length} transaction(s){searchQuery && ` matching "${searchQuery}"`}</div>
        </div>

        {/* Table */}
        {transactions.length > 0 ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
                  <th className="p-3">ID</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Performed By</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.transaction_id} className="hover:bg-gray-50 text-sm border-b border-b-gray-200 last:border-0">
                    <td className="p-3 align-top">{t.transaction_id}</td>
                    <td className="p-3 align-top">{new Date(t.transaction_time).toLocaleString()}</td>
                    <td className="p-3 align-top">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border 
                        ${
                          (t.transaction_type === 'deposit') ? 'bg-green-100 text-green-700 border-green-200' :
                          (t.transaction_type === 'withdrawal') ? 'bg-red-100 text-red-700 border-red-200' :
                          (t.transaction_type === 'interest') ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }
                      `}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className="p-3 align-top">{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 align-top capitalize">{t.account_kind}{t.savings_account_id ? ` #${t.savings_account_id}` : t.fixed_deposit_account_id ? ` #${t.fixed_deposit_account_id}` : ''}</td>
                    <td className="p-3 align-top">{t.branch_name || t.branch_id || '—'}</td>
                    <td className="p-3 align-top">{t.performer_username || t.performed_by_user_id}</td>
                    <td className="p-3 align-top">{t.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No transactions found.</p>
        )}
      </div>
    </div>
  );
}


