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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await action(e);
      if (result?.ok) {
        setSuccessMessage(result.message || 'User created successfully');
        setShowSuccessModal(true);
        // reset minimal fields; keep created_by_userid
        setValues((v) => ({ ...v, username: '', password: '', firstName: '', lastName: '', role: '', email: '', branchId: '' }));
      } else if (result && !result.ok) {
        setErrorMessage(result.error || 'Registration failed');
        setShowErrorModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
  };

  // Error Modal Component
  const ErrorModal = () => (
    showErrorModal && (
      <div className="fixed inset-0 bg-gray-100 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div className="relative mx-auto p-5 w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Registration Failed</h3>
            <div className="mt-2 px-7 py-3">
              <p className="text-sm text-gray-500">{errorMessage}</p>
            </div>
            <div className="items-center px-4 py-3">
              <button onClick={closeErrorModal} className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // Success Modal Component
  const SuccessModal = () => (
    showSuccessModal && (
      <div className="fixed inset-0 bg-gray-100 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div className="relative mx-auto p-5 w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">User Created</h3>
            <div className="mt-2 px-7 py-3">
              <p className="text-sm text-gray-500">{successMessage}</p>
            </div>
            <div className="items-center px-4 py-3 flex flex-col gap-2">
              <a href="/" className="block w-full">
                <button onClick={closeSuccessModal} className="w-full px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300">
                  Go to Home
                </button>
              </a>
              <a href="/register" className="block w-full">
                <button onClick={closeSuccessModal} className="w-full px-4 py-2 border border-green-500 text-green-500 text-base font-medium rounded-md shadow-sm hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-300">
                  Register Another User
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      {/* Modals */}
      <ErrorModal />
      <SuccessModal />
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <a href="/" className="cursor-pointer"><img
          alt="Your Company"
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=blue&shade=500"
          className="mx-auto h-10 w-auto"
        /></a>
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

          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm/6 font-medium text-gray-400">
              First Name
            </label>
            <div className="mt-2">
              <input
                value={values.firstName}
                onChange={(e) => setValues({ ...values, firstName: e.target.value })}
                id="firstName"
                name="firstName"
                type="text"
                required
                autoComplete="given-name"
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6"
              />
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm/6 font-medium text-gray-400">
              Last Name
            </label>
            <div className="mt-2">
              <input
                value={values.lastName}
                onChange={(e) => setValues({ ...values, lastName: e.target.value })}
                id="lastName"
                name="lastName"
                type="text"
                required
                autoComplete="family-name"
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
