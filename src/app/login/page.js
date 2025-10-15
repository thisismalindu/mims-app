'use client';
import React, { useMemo, useState } from 'react';
import Login from './components/Login';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // read query params
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const next = searchParams?.get('next') || '/';
    const info = searchParams?.get('info') === '1';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter both username and password.');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),

            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || 'Login failed.');
                return;
            }

            // alert('Login successful!');
            // Redirect or handle successful login
            window.location.href = next || '/';

        } catch (err) {
            setError('An error occurred. Please try again.');
        }
    };

    return (
        <Login
            action={handleSubmit}
            username={username}
            password={password}
            setUsername={setUsername}
            setPassword={setPassword}
            error={error}
            info={info}
        />
    );
}
