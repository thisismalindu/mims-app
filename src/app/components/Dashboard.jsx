"use client";

import React, { useEffect, useMemo, useState } from "react";

export default function Dashboard({ changePage }) {
  // get user data
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);



  // role colors
  const roleColors = {
    admin: "bg-red-400",
    manager: "bg-green-500",
    agent: "bg-blue-400",
    default: "bg-gray-400",
  };

  const getRoleColor = (role) => roleColors[role] || roleColors.default;

  // reusable badge component
  const RoleBadge = ({ role }) => {
    const colorClass = getRoleColor(role);
    return (
      <span
        className={`${colorClass} text-white rounded text-[10px] font-bold tracking-wide py-0.5 px-2`}
      >
        {role.toUpperCase()}
      </span>
    );
  };

  // Single source of truth for all features/duties
  const duties = [
    {
      name: "Create User",
      action: "CreateUser",
      description: "Add a new user to the system",
      category: "User Management",
      allowedRoles: ["admin"],
    },
    {
      name: "Create Branch",
      action: "CreateBranch",
      description: "Add a new branch to the system",
      category: "Administration",
      allowedRoles: ["admin"],
    },
    {
      name: "Request Report",
      action: "RequestReport",
      description: "Request a system report",
      category: "Reporting",
      allowedRoles: ["admin", "manager"],
    },
    {
      name: "Create Account Plan",
      action: "CreateAccountPlan",
      description: "Define a new account plan",
      category: "Plans",
      allowedRoles: ["admin", "manager"],
    },
    {
      name: "Create Fixed Deposit Plan",
      action: "CreateFixedDepositPlan",
      description: "Define a new fixed deposit plan",
      category: "Plans",
      allowedRoles: ["admin", "manager"],
    },
    {
      name: "Process FD Interest",
      action: "ProcessFDInterest",
      description: "Calculate and credit FD interest payments",
      category: "Operations",
      allowedRoles: ["admin", "manager"],
    },
    {
      name: "Create Customer",
      action: "CreateCustomer",
      description: "Add a new customer to the system",
      category: "Customer",
      allowedRoles: ["admin", "manager", "agent"],
    },
    {
      name: "Create Saving Account",
      action: "CreateSavingAccount",
      description: "Open a new savings account",
      category: "Accounts",
      allowedRoles: ["admin", "manager", "agent"],
    },
    {
      name: "Create Fixed Deposit",
      action: "CreateFixedDeposit",
      description: "Start a new fixed deposit",
      category: "Accounts",
      allowedRoles: ["admin", "manager", "agent"],
    },
    {
      name: "Initiate Transaction",
      action: "InitiateTransaction",
      description: "Process a new transaction",
      category: "Operations",
      allowedRoles: ["admin", "manager", "agent"],
    },
  ];

  // decide which duties to show for a given role
  const dutiesForUser = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin") return duties;
    return duties.filter((d) => d.allowedRoles.includes(user.role));
  }, [user]);

  // derive grouping categories from visible duties
  const categories = useMemo(() => {
    const set = new Set(dutiesForUser.map((d) => d.category));
    return Array.from(set);
  }, [dutiesForUser]);

  // infer accent role for card coloring
  const inferAccentRole = (duty) => {
    if (duty.allowedRoles.includes("agent")) return "agent";
    if (duty.allowedRoles.includes("manager")) return "manager";
    return "admin";
  };

  // page navigation handler
  const handleChangePage = (action) => () => changePage(action);

  // keep animation class centralized
  const pulseClass = "animate-pulse";

  return (
    <>
      {/* === Top Section === */}
      {loading ? (
        <>
          <div className="my-10">
            <div className={`h-6 w-40 bg-gray-200 rounded ${pulseClass}`} />
          </div>

          {/* Lightweight skeleton for duties/cards */}
          {(
            <div aria-busy="true">
              <div
                className={`h-4 w-32 bg-gray-200 rounded mb-3 ${pulseClass}`}
              />
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 min-w-[200px] bg-white rounded-xl border border-gray-200 overflow-hidden"
                  >
                    <div className={`h-1 w-full bg-gray-200 ${pulseClass}`} />
                    <div className={`p-5 ${pulseClass}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-4 w-28 bg-gray-200 rounded" />
                        <div className="h-4 w-10 bg-gray-200 rounded" />
                      </div>
                      <div className="h-3 w-40 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : user ? (
        <div className="flex my-10 items-center">
          <h2 className="text-gray-900 text-2xl/9 font-bold tracking-tight">
            Welcome,{" "}
            {user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.username}
            !
          </h2>
          <p className="ml-4">
            <RoleBadge role={user.role || "default"} />
          </p>
        </div>
      ) : (
        <p className="text-gray-500">Failed to load user.</p>
      )}

      {user && user.role === "admin" && (
        <div className="flex gap-4 items-center text-xs text-gray-500 mb-4">
          {["agent", "manager", "admin"].map((r) => (
            <span key={r} className="inline-flex items-center gap-1">
              <span
                className={`h-2 w-2 rounded-full ${getRoleColor(r)}`}
              ></span>
              {r.charAt(0).toUpperCase() + r.slice(1)} features
            </span>
          ))}
        </div>
      )}

      {/* === Duties by Category === */}
      {user &&
        categories.map((cat) => (
          <div key={cat} className="mb-8">
            <h3 className="text-gray-700 font-semibold mb-3">{cat}</h3>
            <div className="flex flex-wrap gap-4">
              {dutiesForUser
                .filter((d) => d.category === cat)
                .map((duty) => {
                  const accentRole = inferAccentRole(duty);
                  const colorClass = getRoleColor(accentRole);
                  return (
                    <a
                      key={duty.action}
                      onClick={handleChangePage(duty.action)}
                      className="flex-1 min-w-[200px] bg-white text-gray-900 rounded-xl border border-gray-200 hover:shadow-sm transition-shadow overflow-hidden cursor-pointer"
                    >
                      <div className={`h-1 w-full ${colorClass}`} />
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-base font-semibold">
                            {duty.name}
                          </h4>
                          <RoleBadge role={accentRole} />
                        </div>
                        <p className="text-sm opacity-80">
                          {duty.description}
                        </p>
                      </div>
                    </a>
                  );
                })}
            </div>
          </div>
        ))}
    </>
  );
}
