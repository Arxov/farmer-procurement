import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import AdminNav from '../../components/AdminNav';

const ROLE_BADGES = {
  farmer: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  officer: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  admin: 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-slate-500 font-display text-sm">
          <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/90 dark:bg-neutral-950 px-4 py-8 animate-fadeIn">
      <div className="max-w-5xl mx-auto space-y-6 sm:border-x sm:border-slate-200/80 dark:sm:border-neutral-800/60 sm:min-h-screen sm:bg-slate-50/50 dark:sm:bg-neutral-950 sm:shadow-xs sm:px-6">

        {/* Unified Administrative Executive Header & Segmented Tabs */}
        <AdminNav activeTab="/admin/users" />

        {/* Section Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
              {t('userManagement')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Role-Based Access Control (RBAC) security governance, farmer KYC verification, and officer authorizations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700 px-3 py-1 rounded-xl shadow-2xs">
              {users.length} Registered Identities
            </span>
          </div>
        </div>

        {/* Apple HIG Segmented Control Filter Tabs */}
        <div className="bg-slate-200/70 dark:bg-neutral-800/80 p-1.5 rounded-2xl border border-slate-300/80 dark:border-neutral-700 shadow-xs overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {['all', 'farmer', 'officer', 'admin'].map((f) => {
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="relative focus:outline-hidden"
                >
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-display font-semibold transition-all select-none relative z-10 capitalize ${
                      isActive
                        ? 'text-slate-900 dark:text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    <span>{f}s</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-emerald-600'
                        : 'bg-slate-300/80 dark:bg-neutral-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {counts[f] || 0}
                    </span>
                  </motion.div>
                  {isActive && (
                    <motion.div
                      layoutId="userFilterPill"
                      transition={{ type: 'spring', damping: 25, stiffness: 240 }}
                      className="absolute inset-0 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200/90 dark:border-neutral-700 ring-1 ring-slate-900/5"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-slate-200/90 dark:border-neutral-800 ring-1 ring-slate-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-neutral-800 text-left font-bold text-slate-400 uppercase tracking-wider font-display bg-slate-50/80 dark:bg-neutral-900/50">
                  <th className="p-3.5">Full Name</th>
                  <th className="p-3.5">Registered Phone</th>
                  <th className="p-3.5">Village / Tehsil</th>
                  <th className="p-3.5">Land Holding</th>
                  <th className="p-3.5">System Role</th>
                  <th className="p-3.5 text-right">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-neutral-800 font-sans">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 transition">
                    <td className="p-3.5">
                      <p className="font-bold font-display text-slate-900 dark:text-white">
                        {u.full_name || '—'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">UID: {u.id?.slice(0, 8)}</p>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {u.phone || '—'}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {u.village || '—'}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-slate-800 dark:text-neutral-200">
                        {u.land_holding_acres != null ? `${u.land_holding_acres} acres` : '—'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border capitalize ${ROLE_BADGES[u.role] || 'bg-slate-100 dark:bg-neutral-800'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <select
                        value={u.role}
                        onChange={e => changeRole(u.id, e.target.value)}
                        disabled={updating === u.id}
                        className="bg-slate-50 dark:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700 rounded-xl px-2.5 py-1 text-xs font-display font-semibold text-slate-800 dark:text-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-50 cursor-pointer capitalize"
                      >
                        <option value="farmer">Farmer</option>
                        <option value="officer">Officer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                      No users found matching this role filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
