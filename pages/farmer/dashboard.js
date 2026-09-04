import { playQueueChime, triggerQueueHaptic } from '../../lib/audioAlert';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import { getOfflineQueue, syncOfflineQueue, clearOfflineQueue } from '../../lib/offlineQueue';
import { BookingSkeleton, EmptyState } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import NotificationBell from '../../components/NotificationBell';
import WeatherAdvisory from '../../components/WeatherAdvisory';
import MandiFeedback from '../../components/MandiFeedback';
import CropBadge from '../../components/CropBadge';
import PullToRefresh from '../../components/PullToRefresh';
import InstallPwaBanner from '../../components/InstallPwaBanner';
import VoiceAssistance from '../../components/VoiceAssistance';
import { useFarmerBookings, bookingsQueryKeys } from '../../hooks/useBookings';
import { useCommodities } from '../../hooks/useCommodities';
import { useQueryClient } from '@tanstack/react-query';

export default function FarmerDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const queryClient = useQueryClient();
  const { data: commodities = [] } = useCommodities();
  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useFarmerBookings(user?.id);
  const loading = !profile || bookingsLoading;
  const [syncMessage, setSyncMessage] = useState('');
  const [audioAlerts, setAudioAlerts] = useState(true);
  const alertedRef = useRef(false);
  const router = useRouter();
  const channelRef = useRef(null);
  const { t } = useLanguage();
  const { showToast } = useToast();

  // Sync offline queue when online
  const trySyncOffline = async () => {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { synced, failed } = await syncOfflineQueue(session.access_token);
    if (synced > 0) {
      setSyncMessage(`âœ… ${synced} offline booking(s) synced successfully!${failed > 0 ? ` ${failed} failed.` : ''}`);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  useEffect(() => {
    let cancelled = false;

        const init = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const currentUser = data?.user;
        if (!currentUser) { router.push('/'); return; }
        if (cancelled) return;
        setUser(currentUser);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();
          
        if (profileError) throw profileError;
        if (!cancelled && profileData) setProfile(profileData);

        if (!channelRef.current) {
          channelRef.current = supabase
            .channel('farmer-bookings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: \armer_id=eq.\\ }, () => {
              queryClient.invalidateQueries({ queryKey: bookingsQueryKeys.farmer(currentUser.id) });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, () => {
              queryClient.invalidateQueries({ queryKey: bookingsQueryKeys.farmer(currentUser.id) });
            })
            .subscribe();
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Dashboard Init Error:", err);
          showToast('Failed to load profile. Please check your connection.', 'error');
        }
      }
    };

    init();
    trySyncOffline();

    const handleOnline = () => { trySyncOffline().then(() => refetchBookings()); };
    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [router, queryClient, refetchBookings]);

  const handleRefresh = async () => {
    try {
      await refetchBookings();
      await trySyncOffline();
      showToast('Dashboard refreshed with latest Mandi updates', 'success');
    } catch (e) {}
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };


  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter(b => b.slot_date >= today && !['paid', 'cancelled', 'rejected'].includes(b.status));
  const past = bookings.filter(b => b.slot_date < today || ['paid', 'cancelled', 'rejected'].includes(b.status));

  // Audio and Haptic queue turn alarm
  useEffect(() => {
    const hasLeaveNow = upcoming.some(b => {
      const q = b.queue_entries?.[0];
      return q && ['booked', 'checked_in'].includes(b.status) && q.queue_position != null && q.queue_position <= 2;
    });

    if (hasLeaveNow && !alertedRef.current) {
      alertedRef.current = true;
      if (audioAlerts) {
        playQueueChime();
      }
      triggerQueueHaptic();
      showToast('ðŸš¨ Your turn is near! Please proceed to the procurement bay.', 'info');
    } else if (!hasLeaveNow) {
      alertedRef.current = false;
    }
  }, [upcoming, audioAlerts, showToast]);

  // Kisan Passbook stats
  const totalEarnings = bookings.reduce((sum, b) => {
    const p = b.payments?.[0];
    return p ? sum + (Number(p.amount) || 0) : sum;
  }, 0);

  const totalQuintals = bookings.reduce((sum, b) => {
    if (['weighed', 'quality_checked', 'accepted', 'paid'].includes(b.status)) {
      return sum + (Number(b.accepted_quantity_quintals) || Number(b.actual_weight_quintals) || 0);
    }
    return sum;
  }, 0);

  const activeTokens = bookings.filter(b => ['booked', 'checked_in'].includes(b.status)).length;

  const getStatusColor = (status) => {
    const colors = {
      booked: 'bg-blue-100 text-blue-800',
      checked_in: 'bg-yellow-100 text-yellow-800',
      weighed: 'bg-orange-100 text-orange-800',
      quality_checked: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200',
    };
    return colors[status] || 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200';
  };

  const getBorderColor = (status) => {
    const borders = {
      booked: 'border-l-4 border-l-blue-500',
      checked_in: 'border-l-4 border-l-yellow-500',
      weighed: 'border-l-4 border-l-orange-500',
      quality_checked: 'border-l-4 border-l-purple-500',
      accepted: 'border-l-4 border-l-green-600',
      paid: 'border-l-4 border-l-emerald-600',
      rejected: 'border-l-4 border-l-red-500',
      cancelled: 'border-l-4 border-l-gray-300',
    };
    return borders[status] || 'border-l-4 border-l-gray-200';
  };

  const renderBookingCard = (b) => {
    const queuePos = b.queue_entries?.[0]?.queue_position;
    const isLeaveNow = queuePos && queuePos <= 3 && ['booked', 'checked_in'].includes(b.status);

    return (
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={b.id} className={`bg-white dark:bg-neutral-800 rounded-xl shadow p-4 ${getBorderColor(b.status)} ${isLeaveNow ? 'ring-2 ring-orange-400' : ''}`}>
        {/* Rejection Alert Box */}
        {b.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <p className="font-bold text-red-800 text-sm">âŒ Booking Rejected by Centre</p>
            {b.quality_notes && (
              <p className="text-xs text-red-700 mt-0.5">{b.quality_notes}</p>
            )}
            <Link href="/farmer/grievances" className="inline-block mt-2 text-xs font-medium text-red-800 underline hover:text-red-900">
              Have a concern? File a grievance &rarr;
            </Link>
          </div>
        )}

        {/* Leave Now Alert */}
        {isLeaveNow && (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 mb-3 flex items-center gap-2">
            <span className="text-2xl">ðŸš¨</span>
            <div>
              <p className="font-bold text-orange-800 text-sm">
                {queuePos === 1 ? "It's your turn!" : `Your turn is coming! Position: ${queuePos}`}
              </p>
              <p className="text-xs text-orange-600">Leave for the procurement centre now!</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CropBadge name={b.commodities?.name} size="xs" />
              <span className="text-xs font-bold text-gray-800 dark:text-neutral-200">{b.centres?.name}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">{b.slot_date} â€” {b.slot_window}</p>
            {b.expected_quantity_quintals && (
              <p className="text-xs text-gray-400 mt-0.5">Qty: {b.expected_quantity_quintals} quintals</p>
            )}
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full h-fit capitalize ${getStatusColor(b.status)}`}>
            {(b.status ?? '').replace(/_/g, ' ')}
          </span>
        </div>

        {b.queue_entries?.[0] && ['booked', 'checked_in'].includes(b.status) && (
          <div className="mt-2 bg-gray-50 dark:bg-neutral-900 rounded-lg p-2">
            <p className="text-sm text-gray-600 dark:text-neutral-400 dark:text-neutral-400">
              {t('queuePosition')}: <strong className="text-lg">{b.queue_entries[0].queue_position ?? '-'}</strong>
              <span className="mx-2">â€¢</span>
              {t('estWait')}: <strong>{b.queue_entries[0].estimated_wait_minutes ?? '-'} {t('min')}</strong>
            </p>
          </div>
        )}

        {/* 6-Stage Visual Procurement Stepper */}
        {!['cancelled', 'rejected'].includes(b.status) && (
          <div className="mt-4 mb-3 pt-3 border-t border-gray-100 dark:border-neutral-700">
            <div className="flex items-center justify-between relative">
              {/* Connecting Background Line */}
              <div className="absolute left-3 right-3 top-3 -translate-y-1/2 h-0.5 bg-gray-200 -z-0" />
              {/* Connecting Active Progress Line */}
              {(() => {
                const steps = ['booked', 'checked_in', 'weighed', 'quality_checked', 'accepted', 'paid'];
                const currentIndex = steps.indexOf(b.status);
                const pct = currentIndex > 0 ? (currentIndex / (steps.length - 1)) * 100 : 0;
                return (
                  <div
                    className="absolute left-3 top-3 -translate-y-1/2 h-0.5 bg-green-600 transition-all duration-500 -z-0"
                    style={{ width: `calc(${pct}% * 0.92)` }}
                  />
                );
              })()}

              {[
                { id: 'booked', label: 'Booked', icon: 'ðŸ“' },
                { id: 'checked_in', label: 'Checked In', icon: 'ðŸ“' },
                { id: 'weighed', label: 'Weighed', icon: 'âš–ï¸' },
                { id: 'quality_checked', label: 'Quality', icon: 'ðŸ”' },
                { id: 'accepted', label: 'Accepted', icon: 'âœ…' },
                { id: 'paid', label: 'Paid', icon: 'ðŸ’°' },
              ].map((step, idx) => {
                const steps = ['booked', 'checked_in', 'weighed', 'quality_checked', 'accepted', 'paid'];
                const currentIndex = steps.indexOf(b.status);
                const isCompleted = currentIndex > idx;
                const isCurrent = currentIndex === idx;

                return (
                  <div key={step.id} className="flex flex-col items-center z-10">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        isCompleted
                          ? 'bg-green-600 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-white dark:bg-neutral-800 border-2 border-green-600 text-green-700 shadow-md ring-2 ring-green-100'
                          : 'bg-gray-100 dark:bg-neutral-800 text-gray-400 border border-gray-200 dark:border-neutral-700'
                      }`}
                    >
                      {isCompleted ? 'âœ“' : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-medium text-center whitespace-nowrap ${
                        isCurrent
                          ? 'text-green-700 font-bold'
                          : isCompleted
                          ? 'text-gray-700 dark:text-neutral-300'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {b.actual_weight_quintals && (
          <p className="text-sm mt-2 text-gray-600 dark:text-neutral-400 dark:text-neutral-400">âš–ï¸ Actual weight: <strong>{b.actual_weight_quintals}q</strong>
            {b.quality_grade && <span> â€¢ Grade: <strong>{b.quality_grade}</strong></span>}
          </p>
        )}

        {b.payments?.[0] && (
          <div className="text-sm mt-2 bg-green-50 rounded-lg p-2">
            <p className="text-gray-700 dark:text-neutral-300">
              ðŸ’° {t('payment')}: <strong className="capitalize">{b.payments[0].status}</strong>
              {b.payments[0].amount ? ` â€” â‚¹${Number(b.payments[0].amount).toLocaleString()}` : ''}
            </p>
            {b.payments[0].utr_reference && (
              <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mt-1">UTR: {b.payments[0].utr_reference}</p>
            )}
            <div className="flex gap-1 mt-1">
              {['pending', 'initiated', 'paid'].map(step => (
                <div key={step} className="flex-1">
                  <div className={`h-1.5 rounded-full ${
                    step === 'pending' ? 'bg-green-500' :
                    step === 'initiated' && ['initiated', 'paid'].includes(b.payments[0].status) ? 'bg-green-500' :
                    step === 'paid' && b.payments[0].status === 'paid' ? 'bg-green-500' :
                    'bg-gray-200'
                  }`} />
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5-Star Mandi Feedback for Completed/Accepted Procurements */}
        {['accepted', 'paid'].includes(b.status) && (
          <MandiFeedback bookingId={b.id} centreName={b.centres?.name || 'Mandi Centre'} />
        )}

        {/* Action links */}
        <div className="flex gap-2.5 mt-3 flex-wrap items-center">
          {['booked', 'checked_in'].includes(b.status) && (
            <Link href={`/farmer/token/${b.id}`} className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition inline-flex items-center gap-1">
              ðŸŽ« Appointment Slip &rarr;
            </Link>
          )}
          {b.gate_passes?.[0] && (
            <Link href={`/farmer/gate-pass/${b.id}`} className="text-xs font-semibold text-green-800 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition inline-flex items-center gap-1">
              ðŸ“„ Official Gate Pass &rarr;
            </Link>
          )}
          {b.status === 'booked' && (
            <>
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to cancel this booking?')) return;
                  const { data: { session } } = await supabase.auth.getSession();
                  const res = await fetch(`/api/bookings/${b.id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ status: 'cancelled' }),
                  });
                  if (res.ok) {
                    showToast('Booking cancelled successfully', 'info');
                      queryClient.invalidateQueries({ queryKey: bookingsQueryKeys.farmer(user?.id) });
                  } else {
                    showToast('Failed to cancel booking', 'error');
                  }
                }}
                className="text-sm text-red-600 font-medium hover:underline"
              >
                âœ• Cancel
              </button>
              <Link href={`/farmer/book-slot?reschedule=${b.id}`} className="text-sm text-blue-600 font-medium hover:underline">
                ðŸ”„ Reschedule
              </Link>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 px-4 pt-10 pb-28 sm:pb-10 animate-fadeIn">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold">{t('myBookings')}</h1>
            <div className="flex gap-2 items-center flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setAudioAlerts(!audioAlerts)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1 ${
                  audioAlerts ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 dark:text-neutral-400 border-gray-200 dark:border-neutral-700'
                }`}
                title={audioAlerts ? 'Audio alert enabled for your queue turn' : 'Audio alert muted'}
                aria-label={audioAlerts ? 'Mute queue audio alerts' : 'Enable queue audio alerts'}
              >
                <span>{audioAlerts ? 'ðŸ””' : 'ðŸ”•'}</span>
                <span className="hidden sm:inline">{audioAlerts ? 'Alerts On' : 'Alerts Muted'}</span>
              </button>
              <VoiceAssistance profile={profile} bookings={bookings} commodities={commodities} />
              <NotificationBell bookings={bookings} />
              <Link href="/ivr-demo" className="bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs hover:bg-amber-700">ðŸŽ™ï¸ IVR</Link>
              <Link href="/farmer/book-slot" className="bg-green-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs hover:bg-green-800">{t('bookSlot')}</Link>
              <Link href="/farmer/grievances" className="bg-yellow-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs hover:bg-yellow-700">{t('viewGrievances')}</Link>
              <button onClick={handleLogout} className="bg-gray-200 text-gray-700 dark:text-neutral-300 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-gray-300">{t('logout')}</button>
            </div>
          </div>

        {/* Kisan Passbook Profile Card */}
        {profile && (
          <div className="bg-gradient-to-r from-emerald-800 to-green-900 rounded-2xl shadow-lg p-5 text-white mb-6">
            <div className="flex flex-wrap justify-between items-start gap-2 border-b border-emerald-700/60 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-700/80 px-2 py-0.5 rounded text-emerald-100">
                  Kisan Passbook
                </span>
                <h2 className="text-lg font-bold mt-1">{profile.full_name || 'Kisan Mitra'}</h2>
                <p className="text-xs text-emerald-200">
                  ðŸ“± {profile.phone || '-'} â€¢ ðŸ“ {profile.village || 'APMC Region'}
                  {profile.land_holding_acres ? ` â€¢ ðŸŒ¾ ${profile.land_holding_acres} Acres` : ''}
                </p>
              </div>
              <div className="bg-emerald-700/60 border border-emerald-500/40 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs text-emerald-100">
                <span>ðŸ›¡ï¸</span>
                <span className="font-semibold">Aadhaar eKYC Verified</span>
              </div>
            </div>

            {/* Lifetime Procurement Stats */}
            <div className="grid grid-cols-3 gap-2 pt-3 text-center">
              <div>
                <p className="text-[11px] text-emerald-200 font-medium">Total DBT Earned</p>
                <p className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                  â‚¹{totalEarnings.toLocaleString()}
                </p>
              </div>
              <div className="border-x border-emerald-700/60">
                <p className="text-[11px] text-emerald-200 font-medium">Procured Qty</p>
                <p className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                  {totalQuintals} <span className="text-xs font-normal">q</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-emerald-200 font-medium">Active Tokens</p>
                <p className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                  {activeTokens}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live MSP Rate Board */}
        {commodities.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">ðŸŒ¾</span>
                <h3 className="text-xs font-bold text-gray-800 dark:text-neutral-200 uppercase tracking-wider">
                  Live Govt. MSP Rates (2026 Season)
                </h3>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">Updated Daily by CACP</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {commodities.map(c => (
                <div key={c.id} className="bg-slate-50 dark:bg-neutral-950 border border-gray-100 dark:border-neutral-700 rounded-xl p-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <CropBadge name={c.name} size="xs" />
                      {c.season && (
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {c.season}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-extrabold text-green-700 mt-1">
                      â‚¹{Number(c.msp_rate_per_quintal).toLocaleString()} <span className="text-[10px] font-normal text-gray-500 dark:text-neutral-400 dark:text-neutral-400">/q</span>
                    </p>
                  </div>
                  <Link
                    href={`/farmer/book-slot?commodityId=${c.id}`}
                    className="mt-2 text-[10px] text-center font-semibold text-green-700 hover:text-green-800 bg-white dark:bg-neutral-800 border border-green-200 rounded-lg py-1 shadow-2xs hover:bg-green-50 transition"
                  >
                    Book Slot &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3-Day Mandi Weather & Moisture Precaution Advisory */}
        <WeatherAdvisory district={profile?.village || 'Regional Mandi Hub'} />

        {loading && (
          <div className="space-y-4">
            <BookingSkeleton />
            <BookingSkeleton />
          </div>
        )}

        {syncMessage && (
          <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg mb-4 text-sm">
            {syncMessage}
          </div>
        )}

        {!loading && getOfflineQueue().length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4 text-sm">
            ðŸ“¡ {getOfflineQueue().length} booking(s) queued offline â€” will sync when you reconnect.
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <EmptyState
            icon="ðŸŒ¾"
            title="No Bookings Yet"
            description="You haven't booked any procurement slots. Choose a centre and book your first slot easily."
            actionText="Book a Slot Now"
            onAction={() => router.push('/farmer/book-slot')}
          />
        )}

        {/* Upcoming Bookings */}
        {upcoming.length > 0 && (
          <>
            <h2 className="text-md font-semibold text-gray-700 dark:text-neutral-300 mb-3">ðŸ“… Upcoming</h2>
            <div className="space-y-4 mb-8">
              {upcoming.map(renderBookingCard)}
            </div>
          </>
        )}

        {/* Past Bookings */}
        {past.length > 0 && (
          <>
            <h2 className="text-md font-semibold text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mb-3">ðŸ“‹ Past / Completed</h2>
            <div className="space-y-3 opacity-80">
              {past.map(renderBookingCard)}
            </div>
          </>
        )}
        </div>
        <InstallPwaBanner />
        <FarmerBottomNav />
      </div>
    </PullToRefresh>
  );
}




