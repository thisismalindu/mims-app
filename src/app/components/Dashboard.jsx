"use client";

import React from "react";
import { useEffect, useState } from "react";

export default function Dashboard({ changePage }) {
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


  const [user, setUser] = useState(null)

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch('/api/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    }
    fetchUser()
  }, [])


  return (
    <>
      {/* === Top Stats Section === */}
      {user ? (
        <h2 className="my-10 text-gray-900 text-2xl/9 font-bold tracking-tight">
          Welcome, {user.username}!
          </h2>
        ) : (<p>Loading...</p>)}

      <div className="flex flex-wrap gap-6 mb-8">
        <a onClick={() => changePage("CreateCustomer")} className="flex-1 min-w-[180px] bg-gray-50 text-gray-900 rounded-xl p-6 border-1 border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors">
          <h3 className="text-lg font-semibold mb-2">Create Customer</h3>
          <p className="text-sm opacity-80">Add a new customer to the system</p>
        </a>
        <a className="flex-1 min-w-[180px] bg-gray-50 text-gray-900 rounded-xl p-6 border-1 border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors">
          <h3 className="text-lg font-semibold mb-2">Initiate Transaction</h3>
          <p className="text-sm opacity-80">Start a new transaction</p>
        </a>
        <a className="flex-1 min-w-[180px] bg-gray-50 text-gray-900 rounded-xl p-6 border-1 border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors">
          <h3 className="text-lg font-semibold mb-2">Open Account</h3>
          <p className="text-sm opacity-80">Create a new account</p>
        </a>
        <a className="flex-1 min-w-[180px] bg-gray-50 text-gray-900 rounded-xl p-6 border-1 border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors">
          <h3 className="text-lg font-semibold mb-2">Placeholder Action</h3>
          <p className="text-sm opacity-80">More actions coming soon</p>
        </a>
      </div>


      {/* 
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
      </div> */}

      {/* === Recent Transactions Section === */}
      {/* <div className="bg-white rounded-xl shadow p-6">
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
                    className={`p-3 font-medium ${tx.type === "Deposit" ? "text-green-600" : "text-red-600"
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
      </div> */}
    </>
  );
}
