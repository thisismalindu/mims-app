"use client";
import React, { useEffect, useState } from "react";

export default function Accounts({ customerId, onSelectSavingsAccount, onSelectFixedDeposit, changePage }) {
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [fixedDeposits, setFixedDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!customerId) return;

    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/get-customer-accounts?customerId=${customerId}`);
        if (!res.ok) throw new Error("Failed to load customer accounts");
        const data = await res.json();
        setSavingsAccounts(data.savingsAccounts || []);
        setFixedDeposits(data.fixedDeposits || []);
      } catch (err) {
        console.error("Error fetching accounts:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [customerId]);

  if (loading) {
    return (
      <div className="p-6 text-gray-600 italic">Loading accounts...</div>
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

      <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
        Customer Accounts
      </h2>

      {/* Savings Accounts */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Savings Accounts</h3>
        {savingsAccounts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {savingsAccounts.map((acc) => (
              <button
                key={acc.savings_account_id}
                onClick={() => onSelectSavingsAccount(acc.savings_account_id)}
                className="px-4 py-3 bg-blue-500 text-white rounded-md font-semibold text-left hover:bg-blue-400 transition flex justify-between items-center"
              >
                <span>
                  {acc.account_number} — {acc.plan_name}
                </span>
                <span className="text-sm italic opacity-80">View ➜</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No savings accounts found.</p>
        )}
      </div>

      {/* Fixed Deposit Accounts */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Fixed Deposit Accounts</h3>
        {fixedDeposits.length > 0 ? (
          <div className="flex flex-col gap-3">
            {fixedDeposits.map((fd) => (
              <button
                key={fd.fixed_deposit_account_id}
                onClick={() => onSelectFixedDeposit(fd.fixed_deposit_account_id)}
                className="px-4 py-3 bg-green-600 text-white rounded-md font-semibold text-left hover:bg-green-500 transition flex justify-between items-center"
              >
                <span>
                  FD#{fd.fixed_deposit_account_id} — {fd.plan_name}
                </span>
                <span className="text-sm italic opacity-80">View ➜</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No fixed deposits found.</p>
        )}
      </div>
    </div>
  );
}
