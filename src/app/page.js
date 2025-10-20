// page.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import {UserIcon, HomeIcon, UsersIcon, BanknotesIcon, Cog6ToothIcon, DocumentTextIcon, ArrowRightStartOnRectangleIcon, ChartBarIcon } from '@heroicons/react/24/outline'

import Dashboard from "./components/Dashboard";
import Customers from "./components/Customers";
import Transactions from "./components/Transactions";
import SettingsPage from "./components/SettingsPage";
import ChangePassword from "./components/ChangePassword";
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
import Branches from "./components/Branches";
import CustomerDetails from "./components/CustomerDetails";
import AccountDetails from "./components/AccountDetails";
import Accounts from "./components/Accounts";
import ProcessFDInterest from "./components/ProcessFDInterest";
import Reports from "./components/Reports";

export default function Page() {

  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const refreshTimerRef = useRef(null);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  
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

  // Session watchdog: poll once and schedule timers based on token exp
  useEffect(() => {
    let pollAbort = false;

    const fetchSession = async () => {
      try {
        const res = await fetch('/api/session', { cache: 'no-store' });
        if (!res.ok) throw new Error('unauthorized');
        const data = await res.json();
        if (pollAbort) return;
        setSessionInfo(data);

        const secs = Number(data.secondsRemaining || 0);
        // Prompt at 5 minutes remaining if still within session
        const promptMs = Math.max((secs - 5 * 60), 0) * 1000;
        const logoutMs = Math.max(secs, 0) * 1000;

        // Clear previous
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

        // Schedule prompt
        refreshTimerRef.current = setTimeout(() => {
          setShowRefreshPrompt(true);
        }, promptMs);

        // Schedule hard logout on expiry as a backup in case user ignores prompt
        const logoutTimer = setTimeout(() => {
          window.location.replace('/login');
        }, logoutMs + 1000); // 1s grace

        return () => clearTimeout(logoutTimer);
      } catch (_) {
        // If token already invalid, force logout immediately
        window.location.replace('/login');
      }
    };

    fetchSession();
    return () => { pollAbort = true; };
  }, []);

  const handleTokenRefresh = async () => {
    try {
      const res = await fetch('/api/refresh-token', { method: 'POST' });
      if (!res.ok) throw new Error('refresh failed');
      setShowRefreshPrompt(false);
      // Re-poll session to reschedule timers
      const s = await fetch('/api/session', { cache: 'no-store' });
      const data = await s.json();
      setSessionInfo(data);
    } catch (_) {
      window.location.replace('/login');
    }
  };

  const changePage = (page, extraParams = {}) => {
    setActivePage(page);
    // Build a fresh query to avoid leaking prior page params
    const params = new URLSearchParams();
    params.set("page", page);
    for (const [k, v] of Object.entries(extraParams || {})) {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    }
    window.history.pushState({}, "", "?" + params.toString());
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
      // Admin: Dashboard, Users, Agents, Customers, Branches, Settings, Profile
      return [
        ...commonStart,
        { name: "Users", icon: <UsersIcon /> },
        { name: "Agents", icon: <UserIcon /> },
        { name: "Accounts", icon: <BanknotesIcon /> },
        { name: "Customers", icon: <UsersIcon /> },
        { name: "Branches", icon: <BanknotesIcon /> },
        { name: "Reports", icon: <ChartBarIcon /> },
        ...commonEnd,
      ];
    }
    if (user.role === 'manager') { 
      return [
        ...commonStart,
        { name: "Customers", icon: <UsersIcon /> },
        { name: "Accounts", icon: <BanknotesIcon /> },
        { name: "Reports", icon: <ChartBarIcon /> },
        { name: "Agents", icon: <UserIcon /> },
        ...commonEnd,
      ];
    }

    if (user.role === 'agent') {
      return [
        ...commonStart,
        { name: "Customers", icon: <UsersIcon /> },
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

  // Lightweight routes registry to reduce switch-case redundancy
  const routes = {
    Dashboard: () => <Dashboard changePage={changePage} />,
    Customers: () => (
      <Customers
        changePage={changePage}
        onSelectCustomer={(customerId) => {
          setSelectedCustomerId(customerId);
          changePage("CustomerDetails", { customerId });
        }}
      />
    ),
    Agents: () => <Agents changePage={changePage} />,
    CustomerDetails: () => (
      <CustomerDetails
        customerId={selectedCustomerId}
        changePage={changePage}
        onSelectAccount={(accountType, accountId) => {
          setSelectedAccount({ accountType, accountId });
          // Preserve current customerId via URL
          const params = new URLSearchParams(window.location.search);
          const customerId = params.get('customerId') || selectedCustomerId;
          changePage("AccountDetails", { accountType, accountId, customerId });
        }}
        onBack={() => changePage("Customers")}
      />
    ),
    AccountDetails: () => (
      <AccountDetails
        accountType={selectedAccount?.accountType}
        accountId={selectedAccount?.accountId}
        changePage={changePage}
        onBack={() => changePage("Accounts")}
      />
    ),
    Accounts: () => {
      const params = new URLSearchParams(window.location.search);
      const cid = Number(params.get('customerId')) || selectedCustomerId || null;
      return (
        <Accounts
          changePage={changePage}
          customerId={cid}
          onSelectSavingsAccount={(accountId) => changePage('AccountDetails', { accountType: 'savings', accountId, customerId: cid })}
          onSelectFixedDeposit={(accountId) => changePage('AccountDetails', { accountType: 'fd', accountId, customerId: cid })}
        />
      );
    },
    Transactions: () => <Transactions />,
    Settings: () => <SettingsPage changePage={changePage} />,
    ChangePassword: () => <ChangePassword onBack={() => changePage('Settings')} />,
    CreateCustomer: () => <CreateCustomer changePage={changePage} />,
    InitiateTransaction: () => <InitiateTransaction changePage={changePage} />,
    CreateSavingAccount: () => <CreateSavingAccount changePage={changePage} />,
    RequestReport: () => <RequestReport changePage={changePage} />,
    Users: () => <Users changePage={changePage} />,
    CreateFixedDeposit: () => <CreateFixedDeposit changePage={changePage} />,
    Profile: () => <Profile />,
    CreateBranch: () => <CreateBranch changePage={changePage} />,
    CreateAgent: () => { window.location.replace('/register'); return null; },
    CreateUser: () => { window.location.replace('/register'); return null; },
    CreateAccountPlan: () => <CreateAccountPlan changePage={changePage} />,
    CreateFixedDepositPlan: () => <CreateFixedDepositPlan changePage={changePage} />,
    ProcessFDInterest: () => <ProcessFDInterest changePage={changePage} />,
    Reports: () => <Reports changePage={changePage} />,
  };

  const renderPage = () => {
    const render = routes[activePage];
    if (render) return render();
    return (
      <div className="bg-white rounded-lg p-6 shadow text-gray-700">
        Page Not Found
      </div>
    );
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
        {/* Session refresh prompt */}
        {showRefreshPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-sm">
              <h3 className="text-base font-semibold mb-2">Session expiring soon</h3>
              <p className="text-sm text-gray-600 mb-4">Your session will expire shortly. Refresh your session to stay signed in.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowRefreshPrompt(false); window.location.replace('/login'); }} className="px-3 py-1.5 rounded border text-sm">Logout</button>
                <button onClick={handleTokenRefresh} className="px-3 py-1.5 rounded text-sm text-white bg-blue-600 hover:bg-blue-500">Refresh Session</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
