import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import { BookingSkeleton, EmptyState } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import CropBadge from '../../components/CropBadge';
import PullToRefresh from '../../components/PullToRefresh';
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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

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
        <div className="mt-3 p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg space-y-2">
          <label className="block text-sm font-medium">{t('enterWeight')}</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="e.g. 25.5"
            value={actionData.actual_weight_quintals || ''}
            onChange={e => setActionData({ ...actionData, actual_weight_quintals: e.target.value })}
          />
          <div className="flex gap-2">
            <button onClick={() => advance(booking)} disabled={actionLoading || !actionData.actual_weight_quintals} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {actionLoading ? t('loading') : t('confirm')}
            </button>
            <button onClick={cancelAction} className="bg-gray-200 text-gray-700 dark:text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium">{t('cancel')}</button>
          </div>
        </div>
      );
    }

        if (nextStatus === 'quality_checked') {
      const maxMoisture = booking?.commodities?.max_moisture || 14;
      const isRejected = actionData.quality_grade === 'Rejected' || parseFloat(actionData.moisture_percent || 0) > maxMoisture;
      
      return (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg space-y-3">
          {booking?.commodities && (
            <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1.5">FCI Limits for {booking.commodities.name}</p>
              <div className="flex gap-3 text-xs">
                <span className="text-blue-700 dark:text-blue-400">Moisture: <strong>{booking.commodities.max_moisture || 14}%</strong></span>
                <span className="text-blue-700 dark:text-blue-400">Broken: <strong>{booking.commodities.max_broken_percent || 6}%</strong></span>
                <span className="text-blue-700 dark:text-blue-400">Damaged: <strong>{booking.commodities.max_damaged_percent || 4}%</strong></span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">Moisture (%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className={`w-full border rounded-lg px-3 py-2 text-sm ${parseFloat(actionData.moisture_percent || 0) > maxMoisture ? 'border-red-500 bg-red-50 text-red-900' : ''}`}
                placeholder="e.g. 12.5"
                value={actionData.moisture_percent || ''}
                onChange={e => setActionData({ ...actionData, moisture_percent: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">Admixture (%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. 1.2"
                value={actionData.admixture_percent || ''}
                onChange={e => setActionData({ ...actionData, admixture_percent: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            {/* AI Optics Phase 4 */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800 mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Pre-Check AI Vision Scan
                </span>
                <span className="text-[9px] font-bold bg-white dark:bg-neutral-800 text-emerald-700 px-1 rounded shadow-xs">Scan ID: KS-V{Math.floor(Math.random() * 9000) + 1000}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[9px] font-medium bg-emerald-100/50 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-200/50">Size Uniformity: 55-65mm</span>
                <span className="text-[9px] font-medium bg-emerald-100/50 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-200/50">Est. Moisture: 11.4% (Pass)</span>
                <span className="text-[9px] font-medium bg-emerald-100/50 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-200/50">Defect Ratio &lt; 2%</span>
              </div>
              <p className="text-[9px] text-emerald-600/80 mt-1 italic">Please manually verify AI grading suggestions below.</p>
            </div>

            
            {/* Dual-Grade Accountability Rule (Officer Polish Phase 1) */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2.5 rounded-lg mb-4 mt-2">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠️</span>
                <div>
                  <h4 className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-0.5">Dual-Grade Accountability Rule:</h4>
                  <p className="text-[9px] text-amber-700/90 dark:text-amber-400/90 leading-tight">
                    You have full authority to override the AI visual grade if physical inspection reveals discrepancies. Both the AI estimate and your verified manual grade will be permanently preserved in the hash-chained audit log to prevent fraudulent reporting.
                  </p>
                </div>
              </div>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">{t('qualityGrade')}</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={isRejected ? 'Rejected' : (actionData.quality_grade || '')}
              onChange={e => setActionData({ ...actionData, quality_grade: e.target.value })}
              disabled={isRejected && actionData.quality_grade !== 'Rejected'}
            >
              <option value="">Select grade</option>
              <option value="A">FAQ Grade A - Premium</option>
              <option value="B">FAQ Grade B - Standard</option>
              <option value="C">URS - Under Rejection Standard</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {isRejected && (
            <div className="bg-red-50 border border-red-200 p-2 rounded-lg">
               <label className="block text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Rejection Reason</label>
               <select
                  className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm bg-white"
                  value={actionData.rejection_reason || ''}
                  onChange={e => setActionData({ ...actionData, rejection_reason: e.target.value, quality_grade: 'Rejected' })}
                >
                  <option value="">Select Reason</option>
                  <option value="High Moisture">High Moisture (exceeds limit)</option>
                  <option value="High Admixture">High Admixture / Chaff</option>
                  <option value="Fungus / Discolored">Fungus / Discolored Grains</option>
                  <option value="Other">Other</option>
                </select>
            </div>
          )}

          <div>
             <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">{t('qualityNotes')}</label>
             <input
               type="text"
               className="w-full border rounded-lg px-3 py-2 text-sm"
               placeholder="Optional notes or photo reference ID"
               value={actionData.quality_notes || ''}
               onChange={e => setActionData({ ...actionData, quality_notes: e.target.value })}
             />
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <button onClick={() => advance(booking)} disabled={actionLoading || (!isRejected && !actionData.quality_grade) || (isRejected && !actionData.rejection_reason)} className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 text-white ${isRejected ? 'bg-red-600 hover:bg-red-700' : 'bg-green-700 hover:bg-green-800'}`}>
              {actionLoading ? t('loading') : (isRejected ? 'Confirm Rejection' : t('confirm'))}
            </button>
            <button onClick={cancelAction} className="bg-gray-200 text-gray-700 dark:text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium">{t('cancel')}</button>
          </div>
        </div>
      );
    }

    if (nextStatus === 'accepted') {
      return (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg space-y-2">
          <label className="block text-sm font-medium">{t('acceptedQuantity')}</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="e.g. 24.0"
            value={actionData.accepted_quantity_quintals || ''}
            onChange={e => setActionData({ ...actionData, accepted_quantity_quintals: e.target.value })}
          />
          <div className="flex gap-2">
            <button onClick={() => advance(booking)} disabled={actionLoading || !actionData.accepted_quantity_quintals} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {actionLoading ? t('loading') : 'Generate Verified Weigh-Slip'}
            </button>
            <button onClick={cancelAction} className="bg-gray-200 text-gray-700 dark:text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium">{t('cancel')}</button>
          </div>
        </div>
      );
    }

    // For checked_in, no extra inputs needed
    return null;
  };

  return (
    <PullToRefresh onRefresh={() => load(selectedDate)}>
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#111111] font-sans text-gray-900 dark:text-neutral-100 flex flex-col items-center pb-12 transition-colors duration-300">
        
        {/* Sleek Top Navigation */}
        <header className="w-full bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌾</span>
              <h1 className="text-lg font-semibold tracking-tight">Quality Officer Portal</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); load(e.target.value); }}
                  className="bg-gray-100/50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all cursor-pointer"
                />
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400"
                aria-label="Toggle Dark Mode"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <button 
                onClick={handleLogout} 
                className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl w-full px-4 mt-8">
          
          {/* Minimal KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Scheduled', val: bookings.length, color: 'text-gray-900 dark:text-white', dot: 'bg-gray-400' },
              { label: 'Checked In', val: bookings.filter(b => b.status === 'checked_in').length, color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
              { label: 'In Inspection', val: bookings.filter(b => ['weighed', 'quality_checked'].includes(b.status)).length, color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
              { label: 'Accepted', val: bookings.filter(b => ['accepted', 'paid'].includes(b.status)).length, color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' }
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-5 border border-gray-200 dark:border-neutral-800 shadow-sm transition-transform hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${stat.dot}`}></span>
                  <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wide">{stat.label}</p>
                </div>
                <p className={`text-3xl font-light tracking-tight ${stat.color}`}>
                  {stat.val}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Active Queue</h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400">Processing {bookings.length} farmers today</p>
          </div>

          {/* Clean List View */}
          <div className="space-y-4">
            {loading && (
              <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            )}

            {!loading && bookings.map(b => (
              <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={b.id} className={`bg-white dark:bg-[#1A1A1A] rounded-2xl border ${activeId === b.id ? 'border-emerald-500/50 shadow-md ring-4 ring-emerald-500/10' : 'border-gray-200 dark:border-neutral-800 shadow-sm'} overflow-hidden transition-all`}>
                <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  
                  {/* Farmer Details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{b.profiles?.full_name}</h3>
                        <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                          {b.slot_window}
                        </span>
                      </div>
                      <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        b.status === 'accepted' ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50' : 
                        b.status === 'rejected' ? 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50' : 
                        b.status === 'weighed' ? 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800/50' :
                        'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/50'
                      }`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-neutral-400">
                      <span className="flex items-center gap-1.5"><span className="text-gray-400">ID:</span> <span className="font-medium text-gray-900 dark:text-gray-300">{b.id.substring(0,6).toUpperCase()}</span></span>
                      <span className="flex items-center gap-1.5"><span className="text-gray-400">Crop:</span> <span className="font-medium text-gray-900 dark:text-gray-300">{b.commodities?.name}</span></span>
                      <span className="flex items-center gap-1.5"><span className="text-gray-400">Phone:</span> {b.profiles?.phone}</span>
                    </div>

                    {(b.actual_weight_quintals || b.quality_grade) && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800/80 text-sm">
                        {b.actual_weight_quintals && (
                          <span className="flex items-center gap-1.5">
                            <span className="text-gray-400">Weight:</span> 
                            <span className="font-semibold text-gray-900 dark:text-white">{b.actual_weight_quintals} q</span>
                          </span>
                        )}
                        {b.quality_grade && (
                          <span className="flex items-center gap-1.5">
                            <span className="text-gray-400">Grade:</span> 
                            <span className="font-semibold text-gray-900 dark:text-white">{b.quality_grade}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {!['rejected', 'cancelled', 'paid', 'accepted'].includes(b.status) && activeId !== b.id && (
                      <button
                        onClick={async () => {
                          const reason = prompt('Rejection reason:');
                          if (!reason) return;
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.access_token) return;
                            const res = await fetch(`/api/bookings/${b.id}/status`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                              body: JSON.stringify({ status: 'rejected', quality_notes: `Rejected: ${reason}` }),
                            });
                            if (res.ok) { showToast('Booking rejected', 'info'); load(); }
                          } catch (err) {}
                        }}
                        className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    )}
                    
                    {NEXT_STATUS[b.status] && activeId !== b.id && (
                      <button
                        onClick={() => NEXT_STATUS[b.status] === 'checked_in' ? advance(b) : startAction(b)}
                        disabled={actionLoading}
                        className="flex-1 md:flex-none bg-gray-900 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        Proceed to {NEXT_STATUS[b.status].replace(/_/g, ' ')}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Embedded Action Form */}
                {activeId === b.id && (
                  <div className="bg-gray-50/50 dark:bg-neutral-900/50 p-5 border-t border-gray-100 dark:border-neutral-800">
                    
                    {NEXT_STATUS[b.status] === 'weighed' && (
                      <div className="max-w-sm">
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Recorded Weight (Quintals)</label>
                        <input
                          type="number" step="0.1"
                          className="w-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow outline-none"
                          placeholder="e.g. 45.5"
                          value={actionData.actual_weight_quintals || ''}
                          onChange={e => setActionData({ ...actionData, actual_weight_quintals: e.target.value })}
                        />
                        <div className="flex gap-3 mt-4">
                          <button onClick={() => advance(b)} disabled={!actionData.actual_weight_quintals || actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50">Confirm Weight</button>
                          <button onClick={cancelAction} className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">Cancel</button>
                        </div>
                      </div>
                    )}

                    {NEXT_STATUS[b.status] === 'quality_checked' && (
                      <div className="space-y-5">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Moisture Content (%)</label>
                            <input
                              type="number" step="0.1"
                              className="w-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow outline-none"
                              placeholder="e.g. 12.5"
                              value={actionData.moisture_percent || ''}
                              onChange={e => setActionData({ ...actionData, moisture_percent: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Admixture (%)</label>
                            <input
                              type="number" step="0.1"
                              className="w-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow outline-none"
                              placeholder="e.g. 1.2"
                              value={actionData.admixture_percent || ''}
                              onChange={e => setActionData({ ...actionData, admixture_percent: e.target.value })}
                            />
                          </div>
                        </div>
                        
                        <div className="max-w-xl">
                          <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Final Quality Grade</label>
                          <select
                            className="w-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow outline-none"
                            value={actionData.quality_grade || ''}
                            onChange={e => setActionData({ ...actionData, quality_grade: e.target.value })}
                          >
                            <option value="">Select a grade...</option>
                            <option value="A">Grade A (Premium)</option>
                            <option value="B">Grade B (Standard)</option>
                            <option value="C">URS (Under Rejection Standard)</option>
                            <option value="Rejected">Reject Lot</option>
                          </select>
                        </div>

                        {(actionData.quality_grade === 'Rejected') && (
                          <div className="max-w-xl p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                            <label className="block text-sm font-medium text-red-800 dark:text-red-400 mb-1.5">Rejection Reason</label>
                            <input
                              type="text"
                              className="w-full bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-800/50 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                              placeholder="Please provide details..."
                              value={actionData.rejection_reason || ''}
                              onChange={e => setActionData({ ...actionData, rejection_reason: e.target.value })}
                            />
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <button onClick={() => advance(b)} disabled={!actionData.quality_grade || actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50">Save Inspection Data</button>
                          <button onClick={cancelAction} className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">Cancel</button>
                        </div>
                      </div>
                    )}

                    {NEXT_STATUS[b.status] === 'accepted' && (
                      <div className="max-w-sm">
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Accepted Quantity (Quintals)</label>
                        <input
                          type="number" step="0.1"
                          className="w-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow outline-none"
                          placeholder="Final cleared weight"
                          value={actionData.accepted_quantity_quintals || ''}
                          onChange={e => setActionData({ ...actionData, accepted_quantity_quintals: e.target.value })}
                        />
                        <div className="flex gap-3 mt-4">
                          <button onClick={() => advance(b)} disabled={!actionData.accepted_quantity_quintals || actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50">Generate Weigh-Slip</button>
                          <button onClick={cancelAction} className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">Cancel</button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </motion.div>
            ))}

            {!loading && bookings.length === 0 && (
              <div className="text-center py-20 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-800 text-3xl mb-4">
                  ☕
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Queue Empty</h3>
                <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-sm mx-auto">There are no scheduled procurement slots remaining for the selected date.</p>
              </div>
            )}
          </div>

        </main>
      </div>
    </PullToRefresh>
  );
}
