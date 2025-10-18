"use client";
import React, { useState } from "react";

export default function CreateSavingAccount({ changePage }) {

  const [loading, setLoading] = useState(false);
  const [ownershipType, setOwnershipType] = useState("primary");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Remove joint_customer_id if not joint
    if (ownershipType !== "joint") {
      delete data.joint_customer_id;
    }

    console.log("Form data sent:", data);

    try {
      const response = await fetch("/api/create-saving-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create saving account");
      }

      alert("Saving account created successfully!");
      e.target.reset();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      label: "Ownership Type",
      id: "ownershipType",
      name: "ownership_type",
      type: "select",
      required: true,
      options: [
        { label: "Primary", value: "primary" },
        { label: "Joint", value: "joint" },
      ],
      onChange: (e) => setOwnershipType(e.target.value),
      value: ownershipType,
    },
    { label: "Customer ID", id: "customerId", name: "customer_id", type: "text", required: true },
    ...(ownershipType === "joint"
      ? [{ label: "Second Customer ID", id: "jointCustomerId", name: "joint_customer_id", type: "text", required: true }]
      : []),
    { 
      label: "Account Plan Name", 
      id: "accountPlanName", 
      name: "account_plan_name", 
      type: "select", 
      required: true, 
      options: [
        { label: "None", value: "none" },
        // Later, load dynamically from database
      ],
    },
  ];

  return (
    <div className="px-6 py-12 lg:px-8">

      <a
        onClick={() => changePage("Dashboard")}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back
      </a>

      <h2 className="mt-10 text-gray-900 text-2xl/9 font-bold tracking-tight">
        Create Saving Account
      </h2>

      <form className="w-full max-w-3xl mt-10" onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div key={field.id} className="flex flex-col mb-4">
            <div className="flex items-center">
              <label
                className="text-sm/6 font-medium text-gray-400"
                htmlFor={field.id}
              >
                {field.label}:
              </label>
              {field.required && <p className="text-red-500 font-medium">*</p>}
            </div>

            {field.type === "select" ? (
              <select
                id={field.id}
                name={field.name}
                required={field.required}
                value={field.value}
                onChange={field.onChange}
                className="rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                id={field.id}
                name={field.name}
                step={field.step}
                required={field.required}
                className="rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
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
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
