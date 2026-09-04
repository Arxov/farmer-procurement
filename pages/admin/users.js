import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';

const ROLE_COLORS = {
  farmer: 'bg-green-100 text-green-800',
  officer: 'bg-blue-100 text-blue-800',
  admin: 'bg-purple-100 text-purple-800',
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);
  const router = useRouter();
  const { t } = useLanguage();

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/'); return; }
    const res = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.status === 403) { router.push('/'); return; }
    if (res.ok) {
      const { users: u } = await res.json();
      setUsers(u || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (id, newRole) => {
    if (!confirm(`Change this user's role to ${newRole}?`)) return;
    setUpdating(id);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id, role: newRole }),
    });
    setUpdating(null);
    load();
  };

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);
  const counts = { all: users.length, farmer: 0, officer: 0, admin: 0 };
  users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>{t('loading')}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Link href="/admin/dashboard" className="text-green-700 text-sm">&larr; Dashboard</Link>
            <h1 className="text-xl font-bold mt-1">User & Role Management</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-neutral-400 dark:text-neutral-400">{users.length} registered users</p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {['all', 'farmer', 'officer', 'admin'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-green-700 text-white' : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 dark:text-neutral-400 border'}`}
            >
              {f} ({counts[f] || 0})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 dark:text-neutral-400 dark:text-neutral-400">
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Village</th>
                <th className="p-3">Land (acres)</th>
                <th className="p-3">Role</th>
                <th className="p-3">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50 dark:bg-neutral-900">
                  <td className="p-3 font-medium">{u.full_name || '-'}</td>
                  <td className="p-3">{u.phone || '-'}</td>
                  <td className="p-3">{u.village || '-'}</td>
                  <td className="p-3">{u.land_holding_acres ?? '-'}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${ROLE_COLORS[u.role] || 'bg-gray-100 dark:bg-neutral-800'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      disabled={updating === u.id}
                      className="border rounded-lg px-2 py-1 text-sm disabled:opacity-50"
                    >
                      <option value="farmer">Farmer</option>
                      <option value="officer">Officer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500 dark:text-neutral-400 dark:text-neutral-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
