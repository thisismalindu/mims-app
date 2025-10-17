"use client";

import React, { useEffect, useState } from "react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          throw new Error("Failed to fetch user data");
        }
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError("Could not load profile information.");
      }
    }

    fetchUser();
  }, []);

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-red-500">
        {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold">Loading profile...</h2>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow text-gray-800">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      <div className="space-y-4 text-gray-700">
        <p>
          <strong>Name:</strong> {user.name || "N/A"}
        </p>
        <p>
          <strong>Email:</strong> {user.email || "N/A"}
        </p>
        <p>
          <strong>Role:</strong> {user.role || "N/A"}
        </p>
        <p>
          <strong>Branch:</strong> {user.branch || "N/A"}
        </p>
      </div>
    </div>
  );
}