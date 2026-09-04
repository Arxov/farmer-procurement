import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  initiated: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);
  const router = useRouter();
  const { t } = useLanguage();

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/'); return; }
    const res = await fetch('/api/admin/payments', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.status === 403) { router.push('/'); return; }
    if (res.ok) {
      const { payments: p } = await res.json();
      setPayments(p || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markPaid = async (id) => {
    setUpdating(id);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/admin/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id, status: 'paid' }),
    });
    setUpdating(null);
    load();
  };

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const counts = { all: payments.length, pending: 0, initiated: 0, paid: 0 };
  payments.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });

  const totalPending = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>{t('loading')}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Link href="/admin/dashboard" className="text-green-700 text-sm">&larr; Dashboard</Link>
            <h1 className="text-xl font-bold mt-1">Payment Management</h1>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">₹{totalPending.toLocaleString()}</p>
            <p className="text-sm text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Pending</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</p>
            <p className="text-sm text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Paid</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-neutral-200">₹{(totalPending + totalPaid).toLocaleString()}</p>
            <p className="text-sm text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Total</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'initiated', 'paid'].map(f => (
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
                <th className="p-3">Farmer</th>
                <th className="p-3">Centre</th>
                <th className="p-3">Commodity</th>
                <th className="p-3">Qty (q)</th>
                <th className="p-3">Amount</th>
                <th className="p-3">UTR</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 dark:bg-neutral-900">
                  <td className="p-3">
                    <p className="font-medium">{p.bookings?.profiles?.full_name || '-'}</p>
                    <p className="text-xs text-gray-400">{p.bookings?.profiles?.phone}</p>
                  </td>
                  <td className="p-3">{p.bookings?.centres?.name || '-'}</td>
                  <td className="p-3">{p.bookings?.commodities?.name || '-'}</td>
                  <td className="p-3">{p.accepted_quantity_quintals || '-'}</td>
                  <td className="p-3 font-medium">₹{(p.amount || 0).toLocaleString()}</td>
                  <td className="p-3 text-xs font-mono">{p.utr_reference || '-'}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${STATUS_COLORS[p.status] || 'bg-gray-100 dark:bg-neutral-800'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {p.status !== 'paid' && (
                      <button
                        onClick={() => markPaid(p.id)}
                        disabled={updating === p.id}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        {updating === p.id ? '...' : 'Mark Paid'}
                      </button>
                    )}
                    {p.status === 'paid' && p.paid_at && (
                      <span className="text-xs text-gray-400">{new Date(p.paid_at).toLocaleDateString()}</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-gray-500 dark:text-neutral-400 dark:text-neutral-400">No payments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
