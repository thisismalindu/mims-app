"use client";
import React, { useEffect, useState } from "react";

export default function Customers({ changePage, onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/get-customers");
        if (!res.ok) throw new Error("Failed to fetch customers");
        const data = await res.json();
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

  if (loading) {
    return (
      <div className="p-6 text-gray-600 italic">Loading customers...</div>
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

      {customers.length > 0 ? (
        <div className="flex flex-col gap-3 mt-6">
          {customers.map((cust) => (
            <button
              key={cust.customer_id}
              onClick={() => onSelectCustomer(cust.customer_id)}
              className="px-4 py-3 bg-blue-500 text-white rounded-md font-semibold text-left hover:bg-blue-400 transition flex justify-between items-center"
            >
              <span>
                {cust.first_name} {cust.last_name}
              </span>
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
