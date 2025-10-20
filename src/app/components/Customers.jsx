"use client";
import React, { useEffect, useState } from "react";

export default function Customers({ changePage, onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [branches, setBranches] = useState([]);
  
  // Filter states
  const [searchType, setSearchType] = useState("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  // Fetch current user
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

  // Fetch branches for admin
  useEffect(() => {
    const fetchBranches = async () => {
      if (currentUser?.role !== 'admin') return;
      
      try {
        const res = await fetch('/api/get-branches');
        if (res.ok) {
          const data = await res.json();
          setBranches(data.branches || []);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    };
    fetchBranches();
  }, [currentUser]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/get-customers");
        if (!res.ok) throw new Error("Failed to fetch customers");
        const data = await res.json();
        setAllCustomers(data.customers || []);
        setCustomers(data.customers || []);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Filter customers based on search and branch
  useEffect(() => {
    let filtered = allCustomers;

    // Apply branch filter first (admin only)
    if (selectedBranch && currentUser?.role === 'admin') {
      filtered = filtered.filter(c => c.branch_id && c.branch_id.toString() === selectedBranch);
    }

    // Then apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      switch (searchType) {
        case "name":
          filtered = filtered.filter(c => 
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(query)
          );
          break;
        case "customer_id":
          filtered = filtered.filter(c => 
            c.customer_id.toString().includes(query)
          );
          break;
        case "account_number":
          filtered = filtered.filter(c => 
            c.account_numbers?.some(acc => acc.includes(query))
          );
          break;
        case "agent_id":
          filtered = filtered.filter(c => 
            c.created_by_user_id && c.created_by_user_id.toString().includes(query)
          );
          break;
        default:
          break;
      }
    }

    setCustomers(filtered);
  }, [searchQuery, searchType, selectedBranch, allCustomers, currentUser]);

  // centralized animation class, same technique as Dashboard.jsx
  const pulseClass = "animate-pulse";

  if (loading) {
    return (
      <div className="px-6 py-8">
        {/* back link skeleton */}
        <div className={`h-4 w-16 bg-gray-200 rounded ${pulseClass}`} />

        {/* title skeleton */}
        <div className="mt-6">
          <div className={`h-7 w-48 bg-gray-200 rounded ${pulseClass}`} />
        </div>

        {/* search + filter card skeleton */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col gap-4">
            {/* Branch filter row (admin only in real UI) */}
            <div className="flex gap-4 pb-4 border-b border-gray-200">
              <div className="flex-grow">
                <div className={`h-4 w-28 bg-gray-200 rounded mb-2 ${pulseClass}`} />
                <div className={`h-9 w-64 bg-gray-200 rounded ${pulseClass}`} />
              </div>
            </div>

            {/* Search filters row */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Filter type select */}
              <div className="flex-shrink-0">
                <div className={`h-4 w-20 bg-gray-200 rounded mb-2 ${pulseClass}`} />
                <div className={`h-9 w-48 bg-gray-200 rounded ${pulseClass}`} />
              </div>
              {/* Search input */}
              <div className="flex-grow">
                <div className={`h-4 w-14 bg-gray-200 rounded mb-2 ${pulseClass}`} />
                <div className={`h-9 w-full bg-gray-200 rounded ${pulseClass}`} />
              </div>
              {/* Clear button */}
              <div className="hidden md:flex items-end">
                <div className={`h-9 w-20 bg-gray-200 rounded ${pulseClass}`} />
              </div>
            </div>
          </div>

          {/* results count skeleton */}
          <div className="mt-3">
            <div className={`h-4 w-56 bg-gray-200 rounded ${pulseClass}`} />
          </div>
        </div>

        {/* list skeletons */}
        <div className="flex flex-col gap-3 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-3 bg-gray-50 rounded-md border border-gray-200"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className={`h-5 w-56 bg-gray-200 rounded ${pulseClass}`} />
                  <div className={`h-4 w-40 bg-gray-200 rounded mt-2 ${pulseClass}`} />
                </div>
                <div className={`h-4 w-12 bg-gray-200 rounded ${pulseClass}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
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
        Your Customers
      </h2>

      {/* Search and Filter Section */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col gap-4">
          {/* First Row: Branch Filter (Admin only) */}
          {currentUser?.role === 'admin' && (
            <div className="flex gap-4 pb-4 border-b border-gray-200">
              <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Branch:
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="block w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.branch_name} ({String(branch.branch_id).padStart(3, '0')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Second Row: Search Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filter Type Selector */}
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search By:
              </label>
              <select
                value={searchType}
                onChange={(e) => {
                  setSearchType(e.target.value);
                  setSearchQuery("");
                }}
                className="block w-full md:w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              >
                <option value="name">Customer Name</option>
                <option value="customer_id">Customer ID</option>
                <option value="account_number">Account Number</option>
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                  <option value="agent_id">Agent ID</option>
                )}
              </select>
            </div>

            {/* Search Input */}
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search:
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchType === "name" ? "Enter customer name..." :
                  searchType === "customer_id" ? "Enter customer ID..." :
                  searchType === "account_number" ? "Enter account number..." :
                  "Enter agent ID..."
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>

            {/* Clear Button */}
            {searchQuery && (
              <div className="flex items-end">
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition font-medium"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          {loading ? (
            <div className={`h-4 w-56 bg-gray-200 rounded ${pulseClass}`} />
          ) : (
            <>
              Showing {customers.length} of {allCustomers.length} customer(s)
              {searchQuery && ` matching "${searchQuery}"`}
            </>
          )}
        </div>
      </div>

      {customers.length > 0 ? (
        <div className="flex flex-col gap-3 mt-6">
          {customers.map((cust) => (
            <button
              key={cust.customer_id}
              onClick={() => onSelectCustomer(cust.customer_id)}
              className="px-4 py-3 bg-blue-500 text-white rounded-md font-semibold text-left hover:bg-blue-400 transition flex justify-between items-center"
            >
              <div>
                <span className="text-lg">
                  {cust.first_name} {cust.last_name}
                </span>
                <span className="text-sm opacity-80 ml-2">
                  (ID: {cust.customer_id})
                </span>
              </div>
              <span className="text-sm italic opacity-80">View ➜</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic mt-4">
          You haven’t created any customers yet.
        </p>
      )}
    </div>
  );
}
