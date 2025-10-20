"use client";
import React, { useEffect, useMemo, useState } from "react";

export default function Reports({ changePage }) {
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // detailed view
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const pulseClass = "animate-pulse";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/my-report-requests');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load reports');
        setAllRows(data.requests || []);
        setRows(data.requests || []);
      } catch (e) {
        setError(e.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let f = allRows;
    if (typeFilter) f = f.filter(r => r.report_type_key === typeFilter);
    if (filter.trim()) {
      const q = filter.toLowerCase();
      f = f.filter(r => (
        String(r.report_request_id).includes(q) ||
        (r.report_type_name || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q)
      ));
    }
    setRows(f);
  }, [filter, typeFilter, allRows]);

  const viewReport = async (id) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/report-requests/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load report');
      setSelected(data);
    } catch (e) {
      setError(e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const onPrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="px-6 py-8">
        <div className={`h-4 w-16 bg-gray-200 rounded ${pulseClass}`} />
        <div className="bg-white rounded-xl p-6 shadow mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`h-7 w-48 bg-gray-200 rounded ${pulseClass}`} />
            <div className={`h-8 w-28 bg-gray-200 rounded ${pulseClass}`} />
          </div>
          <div className={`h-4 w-72 bg-gray-200 rounded ${pulseClass}`} />
          <div className="overflow-x-auto mt-4">
            <div className="w-full border border-gray-200 rounded-lg">
              <div className="bg-gray-50 p-3">
                <div className="grid grid-cols-5 gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`h-4 bg-gray-200 rounded ${pulseClass}`} />
                  ))}
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {Array.from({ length: 6 }).map((_, r) => (
                  <div key={r} className="grid grid-cols-5 gap-3 p-3">
                    {Array.from({ length: 5 }).map((_, c) => (
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
      <div className="px-6 py-12 lg:px-8">
        <a onClick={() => changePage("Dashboard")} className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600">⬅ back</a>
        <div className="mt-6 text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (selected) {
    const { request, data } = selected;
    return (
      <div className="px-6 py-8">
        <a onClick={() => setSelected(null)} className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600">⬅ back to reports</a>
        <div className="bg-white rounded-xl p-6 shadow mt-6 print:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{data.title}</h2>
            <button onClick={onPrint} className="rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500">Print</button>
          </div>
          <div className="text-sm text-gray-600 mb-4">
            <div><span className="font-medium">Request ID:</span> {request.id}</div>
            <div><span className="font-medium">Type:</span> {request.typeName} ({request.typeKey})</div>
            <div><span className="font-medium">Created:</span> {new Date(request.created_at).toLocaleString()}</div>
          </div>

          {Array.isArray(data.rows) && data.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
                    {Object.keys(data.rows[0]).map((k) => (
                      <th key={k} className="p-2 capitalize">{k.replaceAll('_',' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 border-b last:border-0">
                      {Object.keys(data.rows[0]).map((k) => (
                        <td key={k} className="p-2 align-top">{String(r[k] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No rows for this report.</p>
          )}

          {data.totals && (
            <div className="mt-4 text-sm">
              <div className="font-medium">Summary</div>
              <div>Count: {data.totals.count}</div>
              <div>Total: {data.totals.sum}</div>
            </div>
          )}
          <div className="mt-6">
            <a href={`/reports/print?id=${request.id}`} target="_blank" rel="noreferrer" className="rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600">Open Print View</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <a onClick={() => changePage('Dashboard')} className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600">⬅ back</a>
      <div className="bg-white rounded-xl p-6 shadow text-gray-800 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Reports</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-2">
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type:</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="block w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border">
              <option value="">All Types</option>
              {[...new Set(allRows.map(r => r.report_type_key))].map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search:</label>
            <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search id, type, status..." className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"/>
          </div>
        </div>

        {rows.length > 0 ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
                  <th className="p-3">ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.report_request_id} className="hover:bg-gray-50 text-sm border-b border-b-gray-200 last:border-0">
                    <td className="p-3 align-top">{r.report_request_id}</td>
                    <td className="p-3 align-top">{r.report_type_name} <span className="text-gray-500">({r.report_type_key})</span></td>
                    <td className="p-3 align-top capitalize">{r.status}</td>
                    <td className="p-3 align-top">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-3 align-top text-right">
                      <button onClick={() => viewReport(r.report_request_id)} className="inline-flex items-center gap-1 rounded-md bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 text-xs font-semibold">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No reports found.</p>
        )}
      </div>
    </div>
  );
}
