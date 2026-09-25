import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import AdminNav from '../../components/AdminNav';

const STATUS_BADGES = {
  open: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  in_review: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  resolved: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

export default function AdminGrievances() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);
  const router = useRouter();
  const { t } = useLanguage();

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/'); return; }
    const res = await fetch('/api/admin/grievances', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.status === 403) { router.push('/'); return; }
    if (res.ok) {
      const { grievances: g } = await res.json();
      setGrievances(g || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, newStatus) => {
    const notes = newStatus === 'resolved' ? prompt('Resolution notes (optional):') : null;
    if (newStatus === 'resolved' && notes === null) return;
    setUpdating(id);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/admin/grievances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id, status: newStatus, resolution_notes: notes || undefined }),
    });
    setUpdating(null);
    load();
  };

  const filtered = filter === 'all' ? grievances : grievances.filter(g => g.status === filter);
  const counts = { all: grievances.length, open: 0, in_review: 0, resolved: 0 };
  grievances.forEach(g => { if (counts[g.status] !== undefined) counts[g.status]++; });

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
        <AdminNav activeTab="/admin/grievances" />

        {/* Section Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
              {t('grievanceManagement')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Statutory dispute redressal tribunal for weighing anomalies, quality grading disputes, and payment delays.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-xl shadow-2xs">
              Open Tickets: {counts.open}
            </span>
          </div>
        </div>

        {/* Apple HIG Segmented Control Filter Tabs */}
        <div className="bg-slate-200/70 dark:bg-neutral-800/80 p-1.5 rounded-2xl border border-slate-300/80 dark:border-neutral-700 shadow-xs overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {['all', 'open', 'in_review', 'resolved'].map((f) => {
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
                    <span>{f.replace(/_/g, ' ')}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-emerald-600'
                        : 'bg-slate-300/80 dark:bg-neutral-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {counts[f]}
                    </span>
                  </motion.div>
                  {isActive && (
                    <motion.div
                      layoutId="grievanceFilterPill"
                      transition={{ type: 'spring', damping: 25, stiffness: 240 }}
                      className="absolute inset-0 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200/90 dark:border-neutral-700 ring-1 ring-slate-900/5"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grievance Ticket Cards Stream */}
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(g => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                key={g.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-slate-200/90 dark:border-neutral-800 ring-1 ring-slate-900/5 p-5 space-y-3.5 hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/80 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black font-display text-sm text-slate-900 dark:text-white">
                      {g.bookings?.profiles?.full_name || 'Farmer Client'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      • {g.bookings?.profiles?.phone || 'No Phone'}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGES[g.status] || 'bg-slate-100 dark:bg-neutral-800'}`}>
                      {(g.status || '').replace(/_/g, ' ')}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    ID: GRV-{g.id?.slice(0, 8)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider text-[10px] font-display">
                      Issue Classification:
                    </span>
                    <span className="font-bold font-display text-slate-800 dark:text-neutral-200 bg-slate-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-neutral-700 capitalize">
                      {(g.issue_type || '').replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-neutral-300 font-sans leading-relaxed bg-slate-50/90 dark:bg-neutral-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-neutral-700/80">
                    {g.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
                    <span>Mandi: <strong className="text-slate-700 dark:text-neutral-300">{g.bookings?.centres?.name || 'Central Mandi'}</strong></span>
                    <span>•</span>
                    <span>Slot: <strong className="text-slate-700 dark:text-neutral-300">{g.bookings?.slot_date}</strong></span>
                    <span>•</span>
                    <span>Filed: <strong className="text-slate-700 dark:text-neutral-300">{new Date(g.created_at).toLocaleDateString()}</strong></span>
                  </div>

                  {g.resolution_notes && (
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 rounded-xl p-3 space-y-1">
                      <p className="text-[10px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Official Redressal Resolution
                      </p>
                      <p className="text-xs text-emerald-800 dark:text-emerald-200 font-sans">
                        {g.resolution_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Dispute Redressal Action Controls */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-neutral-800">
                  {g.status === 'open' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => updateStatus(g.id, 'in_review')}
                      disabled={updating === g.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-display font-bold shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {updating === g.id ? 'Processing...' : 'Initiate Review'}
                    </motion.button>
                  )}
                  {g.status === 'in_review' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => updateStatus(g.id, 'resolved')}
                      disabled={updating === g.id}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-display font-bold shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {updating === g.id ? 'Processing...' : 'Mark Resolved'}
                    </motion.button>
                  )}
                  {g.status !== 'open' && g.status !== 'resolved' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => updateStatus(g.id, 'open')}
                      disabled={updating === g.id}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-display font-bold shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {updating === g.id ? 'Processing...' : 'Reopen Ticket'}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-400 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 font-sans">No grievances found for this status filter.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
