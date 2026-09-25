import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import AdminNav from '../../components/AdminNav';
import NumberTicker from '../../components/NumberTicker';
import CropBadge from '../../components/CropBadge';

const STATUS_BADGES = {
  pending: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  initiated: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  paid: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  failed: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
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
      const result = await res.json();
      const p = result.data || result.payments;
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
        <AdminNav activeTab="/admin/payments" />

        {/* Section Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
              {t('paymentManagement')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              PFMS Direct Benefit Transfer (DBT) escrow ledger, automated batch payouts, and bank UTR reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 px-3 py-1 rounded-xl shadow-2xs">
              PFMS Gateway Live
            </span>
          </div>
        </div>

        {/* Summary Metric Tiles with NumberTickers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-amber-500"></div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-display">
              Pending Authorization
            </p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              ₹<NumberTicker value={totalPending} />
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">{counts.pending || 0} batches pending</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-emerald-600"></div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-display">
              Successfully Disbursed
            </p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              ₹<NumberTicker value={totalPaid} />
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">{counts.paid || 0} transfers settled</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-slate-900 dark:bg-slate-500"></div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-display">
              Total Committed Escrow
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              ₹<NumberTicker value={totalPending + totalPaid} />
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">{counts.all} total transactions</p>
          </div>
        </div>

        {/* Apple HIG Segmented Control Filter Tabs */}
        <div className="bg-slate-200/70 dark:bg-neutral-800/80 p-1.5 rounded-2xl border border-slate-300/80 dark:border-neutral-700 shadow-xs overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {['all', 'pending', 'initiated', 'paid'].map((f) => {
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
                    <span>{f}</span>
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
                      layoutId="paymentFilterPill"
                      transition={{ type: 'spring', damping: 25, stiffness: 240 }}
                      className="absolute inset-0 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200/90 dark:border-neutral-700 ring-1 ring-slate-900/5"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-slate-200/90 dark:border-neutral-800 ring-1 ring-slate-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-neutral-800 text-left font-bold text-slate-400 uppercase tracking-wider font-display bg-slate-50/80 dark:bg-neutral-900/50">
                  <th className="p-3.5">Farmer Beneficiary</th>
                  <th className="p-3.5">Mandi Centre</th>
                  <th className="p-3.5">Commodity</th>
                  <th className="p-3.5">Accepted Qty</th>
                  <th className="p-3.5">DBT Amount</th>
                  <th className="p-3.5">Bank UTR Ref</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-neutral-800 font-sans">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 transition">
                    <td className="p-3.5">
                      <p className="font-bold font-display text-slate-900 dark:text-white">
                        {p.bookings?.profiles?.full_name || '—'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">{p.bookings?.profiles?.phone || '—'}</p>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {p.bookings?.centres?.name || '—'}
                    </td>
                    <td className="p-3.5">
                      <CropBadge name={p.bookings?.commodities?.name} size="xs" />
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {p.accepted_quantity_quintals ? `${p.accepted_quantity_quintals} q` : '—'}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        ₹{(p.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {p.utr_reference ? (
                        <span className="bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-neutral-700">
                          {p.utr_reference}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGES[p.status] || 'bg-slate-100 dark:bg-neutral-800'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {p.status !== 'paid' && (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => markPaid(p.id)}
                          disabled={updating === p.id}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-display font-bold shadow-2xs disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{updating === p.id ? 'Processing...' : 'Authorize DBT'}</span>
                        </motion.button>
                      )}
                      {p.status === 'paid' && p.paid_at && (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                          Settled {new Date(p.paid_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                      No payment transactions found matching the selected filter.
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
