"use client";
import React, { useState } from "react";

export default function Login({ action, username, password, setUsername, setPassword, error, info }) {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await action(e); // call the parent action (login)
        } finally {
            setLoading(false); // re-enable button after response
        }
    };

    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <a href="/" className="cursor-pointer"><img
                    alt="Your Company"
                    src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=blue&shade=500"
                    className="mx-auto h-10 w-auto"
                /></a>
                <h2 className="mt-10 text-center text-gray-900 text-2xl/9 font-bold tracking-tight">
                    Sign in to your account
                </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {info && (
                        <p className="text-blue-500 text-sm text-center">
                            Only existing users can create new accounts. Please log in first, and you'll be redirected to the registration page.
                        </p>
                    )}
                    {error && (
                        <p className="text-red-500 text-sm text-center">{error}</p>
                    )}

                    <div>
                        <label htmlFor="username" className="block text-sm/6 font-medium text-gray-400">
                            Username
                        </label>
                        <div className="mt-2">
                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                id="username"
                                name="username"
                                type="text"
                                required
                                autoComplete="username"
                                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="password" className="block text-sm/6 font-medium text-gray-400">
                                Password
                            </label>
                            <div className="text-sm">
                                <a tabIndex={3} href="/forgot-password" className="font-semibold text-blue-400 hover:text-blue-300">
                                    Forgot password?
                                </a>
                            </div>
                        </div>
                        <div className="mt-2 relative">
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                autoComplete="current-password"
                                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 text-xs text-blue-400 hover:text-blue-300 focus:outline-none cursor-pointer"
                                tabIndex={-1}
                                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}
                            >
                                {password ? (showPassword ? "Hide" : "Show") : ""}
                            </button>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-400"
                                }`}
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </div>
                </form>

                <p className="mt-10 text-center text-sm/6 text-gray-400">
                    New User?{" "}
                    <a tabIndex={4} href="/login?next=/register&info=1" className="font-semibold text-blue-400 hover:text-blue-300">
                        Register now
                    </a>
                </p>
            </div>
        </div>
    );
}
