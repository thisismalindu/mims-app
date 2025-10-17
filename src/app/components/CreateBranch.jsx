"use client";
import React, { useState } from "react";

export default function CreateBranch({ changePage }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/create-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create branch");
      }

      alert("Branch created successfully!");
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
        Create New Branch
      </h2>

      <form className="w-full max-w-3xl mt-10" onSubmit={handleSubmit}>
        {[
          { label: "Branch Name", id: "branch_name", name: "branch_name", type: "text", required: true },
          { label: "Address", id: "address", name: "address", type: "text", required: true },
          { label: "Phone Number", id: "phone_number", name: "phone_number", type: "tel", required: false },
        ].map((field) => (
          <div key={field.id} className="flex flex-col mb-4">
            <div className="flex items-center">
              <label className="text-sm/6 font-medium text-gray-400" htmlFor={field.id}>
                {field.label}:
              </label>
              {field.required && <p className="text-red-500 font-medium">*</p>}
            </div>
            <input
              type={field.type}
              id={field.id}
              name={field.name}
              required={field.required}
              className="rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 w-full"
            />
          </div>
        ))}

        <div>
          <p className="text-sm/6 my-4 italic text-red-500">* Required fields</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-400"
          } cursor-pointer`}
        >
          {loading ? "Adding Branch..." : "Add Branch"}
        </button>
      </form>
    </div>
  );
}
