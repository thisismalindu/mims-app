"use client";
import React, { useEffect, useState } from "react";

export default function Users() {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			setLoading(true);
			try {
				const res = await fetch('/api/users');
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					setError(data.error || 'Failed to load users');
					setUsers([]);
					return;
				}
				if (mounted) setUsers(data.users || []);
			} catch (_) {
				setError('Network error');
			} finally {
				if (mounted) setLoading(false);
			}
		};
		load();
		return () => { mounted = false; };
	}, []);

	const onRowClick = (u) => {
		// Placeholder for future user page
		// e.g., window.location.href = `/users/${u.user_id}`
	};

	return (
		<div className="bg-white rounded-xl p-6 shadow text-gray-800">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">Users</h2>
				<a href="/register" className="rounded-md bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 text-sm font-semibold">Create User</a>
			</div>

			{error && (
				<div className="mb-4 text-sm text-red-600">{error}</div>
			)}

			{loading ? (
				<p className="text-sm text-gray-500">Loading...</p>
			) : users.length === 0 ? (
				<p className="text-sm text-gray-500">No users found.</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full border-collapse">
						<thead>
							<tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
								<th className="p-3">ID</th>
								<th className="p-3">Name</th>
								<th className="p-3">Username</th>
								<th className="p-3">Role</th>
								<th className="p-3">Email</th>
								<th className="p-3">Status</th>
								<th className="p-3">Branch</th>
								<th className="p-3">Created</th>
							</tr>
						</thead>
						<tbody>
							{users.map((u) => (
								<tr key={u.user_id} onClick={() => onRowClick(u)} className="hover:bg-gray-50 text-sm border-b border-b-gray-200 last:border-0 cursor-pointer">
									<td className="p-3">{u.user_id}</td>
									<td className="p-3 font-medium">{u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : '-'}</td>
									<td className="p-3">{u.username}</td>
									<td className="p-3">
										<span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${u.role === 'admin' ? 'bg-red-400' : u.role === 'manager' ? 'bg-green-500' : 'bg-blue-400'}`}>
											{String(u.role).toUpperCase()}
										</span>
									</td>
									<td className="p-3">{u.email || '-'}</td>
									<td className="p-3 capitalize">{u.status}</td>
									<td className="p-3">{u.branch_id ?? '-'}</td>
									<td className="p-3">{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

