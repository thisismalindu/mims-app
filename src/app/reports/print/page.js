"use client";
import React, { useEffect, useState } from 'react';

export default function PrintReportPage({ searchParams }) {
  const id = searchParams?.id ? Number(searchParams.id) : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        if (!id || !Number.isInteger(id)) {
          setError('Invalid report id');
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/report-requests/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to fetch report');
        setData(json);
        setLoading(false);
        // Delay slightly to allow rendering then print
        setTimeout(() => window.print(), 300);
      } catch (e) {
        setError(e.message || 'Failed to fetch');
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-gray-600">Preparing report…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  const { request, data: report } = data || {};

  return (
    <div className="p-6 print:p-0">
      <h1 className="text-2xl font-semibold mb-1">{report?.title || 'Report'}</h1>
      <div className="text-sm text-gray-600 mb-4">
        <div><span className="font-medium">Request ID:</span> {request?.id}</div>
        <div><span className="font-medium">Type:</span> {request?.typeName} ({request?.typeKey})</div>
        <div><span className="font-medium">Created:</span> {request?.created_at ? new Date(request.created_at).toLocaleString() : '-'}</div>
      </div>

      {report?.context && (
        <div className="mb-4 text-sm">
          {/* Render context succinctly */}
          {report.context.agent && (
            <div>Agent: {report.context.agent.first_name} {report.context.agent.last_name} (#{report.context.agent.user_id})</div>
          )}
          {report.context.dateRange && (report.context.dateRange.start || report.context.dateRange.end) && (
            <div>Date Range: {report.context.dateRange.start || '—'} to {report.context.dateRange.end || '—'}</div>
          )}
          {report.context.account && (
            <div>Account: #{report.context.account.savings_account_id} • Balance: {report.context.account.balance} • Plan: {report.context.account.plan_name || '-'} • Branch: {report.context.account.branch_id || '-'}</div>
          )}
          {Array.isArray(report.context?.owners) && report.context.owners.length > 0 && (
            <div>Owners: {report.context.owners.map(o => `${o.first_name} ${o.last_name}`).join(', ')}</div>
          )}
          {report.context.customer && (
            <div>Customer: {report.context.customer.first_name} {report.context.customer.last_name} (#{report.context.customer.customer_id})</div>
          )}
        </div>
      )}

      {Array.isArray(report?.rows) && report.rows.length > 0 ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left font-medium border-b">
              {Object.keys(report.rows[0]).map((k) => (
                <th key={k} className="p-2 capitalize">{k.replaceAll('_',' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                {Object.keys(report.rows[0]).map((k) => (
                  <td key={k} className="p-2 align-top">{String(r[k] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-500">No rows in this report.</p>
      )}

      {report?.totals && (
        <div className="mt-4 text-sm">
          <div className="font-medium">Summary</div>
          <div>Count: {report.totals.count}</div>
          <div>Total: {report.totals.sum}</div>
        </div>
      )}
    </div>
  );
}
