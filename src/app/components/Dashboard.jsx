"use client";

import React from "react";
import { useEffect, useState } from "react";

export default function Dashboard({ changePage }) {
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    fetch("/api/recent-transactions")
      .then((res) => res.json())
      .then((data) => setRecentTransactions(data))
      .catch(() => setRecentTransactions([]));
  }, []);


  // get user data
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch('/api/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    }
    fetchUser()
  }, [])

  // define role colors
  const roleColors = {
    admin: 'bg-red-400',
    manager: 'bg-green-500',
    agent: 'bg-blue-400',
  };
  // Define role-specific duties
  const baseDuties = {
    createAgent: { name: "Create Agent", action: "CreateUser", description: "Add a new agent to the system" },
    requestReport: { name: "Request Report", action: "RequestReport", description: "Request a system report" },
    createAccountPlan: { name: "Create Account Plan", action: "CreateAccountPlan", description: "Define a new account plan" },
    createFixedDepositPlan: { name: "Create Fixed Deposit Plan", action: "CreateFixedDepositPlan", description: "Define a new fixed deposit plan" },
    createCustomer: { name: "Create Customer", action: "CreateCustomer", description: "Add a new customer to the system" },
    createSavingAccount: { name: "Create Saving Account", action: "CreateSavingAccount", description: "Open a new savings account" },
    createFixedDeposit: { name: "Create Fixed Deposit", action: "CreateFixedDeposit", description: "Start a new fixed deposit" },
    initiateTransaction: { name: "Initiate Transaction", action: "InitiateTransaction", description: "Process a new transaction" },
    createUser: { name: "Create User", action: "CreateUser", description: "Add a new user to the system" },
    generateReports: { name: "Generate Reports", action: "GenerateReports", description: "View and generate system reports" },
    createBranch: { name: "Create Branch", action: "CreateBranch", description: "Add a new branch to the system" },
  };

  const roleDuties = {
    admin: Object.values(baseDuties),
    manager: [
      baseDuties.createAgent,
      baseDuties.requestReport,
      baseDuties.createAccountPlan,
      baseDuties.createFixedDepositPlan,
    ],
    agent: [
      baseDuties.createCustomer,
      baseDuties.createSavingAccount,
      baseDuties.createFixedDeposit,
      baseDuties.initiateTransaction,
    ],
  };


  return (
    <>
      {/* === Top Stats Section === */}
      {user ? (
        <div className="flex my-10 items-center">
          <h2 className="text-gray-900 text-2xl/9 font-bold tracking-tight">
            Welcome, {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}!
          </h2>
          <p className={`ml-4 text-white rounded-lg ${roleColors[user.role]} text-[8px] font-bold tracking-wide py-0.5 px-2`}>
            {user.role.toUpperCase()}
          </p>
        </div>
      ) : (
        <p>Loading...</p>
      )}

      <div className="flex flex-wrap gap-6 mb-8">
        {user && roleDuties[user.role].map((duty) => (
          <a
            key={duty.action}
            onClick={() => changePage(duty.action)}
            className="flex-1 min-w-[180px] bg-gray-50 text-gray-900 rounded-xl p-6 border-1 border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-2">{duty.name}</h3>
            <p className="text-sm opacity-80">{duty.description}</p>
          </a>
        ))}
      </div>
    </>
  );
}

