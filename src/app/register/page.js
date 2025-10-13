'use client';
import React, { useEffect, useState } from 'react';
import Register from './components/Register';

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [values, setValues] = useState({
    username: '',
    password: '',
    role: '',
    email: '',
    branchId: '',
    created_by_userid: '',
  });
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // get current user to fill created_by_userid and role
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) {
          setError('Unauthorized. Please log in.');
          return;
        }
        const me = await res.json();
        setValues((v) => ({ ...v, created_by_userid: me.userID }));
        setUserRole(me.role);
        setInfo('');
      } catch (e) {
        setError('Failed to load current user.');
      }
    };
    fetchMe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      username: values.username.trim(),
      password: values.password,
      role: values.role,
      email: values.email.trim(),
      branchid: values.branchId ? Number(values.branchId) : null,
      created_by_userid: values.created_by_userid,
    };

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data.error || 'Registration failed.';
        setError(message);
        return { ok: false, error: message };
      }

      // success
      return { ok: true, data, message: 'User created successfully' };
    } catch (err) {
      const message = 'An error occurred. Please try again.';
      setError(message);
      return { ok: false, error: message };
    }
  };

  // If agent, block access
  if (userRole === 'agent') {
    return (
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-gray-900 text-2xl/9 font-bold tracking-tight">
            Access Denied
          </h2>
          <p className="mt-4 text-center text-red-500">Agents are not allowed to create users.</p>
        </div>
      </div>
    );
  }

  // Determine allowed roles for dropdown
  let allowedRoles = [];
  if (userRole === 'admin') {
    allowedRoles = ['admin', 'manager', 'agent'];
  } else if (userRole === 'manager') {
    allowedRoles = ['manager', 'agent'];
  }

  return (
    <Register
      action={handleSubmit}
      values={values}
      setValues={setValues}
      error={error}
      info={info}
      allowedRoles={allowedRoles}
    />
  );
}
