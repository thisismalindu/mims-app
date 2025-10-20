"use client";
import React, { useState } from "react";

export default function ChangePassword({ onBack }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error'|'success', text: string }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'Failed to change password');
      }
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-8">
      <a onClick={onBack} className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600">⬅ back</a>

      <div className="bg-white rounded-xl p-6 shadow text-gray-800 mt-6 max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Change Password</h2>
        </div>
        {message && (
          <div className={`mb-4 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border" />
            <p className="text-xs text-gray-500 mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border" />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="submit" disabled={submitting} className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${submitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-500'}`}>
              {submitting ? 'Updating…' : 'Update Password'}
            </button>
            <a href="/forgot-password" className="text-sm font-semibold text-blue-500 hover:text-blue-400 ml-2">Forgot password?</a>
          </div>
        </form>
      </div>
    </div>
  );
}
