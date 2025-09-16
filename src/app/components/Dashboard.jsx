"use client";

import React from "react";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const stats = {
    totalCustomers: 1500,
    totalAccounts: 2300,
    activeFixedDeposits: 120,
    totalTransactionVolume: 5000000,
  };

  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    fetch("/api/recent-transactions")
      .then((res) => res.json())
      .then((data) => setRecentTransactions(data))
      .catch(() => setRecentTransactions([]));
  }, []);

  return (
    <>
      {/* === Top Stats Section === */}
      <div className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow hover:-translate-y-1 transition-transform">
            <h2 className="text-sm text-gray-600 mb-2">Total Customers</h2>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow hover:-translate-y-1 transition-transform">
            <h2 className="text-sm text-gray-600 mb-2">Total Accounts</h2>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow hover:-translate-y-1 transition-transform">
            <h2 className="text-sm text-gray-600 mb-2">Fixed Deposits</h2>
            <p className="text-2xl font-bold text-gray-900">{stats.activeFixedDeposits}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow hover:-translate-y-1 transition-transform">
            <h2 className="text-sm text-gray-600 mb-2">Transaction Volume</h2>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalTransactionVolume.toLocaleString()} Rs
            </p>
          </div>
        </div>
      </div>

      {/* === Recent Transactions Section === */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-sm font-medium text-gray-700">
                <th className="p-3">ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount (Rs)</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-gray-50 text-sm border-b last:border-0"
                >
                  <td className="p-3">{tx.id}</td>
                  <td className="p-3">{tx.customer}</td>
                  <td
                    className={`p-3 font-medium ${
                      tx.type === "Deposit" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.type}
                  </td>
                  <td className="p-3">{tx.amount.toLocaleString()}</td>
                  <td className="p-3">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
