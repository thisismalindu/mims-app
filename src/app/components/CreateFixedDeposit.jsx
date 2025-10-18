"use client";
import React, { useState, useEffect } from "react";

export default function CreateFixedDepositAccount({ changePage }) {
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [plans, setPlans] = useState([]);

  

  const [confirmData, setConfirmData] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        setUserRole(data?.role || null);
        console.log("Current user role:", data?.role);
      } catch (err) {
        console.error("Error fetching current user:", err);
      }
    }
    fetchUser();
  }, []);

  // Fetch fixed deposit plans
  useEffect(() => {
    async function fetchPlans() {
      try {
        const plansRes = await fetch("/api/get-fixed-deposit-plans");
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
        console.log("Fetched fixed deposit plans:", plansData.plans);
      } catch (err) {
        console.error("Error fetching plans:", err);
      }
    }
    fetchPlans();
  }, []);

  if (userRole && !["admin", "agent"].includes(userRole)) {
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
    setConfirmError(null);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Lookup savings account info
    try {
      const lookupRes = await fetch("/api/lookup-savings-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savings_account_number: data.savings_account_number }),
      });
      const lookup = await lookupRes.json();
      if (!lookup.success) throw new Error(lookup.error || "Account lookup failed");

      setConfirmData({
        account_number: lookup.account_number,
        customer_name: lookup.customer_name,
        amount: data.amount,
        form: data,
      });
      setShowConfirm(true);
    } catch (err) {
      setConfirmError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setShowConfirm(false);
    setConfirmError(null);
    try {
      const response = await fetch("/api/create-fixed-deposit-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmData.form),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Failed to create account");
      alert("✅ Fixed Deposit Account created successfully!");
      document.querySelector('form').reset();
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
        {/* Savings Account Number (10-digit input) */}
        <div className="flex flex-col mb-4">
          <label className="text-sm/6 font-medium text-gray-400">
            Savings Account Number:
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="savings_account_number"
            required
            maxLength={10}
            pattern="\d{10}"
            title="Please enter exactly 10 digits"
            inputMode="numeric"
            autoComplete="off"
            className="rounded-md bg-white px-3 py-1.5 text-base w-full"
            placeholder="Enter 10-digit account number"
            onInput={e => {
              // Only allow digits
              e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
            }}
          />
        </div>

        {/* Fixed Deposit Plan */}
        <div className="flex flex-col mb-4">
          <label className="text-sm/6 font-medium text-gray-400">
            Fixed Deposit Plan:
            <span className="text-red-500">*</span>
          </label>
          <select name="fixed_deposit_account_plan_id" required className="rounded-md bg-white px-3 py-1.5 text-base w-full">
            <option value="">-- Select Plan --</option>
            {plans.map((plan) => {
              const min = Number(plan.minimum_amount_required).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const rate = plan.interest_rate !== undefined ? Number(plan.interest_rate).toFixed(2) : '';
              return (
                <option key={plan.fixed_deposit_account_plan_id || plan.name} value={plan.fixed_deposit_account_plan_id}>
                  {plan.name} - Min: Rs. {min} | Rate: {rate}%
                </option>
              );
            })}
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

        {/* ...no start date field... */}
      {/* Confirmation Popup */}
      {showConfirm && confirmData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Fixed Deposit Account</h3>
            <div className="mb-2"><strong>Account Number:</strong> {confirmData.account_number}</div>
            <div className="mb-2"><strong>Customer Name:</strong> {confirmData.customer_name}</div>
            <div className="mb-2"><strong>Amount:</strong> {confirmData.amount}</div>
            <div className="flex gap-4 mt-6">
              <button
                className="px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600"
                onClick={handleConfirm}
                disabled={loading}
              >Proceed</button>
              <button
                className="px-4 py-2 rounded bg-gray-300 text-gray-700 font-semibold hover:bg-gray-400"
                onClick={() => { setShowConfirm(false); setConfirmData(null); }}
                disabled={loading}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
      {confirmError && (
        <div className="text-red-600 font-semibold mt-4">{confirmError}</div>
      )}

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
