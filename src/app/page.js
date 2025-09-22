// page.js
"use client";

import React, { useState, useEffect } from "react";
import { Home, Users, Banknote, Settings, FileText, LogOut } from "lucide-react";

import Dashboard from "./components/Dashboard";
import Customers from "./components/Customers";
import Accounts from "./components/Accounts";
import Transactions from "./components/Transactions";
import SettingsPage from "./components/SettingsPage";
import CreateCustomer from "./components/CreateCustomer";

export default function Page() {
  
  const [activePage, setActivePage] = useState("Dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const page = params.get("page")
    if (page) setActivePage(page)
  }, [])

  const changePage = (page) => {
    setActivePage(page)
    const params = new URLSearchParams(window.location.search)
    params.set("page", page)
    window.history.pushState({}, "", "?" + params.toString())
  }

  const menuItems = [
    { name: "Dashboard", icon: <Home size={20} /> },
    { name: "Customers", icon: <Users size={20} /> },
    { name: "Accounts", icon: <Banknote size={20} /> },
    { name: "Transactions", icon: <FileText size={20} /> },
    { name: "Settings", icon: <Settings size={20} /> },
  ];

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
        return <Customers />;
      case "Accounts":
        return <Accounts />;
      case "Transactions":
        return <Transactions />;
      case "Settings":
        return <SettingsPage />;
      case "CreateCustomer":
        return <CreateCustomer changePage={changePage} />;
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
      <aside className="w-60 bg-gray-900 text-white flex flex-col p-6">
        <div className="text-2xl font-bold mb-10 text-center text-blue-400">
          MIMS
        </div>
        <nav className="flex flex-col gap-2 flex-grow">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => changePage(item.name)}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium
                ${activePage === item.name
                  ? "bg-blue-500 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
            >
              <span>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium text-gray-300 hover:bg-red-600 hover:text-white mt-4"
        >
          <LogOut size={20} />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* <h1 className="text-3xl font-bold mb-8 text-gray-800">{activePage}</h1> */}
        {renderPage()}
      </main>
    </div>
  );
}
