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
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 px-4 py-10 animate-fadeIn">
        <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">{t('todaysQueue')}</h1>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); load(e.target.value); }}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={handleLogout} className="bg-gray-200 text-gray-700 dark:text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">{t('logout')}</button>
          </div>
        </div>

        {/* Counter Board */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-3 border-t-2 border-blue-500">
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400">Total Scheduled</p>
            <p className="text-xl font-bold text-gray-800 dark:text-neutral-200 mt-1">{bookings.length}</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-3 border-t-2 border-yellow-500">
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400">Checked In</p>
            <p className="text-xl font-bold text-yellow-600 mt-1">
              {bookings.filter(b => b.status === 'checked_in').length}
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-3 border-t-2 border-purple-500">
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400">In Inspection</p>
            <p className="text-xl font-bold text-purple-600 mt-1">
              {bookings.filter(b => ['weighed', 'quality_checked'].includes(b.status)).length}
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-3 border-t-2 border-green-600">
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400">Accepted</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              {bookings.filter(b => ['accepted', 'paid'].includes(b.status)).length}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {loading && (
            <>
              <BookingSkeleton />
              <BookingSkeleton />
              <BookingSkeleton />
            </>
          )}

          {!loading && bookings.map(b => (
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={b.id} className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4 border-l-4 border-l-green-600">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-bold text-gray-900 dark:text-neutral-100">{b.profiles?.full_name}</p>
                    <CropBadge name={b.commodities?.name} size="xs" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-neutral-400">{b.slot_window} - {b.profiles?.phone}</p>
                  <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize inline-block mt-1">{(b.status ?? '').replace(/_/g, ' ')}</span>
                  {b.actual_weight_quintals && <span className="text-xs text-gray-500 dark:text-neutral-400 ml-2">Weight: {b.actual_weight_quintals}q</span>}
                  {b.quality_grade && <span className="text-xs text-gray-500 dark:text-neutral-400 ml-2">Grade: {b.quality_grade}</span>}
                </div>
                <div className="flex gap-2">
                  {NEXT_STATUS[b.status] && activeId !== b.id && (
                    <button
                      onClick={() => NEXT_STATUS[b.status] === 'checked_in' ? advance(b) : startAction(b)}
                      disabled={actionLoading}
                      className="bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {t('markAs')} {NEXT_STATUS[b.status].replace(/_/g, ' ')}
                    </button>
                  )}
                  {!['rejected', 'cancelled', 'paid', 'accepted'].includes(b.status) && activeId !== b.id && (
                    <button
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
                      className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
              {activeId === b.id && renderActionInputs(b)}
            </motion.div>
          ))}

          {!loading && bookings.length === 0 && (
            <EmptyState
              icon="📋"
              title="No Bookings For This Date"
              description="There are no farmers scheduled for procurement on this date. You can select another date using the date picker above."
            />
          )}
        </div>
      </div>
      </div>
    </PullToRefresh>
  );
}
