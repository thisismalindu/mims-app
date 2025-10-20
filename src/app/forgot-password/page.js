"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [step, setStep] = useState(1); // 1 request, 2 confirmation
  const [message, setMessage] = useState(null);
  const [working, setWorking] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");

  const requestOtp = async (e) => {
    e.preventDefault();
    setMessage(null); setWorking(true);
    try {
      const res = await fetch('/api/forgot-password/request-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username })
      });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to request code');
  setMaskedEmail(data?.maskedEmail || "");
  setStep(2);
  const emailQueued = !!data?.emailQueued;
  const target = data?.maskedEmail ? ` to ${data.maskedEmail}` : '';
  const text = emailQueued
    ? `We sent a password reset link${target}. Please check your inbox and follow the link to set a new password.`
    : `We couldn't email a reset link for this account. If you expected an email, make sure your username is correct or contact an administrator.`;
  setMessage({ type: emailQueued ? 'success' : 'error', text });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to request code' });
    } finally { setWorking(false); }
  };

  // No OTP or inline reset: user receives a link via email that lands on /set-password

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
          <p className={`mb-8 text-sm text-center ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{message.text}</p>
        )}

        {step === 1 && (
          <form onSubmit={requestOtp} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm/6 font-medium text-gray-400">Username</label>
              <div className="mt-2">
                <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6" />
              </div>
            </div>
            <button type="submit" disabled={working} className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white ${working ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-400'}`}>{working ? 'Sending…' : 'Reset Password'}</button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Body message now shown above through message banner; we keep a neutral fallback */}
            <p className="text-sm text-gray-500">
              {maskedEmail
                ? `If you received the email, follow the link sent to ${maskedEmail}.`
                : `If you expected an email but didn't receive one, verify your username or contact an administrator.`}
            </p>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-blue-400 hover:text-blue-300 cursor-pointer">Use a different username</button>
              <a className="text-sm font-semibold text-blue-400 hover:text-blue-300" href="/login">Back to login</a>
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-sm/6 text-gray-400">
          Remembered your password? <a href="/login" className="font-semibold text-blue-400 hover:text-blue-300">Back to login</a>
        </p>
      </div>
    </div>
  );
}
