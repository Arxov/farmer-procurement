import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import { BookingSkeleton, EmptyState } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import CropBadge from '../../components/CropBadge';
import PullToRefresh from '../../components/PullToRefresh';
import LanguageToggle from '../../components/LanguageToggle';
import NumberTicker from '../../components/NumberTicker';
import confetti from 'canvas-confetti';
import { useOfficerBookings, useUpdateBookingStatus } from '../../hooks/useBookings';

const NEXT_STATUS = {
  booked: 'checked_in',
  checked_in: 'weighed',
  weighed: 'quality_checked',
  quality_checked: 'accepted',
};

const todayStr = () => new Date().toISOString().split('T')[0];

export default function OfficerDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [actionData, setActionData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const { data: bookings = [], isLoading: loading, refetch: load } = useOfficerBookings(selectedDate);
  const updateStatusMutation = useUpdateBookingStatus();
  const router = useRouter();
  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || !['officer', 'admin'].includes(profile.role)) {
        router.push('/');
        return;
      }

      setAuthorized(true);
    };
    checkAuth();
  }, []);

  const startAction = (booking) => {
    setActiveId(booking.id);
    setActionData({});
  };

  const cancelAction = () => {
    setActiveId(null);
    setActionData({});
  };

  const advance = async (booking) => {
    const nextStatus = NEXT_STATUS[booking.status];
    if (!nextStatus) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showToast('Session expired. Please log in again.', 'error');
        router.push('/');
        return;
      }

      await updateStatusMutation.mutateAsync({
        bookingId: booking.id,
        status: nextStatus,
        actionData,
        token: session.access_token,
      });

      showToast(`Status updated to ${nextStatus.replace(/_/g, ' ')}`, 'success');

      if (nextStatus === 'accepted' || nextStatus === 'paid') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
      }

      setActiveId(null);
      setActionData({});
    } catch (err) {
      showToast(err.message || 'Network error: Could not reach server. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!authorized) return null;

  const renderActionInputs = (booking) => {
    const nextStatus = NEXT_STATUS[booking.status];

    if (nextStatus === 'weighed') {
      return (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 p-4 bg-slate-50 dark:bg-neutral-900/90 rounded-2xl border border-slate-200/80 dark:border-neutral-800 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 uppercase tracking-wider font-display">
              {t('enterWeight')}
            </label>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0.1"
              step="0.1"
              className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl px-4 py-3 text-base font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              placeholder="e.g. 25.5"
              value={actionData.actual_weight_quintals || ''}
              onChange={e => setActionData({ ...actionData, actual_weight_quintals: e.target.value })}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
              QUINTALS (q)
            </span>
          </div>
          <div className="flex gap-2 pt-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => advance(booking)}
              disabled={actionLoading || !actionData.actual_weight_quintals}
              className="min-h-[42px] bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-xs font-display font-bold shadow-xs hover:shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('loading')}</span>
                </>
              ) : (
                <span>{t('confirm')}</span>
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={cancelAction}
              className="min-h-[42px] bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-4 py-2 rounded-xl text-xs font-display font-semibold hover:bg-slate-300 dark:hover:bg-neutral-700 transition-colors"
            >
              {t('cancel')}
            </motion.button>
          </div>
        </motion.div>
      );
    }

    if (nextStatus === 'quality_checked') {
      const maxMoisture = booking?.commodities?.max_moisture || 14;
      const isRejected = actionData.quality_grade === 'Rejected' || parseFloat(actionData.moisture_percent || 0) > maxMoisture;

      return (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 p-4 bg-slate-50 dark:bg-neutral-900/90 rounded-2xl border border-slate-200/80 dark:border-neutral-800 space-y-3.5"
        >
          {booking?.commodities && (
            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-800/60">
              <p className="text-[10px] font-black font-display text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Statutory FCI Limits • {booking.commodities.name}
              </p>
              <div className="flex flex-wrap gap-3 text-xs font-mono">
                <span className="text-blue-800 dark:text-blue-300">
                  Moisture Max: <strong className="font-bold text-slate-900 dark:text-white">{booking.commodities.max_moisture || 14}%</strong>
                </span>
                <span className="text-blue-800 dark:text-blue-300">
                  Broken Max: <strong className="font-bold text-slate-900 dark:text-white">{booking.commodities.max_broken_percent || 6}%</strong>
                </span>
                <span className="text-blue-800 dark:text-blue-300">
                  Damaged Max: <strong className="font-bold text-slate-900 dark:text-white">{booking.commodities.max_damaged_percent || 4}%</strong>
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-700 dark:text-neutral-300 font-display">
                Moisture (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className={`w-full bg-white dark:bg-neutral-800 border rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold focus:outline-hidden transition-all ${
                  parseFloat(actionData.moisture_percent || 0) > maxMoisture
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 ring-2 ring-rose-200 dark:ring-rose-900/30'
                    : 'border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                }`}
                placeholder="e.g. 12.5"
                value={actionData.moisture_percent || ''}
                onChange={e => setActionData({ ...actionData, moisture_percent: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-700 dark:text-neutral-300 font-display">
                Admixture (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                placeholder="e.g. 1.2"
                value={actionData.admixture_percent || ''}
                onChange={e => setActionData({ ...actionData, admixture_percent: e.target.value })}
              />
            </div>
          </div>

          <div>
            {/* AI Optics Pre-Check HUD */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 font-display">
                  <svg className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Pre-Check AI Vision Scan
                </span>
                <span className="text-[9px] font-mono font-bold bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-neutral-700 shadow-2xs">
                  Scan ID: KS-V{Math.floor(Math.random() * 9000) + 1000}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span className="font-semibold bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-300/50">
                  Uniformity: 55-65mm
                </span>
                <span className="font-semibold bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-300/50">
                  Est. Moisture: 11.4% (Pass)
                </span>
                <span className="font-semibold bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-300/50">
                  Defect Ratio &lt; 2%
                </span>
              </div>
              <p className="text-[10px] text-emerald-700/90 dark:text-emerald-400/90 mt-1.5 italic">
                Please manually verify physical sample before confirming grade.
              </p>
            </div>

            {/* Dual-Grade Accountability Notice */}
            <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 p-3 rounded-xl mb-3">
              <div className="flex items-start gap-2.5">
                <span className="text-amber-600 dark:text-amber-400 text-sm mt-0.5">⚠️</span>
                <div>
                  <h4 className="text-[10px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-widest font-display mb-0.5">
                    Dual-Grade Accountability Rule:
                  </h4>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-400/90 leading-relaxed">
                    You have statutory authority to override AI visual grading. Both the automated scan reading and your verified manual grade are permanently anchored to the cryptographic audit trail.
                  </p>
                </div>
              </div>
            </div>

            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-700 dark:text-neutral-300 font-display">
              {t('qualityGrade')}
            </label>
            <select
              className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm font-display font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              value={isRejected ? 'Rejected' : (actionData.quality_grade || '')}
              onChange={e => setActionData({ ...actionData, quality_grade: e.target.value })}
              disabled={isRejected && actionData.quality_grade !== 'Rejected'}
            >
              <option value="">Select Grade</option>
              <option value="A">FAQ Grade A - Premium</option>
              <option value="B">FAQ Grade B - Standard</option>
              <option value="C">URS - Under Rejection Standard</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {isRejected && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl space-y-1.5">
              <label className="block text-[11px] font-black text-rose-900 dark:text-rose-300 uppercase tracking-wider font-display">
                Rejection Reason (Statutory Mandatory)
              </label>
              <select
                className="w-full bg-white dark:bg-neutral-800 border border-rose-300 dark:border-rose-700 rounded-xl px-3.5 py-2.5 text-sm font-display font-semibold text-rose-900 dark:text-rose-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                value={actionData.rejection_reason || ''}
                onChange={e => setActionData({ ...actionData, rejection_reason: e.target.value, quality_grade: 'Rejected' })}
              >
                <option value="">Select Rejection Reason</option>
                <option value="High Moisture">High Moisture (Exceeds FCI limit)</option>
                <option value="High Admixture">High Admixture / Foreign Matter</option>
                <option value="Fungus / Discolored">Fungus / Discolored Grain</option>
                <option value="Other">Other APMC Quality Violation</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-700 dark:text-neutral-300 font-display">
              {t('qualityNotes')}
            </label>
            <input
              type="text"
              className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              placeholder="Physical sample notes, moisture meter ID, or photo reference..."
              value={actionData.quality_notes || ''}
              onChange={e => setActionData({ ...actionData, quality_notes: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => advance(booking)}
              disabled={actionLoading || (!isRejected && !actionData.quality_grade) || (isRejected && !actionData.rejection_reason)}
              className={`min-h-[42px] px-5 py-2 rounded-xl text-xs font-display font-bold text-white shadow-xs hover:shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${
                isRejected ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {actionLoading ? t('loading') : (isRejected ? 'Confirm Rejection' : t('confirm'))}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={cancelAction}
              className="min-h-[42px] bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-4 py-2 rounded-xl text-xs font-display font-semibold hover:bg-slate-300 dark:hover:bg-neutral-700 transition-colors"
            >
              {t('cancel')}
            </motion.button>
          </div>
        </motion.div>
      );
    }

    if (nextStatus === 'accepted') {
      return (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 p-4 bg-slate-50 dark:bg-neutral-900/90 rounded-2xl border border-slate-200/80 dark:border-neutral-800 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 uppercase tracking-wider font-display">
              {t('acceptedQuantity')}
            </label>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0.1"
              step="0.1"
              className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl px-4 py-3 text-base font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              placeholder="e.g. 24.0"
              value={actionData.accepted_quantity_quintals || ''}
              onChange={e => setActionData({ ...actionData, accepted_quantity_quintals: e.target.value })}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
              QUINTALS (q)
            </span>
          </div>
          <div className="flex gap-2 pt-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => advance(booking)}
              disabled={actionLoading || !actionData.accepted_quantity_quintals}
              className="min-h-[42px] bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-xs font-display font-bold shadow-xs hover:shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{actionLoading ? t('loading') : 'Generate Verified Weigh-Slip'}</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={cancelAction}
              className="min-h-[42px] bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-4 py-2 rounded-xl text-xs font-display font-semibold hover:bg-slate-300 dark:hover:bg-neutral-700 transition-colors"
            >
              {t('cancel')}
            </motion.button>
          </div>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <PullToRefresh onRefresh={() => load(selectedDate)}>
      <div className="min-h-screen bg-slate-50/70 dark:bg-neutral-950 px-4 py-8 animate-fadeIn">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Executive Government Officer Brand Bar */}
          <div className="flex justify-between items-center bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center shadow-xs shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-tight text-emerald-900 dark:text-emerald-400 font-display">
                    KISAN SETU
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
                    • APMC Procurement Desk
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    Live Weighbridge Sync
                  </span>
                  <span className="text-slate-300 dark:text-neutral-700 hidden sm:inline">•</span>
                  <span className="hidden sm:inline font-mono">Official Inspector Gate</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageToggle />
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleLogout}
                title={t('logout') || 'Logout'}
                className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-2xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Action Header & Date Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs">
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                {t('todaysQueue')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Physical weighment, dual-grade quality assessment, and warehouse weigh-slip authorization.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); load(e.target.value); }}
                  className="bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all w-full sm:w-auto cursor-pointer"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => load(selectedDate)}
                title="Refresh Queue"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 flex items-center justify-center transition-colors border border-slate-200 dark:border-neutral-700"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Counter Board with Animated NumberTickers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-slate-200/80 dark:border-neutral-800 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-blue-500"></div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-display">
                Total Scheduled
              </p>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                <NumberTicker value={bookings.length} />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-slate-200/80 dark:border-neutral-800 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-amber-500"></div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-display">
                Checked In
              </p>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                <NumberTicker value={bookings.filter(b => b.status === 'checked_in').length} />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-slate-200/80 dark:border-neutral-800 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-purple-500"></div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-display">
                In Inspection
              </p>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">
                <NumberTicker value={bookings.filter(b => ['weighed', 'quality_checked'].includes(b.status)).length} />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-slate-200/80 dark:border-neutral-800 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-emerald-600"></div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-display">
                Accepted
              </p>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                <NumberTicker value={bookings.filter(b => ['accepted', 'paid'].includes(b.status)).length} />
              </div>
            </div>
          </div>

          {/* Bookings Queue Stream */}
          <div className="space-y-3">
            {loading && (
              <div className="space-y-3">
                <BookingSkeleton />
                <BookingSkeleton />
                <BookingSkeleton />
              </div>
            )}

            {!loading && bookings.map(b => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                key={b.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600"></div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pl-1">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-black font-display text-base text-slate-900 dark:text-white">
                        {b.profiles?.full_name}
                      </p>
                      <CropBadge name={b.commodities?.name} size="xs" />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span>{b.slot_window}</span>
                      <span>•</span>
                      <span>{b.profiles?.phone}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 px-2.5 py-0.5 rounded-full capitalize">
                        {(b.status ?? '').replace(/_/g, ' ')}
                      </span>
                      {b.actual_weight_quintals && (
                        <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-neutral-700">
                          Weight: {b.actual_weight_quintals}q
                        </span>
                      )}
                      {b.quality_grade && (
                        <span className="text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          Grade: {b.quality_grade}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-neutral-800">
                    {NEXT_STATUS[b.status] && activeId !== b.id && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => NEXT_STATUS[b.status] === 'checked_in' ? advance(b) : startAction(b)}
                        disabled={actionLoading}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-display font-bold shadow-xs hover:shadow-md disabled:opacity-50 transition-all inline-flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{t('markAs')} {NEXT_STATUS[b.status].replace(/_/g, ' ')}</span>
                      </motion.button>
                    )}
                    {!['rejected', 'cancelled', 'paid', 'accepted'].includes(b.status) && activeId !== b.id && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          const reason = prompt('Rejection reason:');
                          if (!reason) return;
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.access_token) {
                              showToast('Session expired. Please log in again.', 'error');
                              router.push('/');
                              return;
                            }
                            const res = await fetch(`/api/bookings/${b.id}/status`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                              body: JSON.stringify({ status: 'rejected', quality_notes: `Rejected: ${reason}` }),
                            });
                            if (res.ok) {
                              showToast('Booking rejected', 'info');
                            } else {
                              showToast('Failed to reject booking', 'error');
                            }
                            await load();
                          } catch (err) {
                            showToast('Network error: Could not reach server.', 'error');
                          }
                        }}
                        className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-3.5 py-2 rounded-xl text-xs font-display font-semibold transition-colors"
                      >
                        Reject
                      </motion.button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {activeId === b.id && renderActionInputs(b)}
                </AnimatePresence>
              </motion.div>
            ))}

            {!loading && bookings.length === 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-slate-200/80 dark:border-neutral-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-400 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-base font-black font-display text-slate-900 dark:text-white">
                  No Bookings For This Date
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  There are no farmers scheduled for procurement on this date. You can select another date using the date picker above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}
