"use client";
import React, { useEffect, useMemo, useState } from "react";

export default function Users() {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [branches, setBranches] = useState([]);
	const [edits, setEdits] = useState({}); // { [user_id]: { field: value } }
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState("");
	const [toasts, setToasts] = useState([]); // { id, type: 'success'|'error'|'warning', message }
	const [pwModal, setPwModal] = useState({ open: false, action: null, payload: null, password: '', working: false });

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

		// Load branches for dropdown
		const loadBranches = async () => {
			try {
				const res = await fetch('/api/get-branches');
				const data = await res.json().catch(() => ({}));
				if (res.ok && data?.branches) setBranches(data.branches);
			} catch {}
		};
		loadBranches();
		return () => { mounted = false; };
	}, []);

	const hasChanges = useMemo(() => Object.keys(edits).length > 0, [edits]);

	const ROLES = ["admin", "manager", "agent"];
	const STATUSES = ["active", "inactive"];

	const onRowClick = (u) => {
		// Placeholder for future user page
		// e.g., window.location.href = `/users/${u.user_id}`
	};

	const patchEdit = (user_id, field, value) => {
		setEdits((prev) => {
			const next = { ...prev };
			next[user_id] = { ...(next[user_id] || {}), [field]: value };
			// If the value equals the original, remove it from the patch for cleanliness
			const original = users.find((x) => x.user_id === user_id) || {};
			if ((value ?? null) === (original[field] ?? null)) {
				delete next[user_id][field];
				if (Object.keys(next[user_id]).length === 0) delete next[user_id];
			}
			return next;
		});
	};

	const getPatchedValue = (u, field) => (edits[u.user_id]?.hasOwnProperty(field) ? edits[u.user_id][field] : u[field]);

	// Toast helper
	const addToast = (type, message) => {
		const id = Math.random().toString(36).slice(2);
		setToasts((prev) => [...prev, { id, type, message }]);
		setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
	};

	// Password confirmation helpers
	const confirmWithPassword = (action, payload) => {
		setPwModal({ open: true, action, payload, password: '', working: false });
	};

	const handlePasswordConfirm = async () => {
		if (!pwModal.open || !pwModal.password || pwModal.working) return;
		setPwModal((s) => ({ ...s, working: true }));
		try {
			const res = await fetch('/api/verify-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: pwModal.password }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || data?.success === false) {
				throw new Error(data?.error || 'Password verification failed');
			}
			const { action, payload } = pwModal;
			setPwModal({ open: false, action: null, payload: null, password: '', working: false });
			if (action === 'save') {
				await saveChanges();
			} else if (action === 'delete' && payload?.user) {
				await doDeleteUser(payload.user);
			}
		} catch (err) {
			addToast('error', err.message || 'Password verification failed');
			setPwModal((s) => ({ ...s, working: false, password: '' }));
		}
	};

	const saveChanges = async () => {
		if (!hasChanges || saving) return;
		setSaving(true);
		setSaveMsg("");
		setError("");
		try {
			const updates = Object.entries(edits).map(([user_id, patch]) => ({
				user_id: Number(user_id),
				...patch,
			}));
			const res = await fetch('/api/update-users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ updates }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || data?.success === false) {
				throw new Error(data?.error || 'Failed to save changes');
			}
			// Merge server-updated users into local state where possible
			if (Array.isArray(data.updated)) {
				setUsers((prev) => {
					const byId = new Map(prev.map((x) => [x.user_id, x]));
					for (const upd of data.updated) {
						const curr = byId.get(upd.user_id) || {};
						byId.set(upd.user_id, { ...curr, ...upd });
					}
					return Array.from(byId.values());
				});
			}
			setEdits({});
			addToast('success', 'Changes saved');
		} catch (e) {
			setError(e.message || 'Failed to save changes');
			addToast('error', e.message || 'Failed to save changes');
		} finally {
			setSaving(false);
		}
	};

	const doDeleteUser = async (user) => {
		try {
			const res = await fetch('/api/delete-user', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ user_id: user.user_id }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || data?.success === false) {
				throw new Error(data?.error || 'Failed to delete user');
			}
			setUsers(prev => prev.filter(x => x.user_id !== user.user_id));
			setEdits(prev => {
				const n = { ...prev };
				delete n[user.user_id];
				return n;
			});
			addToast('success', `User ${user.username} deleted`);
		} catch (err) {
			setError(err.message || 'Delete failed');
			addToast('error', err.message || 'Delete failed');
		}
	};

	return (
		<>
		<div className="bg-white rounded-xl p-6 shadow text-gray-800">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">Users</h2>
				<div className="flex items-center gap-2">
					{hasChanges && (
						<button
							onClick={() => confirmWithPassword('save', null)}
							disabled={saving}
							className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-500'}`}
						>
							{saving ? 'Saving…' : 'Save Changes'}
						</button>
					)}
					<a href="/register" className="rounded-md bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 text-sm font-semibold">Create User</a>
				</div>
			</div>

			{/* Inline messages removed to avoid layout shift; using floating toasts instead */}

			{loading ? (
				<div className="overflow-x-auto">
					<div className="w-full border border-gray-200 rounded-lg">
						<div className="bg-gray-50 p-3">
							<div className="grid grid-cols-8 gap-3">
								{Array.from({ length: 8 }).map((_, i) => (
									<div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
								))}
							</div>
						</div>
						<div className="divide-y divide-gray-200">
							{Array.from({ length: 6 }).map((_, r) => (
								<div key={r} className="grid grid-cols-8 gap-3 p-3">
									{Array.from({ length: 8 }).map((_, c) => (
										<div key={c} className="h-4 bg-gray-200 rounded animate-pulse" />
									))}
								</div>
							))}
						</div>
					</div>
				</div>
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
								<th className="p-3 text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{users.map((u) => (
								<tr key={u.user_id} onClick={() => onRowClick(u)} className="hover:bg-gray-50 text-sm border-b border-b-gray-200 last:border-0">
									<td className="p-3 align-top">{u.user_id}</td>
									<td className="p-3 align-top">
										<div className="flex gap-2">
											<input
												type="text"
												className="w-28 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
												value={getPatchedValue(u, 'first_name') ?? ''}
												placeholder="First"
												onChange={(e) => patchEdit(u.user_id, 'first_name', e.target.value)}
											/>
											<input
												type="text"
												className="w-28 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
												value={getPatchedValue(u, 'last_name') ?? ''}
												placeholder="Last"
												onChange={(e) => patchEdit(u.user_id, 'last_name', e.target.value)}
											/>
										</div>
									</td>
									<td className="p-3 align-top">
										<input
											type="text"
											className="w-40 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
											value={getPatchedValue(u, 'username') ?? ''}
											onChange={(e) => patchEdit(u.user_id, 'username', e.target.value)}
										/>
									</td>
									<td className="p-3 align-top">
										<select
											className="border border-transparent bg-transparent px-2 py-1 rounded-md focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
											value={getPatchedValue(u, 'role')}
											onChange={(e) => patchEdit(u.user_id, 'role', e.target.value)}
										>
											{ROLES.map((r) => (
												<option key={r} value={r}>{r}</option>
											))}
										</select>
									</td>
									<td className="p-3 align-top">
										<input
											type="email"
											className="w-56 border border-transparent bg-transparent px-2 py-1 rounded-md cursor-text focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
											value={getPatchedValue(u, 'email') ?? ''}
											onChange={(e) => patchEdit(u.user_id, 'email', e.target.value)}
										/>
									</td>
									<td className="p-3 align-top">
										<select
											className="border border-transparent bg-transparent px-2 py-1 rounded-md capitalize focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
											value={getPatchedValue(u, 'status')}
											onChange={(e) => patchEdit(u.user_id, 'status', e.target.value)}
										>
											{STATUSES.map((s) => (
												<option key={s} value={s}>{s}</option>
											))}
										</select>
									</td>
									<td className="p-3 align-top">
										<select
											className="border border-transparent bg-transparent px-2 py-1 rounded-md w-48 focus:border-gray-300 focus:bg-white focus:shadow-sm outline-none transition-colors duration-150"
											value={getPatchedValue(u, 'branch_id') ?? ''}
											onChange={(e) => patchEdit(u.user_id, 'branch_id', e.target.value ? Number(e.target.value) : null)}
										>
											<option value="">- None -</option>
											{branches.map((b) => (
												<option key={b.branch_id} value={b.branch_id}>
													{b.branch_name} (#{b.branch_id})
												</option>
											))}
										</select>
									</td>
									<td className="p-3 align-top">{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
									<td className="p-3 align-top text-right">
										<button
											onClick={(e) => { e.stopPropagation(); confirmWithPassword('delete', { user: u }); }}
											className="inline-flex items-center gap-1 rounded-md bg-red-500 hover:bg-red-400 text-white px-2 py-1 text-xs font-semibold"
										>
											Delete
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>

		{/* Toasts - fixed overlay to avoid layout shift */}
		<div className="fixed top-4 right-4 z-50 space-y-2">
			{toasts.map(t => (
				<div key={t.id} className={`min-w-[240px] max-w-sm px-3 py-2 rounded shadow text-sm text-white ${t.type === 'error' ? 'bg-red-600' : t.type === 'warning' ? 'bg-yellow-600' : 'bg-green-600'}`}>
					{t.message}
				</div>
			))}
		</div>

		{/* Password confirmation modal */}
		{pwModal.open && (
			<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
				<div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-sm">
					<h3 className="text-base font-semibold mb-3">Confirm action</h3>
					<p className="text-sm text-gray-600 mb-3">Please enter your password to continue.</p>
					<input
						type="password"
						value={pwModal.password}
						onChange={(e) => setPwModal(s => ({ ...s, password: e.target.value }))}
						className="w-full border rounded px-3 py-2 mb-4"
						placeholder="Password"
					/>
					<div className="flex justify-end gap-2">
						<button
							onClick={() => setPwModal({ open: false, action: null, payload: null, password: '', working: false })}
							className="px-3 py-1.5 rounded border text-sm"
						>
							Cancel
						</button>
						<button
							onClick={handlePasswordConfirm}
							disabled={pwModal.working || !pwModal.password}
							className={`px-3 py-1.5 rounded text-sm text-white ${pwModal.working ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-500'}`}
						>
							{pwModal.working ? 'Verifying…' : 'Confirm'}
						</button>
					</div>
				</div>
			</div>
		)}
	</>
);
}

