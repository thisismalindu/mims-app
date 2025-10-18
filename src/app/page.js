// page.js
"use client";

import React, { useState, useEffect } from "react";
import {UserIcon, HomeIcon, UsersIcon, BanknotesIcon, Cog6ToothIcon, DocumentTextIcon, ArrowRightStartOnRectangleIcon, ChartBarIcon } from '@heroicons/react/24/outline'

import Dashboard from "./components/Dashboard";
import Customers from "./components/Customers";
import Accounts from "./components/Accounts";
import Transactions from "./components/Transactions";
import SettingsPage from "./components/SettingsPage";
import CreateCustomer from "./components/CreateCustomer";
import InitiateTransaction from "./components/InitiateTransaction";
import Users from "./components/Users";
import CreateSavingAccount from "./components/CreateSavingAccount";
import CreateFixedDeposit from "./components/CreateFixedDeposit";
import CreateAccountPlan from "./components/CreateAccountPlan";

import CreateFixedDepositPlan from "./components/CreateFixedDepositPlan";
import RequestReport from "./components/RequestReport";
import Profile from "./components/Profile";
import CreateBranch from "./components/CreateBranch";
import Agents from "./components/Agents";
import CustomerDetails from "./components/CustomerDetails";
import AccountDetails from "./components/AccountDetails";

export default function Page() {

  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  useEffect(() => {
    const syncPageWithUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get("page") || "Dashboard";
      setActivePage(page);
    };

    // Run on mount
    syncPageWithUrl();

    // Listen for browser navigation
    window.addEventListener("popstate", syncPageWithUrl);

    return () => {
      window.removeEventListener("popstate", syncPageWithUrl);
    };
  }, []);

  // Fetch current user to compute role-based menu
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (_) {
        // ignore; middleware handles auth
      }
    }
    fetchUser();
  }, []);

  const changePage = (page) => {
    setActivePage(page)
    const params = new URLSearchParams(window.location.search)
    params.set("page", page)
    window.history.pushState({}, "", "?" + params.toString())
  }

  // Build menu dynamically based on user role
  const menuItems = (() => {
    // Default minimal menu before user loads
    if (!user) {
      return [
        { name: "Dashboard", icon: <HomeIcon /> },
        { name: "Settings", icon: <Cog6ToothIcon /> },
        { name: "Profile", icon: <UserIcon /> },
      ];
    }

    const commonStart = [ { name: "Dashboard", icon: <HomeIcon /> } ];
    const commonEnd = [
      { name: "Settings", icon: <Cog6ToothIcon /> },
      { name: "Profile", icon: <UserIcon /> },
    ];

    if (user.role === 'admin') {
      // Admin: Dashboard, Users, Agents, Settings, Profile
      // Admin: Dashboard, Customers, Users, Branches, Settings, Profile
      return [
        ...commonStart,
        { name: "Customers", icon: <UsersIcon /> },
        { name: "Users", icon: <UsersIcon /> },
        { name: "Agents", icon: <UserIcon /> },
        { name: "Branches", icon: <BanknotesIcon /> },
        ...commonEnd,
      ];
    }
    if (user.role === 'manager') { 
      return [
        ...commonStart,
        { name: "Customers", icon: <UsersIcon /> },
        { name: "Agents", icon: <UserIcon /> },
        { name: "Accounts", icon: <BanknotesIcon /> },
        ...commonEnd,
      ];
    }

    if (user.role === 'agent') {
      return [
        ...commonStart,
        { name: "Customers", icon: <UsersIcon /> },
        { name: "Accounts", icon: <BanknotesIcon /> },
        { name: "Transactions", icon: <DocumentTextIcon /> },
        ...commonEnd,
      ];
    }
    
    // Fallback
    return [
      ...commonStart,
      ...commonEnd,
    ];
  })();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Logout failed server side", await response.text());
      }
    } catch (err) {
      console.error("Logout request error", err);
    }

    // Hard redirect to login to clear client state and ensure middleware runs
    window.location.replace("/login");
  };

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard changePage={changePage} />;
      case "Customers":
        return <Customers changePage={changePage}/>;
      case "Agents":
        return <Agents changePage={changePage} />;
        return <Customers changePage={changePage} onSelectCustomer={(customerId) => {
          setSelectedCustomerId(customerId);
          changePage("CustomerDetails");
        }} />;
      case "CustomerDetails":
        return <CustomerDetails 
          customerId={selectedCustomerId} 
          changePage={changePage}
          onSelectAccount={(accountType, accountId) => {
            setSelectedAccount({ accountType, accountId });
            changePage("AccountDetails");
          }}
          onBack={() => changePage("Customers")}
        />;
      case "AccountDetails":
        return <AccountDetails 
          accountType={selectedAccount?.accountType}
          accountId={selectedAccount?.accountId}
          changePage={changePage}
          onBack={() => changePage("CustomerDetails")}
        />;
      case "Accounts":
        return <Accounts />;
      case "Transactions":
        return <Transactions />;
      case "Settings":
        return <SettingsPage />;
      case "CreateCustomer":
        return <CreateCustomer changePage={changePage} />;
      case "InitiateTransaction":
        return <InitiateTransaction changePage={changePage} />;
      case "CreateSavingAccount":
        return <CreateSavingAccount changePage={changePage} />;
      case "RequestReport":
        return <RequestReport changePage={changePage} />;
      case "Users":
        return <Users changePage={changePage} />;
      case "CreateFixedDeposit":
        return <CreateFixedDeposit changePage={changePage} />;
      case "Profile":
        return <Profile />;
      case "CreateBranch":
        return <CreateBranch changePage={changePage} />;
      case "CreateUser":
        window.location.replace("/register");
        return null;
      case "CreateAccountPlan":
        return <CreateAccountPlan changePage={changePage} />;
      case "CreateFixedDepositPlan":
        return <CreateFixedDepositPlan changePage={changePage} />;
      default:
        return (
          <div className="bg-white rounded-lg p-6 shadow text-gray-700">
            Page Not Found
          </div>
        );
    }
  };

  // Main content
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col py-6">
        <a href="/" className=" text-gray-500 text-sm/6 pb-5 border-b border-gray-800 px-6 cursor-pointer">
          <h2 className="text-gray-200 text-2xl font-bold mb-2">B-Trust</h2>
          <p>
            Microbanking and Interest Management System
          </p>
        </a>
        <nav className="flex flex-col flex-grow">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => changePage(item.name)}
              className={`flex items-center gap-3 px-4 py-4 transition-colors text-sm font-medium border-b border-gray-800
                ${activePage === item.name
                  ? "bg-blue-500 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
            >
              <span className="size-4 text-gray-300">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-4 transition-colors text-sm font-medium text-gray-300 hover:bg-red-600 hover:text-white border-y border-gray-800"
        >
          <ArrowRightStartOnRectangleIcon className="size-4 text-gray-300" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}
