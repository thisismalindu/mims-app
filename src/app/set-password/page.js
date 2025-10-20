"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token') || '';
    setToken(t);
  }, [searchParams]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setMessage({ type: 'error', text: 'Missing or invalid link.' });
      return;
    }
    setWorking(true);
    setMessage(null);
    try {
      const res = await fetch('/api/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: token, newPassword, confirmPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to set password');
      setMessage({ type: 'success', text: 'Password set successfully. Redirecting…' });
      setTimeout(() => router.push('/login'), 1000);
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to set password' });
    } finally { setWorking(false); }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <a href="/" className="cursor-pointer">
          <img alt="Your Company" src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=blue&shade=500" className="mx-auto h-10 w-auto" />
        </a>
        <h2 className="mt-10 text-center text-gray-900 text-2xl/9 font-bold tracking-tight">Set your password</h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {message && (
          <p className={`text-sm text-center ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{message.text}</p>
        )}
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm/6 font-medium text-gray-400">New Password</label>
            <div className="mt-2">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6" />
            </div>
          </div>
          <div>
            <label className="block text-sm/6 font-medium text-gray-400">Confirm Password</label>
            <div className="mt-2">
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6" />
            </div>
          </div>
          <button type="submit" disabled={working} className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white ${working ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-400'}`}>{working ? 'Saving…' : 'Set Password'}</button>
        </form>
      </div>
    </div>
  );
}
