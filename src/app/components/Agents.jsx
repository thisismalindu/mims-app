"use client";
import React, { useEffect, useState } from "react";

export default function Agents({ changePage }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Fetch current user role
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data?.role || null);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    }
    fetchUser();
  }, []);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/get-agents");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch agents");
        }
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error("Error fetching agents:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Check access control
  if (userRole && !["admin", "manager"].includes(userRole)) {
    return (
      <div className="px-6 py-12 lg:px-8">
        <a
          onClick={() => changePage("Dashboard")}
          className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
        >
          ⬅ back
        </a>
        <h2 className="mt-10 text-red-600 text-xl font-semibold">
          Access Denied
        </h2>
        <p className="text-gray-500 mt-4">
          Only managers and admins can view agents.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-gray-600 italic">Loading agents...</div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-12 lg:px-8">
        <a
          onClick={() => changePage("Dashboard")}
          className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
        >
          ⬅ back
        </a>
        <div className="mt-6 text-red-600">Error: {error}</div>
      </div>
    );
  }

  // If an agent is selected, show their details
  if (selectedAgent) {
    return (
      <div className="px-6 py-8">
        <a
          onClick={() => setSelectedAgent(null)}
          className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
        >
          ⬅ back to agents list
        </a>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
          Agent Details
        </h2>

        <div className="mt-6 bg-white rounded-lg shadow-md p-6 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">User ID</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{selectedAgent.user_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {selectedAgent.first_name} {selectedAgent.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Username</p>
              <p className="mt-1 text-lg text-gray-900">{selectedAgent.username}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <p className="mt-1 text-lg font-semibold text-blue-600">
                {selectedAgent.role?.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="mt-1 text-lg text-gray-900">{selectedAgent.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className={`mt-1 text-lg font-semibold ${selectedAgent.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                {selectedAgent.status?.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Branch ID</p>
              <p className="mt-1 text-lg text-gray-900">{selectedAgent.branch_id || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Customers Created</p>
              <p className="mt-1 text-lg font-semibold text-blue-600">{selectedAgent.customer_count}</p>
            </div>
            {/* Only show Created By for admin users */}
            {userRole === 'admin' && selectedAgent.created_by_user_id && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created By ID</p>
                  <p className="mt-1 text-lg text-gray-900">{selectedAgent.created_by_user_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created By Name</p>
                  <p className="mt-1 text-lg text-gray-900">
                    {selectedAgent.creator_first_name && selectedAgent.creator_last_name
                      ? `${selectedAgent.creator_first_name} ${selectedAgent.creator_last_name}`
                      : "N/A"}
                  </p>
                </div>
              </>
            )}
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500">Created At</p>
              <p className="mt-1 text-lg text-gray-900">
                {new Date(selectedAgent.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="px-6 py-8">
      <a
        onClick={() => changePage("Dashboard")}
        className="rounded-md font-medium tracking-tight text-blue-500 cursor-pointer hover:text-blue-600"
      >
        ⬅ back
      </a>

      <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
        {userRole === 'admin' ? 'All Agents' : 'Your Agents'}
      </h2>

      {agents.length > 0 ? (
        <div className="flex flex-col gap-3 mt-6">
          {agents.map((agent) => (
            <button
              key={agent.user_id}
              onClick={() => setSelectedAgent(agent)}
              className="px-4 py-3 bg-blue-500 text-white rounded-md font-semibold text-left hover:bg-blue-400 transition flex justify-between items-center"
            >
              <div className="flex flex-col">
                <span>{agent.first_name} {agent.last_name}</span>
                <span className="text-xs opacity-80">
                  User ID: {agent.user_id} • Customers: {agent.customer_count}
                </span>
              </div>
              <span className="text-sm italic opacity-80">View ➜</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic mt-4">
          {userRole === 'admin' 
            ? 'No agents found in the system.' 
            : "You haven't created any agents yet."}
        </p>
      )}
    </div>
  );
}
