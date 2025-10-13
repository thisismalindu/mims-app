"use client";
import React, { useState } from "react";

export default function Register({
  action,
  values,
  setValues,
  error,
  info,
  allowedRoles = ['admin', 'manager', 'agent'],
}) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await action(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Your Company"
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=blue&shade=500"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-gray-900 text-2xl/9 font-bold tracking-tight">
          Create a new user
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {info && (
            <p className="text-blue-500 text-sm text-center">
              Only an existing user can create a new account. You are currently
              logged in and authorized to proceed.
            </p>
          )}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm/6 font-medium text-gray-400">
              Username
            </label>
            <div className="mt-2">
              <input
                value={values.username}
                onChange={(e) => setValues({ ...values, username: e.target.value })}
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm/6 font-medium text-gray-400">
                Password
              </label>
            </div>
            <div className="mt-2 relative">
              <input
                value={values.password}
                onChange={(e) => setValues({ ...values, password: e.target.value })}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 text-xs text-blue-400 hover:text-blue-300 focus:outline-none cursor-pointer"
                tabIndex={-1}
                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}
              >
                {values.password ? (showPassword ? "Hide" : "Show") : ""}
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm/6 font-medium text-gray-400">
              Role
            </label>
            <div className="mt-2">
              <select
                id="role"
                name="role"
                value={values.role}
                onChange={(e) => setValues({ ...values, role: e.target.value })}
                required
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6"
              >
                <option value="">Select a role</option>
                {allowedRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm/6 font-medium text-gray-400">
              Email
            </label>
            <div className="mt-2">
              <input
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6"
              />
            </div>
          </div>

          {/* Branch ID */}
          <div>
            <label htmlFor="branchId" className="block text-sm/6 font-medium text-gray-400">
              Branch ID
            </label>
            <div className="mt-2">
              <input
                value={values.branchId}
                onChange={(e) => setValues({ ...values, branchId: e.target.value })}
                id="branchId"
                name="branchId"
                type="number"
                required
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6"
              />
            </div>
          </div>

          {/* Created By (readonly) */}
          <div>
            <label htmlFor="createdBy" className="block text-sm/6 font-medium text-gray-400">
              Created By (current user)
            </label>
            <div className="mt-2">
              <input
                value={values.created_by_userid}
                readOnly
                id="createdBy"
                name="createdBy"
                type="text"
                className="block w-full rounded-md bg-gray-100 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-400"}`}
            >
              {loading ? "Creating user..." : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
