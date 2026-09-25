import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import AdminNav from '../../components/AdminNav';
import CropBadge from '../../components/CropBadge';

export default function AdminCommodities() {
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', msp_rate_per_quintal: '', season: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { t } = useLanguage();

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const load = async () => {
    const token = await getToken();
    if (!token) { router.push('/'); return; }
    const res = await fetch('/api/admin/commodities', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403) { router.push('/'); return; }
    if (res.ok) {
      const { commodities: c } = await res.json();
      setCommodities(c || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (item) => {
    setEditing(item.id);
    setForm({ name: item.name, msp_rate_per_quintal: item.msp_rate_per_quintal, season: item.season || '' });
    setError('');
  };

  const startNew = () => {
    setEditing('new');
    setForm({ name: '', msp_rate_per_quintal: '', season: '' });
    setError('');
  };

  const cancelEdit = () => { setEditing(null); setError(''); };

  const save = async () => {
    if (!form.name.trim() || !form.msp_rate_per_quintal) { setError('Name and MSP rate are required'); return; }
    setSaving(true);
    setError('');
    const token = await getToken();
    const isNew = editing === 'new';

    const res = await fetch('/api/admin/commodities', {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(isNew ? form : { id: editing, ...form }),
    });

    setSaving(false);
    if (!res.ok) { const r = await res.json(); setError(r.error || 'Failed'); return; }
    setEditing(null);
    load();
  };

  const deleteCommodity = async (id) => {
    if (!confirm('Delete this commodity? Existing bookings using it will be unaffected.')) return;
    const token = await getToken();
    await fetch('/api/admin/commodities', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    load();
  };

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
    <div className="min-h-screen bg-slate-50/70 dark:bg-neutral-950 px-4 py-8 animate-fadeIn">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Unified Administrative Executive Header & Segmented Tabs */}
        <AdminNav activeTab="/admin/commodities" />

        {/* Section Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
              {t('commodityManagement')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              CACP statutory Minimum Support Price (MSP) schedule, seasonal registry, and moisture baselines.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startNew}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-display font-bold shadow-xs hover:shadow-md transition-all inline-flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>{t('addCommodity')}</span>
          </motion.button>
        </div>

        {/* Add/Edit Form */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-neutral-800 p-5 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-neutral-800 pb-3">
                <h2 className="text-sm font-black font-display text-slate-900 dark:text-white">
                  {editing === 'new' ? 'Add New Registered Commodity' : 'Edit Statutory MSP Commodity'}
                </h2>
                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 px-2 py-0.5 rounded-md">
                  CACP Price Schedule
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1 font-display">
                    Commodity Name *
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-sans text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    placeholder="e.g. Wheat, Paddy, Soybean"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1 font-display">
                    MSP Rate (₹ / Quintal) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    placeholder="e.g. 2275"
                    value={form.msp_rate_per_quintal}
                    onChange={e => setForm({ ...form, msp_rate_per_quintal: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-1 font-display">
                    Agricultural Season
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-display font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all capitalize"
                    value={form.season}
                    onChange={e => setForm({ ...form, season: e.target.value })}
                  >
                    <option value="">Select Season</option>
                    <option value="kharif">Kharif</option>
                    <option value="rabi">Rabi</option>
                    <option value="zaid">Zaid</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 font-sans">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={save}
                  disabled={saving}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-xs font-display font-bold shadow-xs hover:shadow-md disabled:opacity-50 transition-all inline-flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Commodity</span>
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={cancelEdit}
                  className="bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-4 py-2 rounded-xl text-xs font-display font-semibold hover:bg-slate-300 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Commodities Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-neutral-800 text-left font-bold text-slate-400 uppercase tracking-wider font-display bg-slate-50/60 dark:bg-neutral-900/50">
                  <th className="p-3.5">Commodity & Badge</th>
                  <th className="p-3.5">Statutory MSP (₹/q)</th>
                  <th className="p-3.5">Harvest Season</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 font-sans">
                {commodities.map(c => {
                  const seasonStyles = {
                    kharif: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                    rabi: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                    zaid: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                  };

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 transition">
                      <td className="p-3.5 font-bold font-display text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <CropBadge name={c.name} size="xs" />
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          ₹{Number(c.msp_rate_per_quintal).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono ml-1">/ quintal</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-display font-bold px-2.5 py-0.5 rounded-full border capitalize ${seasonStyles[c.season?.toLowerCase()] || 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'}`}>
                          {c.season || 'Annual'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => startEdit(c)}
                            className="px-2.5 py-1 rounded-lg text-xs font-display font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          >
                            Edit
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => deleteCommodity(c.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-display font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            Delete
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {commodities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-xs text-slate-400">
                      No statutory commodities configured. Click "+ Add Commodity" to register an MSP crop.
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
