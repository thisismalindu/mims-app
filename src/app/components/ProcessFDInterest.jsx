"use client";
import React, { useState, useEffect } from "react";

export default function ProcessFDInterest({ changePage }) {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Check user role
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        setUserRole(data?.role || null);
      } catch (err) {
        console.error("Error fetching current user:", err);
      }
    }
    fetchUser();
  }, []);

  // Block unauthorized users
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
          Only managers and admins are allowed to process FD interest calculations.
        </p>
      </div>
    );
  }

  const handleProcessInterest = async () => {
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/process-fd-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process FD interest");
      }

      setResult(data);
    } catch (err) {
      console.error("Error processing FD interest:", err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="px-6 py-12 lg:px-8">
      <a
        onClick={() => changePage("Dashboard")}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back
      </a>

      <h2 className="mt-10 text-gray-900 text-2xl/9 font-bold tracking-tight">
        Process Fixed Deposit Interest
      </h2>

      <div className="w-full max-w-4xl mt-10">
        {/* Process Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleProcessInterest}
            disabled={processing}
            className={`px-6 py-3 rounded-md font-semibold text-white transition ${
              processing
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {processing ? "Processing..." : "🔄 Process FD Interest Now"}
          </button>
          {processing && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
              <span>Calculating interest...</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">❌ Error</h3>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ✅ Processing Complete
            </h3>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{result.processed}</p>
                <p className="text-sm text-green-600">Successful</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{result.errors || 0}</p>
                <p className="text-sm text-red-600">Errors</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.total}</p>
                <p className="text-sm text-blue-600">Total</p>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{result.message}</p>

            {/* Detailed Results */}
            {result.results && result.results.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Processing Details:</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead>
                      <tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
                        <th className="p-3 border-b">FD Account</th>
                        <th className="p-3 border-b">Savings Account</th>
                        <th className="p-3 border-b">FD Amount</th>
                        <th className="p-3 border-b">Interest Credited</th>
                        <th className="p-3 border-b">Next Interest Date</th>
                        <th className="p-3 border-b">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.map((item, index) => (
                        <tr key={index} className="text-sm border-b last:border-0">
                          <td className="p-3">{item.fd_account_number}</td>
                          <td className="p-3">{item.savings_account_number || "-"}</td>
                          <td className="p-3">
                            {item.amount ? `Rs. ${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                          </td>
                          <td className="p-3 font-semibold text-green-600">
                            {item.interest_credited ? `Rs. ${Number(item.interest_credited).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                          </td>
                          <td className="p-3">{item.next_interest_date || "Completed"}</td>
                          <td className="p-3">
                            {item.status === 'success' ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                ✓ Success
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                ✗ Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
