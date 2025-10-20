"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1); // 1 request, 2 verify, 3 reset
  const [message, setMessage] = useState(null);
  const [working, setWorking] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setMessage(null); setWorking(true);
    try {
      const res = await fetch('/api/forgot-password/request-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to request code');
      setStep(2);
      setMessage({ type: 'success', text: 'If the username exists, an OTP has been issued.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to request code' });
    } finally { setWorking(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setMessage(null); setWorking(true);
    try {
      const res = await fetch('/api/forgot-password/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, otp })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false || !data?.resetToken) throw new Error(data?.error || 'Invalid code');
      setResetToken(data.resetToken);
      setStep(3);
      setMessage({ type: 'success', text: 'OTP verified. You may now set a new password.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Verification failed' });
    } finally { setWorking(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setMessage(null); setWorking(true);
    try {
      const res = await fetch('/api/forgot-password/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resetToken, newPassword, confirmPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to reset password');
      setMessage({ type: 'success', text: 'Password reset successfully. Redirecting…' });
      // Redirect to home after successful reset
    setTimeout(() => router.push('/'), 1000);
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to reset password' });
    } finally { setWorking(false); }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <a href="/" className="cursor-pointer">
          <img alt="Your Company" src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=blue&shade=500" className="mx-auto h-10 w-auto" />
        </a>
        <h2 className="mt-10 text-center text-gray-900 text-2xl/9 font-bold tracking-tight">Forgot your password?</h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {message && (
          <p className={`text-sm text-center ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{message.text}</p>
        )}

        {step === 1 && (
          <form onSubmit={requestOtp} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm/6 font-medium text-gray-400">Username</label>
              <div className="mt-2">
                <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6" />
              </div>
            </div>
            <button type="submit" disabled={working} className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white ${working ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-400'}`}>{working ? 'Sending…' : 'Send OTP'}</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOtp} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm/6 font-medium text-gray-400">Enter OTP</label>
              <div className="mt-2">
                <input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold  text-blue-400 hover:text-blue-300 cursor-pointer">Change username</button>
              <button type="submit" disabled={working} className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${working ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-400'}`}>{working ? 'Verifying…' : 'Verify'}</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword} className="space-y-6">
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
            <button type="submit" disabled={working} className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white ${working ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-400'}`}>{working ? 'Resetting…' : 'Reset Password'}</button>
          </form>
        )}

        <p className="mt-10 text-center text-sm/6 text-gray-400">
          Remembered your password? <a href="/login" className="font-semibold text-blue-400 hover:text-blue-300">Back to login</a>
        </p>
      </div>
    </div>
  );
}
