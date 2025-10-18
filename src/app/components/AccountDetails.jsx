"use client";
import React, { useEffect, useState } from "react";

export default function AccountDetails({ accountType, accountId, changePage, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/get-account-details?type=${accountType}&account_id=${accountId}`);
        if (!res.ok) throw new Error("Failed to fetch account details");
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        setData(result);
      } catch (err) {
        console.error("Error fetching account details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (accountType && accountId) {
      fetchAccountDetails();
    }
  }, [accountType, accountId]);

  if (loading) {
    return <div className="p-6 text-gray-600 italic">Loading account details...</div>;
  }

  if (error) {
    return (
      <div className="px-6 py-12">
        <a
          onClick={onBack}
          className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
        >
          ⬅ back
        </a>
        <div className="mt-6 text-red-600">Error: {error}</div>
      </div>
    );
  }

  const { account, customers, transactions } = data;

  return (
    <div className="px-6 py-8">
      <a
        onClick={onBack}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back
      </a>

      <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
        {accountType === 'savings' ? 'Savings Account Details' : 'Fixed Deposit Account Details'}
      </h2>

      {/* Account Information */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Account Number</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {accountType === 'savings' ? account.account_number : account.fd_account_number}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Account Type</p>
            <p className="mt-1 text-lg font-semibold text-blue-600">
              {accountType === 'savings' ? 'SAVINGS ACCOUNT' : 'FIXED DEPOSIT'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Plan Name</p>
            <p className="mt-1 text-lg text-gray-900">{account.plan_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Interest Rate</p>
            <p className="mt-1 text-lg text-gray-900">
              {account.interest_rate ? `${Number(account.interest_rate).toFixed(2)}%` : 'N/A'}
            </p>
          </div>
          {accountType === 'savings' ? (
            <>
              <div>
                <p className="text-sm font-medium text-gray-500">Balance</p>
                <p className="mt-1 text-lg font-semibold text-green-600">
                  Rs. {Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Minimum Balance Required</p>
                <p className="mt-1 text-lg text-gray-900">
                  Rs. {Number(account.min_balance_required).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-gray-500">Amount</p>
                <p className="mt-1 text-lg font-semibold text-purple-600">
                  Rs. {Number(account.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Duration</p>
                <p className="mt-1 text-lg text-gray-900">{account.duration ? `${account.duration} months` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="mt-1 text-lg text-gray-900">
                  {account.start_date ? new Date(account.start_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Closing Date</p>
                <p className="mt-1 text-lg text-gray-900">
                  {account.closing_date ? new Date(account.closing_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Next Interest Date</p>
                <p className="mt-1 text-lg text-gray-900">
                  {account.next_interest_date ? new Date(account.next_interest_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Interest Transferable Account</p>
                <p className="mt-1 text-lg font-semibold text-blue-600">{account.savings_account_number}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <p className={`mt-1 text-lg font-semibold ${account.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
              {account.status?.toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Branch ID</p>
            <p className="mt-1 text-lg text-gray-900">{account.branch_id}</p>
          </div>
        </div>
      </div>

      {/* Account Holders */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Account Holder{customers.length > 1 ? 's' : ''} {customers.length > 1 ? '(Joint Account)' : ''}
        </h3>
        <div className="flex flex-col gap-3">
          {customers.map((cust) => (
            <div key={cust.customer_id} className="px-4 py-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {cust.first_name} {cust.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Customer ID: {cust.customer_id} • NIC: {cust.nic_number || 'N/A'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-blue-600 uppercase">
                  {cust.ownership || 'N/A'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions - Always show for savings, only show for FD if transactions exist */}
      {(accountType === 'savings' || (accountType === 'fd' && transactions.length > 0)) && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {accountType === 'savings' ? 'Recent Transactions (Last 10)' : 'Transactions'}
          </h3>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
                    <th className="p-3">Transaction ID</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.transaction_id} className="text-sm border-b border-b-gray-200 last:border-0">
                      <td className="p-3">{tx.transaction_id}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${
                          tx.transaction_type === 'deposit' ? 'bg-green-500' :
                          tx.transaction_type === 'withdrawal' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}>
                          {tx.transaction_type?.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">
                        Rs. {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-gray-600 max-w-xs truncate" title={tx.description}>
                        {tx.description || 'N/A'}
                      </td>
                      <td className="p-3">{new Date(tx.transaction_time).toLocaleString()}</td>
                      <td className="p-3 capitalize">{tx.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No transactions found for this account.</p>
          )}
        </div>
      )}
    </div>
  );
}
