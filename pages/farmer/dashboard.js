import { playQueueChime, triggerQueueHaptic } from '../../lib/audioAlert';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useMemo } from 'react';
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
import LanguageToggle from '../../components/LanguageToggle';
import CropBadge from '../../components/CropBadge';
import PullToRefresh from '../../components/PullToRefresh';
import InstallPwaBanner from '../../components/InstallPwaBanner';
import VoiceAssistance from '../../components/VoiceAssistance';
import KisanMitraWidget from '../../components/KisanMitraWidget';
import NumberTicker from '../../components/NumberTicker';
import { useFarmerBookings, bookingsQueryKeys } from '../../hooks/useBookings';
import { useCommodities } from '../../hooks/useCommodities';
import { useQueryClient } from '@tanstack/react-query';

export default function FarmerDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'all'
  const [showAllCommodities, setShowAllCommodities] = useState(false);
  const queryClient = useQueryClient();
  const { data: commodities = [] } = useCommodities();
  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useFarmerBookings(user?.id);
  const loading = !profile || bookingsLoading;
  const [syncMessage, setSyncMessage] = useState('');
  const [audioAlerts, setAudioAlerts] = useState(true);
  const alertedRef = useRef(false);
  const router = useRouter();
  const channelRef = useRef(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const { t, language, changeLanguage } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateQueueCount = async () => {
        const queue = await getOfflineQueue();
        setOfflineQueueCount(queue.length);
      };

      updateQueueCount();

      const handleStorageChange = () => updateQueueCount();

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('online', handleStorageChange);
      window.addEventListener('focus', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('online', handleStorageChange);
        window.removeEventListener('focus', handleStorageChange);
      };
    }
  }, []);

  // Sync offline queue when online
  const trySyncOffline = async () => {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { synced, failed } = await syncOfflineQueue(session.access_token);
    if (synced > 0) {
      setSyncMessage(`${synced} offline booking(s) synced successfully!${failed > 0 ? ` ${failed} failed.` : ''}`);
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

        if (cancelled) return;
        if (!channelRef.current) {
          channelRef.current = supabase
            .channel('farmer-bookings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `farmer_id=eq.${currentUser.id}` }, () => {
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
  }, [queryClient, refetchBookings]);

  const handleRefresh = async () => {
    try {
      await refetchBookings();
      await trySyncOffline();
      showToast('Dashboard refreshed with latest Mandi updates', 'success');
    } catch (e) {
      showToast('Failed to refresh. Check your connection.', 'error');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = useMemo(() => bookings.filter(b => b.slot_date >= today && !['paid', 'cancelled', 'rejected'].includes(b.status)), [bookings, today]);
  const past = useMemo(() => bookings.filter(b => b.slot_date < today || ['paid', 'cancelled', 'rejected'].includes(b.status)), [bookings, today]);

  // Find active booking for today if any (Hero Card)
  const activeTodayBooking = useMemo(() => {
    return upcoming.find(b => b.slot_date === today && ['booked', 'checked_in', 'weighed', 'quality_checked'].includes(b.status));
  }, [upcoming, today]);

  // Whether the farmer should leave now (queue position <= 2)
  const leaveNow = useMemo(() => {
    return upcoming.some(b => {
      const q = b.queue_entries?.[0];
      return b.slot_date === today && q && ['booked', 'checked_in'].includes(b.status) && q.queue_position != null && q.queue_position <= 2;
    });
  }, [upcoming, today]);

  // Audio and Haptic queue turn alarm
  useEffect(() => {
    const hasLeaveNow = upcoming.some(b => {
      const q = b.queue_entries?.[0];
      return b.slot_date === today && q && ['booked', 'checked_in'].includes(b.status) && q.queue_position != null && q.queue_position <= 2;
    });

    if (hasLeaveNow && !alertedRef.current) {
      alertedRef.current = true;
      if (audioAlerts) {
        playQueueChime();
      }
      triggerQueueHaptic();
      showToast(t('leaveNowAlert'), 'info');
    } else if (!hasLeaveNow) {
      alertedRef.current = false;
    }
  }, [upcoming, audioAlerts, showToast, t, today]);

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

  const qualityRatio = useMemo(() => {
    const completed = bookings.filter(b => ['accepted', 'paid', 'rejected'].includes(b.status)).length;
    const accepted = bookings.filter(b => ['accepted', 'paid'].includes(b.status)).length;
    return completed > 0 ? Math.round((accepted / completed) * 100) : 100;
  }, [bookings]);

  const topCrop = useMemo(() => {
    const counts = bookings.reduce((acc, b) => {
      if (b.commodities?.name) acc[b.commodities.name] = (acc[b.commodities.name] || 0) + 1;
      return acc;
    }, {});
    const keys = Object.keys(counts);
    return keys.length > 0 ? keys.sort((a, b) => counts[b] - counts[a])[0] : 'N/A';
  }, [bookings]);

  const getStatusBadge = (status) => {
    const badges = {
      booked: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      checked_in: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      weighed: 'bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      quality_checked: 'bg-purple-50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      accepted: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      paid: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 font-bold',
      rejected: 'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      cancelled: 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300 border-gray-200 dark:border-neutral-700',
    };
    return badges[status] || badges.booked;
  };

  const displayedBookings = useMemo(() => {
    if (activeTab === 'upcoming') return upcoming;
    if (activeTab === 'past') return past;
    return bookings;
  }, [activeTab, upcoming, past, bookings]);

  const renderBookingCard = (b) => {
    const queuePos = b.queue_entries?.[0]?.queue_position;
    const waitMins = b.queue_entries?.[0]?.estimated_wait_minutes;
    const isLeaveNow = b.slot_date === today && waitMins != null && waitMins <= 45 && ['booked', 'checked_in'].includes(b.status);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        key={b.id}
        id={`booking-${b.id}`}
        className={`bg-white dark:bg-neutral-900 rounded-2xl p-5 border transition-all ${
          isLeaveNow
            ? 'border-amber-400 ring-4 ring-amber-100 dark:ring-amber-900/30 shadow-md'
            : 'border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 hover:shadow-md'
        }`}
      >
        {/* Rejection Alert Box */}
        {b.status === 'rejected' && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-3 mb-3 flex items-start gap-2.5">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-bold text-rose-900 dark:text-rose-200 text-xs">Booking Rejected by Procurement Centre</p>
              {b.quality_notes && (
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">{b.quality_notes}</p>
              )}
              <Link href="/farmer/grievances" className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300 underline hover:text-rose-900">
                <span>File an official grievance</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        )}

        {/* Leave Now Alert */}
        {isLeaveNow && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-3 mb-3 flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div className="flex-1">
              <p className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                {waitMins <= 15 ? "It's your turn at the gate!" : `Your turn is in ~${waitMins} mins`}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">Please proceed to the Mandi procurement bay now.</p>
            </div>
          </div>
        )}

        {/* Card Header: Crop, Centre, Date, Status */}
        <div className="flex justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <CropBadge name={b.commodities?.name} size="xs" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {b.centres?.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {b.slot_date}
              </span>
              <span>•</span>
              <span>{b.slot_window}</span>
            </div>
            {b.expected_quantity_quintals && (
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-1">
                {t('targetQty')}: <span className="font-bold text-slate-900 dark:text-white">{b.expected_quantity_quintals} {t('quintalUnit')}</span>
              </p>
            )}
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border h-fit capitalize ${getStatusBadge(b.status)}`}>
            {t(`status_${b.status}`, (b.status ?? '').replace(/_/g, ' '))}
          </span>
        </div>

        {/* Live Queue Position & Wait Callout */}
        {b.queue_entries?.[0] && ['booked', 'checked_in'].includes(b.status) && (
          <div className="mt-3 bg-slate-50 dark:bg-neutral-800/80 rounded-xl p-3 border border-slate-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-black text-sm flex items-center justify-center">
                #{b.queue_entries[0].queue_position ?? '-'}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">{t('queuePosition')}</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {t('estWait')}: <span className="text-emerald-700 dark:text-emerald-400 font-bold">{b.queue_entries[0].estimated_wait_minutes ?? '-'} {t('min')}</span>
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {t('liveQueue')}
            </span>
          </div>
        )}

        {/* 6-Stage Visual Stepper */}
        {!['cancelled', 'rejected'].includes(b.status) && (
          <div className="mt-4 mb-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-3 right-3 top-3 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-neutral-700 -z-0" />
              {(() => {
                const steps = ['booked', 'checked_in', 'weighed', 'quality_checked', 'accepted', 'paid'];
                const currentIndex = steps.indexOf(b.status);
                const pct = currentIndex > 0 ? (currentIndex / (steps.length - 1)) * 100 : 0;
                return (
                  <div
                    className="absolute left-3 top-3 -translate-y-1/2 h-0.5 bg-emerald-600 transition-all duration-500 -z-0"
                    style={{ width: `calc(${pct}% * 0.92)` }}
                  />
                );
              })()}

              {[
                { id: 'booked', label: t('stepBooked') },
                { id: 'checked_in', label: t('stepCheckIn') },
                { id: 'weighed', label: t('stepWeighed') },
                { id: 'quality_checked', label: t('stepQuality') },
                { id: 'accepted', label: t('stepAccepted') },
                { id: 'paid', label: t('stepPaid') },
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
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-white dark:bg-neutral-800 border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 shadow-md ring-2 ring-emerald-100 dark:ring-emerald-900/40'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 border border-slate-200 dark:border-neutral-700'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-[9px] mt-1 font-semibold text-center whitespace-nowrap ${
                        isCurrent
                          ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                          : isCompleted
                          ? 'text-slate-700 dark:text-neutral-300'
                          : 'text-slate-400 dark:text-neutral-500'
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
          <div className="mt-3 bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-2.5 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between border border-slate-200/50 dark:border-neutral-800">
            <span className="flex items-center gap-1.5 font-medium">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              {t('actualWeight')}: <strong className="text-slate-900 dark:text-white font-bold">{b.actual_weight_quintals} {t('quintalUnit')}</strong>
            </span>
            {b.quality_grade && (
              <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md text-[11px]">
                {t('grade')} {b.quality_grade}
              </span>
            )}
          </div>
        )}

        {/* Nodal Escrow Settlement */}
        {b.payments?.[0] && (
          <div className="mt-4 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 border-b border-emerald-100 dark:border-emerald-900/40 flex justify-between items-center">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('nodalSettlement')}
              </span>
              <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                {t('verified')}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-neutral-900">
              <div className="flex justify-between items-start mb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {b.payments[0].status === 'paid' ? (
                      <>
                        <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span>{t('payoutReleased')}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                        <span>{t('payoutProcessing')}</span>
                      </>
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">TXN: KS-TXN-{b.payments[0].id?.slice(0, 8) || '90218'}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {b.payments[0].amount ? `₹${Number(b.payments[0].amount).toLocaleString('en-IN')}` : 'Pending'}
                  </div>
                  <div className="text-[9px] text-slate-400">Direct Bank / DBT</div>
                </div>
              </div>

              <div className="space-y-1 border-t border-slate-100 dark:border-neutral-800 pt-2 text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Commodity & Grade</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{b.commodities?.name} • Grade {b.quality_grade || 'A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Direct Credit Handle</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {profile?.phone?.slice(-4) || '1234'}****@okhdfc
                  </span>
                </div>
              </div>

              <details className="mt-2 text-[10px] group">
                <summary className="cursor-pointer text-emerald-700 dark:text-emerald-400 font-semibold hover:underline outline-none">
                  {t('viewBreakdown')}
                </summary>
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-200 dark:border-neutral-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Value:</span>
                    <span className="text-slate-700 dark:text-slate-300">₹{b.payments[0].amount ? Math.round(Number(b.payments[0].amount) * 1.05).toLocaleString('en-IN') : '0'}</span>
                  </div>
                  <div className="flex justify-between text-rose-600/80">
                    <span>APMC Cess (5%):</span>
                    <span>-₹{b.payments[0].amount ? Math.round(Number(b.payments[0].amount) * 0.05).toLocaleString('en-IN') : '0'}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-100 dark:border-neutral-800">
                    <span className="text-slate-700 dark:text-slate-300">Net Realized:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">₹{b.payments[0].amount ? Number(b.payments[0].amount).toLocaleString('en-IN') : '0'}</span>
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}

        {/* 5-Star Mandi Feedback for Completed/Accepted Procurements */}
        {['accepted', 'paid'].includes(b.status) && (
          <MandiFeedback bookingId={b.id} centreName={b.centres?.name || 'Mandi Centre'} />
        )}

        {/* Action Buttons Row */}
        <div className="flex gap-2 mt-4 flex-wrap items-center pt-3 border-t border-slate-100 dark:border-neutral-800">
          {['booked', 'checked_in'].includes(b.status) && (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Link
                href={`/farmer/token/${b.id}`}
                className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition inline-flex items-center gap-1.5 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{t('appointmentSlip')}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </motion.div>
          )}

          {['booked'].includes(b.status) && (
            <motion.div whileTap={{ scale: 0.95 }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Kisan Setu Booking Confirmed!\nMandi: ' + b.centres?.name + '\nDate: ' + b.slot_date + '\nTime: ' + b.slot_window)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-3.5 py-2 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/60 transition inline-flex items-center gap-1.5 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
                <span>{t('shareWhatsApp')}</span>
              </a>
            </motion.div>
          )}

          {b.gate_passes?.[0] && (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Link
                href={`/farmer/gate-pass/${b.id}`}
                className="text-xs font-semibold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-3.5 py-2 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/60 transition inline-flex items-center gap-1.5 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>{t('officialGatePass')}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </motion.div>
          )}

          {b.status === 'booked' && (
            <div className="ml-auto flex items-center gap-3">
              <motion.div whileTap={{ scale: 0.95 }}>
                <Link
                  href={`/farmer/book-slot?reschedule=${b.id}`}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 py-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{t('reschedule')}</span>
                </Link>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }}>
                <button
                  type="button"
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
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 py-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{t('cancelBooking')}</span>
                </button>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-slate-100/90 dark:bg-neutral-950 pb-28 sm:pb-12 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5 sm:border-x sm:border-slate-200/80 dark:sm:border-neutral-800/60 sm:min-h-screen sm:bg-slate-50/50 dark:sm:bg-neutral-950 sm:shadow-xs">

          {/* Top Brand Bar & Trust Indicators */}
          <div className="flex justify-between items-center bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center shadow-xs shrink-0">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m0-18c-2.5 3-5 5-5 9 0 3 2 5 5 9m0-18c2.5 3 5 5 5 9 0 3-2 5-5 9m-8-9c1.5-1 3-1.5 5-1.5s3.5.5 5 1.5m-10 4c1.5-1 3-1.5 5-1.5s3.5.5 5 1.5" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-tight text-emerald-900 dark:text-emerald-400">KISAN SETU</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">• APMC Grid</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    {t('fciSync')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageToggle />
              <NotificationBell bookings={bookings} />
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

          {/* Official Government Farmer Registry Certificate & Mandi Hub Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 space-y-4">
            {/* Certificate Header Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-neutral-800/80 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600/10 dark:bg-emerald-400/10 border border-emerald-500/25 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 shadow-2xs">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-neutral-700">
                      {t('farmerRegistryCert')}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      ID: MH-REG-2026-F{String(profile?.phone || '2026').slice(-4)}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-0.5">
                    {profile?.full_name || 'Kisan Mitra'}
                  </h1>
                </div>
              </div>

              {/* Primary Book Slot Action & Audio Assistance */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <motion.div whileTap={{ scale: 0.96 }} className="flex-1 sm:flex-none">
                  <Link
                    href="/farmer/book-slot"
                    className="min-h-[46px] bg-[#0c5c36] hover:bg-[#0a4d2d] text-white px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-display font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2 select-none w-full sm:w-auto"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{t('bookSlot')}</span>
                  </Link>
                </motion.div>

                {/* Voice Assistance Read-Aloud for Accessibility */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <VoiceAssistance profile={profile} bookings={bookings} commodities={commodities} />
                </div>
              </div>
            </div>

            {/* Verified Farmer Credentials & Mandi Jurisdiction Bar (Streamlined) */}
            <div className="bg-slate-50/90 dark:bg-neutral-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-neutral-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap text-slate-700 dark:text-neutral-300">
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  APMC {profile?.village || 'Regional'} Central Hub
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-neutral-400">MH-PUN-042</span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 hidden sm:inline">{t('nodalAgencies')}</span>
              </div>

              {/* Clean Trust Verification Badges (Fully Legible, No Truncation) */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                <span className="inline-flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300/60 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{language === 'mr' ? 'आधार (UIDAI)' : language === 'hi' ? 'आधार (UIDAI)' : 'Aadhaar (UIDAI)'}</span>
                </span>

                <span className="inline-flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300/60 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{language === 'mr' ? `७/१२ भूलेख (${profile?.land_holding_acres || '2.5'} ac)` : language === 'hi' ? `भूलेख खतौनी (${profile?.land_holding_acres || '2.5'} ac)` : `7/12 Land Record (${profile?.land_holding_acres || '2.5'} ac)`}</span>
                </span>

                <span className="inline-flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300/60 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{language === 'mr' ? 'NPCI बँक सीडिंग' : language === 'hi' ? 'NPCI बैंक सीडिंग' : 'NPCI Bank Seeded'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Official Mandi Bulletin & Real-Time Active Alert Notice Strip */}
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-700/50 rounded-2xl px-4 py-2.5 shadow-xs relative overflow-hidden backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 shrink-0">
                  {t('mandiBulletinTitle')}:
                </span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  {activeTodayBooking && activeTodayBooking.queue_entries?.[0]?.queue_position <= 3
                    ? (leaveNow ? t('leaveNowAlert') : `${t('queuePosition')}: #${activeTodayBooking.queue_entries[0].queue_position} — ${language === 'mr' ? 'वाहने वजनकाट्याकडे आणावीत' : language === 'hi' ? 'वाहन धर्मकांटे पर लाएं' : 'Proceed to weighbridge'}`)
                    : activeTodayBooking?.gate_passes?.[0]
                    ? (language === 'mr' ? `नमुना ४-अ ई-गेट पास तयार (${activeTodayBooking.commodities?.name || 'धान्य'}). स्कॅन करा.` : language === 'hi' ? `प्रारूप ४-क ई-गेट पास तैयार है। प्रवेश द्वार पर प्रस्तुत करें।` : `Form 4-A APMC Inward Pass is ready. Scan at weighbridge entrance.`)
                    : t('mandiStatutoryNotice')}
                </p>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-farmer-notifications'));
                  }
                }}
                className="shrink-0 text-xs font-bold text-amber-900 dark:text-amber-300 hover:text-amber-950 underline decoration-amber-400 underline-offset-2 flex items-center gap-1 self-end sm:self-auto"
              >
                <span>{t('viewAllAlerts')}</span>
                <span>→</span>
              </motion.button>
            </div>
          </div>

          {/* Dynamic Hero: Form 4-A APMC Inward Electronic Pass (Legal Metrology Act 2009 Certified) */}
          {activeTodayBooking && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-gradient-to-br from-neutral-900 via-slate-900 to-amber-950/85 rounded-3xl p-5 text-white shadow-xl border-2 border-amber-500/50 relative overflow-hidden backdrop-blur-xl"
            >
              {/* Radial ambient glow & border beam effect */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-orange-600/15 rounded-full blur-2xl pointer-events-none" />

              <div className="flex justify-between items-center mb-3.5 relative z-10 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-500/30 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2">
                    {/* Calibrated Multi-Ring Radar Beacon */}
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 shadow-xs"></span>
                    </span>
                    <span>{t('form4aPassTitle')}</span>
                  </span>
                  <span className="text-[9.5px] font-bold text-amber-300/80 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md hidden sm:inline">
                    {t('legalMetrologyCertified')}
                  </span>
                </div>
                <span className="text-xs font-semibold text-amber-200/90 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                  {activeTodayBooking.slot_window}
                </span>
              </div>

              <div className="flex justify-between items-baseline mb-4 relative z-10">
                <div>
                  <h3 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white flex items-center gap-2">
                    <span>Token #{activeTodayBooking.queue_entries?.[0]?.queue_position ?? '01'}</span>
                    <span className="text-[11px] font-mono font-normal text-emerald-400 bg-emerald-950/80 border border-emerald-600/50 px-2 py-0.5 rounded-full">
                      APMC-GATE-OK
                    </span>
                  </h3>
                  <p className="text-xs font-semibold text-amber-100/90 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>{activeTodayBooking.commodities?.name}</span>
                    <span>•</span>
                    <span>{activeTodayBooking.centres?.name}</span>
                    <span>•</span>
                    <span className="text-amber-300 font-bold">{t('cacpGradeANorm')}</span>
                  </p>
                </div>
                {activeTodayBooking.queue_entries?.[0]?.estimated_wait_minutes != null && (
                  <div className="text-right bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-amber-300/80">{t('estWait')}</span>
                    <p className="text-2xl sm:text-3xl font-black font-display text-amber-400">
                      ~{activeTodayBooking.queue_entries[0].estimated_wait_minutes} <span className="text-xs font-normal text-amber-200">{t('min')}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 relative z-10">
                <motion.div whileTap={{ scale: 0.96 }} className="flex-1">
                  <Link
                    href={`/farmer/token/${activeTodayBooking.id}`}
                    className="w-full bg-white text-slate-900 py-2.5 rounded-xl text-center text-xs font-bold shadow-md hover:bg-slate-100 transition inline-flex items-center justify-center gap-1.5"
                  >
                    <span>{t('appointmentSlip')} (Form 3)</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </motion.div>
                {activeTodayBooking.gate_passes?.[0] && (
                  <motion.div whileTap={{ scale: 0.96 }} className="flex-1">
                    <Link
                      href={`/farmer/gate-pass/${activeTodayBooking.id}`}
                      className="w-full bg-white/10 border border-white/20 text-white py-2.5 rounded-xl text-center text-xs font-bold hover:bg-white/20 transition inline-flex items-center justify-center gap-1.5 backdrop-blur-md"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span>{t('officialGatePass')} (Form 4-A)</span>
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Official PFMS Direct Benefit Transfer (DBT) Escrow Passbook */}
          <div className="bg-gradient-to-br from-[#062817] via-[#0b1f15] to-[#041a0f] rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-emerald-500/20 relative overflow-hidden space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-800/60 pb-3 flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="text-base sm:text-lg font-black font-display text-white tracking-tight">
                    {t('kisanPassbook')} • {t('pfmsEscrowHeader')}
                  </h2>
                </div>
                <p className="text-[11px] text-emerald-300/80 mt-0.5 font-mono">
                  NPCI Aadhar Pay: ****{String(profile?.phone || '2026').slice(-4)}@okhdfc • {t('zeroMiddleman')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/60 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                  {t('treasuryCleared')}
                </span>
              </div>
            </div>

            {/* Lifetime Procurement Stats Grid with Animated Spring NumberTicker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:border-emerald-500/30 transition">
                <p className="text-[10.5px] text-emerald-300 font-extrabold uppercase tracking-wider">{t('dbtEarned')}</p>
                <p className="text-2xl sm:text-3xl font-black font-display text-emerald-300 tracking-tight mt-1">
                  <NumberTicker value={totalEarnings} prefix="₹" className="text-2xl sm:text-3xl font-black font-display text-emerald-300 tracking-tight" />
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:border-emerald-500/30 transition">
                <p className="text-[10.5px] text-emerald-300 font-extrabold uppercase tracking-wider">{t('procuredQty')}</p>
                <p className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight mt-1">
                  <NumberTicker value={totalQuintals} suffix=" q" className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight" />
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:border-emerald-500/30 transition">
                <p className="text-[10.5px] text-emerald-300 font-extrabold uppercase tracking-wider">{t('qualityScore')}</p>
                <p className="text-2xl sm:text-3xl font-black font-display text-emerald-300 tracking-tight mt-1">
                  <NumberTicker value={qualityRatio} suffix="% A" className="text-2xl sm:text-3xl font-black font-display text-emerald-300 tracking-tight" />
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-3 border border-white/5 hover:border-emerald-500/30 transition">
                <p className="text-[10.5px] text-emerald-300 font-extrabold uppercase tracking-wider">{t('topCrop')}</p>
                <p className="text-base sm:text-lg font-black font-display text-white mt-2 truncate">
                  {topCrop}
                </p>
              </div>
            </div>

            {/* PFMS Settlement Assurance Micro-footer */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-emerald-300/70 border-t border-emerald-900/50">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{t('pfmsEscrowNote')}</span>
              </span>
              <span className="font-semibold text-emerald-400 hidden sm:inline">FCI • Nodal Escrow</span>
            </div>
          </div>

          {/* Live MSP Rate Board with CACP Statutory Notifications */}
          {commodities.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black font-display text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{t('liveMspRates')}</span>
                      <span className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        {t('cacpMspTitle')}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {t('cacpMspSubtitle')}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                  {t('updatedDaily')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(showAllCommodities ? commodities : commodities.slice(0, 6)).map(c => (
                  <motion.div
                    key={c.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-slate-50/90 dark:bg-neutral-800/60 border border-slate-200/80 dark:border-neutral-700/60 rounded-2xl p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <CropBadge name={c.name} size="xs" />
                        {c.season && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {c.season}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-black font-display text-emerald-700 dark:text-emerald-400 mt-1">
                        ₹{Number(c.msp_rate_per_quintal).toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/q</span>
                      </p>
                    </div>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Link
                        href={`/farmer/book-slot?commodityId=${c.id}`}
                        className="mt-2.5 text-[11px] text-center font-bold font-display text-emerald-800 dark:text-emerald-300 bg-white dark:bg-neutral-800 border border-emerald-200 dark:border-emerald-800 rounded-xl py-1 shadow-2xs hover:bg-emerald-50 dark:hover:bg-neutral-700 transition block"
                      >
                        {t('bookSlot')} &rarr;
                      </Link>
                    </motion.div>
                  </motion.div>
                ))}
              </div>

              {commodities.length > 6 && (
                <div className="mt-3 text-center">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowAllCommodities(!showAllCommodities)}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-1.5 rounded-xl transition inline-flex items-center gap-1.5"
                  >
                    <span>
                      {showAllCommodities
                        ? t('showLess')
                        : t('viewAllRates').replace('{count}', commodities.length)}
                    </span>
                    <span>{showAllCommodities ? '▴' : '▾'}</span>
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {/* Quick Services 4-Grid with Tactile Micro-Interactions */}
          <div>
            <h2 className="text-xs font-black font-display text-slate-500 uppercase tracking-wider mb-2.5 px-1">{t('quickTools')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/farmer/net-calculator"
                  className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-1.5 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-neutral-800/80 transition group h-full"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold font-display text-slate-800 dark:text-slate-200">{t('netCalc')}</span>
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/farmer/price-outlook"
                  className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-1.5 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-neutral-800/80 transition group h-full"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold font-display text-slate-800 dark:text-slate-200">{t('priceTrend')}</span>
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/farmer/guidelines"
                  className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-1.5 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-neutral-800/80 transition group h-full"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold font-display text-slate-800 dark:text-slate-200">{t('guidelines')}</span>
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/farmer/grievances"
                  className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-1.5 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-neutral-800/80 transition group h-full"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold font-display text-slate-800 dark:text-slate-200">{t('grievanceDesk')}</span>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Statutory Public Services Guarantee Act & Mandi Grievance Hotline Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black font-display text-amber-900 dark:text-amber-300">
                    {t('publicServicesAct')}
                  </span>
                  <span className="text-[9px] font-bold bg-amber-200/60 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                    SLA: 3 Hrs
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                  {t('publicServicesSLA')}
                </p>
              </div>
            </div>

            <Link
              href="/farmer/grievances"
              className="min-h-[40px] px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-display text-xs rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto"
            >
              <span>{t('fileMandiDispute')}</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <WeatherAdvisory district={profile?.village || 'Regional Mandi Hub'} />

          {/* Sync & Offline Alerts */}
          {syncMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-2xl text-xs font-semibold shadow-2xs">
              {syncMessage}
            </div>
          )}

          {!loading && offlineQueueCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-2xl text-xs font-semibold shadow-2xs flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.343 9.343c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <span>{offlineQueueCount} booking(s) queued offline — will sync when you reconnect.</span>
            </div>
          )}

          {/* Bookings Section with Apple HIG Segmented Control */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white tracking-tight">{t('myBookings')}</h2>
              <span className="text-xs text-slate-400 font-medium">{bookings.length} Total</span>
            </div>

            {/* Apple HIG Segmented Control */}
            <div className="bg-slate-200/70 dark:bg-neutral-800/80 p-1 rounded-2xl flex gap-1 relative border border-slate-200/80 dark:border-neutral-700/80 mb-4 select-none">
              {[
                { id: 'upcoming', label: t('upcoming'), count: upcoming.length },
                { id: 'past', label: t('pastCompleted'), count: past.length },
                { id: 'all', label: t('allBookings'), count: bookings.length },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors relative z-10 flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="activeBookingTab"
                        className="absolute inset-0 bg-white dark:bg-neutral-700 rounded-xl shadow-xs -z-10"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="font-display font-bold">{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-slate-100 dark:bg-neutral-600 text-slate-800 dark:text-slate-200'
                          : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Loading Skeleton */}
            {loading && (
              <div className="space-y-4">
                <BookingSkeleton />
                <BookingSkeleton />
              </div>
            )}

            {/* Empty State */}
            {!loading && displayedBookings.length === 0 && (
              <EmptyState
                title={t('noBookingsCategory')}
                description={
                  activeTab === 'upcoming'
                    ? t('noUpcomingDesc')
                    : t('noPastDesc')
                }
                actionText={t('bookSlot')}
                onAction={() => router.push('/farmer/book-slot')}
              />
            )}

            {/* Bookings Feed */}
            {!loading && displayedBookings.length > 0 && (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {displayedBookings.map(renderBookingCard)}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>

        <InstallPwaBanner />
        <FarmerBottomNav />
      </div>
      <KisanMitraWidget profile={profile} bookings={bookings} commodities={commodities} />
    </PullToRefresh>
  );
}
