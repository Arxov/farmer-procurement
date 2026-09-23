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
import BookingStepper from '../../components/BookingStepper';
import PullToRefresh from '../../components/PullToRefresh';
import InstallPwaBanner from '../../components/InstallPwaBanner';
import VoiceAssistance from '../../components/VoiceAssistance';
import KisanMitraWidget from '../../components/KisanMitraWidget';
import { useFarmerBookings, bookingsQueryKeys } from '../../hooks/useBookings';
import { useCommodities } from '../../hooks/useCommodities';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function FarmerDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
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

  const trySyncOffline = async () => {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { synced, failed } = await syncOfflineQueue(session.access_token);
    if (synced > 0) {
      setSyncMessage(`✅ ${synced} offline booking(s) synced successfully!${failed > 0 ? ` ${failed} failed.` : ''}`);
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
      showToast('🚨 Your turn is near! Please proceed to the procurement bay.', 'info');
    } else if (!hasLeaveNow) {
      alertedRef.current = false;
    }
  }, [upcoming, audioAlerts, showToast]);

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
    const waitMins = b.queue_entries?.[0]?.estimated_wait_minutes;
    const today = new Date().toISOString().split('T')[0];
    const isLeaveNow = b.slot_date === today && waitMins != null && waitMins <= 45 && ['booked', 'checked_in'].includes(b.status);

    return (
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={b.id} id={`booking-${b.id}`} className={`bg-white dark:bg-neutral-800 rounded-xl shadow p-4 ${getBorderColor(b.status)} ${isLeaveNow ? 'ring-2 ring-orange-400' : ''}`}>
        {b.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <p className="font-bold text-red-800 text-sm">❌ Booking Rejected by Centre</p>
            {b.quality_notes && (
              <p className="text-xs text-red-700 mt-0.5">{b.quality_notes}</p>
            )}
            <Link href="/farmer/grievances" className="inline-block mt-2 text-xs font-medium text-red-800 underline hover:text-red-900">
              Have a concern? File a grievance &rarr;
            </Link>
          </div>
        )}

        {isLeaveNow && (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 mb-3 flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-bold text-orange-800 text-sm">
                {waitMins <= 15 ? "It's your turn!" : `Your turn is in ${waitMins} mins!`}
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
            <p className="text-xs text-gray-500 dark:text-neutral-400">{b.slot_date} — {b.slot_window}</p>
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
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              {t('queuePosition')}: <strong className="text-lg">{b.queue_entries[0].queue_position ?? '-'}</strong>
              <span className="mx-2">•</span>
              {t('estWait')}: <strong>{b.queue_entries[0].estimated_wait_minutes ?? '-'} {t('min')}</strong>
            </p>
          </div>
        )}

        <div className="mt-4 mb-3 pt-3 border-t border-slate-200">
          <BookingStepper status={b.status} />
        </div>

        {b.actual_weight_quintals && (
          <p className="text-sm mt-2 text-gray-600 dark:text-neutral-400">⚖️ Actual weight: <strong>{b.actual_weight_quintals}q</strong>
            {b.quality_grade && <span> • Grade: <strong>{b.quality_grade}</strong></span>}
          </p>
        )}

        {b.payments?.[0] && (
          <div className="mt-4 border border-emerald-100 dark:border-emerald-900/30 rounded-xl overflow-hidden">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 border-b border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Nodal Escrow Settlement
              </span>
              <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Simulated Sandbox</span>
            </div>
            
            <div className="p-3 bg-white dark:bg-neutral-800">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">
                    {b.payments[0].status === 'paid' ? '✅ Nodal Payout Released' : '⏳ Payout Processing'}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">TXN: KS-TXN-{b.payments[0].id?.slice(0,8) || '90218'}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600">
                    {b.payments[0].amount ? `₹${Number(b.payments[0].amount).toLocaleString()}` : 'Pending'}
                  </div>
                  <div className="text-[9px] text-gray-500">Direct Bank/UPI Credited</div>
                </div>
              </div>
              
              <div className="space-y-1.5 border-t border-gray-100 dark:border-neutral-700 pt-3">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Transaction Date</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{new Date(b.payments[0].updated_at || b.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Commodity & Grade</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{b.commodities?.name} • Grade {b.quality_grade || 'A'}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">UPI / Bank Handle</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200 flex items-center gap-1">
                    {profile?.phone?.slice(-4) || '1234'}****@okhdfc
                    <span className="text-emerald-600 border border-emerald-200 bg-emerald-50 px-1 rounded-sm text-[8px]">Verified</span>
                  </span>
                </div>
              </div>
              
              <details className="mt-3 text-[10px] group">
                <summary className="cursor-pointer text-blue-600 dark:text-blue-400 font-medium hover:underline outline-none">View Itemized Transparent Breakdown</summary>
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-100 dark:border-neutral-700">
                  <div className="flex justify-between"><span className="text-gray-500">Gross Value:</span><span className="text-gray-700 dark:text-neutral-300">₹{b.payments[0].amount ? Math.round(Number(b.payments[0].amount) * 1.05).toLocaleString() : '0'}</span></div>
                  <div className="flex justify-between text-red-600/80"><span className="">APMC Commission (5%):</span><span>-₹{b.payments[0].amount ? Math.round(Number(b.payments[0].amount) * 0.05).toLocaleString() : '0'}</span></div>
                  <div className="flex justify-between font-bold pt-1 border-t border-gray-50 dark:border-neutral-700"><span className="text-gray-700 dark:text-neutral-300">Net Realized:</span><span className="text-emerald-600">₹{b.payments[0].amount ? Number(b.payments[0].amount).toLocaleString() : '0'}</span></div>
                </div>
              </details>
            </div>
          </div>
        )}

        {['accepted', 'paid'].includes(b.status) && (
          <MandiFeedback bookingId={b.id} centreName={b.centres?.name || 'Mandi Centre'} />
        )}

        <div className="flex gap-2.5 mt-3 flex-wrap items-center">
          {['booked', 'checked_in'].includes(b.status) && (
            <Link href={`/farmer/token/${b.id}`} className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition inline-flex items-center gap-1">
              🎟️ Appointment Slip &rarr;
            </Link>
          )}
          
          {['booked'].includes(b.status) && (
            <a 
              href={`https://wa.me/?text=${encodeURIComponent('✅ Kisan Setu Booking Confirmed!\nMandi: ' + b.centres?.name + '\nDate: ' + b.slot_date + '\nTime: ' + b.slot_window)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition inline-flex items-center gap-1"
            >
              Share WhatsApp
            </a>
          )}
          {b.gate_passes?.[0] && (
            <Link href={`/farmer/gate-pass/${b.id}`} className="text-xs font-semibold text-green-800 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition inline-flex items-center gap-1">
              📄 Official Gate Pass &rarr;
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
                ✖ Cancel
              </button>
              <Link href={`/farmer/book-slot?reschedule=${b.id}`} className="text-sm text-blue-600 font-medium hover:underline">
                🔄 Reschedule
              </Link>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-[var(--chassis)] px-4 pt-10 pb-28 sm:pb-10 animate-fadeIn font-sans">
        <div className="max-w-2xl mx-auto">
          
          {/* Trust Badges & Language Toggle */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl border border-emerald-100 dark:border-emerald-800">
            <div className="flex gap-2 text-[9px] sm:text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> FCI APMC Grid Sync</span>
              <span className="flex items-center gap-1 text-blue-700 bg-blue-100/50 px-2 py-1 rounded-full">UIDAI Zero-Trust Verified</span>
            </div>
            
            <LanguageToggle />
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Dashboard</h1>
            <div className="flex gap-2 items-center flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setAudioAlerts(!audioAlerts)}
                className={`px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition flex items-center gap-1 shadow-card active:shadow-pressed active:translate-y-[2px] ${
                  audioAlerts ? 'bg-[#f8fafc] text-slate-700 border-slate-300' : 'bg-slate-200 text-slate-400 border-slate-300 shadow-recessed'
                }`}
                title={audioAlerts ? 'Audio alert enabled for your queue turn' : 'Audio alert muted'}
                aria-label={audioAlerts ? 'Mute queue audio alerts' : 'Enable queue audio alerts'}
              >
                <span>{audioAlerts ? '🔔' : '🔕'}</span>
                <span className="hidden sm:inline">{audioAlerts ? 'ALERTS ON' : 'MUTED'}</span>
              </button>
              <VoiceAssistance profile={profile} bookings={bookings} commodities={commodities} />
              <NotificationBell bookings={bookings} />
              <button onClick={handleLogout} className="bg-[#f8fafc] text-slate-600 border border-slate-300 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-card active:shadow-pressed active:translate-y-[2px]">LOGOUT</button>
            </div>
          </div>

          {/* Hardware Toggle Switch for Views */}
          <div className="bg-[#e8ecef] p-1.5 rounded-xl shadow-recessed border border-white/60 mb-6 flex gap-1 relative overflow-hidden">
            <Button
              variant={activeTab === 'bookings' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('bookings')}
              className={`flex-1 text-[10px] py-2 h-auto rounded-lg transition-all ${activeTab === 'bookings' ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.4)] text-amber-950 font-black' : 'bg-transparent border-transparent shadow-none text-slate-500 font-bold hover:bg-white/40'}`}
            >
              OPERATIONS
            </Button>
            <Button
              variant={activeTab === 'market' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('market')}
              className={`flex-1 text-[10px] py-2 h-auto rounded-lg transition-all ${activeTab === 'market' ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.4)] text-amber-950 font-black' : 'bg-transparent border-transparent shadow-none text-slate-500 font-bold hover:bg-white/40'}`}
            >
              TELEMETRY
            </Button>
            <Button
              variant={activeTab === 'passbook' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('passbook')}
              className={`flex-1 text-[10px] py-2 h-auto rounded-lg transition-all ${activeTab === 'passbook' ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.4)] text-amber-950 font-black' : 'bg-transparent border-transparent shadow-none text-slate-500 font-bold hover:bg-white/40'}`}
            >
              LEDGER
            </Button>
          </div>

          {loading && (
            <div className="space-y-4">
              <BookingSkeleton />
              <BookingSkeleton />
            </div>
          )}

          {syncMessage && (
            <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg mb-4 text-[10px] font-bold uppercase tracking-wider shadow-card">
              {syncMessage}
            </div>
          )}

          {!loading && offlineQueueCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 text-[10px] font-bold uppercase tracking-wider shadow-card">
              📡 {offlineQueueCount} LOG(S) QUEUED OFFLINE — PENDING SYNC.
            </div>
          )}

          {/* =======================
              OPERATIONS VIEW
              ======================= */}
          {activeTab === 'bookings' && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Quick Tools */}
              <div>
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">HARDWARE MODULES</h2>
                <div className="grid grid-cols-3 gap-3">
                  <Link href="/farmer/net-calculator" className="bg-[#f8fafc] p-3 rounded-xl shadow-card active:shadow-pressed active:translate-y-[2px] border border-slate-300 flex flex-col items-center justify-center text-center gap-2 transition-all duration-150">
                    <span className="text-2xl drop-shadow-sm">🧮</span>
                    <span className="text-[9px] font-black text-slate-600 leading-tight uppercase tracking-widest">NET CALC</span>
                  </Link>
                  <Link href="/farmer/price-outlook" className="bg-[#f8fafc] p-3 rounded-xl shadow-card active:shadow-pressed active:translate-y-[2px] border border-slate-300 flex flex-col items-center justify-center text-center gap-2 transition-all duration-150">
                    <span className="text-2xl drop-shadow-sm">📈</span>
                    <span className="text-[9px] font-black text-slate-600 leading-tight uppercase tracking-widest">RADAR</span>
                  </Link>
                  <Link href="/farmer/guidelines" className="bg-[#f8fafc] p-3 rounded-xl shadow-card active:shadow-pressed active:translate-y-[2px] border border-slate-300 flex flex-col items-center justify-center text-center gap-2 transition-all duration-150">
                    <span className="text-2xl drop-shadow-sm">📖</span>
                    <span className="text-[9px] font-black text-slate-600 leading-tight uppercase tracking-widest">MANUAL</span>
                  </Link>
                </div>
              </div>

              <div className="flex justify-between items-center mb-2 mt-4">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ACTIVE LOGS</h2>
                <Link href="/farmer/book-slot" className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-[0_2px_0_#047857] active:translate-y-[2px] active:shadow-none hover:bg-emerald-500 transition-all">
                  + NEW SLOT
                </Link>
              </div>

              {bookings.length === 0 && (
                <Card elevated={true} className="p-8 text-center bg-[#f8fafc] border border-slate-300">
                  <span className="text-4xl mb-3 block">🌾</span>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">NO LOGS DETECTED</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">You haven't booked any procurement slots.</p>
                  <Link href="/farmer/book-slot" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-[0_3px_0_#047857] active:translate-y-[3px] active:shadow-none hover:bg-emerald-500 transition-all inline-block">
                    INITIALIZE BOOKING
                  </Link>
                </Card>
              )}

              {upcoming.length > 0 && (
                <div className="space-y-4">
                  {upcoming.map(renderBookingCard)}
                </div>
              )}

              {past.length > 0 && (
                <>
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6 border-b-2 border-slate-300 pb-1">ARCHIVED LOGS</h2>
                  <div className="space-y-3 opacity-80 mt-3">
                    {past.map(renderBookingCard)}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* =======================
              TELEMETRY VIEW
              ======================= */}
          {activeTab === 'market' && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Seasonal Advisory */}
              <Card elevated={false} withScrews={false} className="bg-amber-100/50 border border-amber-300 p-4 shadow-recessed relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-amber-400 rounded-bl-full flex items-center justify-center shadow-inner opacity-40">
                  <span className="text-amber-900 font-bold -mt-2 -mr-2 text-xs">!</span>
                </div>
                <div className="flex items-start gap-3 relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1 border-b-2 border-amber-300/50 pb-0.5 inline-block">SEASONAL ADVISORY</p>
                    <p className="text-[11px] font-bold text-amber-900 uppercase leading-relaxed mt-1">
                      {new Date().getMonth() >= 9 || new Date().getMonth() <= 0
                        ? 'KHARIF PROCUREMENT SEASON IS ACTIVE. SOYABEAN, PADDY, COTTON, AND TUR ARE CURRENTLY BEING PROCURED AT YOUR NEARBY MANDIS.'
                        : new Date().getMonth() >= 2 && new Date().getMonth() <= 4
                        ? 'RABI PROCUREMENT SEASON IS ACTIVE. WHEAT, GRAM, JOWAR, AND ONION ARE CURRENTLY BEING PROCURED AT YOUR NEARBY MANDIS.'
                        : 'OFF-SEASON PERIOD. LIMITED PROCUREMENT IS UNDERWAY. CHECK GUIDELINES FOR NEXT SEASON PREPARATION TIPS.'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Live MSP Rate Board */}
              {commodities.length > 0 && (
                <Card className="p-4 border border-white/50" withScrews={true} withVents={true}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      LIVE GOVT. MSP RATES
                    </h3>
                    <span className="text-[8px] bg-red-100 text-red-800 border border-red-300 font-bold px-1.5 py-0.5 rounded shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> LIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {commodities.map(c => (
                      <div key={c.id} className="bg-[var(--chassis)] border border-white/60 shadow-recessed rounded-xl p-3 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2 border-b border-slate-300/50 pb-1">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest truncate max-w-[80%]">{c.name}</span>
                            <span className="text-base leading-none">🌾</span>
                          </div>
                          <div className="bg-[#9ea79a] shadow-[inset_0_2px_5px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,1)] p-2 rounded border-2 border-[#8b9588] text-center">
                            <p className="text-[8px] text-slate-800/60 font-black uppercase tracking-widest mb-0.5">RATE/QTL</p>
                            <p className="text-lg font-mono font-black text-slate-900 tracking-tighter leading-none">
                              ₹{Number(c.msp_rate_per_quintal).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/farmer/book-slot?commodityId=${c.id}`}
                          className="mt-3 text-[9px] text-center font-black text-emerald-800 uppercase tracking-widest bg-emerald-100 hover:bg-emerald-200 border-2 border-emerald-300 rounded shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.1)] py-1.5 transition-colors"
                        >
                          BOOK &rarr;
                        </Link>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Market Intelligence & Quality Analytics Card */}
              <Card className="border border-white/50 p-4" withScrews={true}>
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">
                  MARKET & QUALITY ANALYTICS
                </h3>
                
                {/* Acceptance Ratio */}
                {(() => {
                  const finished = bookings.filter(b => ['accepted', 'paid', 'rejected'].includes(b.status));
                  const accepted = finished.filter(b => ['accepted', 'paid'].includes(b.status)).length;
                  const ratio = finished.length > 0 ? Math.round((accepted / finished.length) * 100) : 100;
                  return (
                    <div className="mb-5 bg-[var(--chassis)] shadow-recessed rounded-xl p-3 border border-white/60">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">LIFETIME ACCEPTANCE RATIO</span>
                        <span className={`text-sm font-mono font-black ${ratio >= 90 ? 'text-emerald-600' : ratio >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                          {ratio}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-300 rounded-full h-2 shadow-inner overflow-hidden border border-slate-400">
                        <div className={`h-full border-r border-white/40 ${ratio >= 90 ? 'bg-emerald-500' : ratio >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-4">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200 pb-1">LIVE COMMODITY SPREADS</h4>
                  {commodities.slice(0, 5).map(c => {
                    const demandStatus = c.demand_status || 'normal';
                    const marketAdvisory = c.market_advisory;
                    const mockMarketPrice = Math.round(c.msp_rate_per_quintal * (demandStatus === 'high' ? 1.08 : demandStatus === 'oversupply' ? 0.95 : 1.02));
                    const aboveMsp = mockMarketPrice >= c.msp_rate_per_quintal;
                    
                    return (
                      <div key={c.id} className="bg-white border border-slate-300 rounded-lg p-2.5 shadow-[0_2px_5px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                            {c.name}
                            {demandStatus === 'high' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase shadow-sm">HIGH DEMAND</span>}
                            {demandStatus === 'oversupply' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-800 border border-red-300 uppercase shadow-sm">OVERSUPPLY</span>}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-[#f8fafc] shadow-recessed p-1.5 border border-slate-200 rounded text-center">
                            <p className="text-[8px] text-slate-500 font-bold uppercase">GOVT MSP</p>
                            <p className="text-xs font-mono font-black text-slate-700">₹{Number(c.msp_rate_per_quintal).toLocaleString()}</p>
                          </div>
                          <div className="bg-[#f8fafc] shadow-recessed p-1.5 border border-slate-200 rounded text-center">
                            <p className="text-[8px] text-slate-500 font-bold uppercase">OPEN MKT</p>
                            <p className={`text-xs font-mono font-black ${aboveMsp ? 'text-emerald-600' : 'text-red-600'}`}>₹{Number(mockMarketPrice).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        {marketAdvisory && (
                          <p className="text-[9px] font-bold text-amber-800 bg-amber-100/50 border border-amber-200 p-1.5 rounded uppercase">
                            ⚠️ {marketAdvisory}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              <WeatherAdvisory district={profile?.village || 'Regional Mandi Hub'} />

            </motion.div>
          )}

          {/* =======================
              LEDGER VIEW (PROFILE)
              ======================= */}
          {activeTab === 'passbook' && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Kisan Passbook Profile Card */}
              {profile && (
                <Card elevated={true} withScrews={true} className="bg-[#e8ecef] p-4 border border-white/50 shadow-floating">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-[11px] font-black text-slate-600 uppercase tracking-widest border-b-2 border-slate-300 pb-1">Kisan Passbook Identity</h2>
                    <div className="bg-emerald-100 border border-emerald-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] rounded px-2 py-0.5 flex items-center gap-1.5 text-[9px] text-emerald-800 font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse" /> UIDAI VERIFIED
                    </div>
                  </div>

                  <div className="bg-[#2d3436] p-4 rounded-xl shadow-[inset_0_3px_10px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.8)] border border-slate-900 mb-2 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_5px_rgba(52,211,153,0.4)] uppercase">{profile.full_name || 'KISAN MITRA'}</h3>
                        <p className="text-[10px] text-emerald-600/80 font-mono font-bold mt-1 uppercase tracking-widest">
                          MOB: {profile.phone || '-'} • LOC: {profile.village || 'APMC HUB'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t-2 border-dashed border-emerald-900/50">
                      <div>
                        <p className="text-[9px] text-emerald-700 font-black tracking-widest uppercase">LIFETIME DBT</p>
                        <p className="text-xl font-mono font-black text-emerald-400 tracking-tight mt-0.5">₹{totalEarnings.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-emerald-700 font-black tracking-widest uppercase">CROP VOL</p>
                        <p className="text-xl font-mono font-black text-emerald-400 tracking-tight mt-0.5">{totalQuintals.toLocaleString()} <span className="text-xs">Q</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] text-emerald-700 font-black tracking-widest uppercase">QUALITY IDX</p>
                        <p className="text-xl font-mono font-black text-emerald-400 tracking-tight mt-0.5">
                          {(() => {
                            const completed = bookings.filter(b => ['accepted', 'paid', 'rejected'].includes(b.status)).length;
                            const accepted = bookings.filter(b => ['accepted', 'paid'].includes(b.status)).length;
                            return completed > 0 ? Math.round((accepted / completed) * 100) : 100;
                          })()}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-emerald-700 font-black tracking-widest uppercase">PRI. COMMODITY</p>
                        <p className="text-sm font-mono font-black text-emerald-400 tracking-tight mt-2 truncate">
                          {(() => {
                            const counts = bookings.reduce((acc, b) => {
                              if (b.commodities?.name) acc[b.commodities.name] = (acc[b.commodities.name] || 0) + 1;
                              return acc;
                            }, {});
                            return Object.keys(counts).length > 0 ? Object.keys(counts).sort((a,b) => counts[b] - counts[a])[0].toUpperCase() : 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

        </div>
        <InstallPwaBanner />
        <FarmerBottomNav />
      </div>
      <KisanMitraWidget />
    </PullToRefresh>
  );
}
