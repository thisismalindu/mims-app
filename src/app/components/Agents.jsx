"use client";
import React, { useEffect, useState } from "react";

export default function Agents({ changePage }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Fetch current user role
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data?.role || null);
          console.log('Agents.jsx /api/me result:', data);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    }
    fetchUser();
  }, []);

  // Fetch branches for admin and manager (manager sees read-only branch text)
  useEffect(() => {
    const fetchBranches = async () => {
      if (!['admin','manager'].includes(userRole)) return;
      
      try {
        const res = await fetch('/api/get-branches');
        if (res.ok) {
          const data = await res.json();
          setBranches(data.branches || []);
          console.log('Agents.jsx branches loaded:', { count: (data.branches || []).length, sample: (data.branches || [])[0] });
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    };
    fetchBranches();
  }, [userRole]);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/get-agents");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch agents");
        }
        const data = await res.json();
        setAgents(data.agents || []);
        console.log('Agents.jsx agents loaded:', { count: (data.agents || []).length, sample: (data.agents || [])[0] });
      } catch (err) {
        console.error("Error fetching agents:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Filter agents based on search and branch
  useEffect(() => {
    let filtered = allAgents;

    // Apply branch filter first (admin only)
    if (selectedBranch && userRole === 'admin') {
      filtered = filtered.filter(a => a.branch_id && a.branch_id.toString() === selectedBranch);
    }

    // Then apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      switch (searchType) {
        case "name":
          filtered = filtered.filter(a => 
            `${a.first_name} ${a.last_name}`.toLowerCase().includes(query)
          );
          break;
        case "agent_id":
          filtered = filtered.filter(a => 
            a.user_id.toString().includes(query)
          );
          break;
        case "customer_id":
          // Filter agents who created a customer with this ID
          filtered = filtered.filter(a => 
            a.customer_ids?.some(id => id.toString().includes(query))
          );
          break;
        case "customer_name":
          // Filter agents who created a customer with this name
          filtered = filtered.filter(a => 
            a.customer_names?.some(name => name.toLowerCase().includes(query))
          );
          break;
        default:
          break;
      }
    }

    setAgents(filtered);
    console.log('Agents.jsx filter applied:', {
      selectedBranch,
      searchType,
      searchQuery,
      before: allAgents.length,
      after: filtered.length,
    });
  }, [searchQuery, searchType, selectedBranch, allAgents, userRole]);

  // Check access control
  if (userRole && !["admin", "manager"].includes(userRole)) {
    return (
      <div className="px-6 py-12 lg:px-8">
        <a
          onClick={() => changePage("Dashboard")}
          className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
        >
          ⬅ back
        </a>
        <h2 className="mt-10 text-red-600 text-xl font-semibold">
          Access Denied
        </h2>
        <p className="text-gray-500 mt-4">
          Only managers and admins can view agents.
        </p>
      </div>
    );
  }

  // centralized animation class (same technique as Dashboard.jsx)
  const pulseClass = "animate-pulse";

  const patchEdit = (user_id, field, value) => {
    console.log('Agents.jsx edit patch:', { user_id, field, value });
    setEdits((prev) => {
      const next = { ...prev };
      next[user_id] = { ...(next[user_id] || {}), [field]: value };
      // Clean if equals original
      const original = agents.find((x) => x.user_id === user_id) || {};
      if ((value ?? null) === (original[field] ?? null)) {
        delete next[user_id][field];
        if (Object.keys(next[user_id]).length === 0) delete next[user_id];
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
  const confirmDelete = (user) => setPwModal({ open: true, password: '', working: false, action: 'delete', payload: { user } });

  const handlePasswordConfirm = async () => {
    if (!pwModal.open || !pwModal.password || pwModal.working) return;
    setPwModal((s) => ({ ...s, working: true }));
    try {
      const res = await fetch('/api/verify-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwModal.password }) });
      const data = await res.json().catch(() => ({}));
      console.log('Agents.jsx verify-password response:', { ok: res.ok, data });
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Password verification failed');
      const { action, payload } = pwModal;
      setPwModal({ open: false, password: '', working: false, action: null, payload: null });
      if (action === 'save') {
        await saveChanges();
      } else if (action === 'delete' && payload?.user) {
        await deleteAgent(payload.user);
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
      const updates = Object.entries(edits).map(([user_id, patch]) => ({ user_id: Number(user_id), ...patch }));
      console.log('Agents.jsx saveChanges sending updates:', updates);
      const res = await fetch('/api/update-users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
      const data = await res.json().catch(() => ({}));
      console.log('Agents.jsx update-users response:', { ok: res.ok, data });
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to save changes');
      if (Array.isArray(data.updated)) {
        setAllAgents((prev) => {
          const byId = new Map(prev.map((x) => [x.user_id, x]));
          for (const upd of data.updated) {
            const curr = byId.get(upd.user_id) || {};
            byId.set(upd.user_id, { ...curr, ...upd });
          }
          return Array.from(byId.values());
        });
        // re-apply filters by updating agents from allAgents in effect deps; or simply sync agents now
        setAgents((prev) => {
          const byId = new Map(prev.map((x) => [x.user_id, x]));
          for (const upd of data.updated) {
            const curr = byId.get(upd.user_id) || {};
            byId.set(upd.user_id, { ...curr, ...upd });
          }
          return Array.from(byId.values());
        });
      }
      setEdits({});
      addToast('success', 'Changes saved');
    } catch (e) {
      addToast('error', e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async (user) => {
    try {
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('Agents.jsx delete-user response:', { ok: res.ok, data, user });
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to delete agent');
      setAllAgents(prev => prev.filter(x => x.user_id !== user.user_id));
      setAgents(prev => prev.filter(x => x.user_id !== user.user_id));
      setEdits(prev => { const n = { ...prev }; delete n[user.user_id]; return n; });
      addToast('success', `Agent ${user.username} deleted`);
    } catch (err) {
      addToast('error', err.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-600 italic">Loading agents...</div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-12 lg:px-8">
        <a
          onClick={() => changePage("Dashboard")}
          className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
        >
          ⬅ back
        </a>
        <div className="mt-6 text-red-600">Error: {error}</div>
      </div>
    );
  }

  // If an agent is selected, show their details
  if (selectedAgent) {
    return (
      <div className="px-6 py-8">
        <a
          onClick={() => setSelectedAgent(null)}
          className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
        >
          ⬅ back to agents list
        </a>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
          Agent Details
        </h2>

        <div className="mt-6 bg-white rounded-lg shadow-md p-6 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">User ID</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{selectedAgent.user_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {selectedAgent.first_name} {selectedAgent.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Username</p>
              <p className="mt-1 text-lg text-gray-900">{selectedAgent.username}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <p className="mt-1 text-lg font-semibold text-blue-600">
                {selectedAgent.role?.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="mt-1 text-lg text-gray-900">{selectedAgent.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className={`mt-1 text-lg font-semibold ${selectedAgent.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                {selectedAgent.status?.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Branch ID</p>
              <p className="mt-1 text-lg text-gray-900">{selectedAgent.branch_id || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Customers Created</p>
              <p className="mt-1 text-lg font-semibold text-blue-600">{selectedAgent.customer_count}</p>
            </div>
            {/* Only show Created By for admin users */}
            {userRole === 'admin' && selectedAgent.created_by_user_id && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created By ID</p>
                  <p className="mt-1 text-lg text-gray-900">{selectedAgent.created_by_user_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created By Name</p>
                  <p className="mt-1 text-lg text-gray-900">
                    {selectedAgent.creator_first_name && selectedAgent.creator_last_name
                      ? `${selectedAgent.creator_first_name} ${selectedAgent.creator_last_name}`
                      : "N/A"}
                  </p>
                </div>
              </>
            )}
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500">Created At</p>
              <p className="mt-1 text-lg text-gray-900">
                {new Date(selectedAgent.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="px-6 py-8">
      <a
        onClick={() => changePage("Dashboard")}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back
      </a>

      <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
        {userRole === 'admin' ? 'All Agents' : 'Your Agents'}
      </h2>

      {agents.length > 0 ? (
        <div className="flex flex-col gap-3 mt-6">
          {agents.map((agent) => (
            <button
              key={agent.user_id}
              onClick={() => setSelectedAgent(agent)}
              className="px-4 py-3 bg-blue-500 text-white rounded-md font-semibold text-left hover:bg-blue-400 transition flex justify-between items-center"
            >
              <div className="flex flex-col">
                <span>{agent.first_name} {agent.last_name}</span>
                <span className="text-xs opacity-80">
                  User ID: {agent.user_id} • Customers: {agent.customer_count}
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-600">Showing {agents.length} of {allAgents.length} agent(s){searchQuery && ` matching "${searchQuery}"`}</div>
        </div>

        {/* Table */}
        {agents.length > 0 ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Username</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3">Branch</th>
                <th className="p-3">Customers</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.user_id} className="hover:bg-gray-50 text-sm border-b border-b-gray-200 last:border-0">
                  <td className="p-3 align-top">{a.user_id}</td>
                  <td className="p-3 align-top">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="w-28 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                        value={(edits[a.user_id]?.first_name ?? a.first_name) || ''}
                        placeholder="First"
                        onChange={(e) => patchEdit(a.user_id, 'first_name', e.target.value)}
                      />
                      <input
                        type="text"
                        className="w-28 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                        value={(edits[a.user_id]?.last_name ?? a.last_name) || ''}
                        placeholder="Last"
                        onChange={(e) => patchEdit(a.user_id, 'last_name', e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="p-3 align-top">
                    <input
                      type="text"
                      className="w-40 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                      value={(edits[a.user_id]?.username ?? a.username) || ''}
                      onChange={(e) => patchEdit(a.user_id, 'username', e.target.value)}
                    />
                  </td>
                  <td className="p-3 align-top">
                    <input
                      type="email"
                      className="w-56 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                      value={(edits[a.user_id]?.email ?? a.email) || ''}
                      onChange={(e) => patchEdit(a.user_id, 'email', e.target.value)}
                    />
                  </td>
                  <td className="p-3 align-top">
                    <select
                      className="border border-transparent bg-transparent px-2 py-1 rounded-md capitalize focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                      value={(edits[a.user_id]?.status ?? a.status)}
                      onChange={(e) => patchEdit(a.user_id, 'status', e.target.value)}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </td>
                  <td className="p-3 align-top">
                    {userRole === 'admin' ? (
                      <select
                        className="border border-transparent bg-transparent px-2 py-1 rounded-md w-48 focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
                        value={(edits[a.user_id]?.branch_id ?? a.branch_id) ?? ''}
                        onChange={(e) => patchEdit(a.user_id, 'branch_id', e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">- None -</option>
                        {branches.map((b) => (
                          <option key={b.branch_id} value={b.branch_id}>
                            {b.branch_name} (#{b.branch_id})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-block min-w-[8rem]">
                        {(() => {
                          const id = (edits[a.user_id]?.branch_id ?? a.branch_id);
                          const b = branches.find(x => String(x.branch_id) === String(id));
                          if (!id) return '-';
                          return b ? `${b.branch_name} (#${b.branch_id})` : `Branch #${id}`;
                        })()}
                      </span>
                    )}
                  </td>
                  <td className="p-3 align-top">{a.customer_count}</td>
                  <td className="p-3 align-top">{a.created_at ? new Date(a.created_at).toLocaleString() : '-'}</td>
                  <td className="p-3 align-top text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { console.log('Agents.jsx view agent:', a); setSelectedAgent(a); }} className="inline-flex items-center gap-1 rounded-md bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 text-xs font-semibold">View</button>
                      {userRole === 'admin' && (
                        <button onClick={() => confirmDelete(a)} className="inline-flex items-center gap-1 rounded-md bg-red-500 hover:bg-red-400 text-white px-2 py-1 text-xs font-semibold">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No agents found.</p>
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
      ) : (
        <p className="text-gray-500 italic mt-4">
          {userRole === 'admin' 
            ? 'No agents found in the system.' 
            : "You haven't created any agents yet."}
        </p>
      )}
    </div>
  );
}
