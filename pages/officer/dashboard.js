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
  }, [router]);

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
      const isRejected = actionData.quality_grade === 'Rejected' || parseFloat(actionData.moisture_percent || 0) > 14;
      
      return (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">Moisture (%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className={`w-full border rounded-lg px-3 py-2 text-sm ${parseFloat(actionData.moisture_percent || 0) > 14 ? 'border-red-500 bg-red-50 text-red-900' : ''}`}
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
                  <option value="High Moisture">High Moisture (> 14%)</option>
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
            <button onClick={() => advance(booking)} disabled={actionLoading || !actionData.accepted_quantity_quintals} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {actionLoading ? t('loading') : t('confirm')}
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
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Total Scheduled</p>
            <p className="text-xl font-bold text-gray-800 dark:text-neutral-200 mt-1">{bookings.length}</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-3 border-t-2 border-yellow-500">
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Checked In</p>
            <p className="text-xl font-bold text-yellow-600 mt-1">
              {bookings.filter(b => b.status === 'checked_in').length}
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-3 border-t-2 border-purple-500">
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 dark:text-neutral-400">In Inspection</p>
            <p className="text-xl font-bold text-purple-600 mt-1">
              {bookings.filter(b => ['weighed', 'quality_checked'].includes(b.status)).length}
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-3 border-t-2 border-green-600">
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Accepted</p>
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
                  <p className="text-sm text-gray-500 dark:text-neutral-400 dark:text-neutral-400">{b.slot_window} - {b.profiles?.phone}</p>
                  <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize inline-block mt-1">{(b.status ?? '').replace(/_/g, ' ')}</span>
                  {b.actual_weight_quintals && <span className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 ml-2">Weight: {b.actual_weight_quintals}q</span>}
                  {b.quality_grade && <span className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 ml-2">Grade: {b.quality_grade}</span>}
                </div>
                <div className="flex gap-2">
                  {NEXT_STATUS[b.status] && activeId !== b.id && (
                    <button
                      onClick={() => NEXT_STATUS[b.status] === 'checked_in' ? advance(b) : startAction(b)}
                      className="bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
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
