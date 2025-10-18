"use client";
import React, { useState, useEffect } from "react";

export default function CreateFixedDepositPlan({ changePage }) {
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Check user role
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

  // Block unauthorized users
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
          Only managers and admins are allowed to create fixed deposit plans.
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
      const response = await fetch("/api/create-fixed-deposit-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create fixed deposit plan");
      }

      alert("Fixed Deposit Plan created successfully!");
      e.target.reset();
    } catch (error) {
      alert(error.message);
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
        Create Fixed Deposit Plan
      </h2>

      <form className="w-full max-w-3xl mt-10" onSubmit={handleSubmit}>
        {[
          {
            label: "Plan Name",
            id: "name",
            name: "name",
            type: "text",
            required: true,
          },
          {
            label: "Duration (months)",
            id: "duration",
            name: "duration",
            type: "number",
            required: true,
            step: "1",
            min: "1",
            description: "Enter duration in months",
          },
          {
            label: "Interest Rate (%)",
            id: "interest_rate",
            name: "interest_rate",
            type: "number",
            step: "0.01",
            required: true,
          },
          {
            label: "Minimum Amount (LKR)",
            id: "minimum_amount_required",
            name: "minimum_amount_required",
            type: "number",
            step: "0.01",
            required: true,
          },
          {
            label: "Description",
            id: "description",
            name: "description",
            type: "text",
            required: false,
          },
        ].map((field) => (
          <div key={field.id} className="flex flex-col mb-4">
            <div className="flex items-center">
              <label
                className="text-sm/6 font-medium text-gray-400"
                htmlFor={field.id}
              >
                {field.label}:
              </label>
              {field.required ? (
                <p className="text-red-500 font-medium">*</p>
              ) : null}
            </div>

            {field.type === "select" ? (
              <select
                id={field.id}
                name={field.name}
                required={field.required}
                className="rounded-md bg-white px-3 py-1.5 text-base outline-1 outline-gray-300 focus:outline-2 focus:outline-blue-500 sm:text-sm/6 w-full"
              >
                <option value="">-- Select Duration --</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                id={field.id}
                name={field.name}
                required={field.required}
                className="rounded-md bg-white px-3 py-1.5 text-base outline-1 outline-gray-300 focus:outline-2 focus:outline-blue-500 sm:text-sm/6 w-full"
              ></textarea>
            ) : (
              <input
                type={field.type}
                id={field.id}
                name={field.name}
                step={field.step || undefined}
                min={field.min || undefined}
                placeholder={field.placeholder || undefined}
                required={field.required}
                className="rounded-md bg-white px-3 py-1.5 text-base outline-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500 sm:text-sm/6 w-full"
              />
            )}
          </div>
        ))}

        <div>
          <p className="text-sm/6 my-4 italic text-red-500">
            * Required fields
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-400"
          } cursor-pointer`}
        >
          {loading ? "Creating Plan..." : "Create Plan"}
        </button>
      </form>
    </div>
  );
}
