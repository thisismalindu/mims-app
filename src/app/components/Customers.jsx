"use client";
import React, { useEffect, useMemo, useState } from "react";

export default function Customers({ changePage, onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [edits, setEdits] = useState({}); // { [customer_id]: { field: value } }
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [pwModal, setPwModal] = useState({ open: false, password: '', working: false, action: null, payload: null });
  
  // Filter states
  const [searchType, setSearchType] = useState("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  const hasChanges = useMemo(() => Object.keys(edits).length > 0, [edits]);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch branches 
  useEffect(() => {
    const fetchBranches = async () => {
      // if (currentUser?.role !== 'admin') return;
      
      try {
        const res = await fetch('/api/get-branches');
        if (res.ok) {
          const data = await res.json();
          setBranches(data.branches || []);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    };
    fetchBranches();
  }, [currentUser]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/get-customers");
        if (!res.ok) throw new Error("Failed to fetch customers");
        const data = await res.json();
        setAllCustomers(data.customers || []);
        setCustomers(data.customers || []);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Filter customers based on search and branch
  useEffect(() => {
    let filtered = allCustomers;

    // Apply branch filter first (admin only)
    if (selectedBranch && currentUser?.role === 'admin') {
      filtered = filtered.filter(c => c.branch_id && c.branch_id.toString() === selectedBranch);
    }

    // Then apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      switch (searchType) {
        case "name":
          filtered = filtered.filter(c => 
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(query)
          );
          break;
        case "customer_id":
          filtered = filtered.filter(c => 
            c.customer_id.toString().includes(query)
          );
          break;
        case "account_number":
          filtered = filtered.filter(c => 
            c.account_numbers?.some(acc => acc.includes(query))
          );
          break;
        case "agent_id":
          filtered = filtered.filter(c => 
            c.created_by_user_id && c.created_by_user_id.toString().includes(query)
          );
          break;
        default:
          break;
      }
    }

    setCustomers(filtered);
  }, [searchQuery, searchType, selectedBranch, allCustomers, currentUser]);

  // centralized animation class, same technique as Dashboard.jsx
  const pulseClass = "animate-pulse";

  const patchEdit = (customer_id, field, value) => {
    setEdits((prev) => {
      const next = { ...prev };
      next[customer_id] = { ...(next[customer_id] || {}), [field]: value };
      const original = customers.find((x) => x.customer_id === customer_id) || {};
      if ((value ?? null) === (original[field] ?? null)) {
        delete next[customer_id][field];
        if (Object.keys(next[customer_id]).length === 0) delete next[customer_id];
      }
      return next;
    });
  };

  const addToast = (type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  };

  const confirmSave = () => setPwModal({ open: true, password: '', working: false, action: 'save', payload: null });
  const confirmDelete = (customer) => setPwModal({ open: true, password: '', working: false, action: 'delete', payload: { customer } });

  const handlePasswordConfirm = async () => {
    if (!pwModal.open || !pwModal.password || pwModal.working) return;
    setPwModal((s) => ({ ...s, working: true }));
    try {
      const res = await fetch('/api/verify-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwModal.password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Password verification failed');
      const { action, payload } = pwModal;
      setPwModal({ open: false, password: '', working: false, action: null, payload: null });
      if (action === 'save') {
        await saveChanges();
      } else if (action === 'delete' && payload?.customer) {
        await deleteCustomer(payload.customer);
      }
    } catch (e) {
      addToast('error', e.message || 'Password verification failed');
      setPwModal((s) => ({ ...s, working: false, password: '' }));
    }
  };

  const saveChanges = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const updates = Object.entries(edits).map(([customer_id, patch]) => ({ customer_id: Number(customer_id), ...patch }));
      const res = await fetch('/api/update-customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to save changes');
      if (Array.isArray(data.updated)) {
        const merge = (list) => {
          const byId = new Map(list.map((x) => [x.customer_id, x]));
          for (const upd of data.updated) {
            const curr = byId.get(upd.customer_id) || {};
            byId.set(upd.customer_id, { ...curr, ...upd });
          }
          return Array.from(byId.values());
        };
        setAllCustomers(prev => merge(prev));
        setCustomers(prev => merge(prev));
      }
      setEdits({});
      addToast('success', 'Changes saved');
    } catch (e) {
      addToast('error', e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (customer) => {
    try {
      const res = await fetch('/api/delete-customer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: customer.customer_id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to delete customer');
      setAllCustomers(prev => prev.filter(x => x.customer_id !== customer.customer_id));
      setCustomers(prev => prev.filter(x => x.customer_id !== customer.customer_id));
      setEdits(prev => { const n = { ...prev }; delete n[customer.customer_id]; return n; });
      addToast('success', `Customer ${((customer.first_name || '') + ' ' + (customer.last_name || '')).trim()} deleted`);
    } catch (err) {
      addToast('error', err.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-8">
        {/* back link placeholder */}
        <div className={`h-4 w-16 bg-gray-200 rounded ${pulseClass}`} />

        {/* Single card skeleton to mirror final UI */}
        <div className="bg-white rounded-xl p-6 shadow mt-6">
          {/* Header: title + save button */}
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
              <div className={`h-4 w-20 bg-gray-200 rounded mb-2 ${pulseClass}`} />
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

          {/* Table skeleton: 10 columns (ID, Name, NIC, Phone, Email, Status, Agent?, Branch, Accounts, Actions) */}
          <div className="overflow-x-auto mt-4">
            <div className="w-full border border-gray-200 rounded-lg">
              <div className="bg-gray-50 p-3">
                <div className="grid grid-cols-10 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={`h-4 bg-gray-200 rounded ${pulseClass}`} />
                  ))}
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {Array.from({ length: 6 }).map((_, r) => (
                  <div key={r} className="grid grid-cols-10 gap-3 p-3">
                    {Array.from({ length: 10 }).map((_, c) => (
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
        onClick={() => changePage("Dashboard")}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back
      </a>

      <div className="bg-white rounded-xl p-6 shadow text-gray-800 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{currentUser?.role === 'admin' ? 'All Customers' : 'Customers'}</h2>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button onClick={confirmSave} disabled={saving} className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-500'}`}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
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
                <option value="name">Customer Name</option>
                <option value="customer_id">Customer ID</option>
                <option value="account_number">Account Number</option>
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                  <option value="agent_id">Agent ID</option>
                )}
              </select>
            </div>
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchType === 'name' ? 'Enter customer name...' :
                  searchType === 'customer_id' ? 'Enter customer ID...' :
                  searchType === 'account_number' ? 'Enter account number...' :
                  'Enter agent ID...'
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>
            {searchQuery && (
              <div className="flex items-end">
                <button onClick={() => setSearchQuery('')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition font-medium">Clear</button>
              </div>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-600">Showing {customers.length} of {allCustomers.length} customer(s){searchQuery && ` matching "${searchQuery}"`}</div>
        </div>

        {/* Table */}
        {customers.length > 0 ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
                  <th className="p-3">ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">NIC</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Status</th>
                  {currentUser?.role === 'admin' && <th className="p-3">Agent</th>}
                  <th className="p-3">Branch</th>
                  <th className="p-3">Accounts</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-gray-50 text-sm border-b border-b-gray-200 last:border-0">
                    <td className="p-3 align-top">{c.customer_id}</td>
                    <td className="p-3 align-top">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="w-28 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                          value={(edits[c.customer_id]?.first_name ?? c.first_name) || ''}
                          placeholder="First"
                          onChange={(e) => patchEdit(c.customer_id, 'first_name', e.target.value)}
                        />
                        <input
                          type="text"
                          className="w-28 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                          value={(edits[c.customer_id]?.last_name ?? c.last_name) || ''}
                          placeholder="Last"
                          onChange={(e) => patchEdit(c.customer_id, 'last_name', e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <input
                        type="text"
                        className="w-32 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                        value={(edits[c.customer_id]?.nic_number ?? c.nic_number) || ''}
                        onChange={(e) => patchEdit(c.customer_id, 'nic_number', e.target.value)}
                      />
                    </td>
                    <td className="p-3 align-top">
                      <input
                        type="text"
                        className="w-32 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                        value={(edits[c.customer_id]?.phone_number ?? c.phone_number) || ''}
                        onChange={(e) => patchEdit(c.customer_id, 'phone_number', e.target.value)}
                      />
                    </td>
                    <td className="p-3 align-top">
                      <input
                        type="email"
                        className="w-56 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                        value={(edits[c.customer_id]?.email ?? c.email) || ''}
                        onChange={(e) => patchEdit(c.customer_id, 'email', e.target.value)}
                      />
                    </td>
                    <td className="p-3 align-top">
                      <select
                        className="border border-transparent bg-transparent px-2 py-1 rounded-md capitalize focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                        value={(edits[c.customer_id]?.status ?? c.status)}
                        onChange={(e) => patchEdit(c.customer_id, 'status', e.target.value)}
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                    {currentUser?.role === 'admin' && (
                      <td className="p-3 align-top">
                        {c.agent_first_name || c.agent_last_name ? `${c.agent_first_name ?? ''} ${c.agent_last_name ?? ''}`.trim() : c.created_by_user_id}
                      </td>
                    )}
                    <td className="p-3 align-top">{c.branch_id ?? '-'}</td>
                    <td className="p-3 align-top">{Array.isArray(c.account_numbers) && c.account_numbers.length ? c.account_numbers.join(', ') : '-'}</td>
                    <td className="p-3 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onSelectCustomer(c.customer_id)} className="inline-flex items-center gap-1 rounded-md bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 text-xs font-semibold">View</button>
                        <button onClick={() => confirmDelete(c)} className="inline-flex items-center gap-1 rounded-md bg-red-500 hover:bg-red-400 text-white px-2 py-1 text-xs font-semibold">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No customers found.</p>
        )}
      </div>
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`min-w-[240px] max-w-sm px-3 py-2 rounded shadow text-sm text-white ${t.type === 'error' ? 'bg-red-600' : t.type === 'warning' ? 'bg-yellow-600' : 'bg-green-600'}`}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Password confirmation modal */}
      {pwModal.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-sm">
            <h3 className="text-base font-semibold mb-3">Confirm action</h3>
            <p className="text-sm text-gray-600 mb-3">Please enter your password to continue.</p>
            <input
              type="password"
              value={pwModal.password}
              onChange={(e) => setPwModal(s => ({ ...s, password: e.target.value }))}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Password"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPwModal({ open: false, password: '', working: false, action: null, payload: null })}
                className="px-3 py-1.5 rounded border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordConfirm}
                disabled={pwModal.working || !pwModal.password}
                className={`px-3 py-1.5 rounded text-sm text-white ${pwModal.working ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-500'}`}
              >
                {pwModal.working ? 'Verifying…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
