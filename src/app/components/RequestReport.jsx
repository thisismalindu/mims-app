"use client";
import React, { useState } from "react";

export default function RequestReport({ changePage }) {
  const [reportType, setReportType] = useState("");
  const [formData, setFormData] = useState({
    agentId: "",
    startDate: "",
    endDate: "",
    accountNumber: "",
    customerId: "",
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleReportTypeChange = (e) => {
    setReportType(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Prepare data to send
    const dataToSend = {
      report_type: reportType,
      ...formData,
    };

    console.log("Report request data sent:", dataToSend);

    try {
      const response = await fetch("/api/request-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error("Failed to request report");
      }

      alert("Report request submitted successfully!");
      setFormData({
        agentId: "",
        startDate: "",
        endDate: "",
        accountNumber: "",
        customerId: "",
      });
      setReportType("");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-12 lg:px-8">
      {/* Back button */}
      <a
        onClick={() => changePage("Dashboard")}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back
      </a>

      {/* Title */}
      <h2 className="mt-10 text-gray-900 text-2xl/9 font-bold tracking-tight">
        Request Report
      </h2>

      <form className="w-full max-w-3xl mt-10" onSubmit={handleSubmit}>
        {/* Report Type Selection */}
        <div className="flex flex-col mb-4">
          <label className="text-sm/6 font-medium text-gray-400">
            Report Type:
          </label>
          <select
            name="reportType"
            value={reportType}
            onChange={handleReportTypeChange}
            required
            className="rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
          >
            <option value="">Select Report Type</option>
            <option value="agent_transactions">
              Agent-wise Total Number & Value of Transactions
            </option>
            <option value="account_summary">
              Account-wise Transaction Summary & Current Balance
            </option>
            <option value="active_fds">
              Active FDs & Next Interest Payout Dates
            </option>
            <option value="monthly_interest_summary">
              Monthly Interest Distribution Summary by Account Type
            </option>
            <option value="customer_activity">
              Customer Activity Report (Deposits, Withdrawals, Net Balance)
            </option>
          </select>
        </div>

        {/* Conditional fields */}
        {reportType === "agent_transactions" && (
          <>
            <div className="flex flex-col mb-4">
              <label className="text-sm/6 font-medium text-gray-400">
                Agent ID:
              </label>
              <input
                type="text"
                name="agentId"
                value={formData.agentId}
                onChange={handleInputChange}
                required
                className="rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
              />
            </div>
            <div className="flex gap-2 mb-4">
              <div className="flex-1 flex flex-col">
                <label className="text-sm/6 font-medium text-gray-400">
                  Start Date:
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="text-sm/6 font-medium text-gray-400">
                  End Date:
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
                />
              </div>
            </div>
          </>
        )}

        {reportType === "account_summary" && (
          <div className="flex flex-col mb-4">
            <label className="text-sm/6 font-medium text-gray-400">
              Account Number:
            </label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleInputChange}
              required
              className="rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
            />
          </div>
        )}

        {reportType === "customer_activity" && (
          <div className="flex flex-col mb-4">
            <label className="text-sm/6 font-medium text-gray-400">
              Customer ID:
            </label>
            <input
              type="text"
              name="customerId"
              value={formData.customerId}
              onChange={handleInputChange}
              required
              className="rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
            />
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-400"
          } cursor-pointer`}
        >
          {loading ? "Requesting Report..." : "Request Report"}
        </button>
      </form>
    </div>
  );
}
