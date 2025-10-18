"use client";
import React, { useEffect, useState } from "react";

export default function CustomerDetails({ customerId, changePage, onSelectAccount }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user to check role
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/get-customer-details?customer_id=${customerId}`);
        if (!res.ok) throw new Error("Failed to fetch customer details");
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        setData(result);
      } catch (err) {
        console.error("Error fetching customer details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  if (loading) {
    return <div className="p-6 text-gray-600 italic">Loading customer details...</div>;
  }

  if (error) {
    return (
      <div className="px-6 py-12">
        <a
          onClick={() => changePage("Customers")}
          className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
        >
          ⬅ back to customers
        </a>
        <div className="mt-6 text-red-600">Error: {error}</div>
      </div>
    );
  }

  const { customer, savings_accounts, fixed_deposit_accounts } = data;

  return (
    <div className="px-6 py-8">
      <a
        onClick={() => changePage("Customers")}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back to customers
      </a>

      <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">Customer Details</h2>

      {/* Customer Information */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Customer ID</p>
            <p className="mt-1 text-lg text-gray-900">{customer.customer_id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Full Name</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {customer.first_name} {customer.last_name}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">NIC Number</p>
            <p className="mt-1 text-lg text-gray-900">{customer.nic_number || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Gender</p>
            <p className="mt-1 text-lg text-gray-900 capitalize">{customer.gender || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Phone Number</p>
            <p className="mt-1 text-lg text-gray-900">{customer.phone_number || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="mt-1 text-lg text-gray-900">{customer.email || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Date of Birth</p>
            <p className="mt-1 text-lg text-gray-900">
              {customer.date_of_birth ? new Date(customer.date_of_birth).toLocaleDateString() : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <p className={`mt-1 text-lg font-semibold ${customer.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
              {customer.status?.toUpperCase()}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-sm font-medium text-gray-500">Address</p>
            <p className="mt-1 text-lg text-gray-900">{customer.address || "N/A"}</p>
          </div>
          {/* Show creator info for admins and managers */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && customer.created_by_user_id && (
            <div className="col-span-2 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-500">Created By Agent</p>
              <p className="mt-1 text-lg text-gray-900">
                {customer.creator_first_name} {customer.creator_last_name} 
                <span className="text-sm text-gray-500 ml-2">(ID: {customer.created_by_user_id})</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Savings Accounts */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Savings Accounts</h3>
        {savings_accounts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {savings_accounts.map((acc) => (
              <button
                key={acc.savings_account_id}
                onClick={() => onSelectAccount('savings', acc.savings_account_id)}
                className="px-4 py-3 bg-green-500 text-white rounded-md font-semibold text-left hover:bg-green-400 transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg">{acc.account_number}</p>
                    <p className="text-sm opacity-80">
                      {acc.plan_name} • Balance: Rs. {Number(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs font-semibold mt-1 ${acc.status === 'active' ? 'text-green-200' : 'text-red-200'}`}>
                      Status: {acc.status?.toUpperCase()}
                    </p>
                  </div>
                  <span className="text-sm italic opacity-80">View ➜</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No savings accounts found for this customer.</p>
        )}
      </div>

      {/* Fixed Deposit Accounts */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fixed Deposit Accounts</h3>
        {fixed_deposit_accounts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {fixed_deposit_accounts.map((fd) => (
              <button
                key={fd.fixed_deposit_account_id}
                onClick={() => onSelectAccount('fd', fd.fixed_deposit_account_id)}
                className="px-4 py-3 bg-purple-500 text-white rounded-md font-semibold text-left hover:bg-purple-400 transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg">{fd.fd_account_number}</p>
                    <p className="text-sm opacity-80">
                      {fd.plan_name} • Amount: Rs. {Number(fd.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs font-semibold mt-1 ${fd.status === 'active' ? 'text-purple-200' : 'text-red-200'}`}>
                      Status: {fd.status?.toUpperCase()}
                    </p>
                  </div>
                  <span className="text-sm italic opacity-80">View ➜</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No fixed deposit accounts found for this customer.</p>
        )}
      </div>
    </div>
  );
}
