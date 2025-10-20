"use client";

import React, { useEffect, useState } from "react";

export default function SettingsPage({ changePage }) {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    defaultLanding: "Dashboard",
    compactTables: false,
    showAdvanced: false,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (_) {}
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    // Stub persistence; could POST to /api/save-preferences in the future
    setSaving(true);
    setTimeout(() => setSaving(false), 600);
  };

  return (
    <div className="px-6 py-8">
      <h2 className="text-xl font-semibold text-gray-900">Settings</h2>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Profile / Role */}
        <div className="bg-white rounded-xl p-6 shadow">
          <h3 className="text-base font-semibold mb-3">Profile</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p><span className="font-medium">Username:</span> {user?.username ?? "-"}</p>
            <p><span className="font-medium">Role:</span> <span className="capitalize">{user?.role ?? "-"}</span></p>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl p-6 shadow">
          <h3 className="text-base font-semibold mb-3">Security</h3>
          <p className="text-sm text-gray-600 mb-4">Manage your account security settings.</p>
          <button
            onClick={() => changePage && changePage("ChangePassword")}
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500"
          >
            Change Password
          </button>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-xl p-6 shadow md:col-span-2">
          <h3 className="text-base font-semibold mb-3">Preferences</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Landing Page</label>
              <select
                value={prefs.defaultLanding}
                onChange={(e) => setPrefs((p) => ({ ...p, defaultLanding: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              >
                <option>Dashboard</option>
                <option>Customers</option>
                <option>Agents</option>
                <option>Users</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Choose where you land after login.</p>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <input
                id="compactTables"
                type="checkbox"
                checked={prefs.compactTables}
                onChange={(e) => setPrefs((p) => ({ ...p, compactTables: e.target.checked }))}
                className="h-4 w-4 border-gray-300 rounded"
              />
              <label htmlFor="compactTables" className="text-sm text-gray-700">Use compact table rows</label>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <input
                id="showAdvanced"
                type="checkbox"
                checked={prefs.showAdvanced}
                onChange={(e) => setPrefs((p) => ({ ...p, showAdvanced: e.target.checked }))}
                className="h-4 w-4 border-gray-300 rounded"
              />
              <label htmlFor="showAdvanced" className="text-sm text-gray-700">Show advanced controls</label>
            </div>
          </div>

          <div className="flex items-center justify-end mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-500'}`}
            >
              {saving ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
