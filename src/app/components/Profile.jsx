"use client";

import React, { useEffect, useState } from "react";
import { UserIcon, EnvelopeIcon, ShieldCheckIcon, BuildingOfficeIcon, CalendarIcon, UsersIcon, UserGroupIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const res = await fetch("/api/profile");
        if (!res.ok) {
          throw new Error("Failed to fetch user data");
        }
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError("Could not load profile information.");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  // Define role colors and badges
  const roleColors = {
    admin: 'bg-gradient-to-r from-red-500 to-red-600',
    manager: 'bg-gradient-to-r from-green-500 to-green-600',
    agent: 'bg-gradient-to-r from-blue-500 to-blue-600',
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-red-100 text-red-800 border-red-200',
  };

  // skeleton animation class like Dashboard.jsx
  const pulseClass = "animate-pulse";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header Card with Avatar (skeleton) */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className={`h-32 bg-gray-200 ${pulseClass}`}></div>
          <div className="relative px-6 pb-6">
            <div className="flex justify-between items-start">
              <div className="relative -mt-16">
                <div className="w-32 h-32 rounded-full bg-white p-2 shadow-xl">
                  <div className={`w-full h-full rounded-full bg-gray-200 ${pulseClass}`}></div>
                </div>
              </div>
              <div className="mt-4">
                <div className={`h-7 w-28 bg-gray-200 rounded ${pulseClass}`} />
              </div>
            </div>
            <div className="mt-4">
              <div className={`h-8 w-64 bg-gray-200 rounded ${pulseClass}`} />
              <div className="flex items-center gap-2 mt-2">
                <div className={`h-6 w-28 bg-gray-200 rounded ${pulseClass}`} />
                <div className={`h-5 w-24 bg-gray-200 rounded ${pulseClass}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Information Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className={`h-6 w-48 bg-gray-200 rounded mb-4 ${pulseClass}`} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gray-200 ${pulseClass}`} />
                <div className="flex-grow">
                  <div className={`h-4 w-28 bg-gray-200 rounded ${pulseClass}`} />
                  <div className={`h-5 w-40 bg-gray-200 rounded mt-2 ${pulseClass}`} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className={`h-6 w-48 bg-gray-200 rounded mb-4 ${pulseClass}`} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gray-200 ${pulseClass}`} />
                <div className="flex-grow">
                  <div className={`h-4 w-28 bg-gray-200 rounded ${pulseClass}`} />
                  <div className={`h-5 w-40 bg-gray-200 rounded mt-2 ${pulseClass}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Profile</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const fullName = user.first_name && user.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user.username;

  const initials = user.first_name && user.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : user.username.substring(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Card with Avatar */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
        {/* Cover Image / Gradient Background */}
        <div className={`h-32 ${roleColors[user.role] || 'bg-gradient-to-r from-gray-500 to-gray-600'}`}></div>
        
        {/* Profile Header */}
        <div className="relative px-6 pb-6">
          {/* Avatar */}
          <div className="flex justify-between items-start">
            <div className="relative -mt-16">
              <div className="w-32 h-32 rounded-full bg-white p-2 shadow-xl">
                <div className={`w-full h-full rounded-full ${roleColors[user.role] || 'bg-gray-500'} flex items-center justify-center text-white text-3xl font-bold`}>
                  {initials}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-4">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${statusColors[user.status] || 'bg-gray-100 text-gray-800'}`}>
                {user.status === 'active' ? '✓ Active' : '○ Inactive'}
              </span>
            </div>
          </div>

          {/* Name and Role */}
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${roleColors[user.role]}`}>
                {user.role?.toUpperCase()}
              </span>
              <span className="text-gray-500 text-sm">@{user.username}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Personal Information Card */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-blue-500" />
            Personal Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-grow">
                <p className="text-sm text-gray-500 font-medium">User ID</p>
                <p className="text-gray-900 font-semibold">#{user.user_id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-grow">
                <p className="text-sm text-gray-500 font-medium">Full Name</p>
                <p className="text-gray-900 font-semibold">
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : "Not provided"}
                </p>
              </div>
            </div>

            {user.email && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <EnvelopeIcon className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-grow">
                  <p className="text-sm text-gray-500 font-medium">Email Address</p>
                  <p className="text-gray-900 font-semibold break-all">{user.email}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                <ShieldCheckIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-grow">
                <p className="text-sm text-gray-500 font-medium">Account Status</p>
                <p className={`font-semibold ${user.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                  {user.status === 'active' ? '✓ Active Account' : '○ Inactive Account'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Work Information Card */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="w-6 h-6 text-green-500" />
            Work Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-grow">
                <p className="text-sm text-gray-500 font-medium">Role</p>
                <p className="text-gray-900 font-semibold capitalize">{user.role}</p>
              </div>
            </div>

            {user.branch_name && (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm text-gray-500 font-medium">Branch</p>
                    <p className="text-gray-900 font-semibold">{user.branch_name}</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {String(user.branch_id).padStart(3, '0')}</p>
                  </div>
                </div>

                {user.branch_address && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                      <BuildingOfficeIcon className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm text-gray-500 font-medium">Branch Address</p>
                      <p className="text-gray-900">{user.branch_address}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-grow">
                <p className="text-sm text-gray-500 font-medium">Member Since</p>
                <p className="text-gray-900 font-semibold">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(user.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Card (for agents and managers) */}
      {(user.role === 'agent' || user.role === 'manager') && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-purple-500" />
            Your Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.role === 'agent' && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Total Customers</p>
                    <p className="text-4xl font-bold text-blue-700">{user.total_customers_created || 0}</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center">
                    <UsersIcon className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">Customers you've created</p>
              </div>
            )}

            {user.role === 'manager' && (
              <>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">Total Agents</p>
                      <p className="text-4xl font-bold text-green-700">{user.total_agents_created || 0}</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center">
                      <UserGroupIcon className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">Agents under your management</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">Total Customers</p>
                      <p className="text-4xl font-bold text-green-700">{user.total_customers_created || 0}</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center">
                      <UsersIcon className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">From your agents' work</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* System Statistics Card (for admins) */}
      {user.role === 'admin' && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-red-500" />
            System Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Customers */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-red-600 mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-red-700">{user.total_customers_in_system || 0}</p>
            </div>

            {/* Total Agents */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-red-600 mb-1">Total Agents</p>
              <p className="text-3xl font-bold text-red-700">{user.total_agents_in_system || 0}</p>
            </div>

            {/* Total Managers */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">
                  <ShieldCheckIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-red-600 mb-1">Total Managers</p>
              <p className="text-3xl font-bold text-red-700">{user.total_managers_in_system || 0}</p>
            </div>

            {/* Total Branches */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">
                  <BuildingOfficeIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-red-600 mb-1">Total Branches</p>
              <p className="text-3xl font-bold text-red-700">{user.total_branches_in_system || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Account Creation Info Card */}
      {user.created_by_first_name && user.created_by_last_name && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckBadgeIcon className="w-6 h-6 text-indigo-500" />
            Account Information
          </h2>
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <p className="text-sm text-indigo-600 mb-2">This account was created by:</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                {user.created_by_first_name[0]}{user.created_by_last_name[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {user.created_by_first_name} {user.created_by_last_name}
                </p>
                <p className="text-sm text-gray-600 capitalize">
                  {user.created_by_role} • User ID: #{user.created_by_user_id}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}