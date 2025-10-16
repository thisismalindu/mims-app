"use client";
import React, { useEffect, useState } from "react";

export default function Branches({ changePage }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/branches');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || 'Failed to load branches');
          setBranches([]);
          return;
        }
        if (mounted) setBranches(data.branches || []);
      } catch (_) {
        setError('Network error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow text-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Branches</h2>
        <button onClick={() => changePage && changePage('CreateBranch')}
           className="rounded-md bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 text-sm font-semibold cursor-pointer">Create Branch</button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : branches.length === 0 ? (
        <p className="text-sm text-gray-500">No branches found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Address</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.branch_id} className="hover:bg-gray-50 text-sm border-b border-b-gray-200 last:border-0 cursor-pointer">
                  <td className="p-3">{b.branch_id}</td>
                  <td className="p-3 font-medium">{b.branch_name}</td>
                  <td className="p-3">{b.address || '-'}</td>
                  <td className="p-3">{b.phone_number || '-'}</td>
                  <td className="p-3 capitalize">{b.status}</td>
                  <td className="p-3">{b.created_at ? new Date(b.created_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
