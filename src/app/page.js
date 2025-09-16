// page.js
"use client";

import React, { useState } from "react";
import { Home, Users, Banknote, Settings, FileText } from "lucide-react";

import Dashboard from "./components/Dashboard";
import Customers from "./components/Customers";
import Accounts from "./components/Accounts";
import Transactions from "./components/Transactions";
import SettingsPage from "./components/SettingsPage";

export default function Page() {
  const [activePage, setActivePage] = useState("Dashboard");

  const menuItems = [
    { name: "Dashboard", icon: <Home size={20} /> },
    { name: "Customers", icon: <Users size={20} /> },
    { name: "Accounts", icon: <Banknote size={20} /> },
    { name: "Transactions", icon: <FileText size={20} /> },
    { name: "Settings", icon: <Settings size={20} /> },
  ];

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard />;
      case "Customers":
        return <Customers />;
      case "Accounts":
        return <Accounts />;
      case "Transactions":
        return <Transactions />;
      case "Settings":
        return <SettingsPage />;
      default:
        return (
          <div className="bg-white rounded-lg p-6 shadow text-gray-700">
            Page Not Found
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col p-6">
        <div className="text-2xl font-bold mb-10 text-center text-blue-400">
          MIMS
        </div>
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActivePage(item.name)}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium
                ${
                  activePage === item.name
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
            >
              <span>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">{activePage}</h1>
        {renderPage()}
      </main>
    </div>
  );
}
