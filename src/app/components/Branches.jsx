"use client";
import React, { useEffect, useState } from "react";

export default function Branches({ changePage }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/get-branches');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch branches');
        }
        const data = await res.json();
        setBranches(data.branches || []);
      } catch (err) {
        console.error('Error fetching branches:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-600 italic">Loading branches...</div>;
  }

  if (error) {
    return (
      <div className="px-6 py-12 lg:px-8">
        <a
          onClick={() => changePage('Dashboard')}
          className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
        >
          ⬅ back
        </a>
        <div className="mt-6 text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <a
        onClick={() => changePage('Dashboard')}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back
      </a>

      <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">Branches</h2>

      {branches.length > 0 ? (
        <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map((b) => (
                <tr key={b.branch_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.branch_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.branch_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.phone_number || b.phone || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.address || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 italic mt-4">No branches found.</p>
      )}
    </div>
  );
}
