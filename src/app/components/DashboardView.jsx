"use client";

import React from "react";

export default function DashboardView() {
  const stats = {
    totalCustomers: 1500,
    totalAccounts: 2300,
    activeFixedDeposits: 120,
    totalTransactionVolume: 5000000,
  };

  const recentTransactions = [
    { id: 1, customer: "Alice", amount: 5000, type: "Deposit", date: "2025-09-07" },
    { id: 2, customer: "Bob", amount: 12000, type: "Withdrawal", date: "2025-09-06" },
    { id: 3, customer: "Charlie", amount: 7000, type: "Deposit", date: "2025-09-05" },
    { id: 4, customer: "Diana", amount: 3500, type: "Withdrawal", date: "2025-09-04" },
    { id: 5, customer: "Ethan", amount: 10000, type: "Deposit", date: "2025-09-03" },
  ];

  return (
    <>
      {/* Top Row: Stats Cards */}
      <div className="top-section">
        <div className="stats-grid">
          <div className="card">
            <h2 className="text-red-700">Total Customers</h2>
            <p>{stats.totalCustomers}</p>
          </div>
          <div className="card">
            <h2>Total Accounts</h2>
            <p>{stats.totalAccounts}</p>
          </div>
          <div className="card">
            <h2>Fixed Deposits</h2>
            <p>{stats.activeFixedDeposits}</p>
          </div>
          <div className="card">
            <h2>Transaction Volume</h2>
            <p>{stats.totalTransactionVolume.toLocaleString()} Rs</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="transactions-section">
        <h2>Recent Transactions</h2>
        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Amount (Rs)</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.customer}</td>
                  <td className={`tx-type ${tx.type.toLowerCase()}`}>{tx.type}</td>
                  <td>{tx.amount.toLocaleString()}</td>
                  <td>{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
