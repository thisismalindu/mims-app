"use client";
import React, { useState, useEffect } from "react";

export default function CreateFixedDepositAccount({ changePage }) {
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [plans, setPlans] = useState([]);
  const [savingsAccounts, setSavingsAccounts] = useState([]);

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/get-current-user");
        const data = await res.json();
        setUserRole(data?.role || null);
      } catch (err) {
        console.error("Error fetching current user:", err);
      }
    }
    fetchUser();
  }, []);

  // Fetch plans and savings accounts
  useEffect(() => {
    async function fetchData() {
      try {
        const plansRes = await fetch("/api/get-fixed-deposit-plans");
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);

        const accountsRes = await fetch("/api/get-savings-accounts");
        const accountsData = await accountsRes.json();
        setSavingsAccounts(accountsData.accounts || []);
      } catch (err) {
        console.error("Error fetching plans/accounts:", err);
      }
    }
    fetchData();
  }, []);

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
          Only managers and admins can create fixed deposit accounts.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    console.log("Form data sent:", data);

    try {
      const response = await fetch("/api/create-fixed-deposit-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create account");
      }

      alert("✅ Fixed Deposit Account created successfully!");
      e.target.reset();
    } catch (error) {
      alert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
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
        Create Fixed Deposit Account
      </h2>

      <form className="w-full max-w-3xl mt-10" onSubmit={handleSubmit}>
        {/* Savings Account */}
        <div className="flex flex-col mb-4">
          <label className="text-sm/6 font-medium text-gray-400">
            Savings Account:
            <span className="text-red-500">*</span>
          </label>
          <select name="savings_account_id" required className="rounded-md bg-white px-3 py-1.5 text-base w-full">
            <option value="">-- Select Savings Account --</option>
            {savingsAccounts.map((acc) => (
              <option key={acc.savings_account_id} value={acc.savings_account_id}>
                {acc.account_number} - Balance: {acc.balance}
              </option>
            ))}
          </select>
        </div>

        {/* Fixed Deposit Plan */}
        <div className="flex flex-col mb-4">
          <label className="text-sm/6 font-medium text-gray-400">
            Fixed Deposit Plan:
            <span className="text-red-500">*</span>
          </label>
          <select name="fixed_deposit_account_plan_id" required className="rounded-md bg-white px-3 py-1.5 text-base w-full">
            <option value="">-- Select Plan --</option>
            {plans.map((plan) => (
              <option key={plan.fixed_deposit_account_plan_id} value={plan.fixed_deposit_account_plan_id}>
                {plan.name} ({plan.duration}) - Min: {plan.minimum_amount_required}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="flex flex-col mb-4">
          <label className="text-sm/6 font-medium text-gray-400">
            Amount:
            <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            name="amount"
            required
            className="rounded-md bg-white px-3 py-1.5 text-base w-full"
          />
        </div>

        {/* Start Date */}
        <div className="flex flex-col mb-4">
          <label className="text-sm/6 font-medium text-gray-400">
            Start Date:
            <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="start_date"
            required
            className="rounded-md bg-white px-3 py-1.5 text-base w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-400"
          }`}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
