import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import { addToOfflineQueue } from '../../lib/offlineQueue';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import CropBadge from '../../components/CropBadge';
import { getCropConfig } from '../../lib/cropIcons';
import { useCentres } from '../../hooks/useCentres';
import { useCommodities } from '../../hooks/useCommodities';
import confetti from 'canvas-confetti';
import LanguageToggle from '../../components/LanguageToggle';
import NumberTicker from '../../components/NumberTicker';

const SLOT_WINDOWS = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];
const EMPTY_ARRAY = [];

export default function BookSlot() {
  const { data = EMPTY_ARRAY } = useCentres();
  const centres = data;
  const { data: commoditiesData = EMPTY_ARRAY } = useCommodities();
  const commodities = commoditiesData;
  const [centreId, setCentreId] = useState('');
  const [commodityId, setcommodityId] = useState('');
  const [date, setDate] = useState('');
  const [slotWindow, setSlotWindow] = useState(SLOT_WINDOWS[0]);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [showCustomDate, setshowCustomDate] = useState(false);
  const [step, setStep] = useState(1);
  const [centreCommodities, setCentreCommodities] = useState([]);

  const router = useRouter();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (router.query.commodityId) {
      setcommodityId(router.query.commodityId);
    }
  }, [router.query.commodityId]);

  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const requestLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLocating(false);
    }, (err) => {
      console.error(err);
      alert('Could not get location. Ensure permissions are granted.');
      setLocating(false);
    });
  };

  useEffect(() => {
    const fetchSuggestion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const params = new URLSearchParams();
        if (location) {
          params.append('lat', location.lat);
          params.append('lng', location.lng);
        }
        if (commodityId) params.append('commodityId', commodityId);
        if (quantity) params.append('qty', quantity);

        const res = await fetch(`/api/bookings/suggest?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const { suggestion: s } = await res.json();
          setSuggestion(s);
        }
      } catch (e) { /* ignore */ }
    };

    const tId = setTimeout(fetchSuggestion, 400);
    return () => clearTimeout(tId);
  }, [commodityId, quantity, location]);

  const applySuggestion = () => {
    if (!suggestion) return;
    setCentreId(suggestion.centreId);
    setDate(suggestion.date);
    setSlotWindow(suggestion.slotWindow);
  };

  // Fetch which commodities this centre procures
  useEffect(() => {
    if (!centreId) { setCentreCommodities([]); return; }
    const fetchCC = async () => {
      const { data } = await supabase
        .from('centre_commodities')
        .select('commodity_id, procurement_start_month, procurement_end_month')
        .eq('centre_id', centreId);
      setCentreCommodities(data || []);
    };
    fetchCC();
  }, [centreId]);

  const [centreStats, setCentreStats] = useState(null);

  // Fetch Centre Stats when centreId changes
  useEffect(() => {
    if (!centreId) {
      setCentreStats(null);
      return;
    }
    const fetchStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch(`/api/centres/${centreId}/stats`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const stats = await res.json();

          const selectedCentre = centres.find(c => c.id === centreId);
          if (location && selectedCentre?.latitude) {
            const R = 6371;
            const dLat = (selectedCentre.latitude - location.lat) * Math.PI/180;
            const dLon = (selectedCentre.longitude - location.lng) * Math.PI/180;
            const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
                      Math.cos(location.lat*Math.PI/180)*Math.cos(selectedCentre.latitude*Math.PI/180) *
                      Math.sin(dLon/2)*Math.sin(dLon/2);
            stats.distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
          }

          setCentreStats(stats);
        }
      } catch (e) {
        console.error('Failed to load centre stats', e);
      }
    };
    fetchStats();
  }, [centreId, location, centres]);

  // Fetch slot availability for next 4 days when centre is selected
  useEffect(() => {
    if (!centreId) {
      setAvailability([]);
      return;
    }

    const fetchAvailability = async () => {
      const selectedCentre = centres.find(c => c.id === centreId);
      const capacity = selectedCentre?.daily_capacity || 100;

      const dates = [];
      for (let i = 0; i < 4; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/centres/${centreId}/availability?dates=${dates.join(',')}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        if (res.ok) {
          const { availability } = await res.json();
          setAvailability(availability || []);
        } else {
          setAvailability([]);
        }
      } catch (err) {
        console.error('Failed to fetch availability:', err);
        setAvailability([]);
      }
    };

    fetchAvailability();
  }, [centreId, centres]);

  const submit = async () => {
    if (!centreId || !commodityId || !date) {
      setError('Please fill in all required fields (Centre, Commodity, Date).');
      return;
    }
    if (quantity && (Number.isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0)) {
      setError('Expected Quantity must be a positive number.');
      return;
    }
    setLoading(true);
    setError('');

    const rescheduleId = router.query.reschedule;
    const bookingPayload = {
      centreId,
      commodityId,
      date,
      slotWindow,
      quantity: quantity.trim() === '' ? null : quantity,
      rescheduleId: rescheduleId || undefined
    };

    // Offline fallback: queue locally
    if (!navigator.onLine) {
      await addToOfflineQueue(bookingPayload);
      setLoading(false);
      alert('You are offline. Your booking has been saved and will be submitted automatically when you reconnect.');
      router.push('/farmer/dashboard');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(bookingPayload),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        setError(result.error || 'Something went wrong on the server.');
        return;
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#059669', '#10b981', '#34d399', '#fbbf24']
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }

      setTimeout(() => {
        router.push('/farmer/dashboard');
      }, 1500);
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedComm = commodities.find(c => c.id === commodityId);
  const selectedCentre = centres.find(c => c.id === centreId);
  const estPayout = selectedComm && quantity && !Number.isNaN(parseFloat(quantity))
    ? parseFloat(quantity) * parseFloat(selectedComm.msp_rate_per_quintal)
    : 0;

  return (
    <div className="min-h-screen bg-slate-100/90 dark:bg-neutral-950 px-4 pt-6 pb-28 sm:pb-12 text-slate-900 dark:text-white transition-colors">
      <div className="max-w-2xl mx-auto space-y-5 sm:border-x sm:border-slate-200/80 dark:sm:border-neutral-800/60 sm:min-h-screen sm:bg-slate-50/50 dark:sm:bg-neutral-950 sm:shadow-xs sm:px-4">

        {/* Top Executive Navigation Bar */}
        <div className="flex justify-between items-center bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-center gap-3">
            <motion.div whileTap={{ scale: 0.92 }}>
              <Link
                href="/farmer/dashboard"
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 flex items-center justify-center transition shadow-2xs"
                title={t('back', 'Back')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            </motion.div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-tight text-emerald-900 dark:text-emerald-400 font-display">KISAN SETU</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.2 rounded-md">
                  MSP ALLOTMENT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Central Mandi Procurement & Digital Weighbridge Registry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
          </div>
        </div>

        {/* Location & Smart Suggestion Recommendation Box */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={requestLocation}
              disabled={locating}
              className={`text-xs font-display font-bold px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs ${
                location
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-neutral-900 border-slate-200/80 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300'
              }`}
            >
              <span className="text-sm">📍</span>
              <span>
                {locating
                  ? 'Calculating Mandi Proximity...'
                  : location
                  ? 'Location Synchronized (Optimizing Transport)'
                  : 'Detect My Location (Find Closest Mandis)'}
              </span>
            </motion.button>
          </div>

          <AnimatePresence>
            {suggestion && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`border rounded-2xl p-4 shadow-2xs relative overflow-hidden ${
                  suggestion.netBenefit > 0
                    ? 'bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/20 dark:to-neutral-900 border-amber-200/80 dark:border-amber-800/60'
                    : 'bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-neutral-900 border-emerald-200/80 dark:border-emerald-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    <div>
                      <p className={`text-xs font-black font-display uppercase tracking-wider ${
                        suggestion.netBenefit > 0 ? 'text-amber-900 dark:text-amber-300' : 'text-emerald-900 dark:text-emerald-300'
                      }`}>
                        {suggestion.netBenefit > 0 ? 'Optimal Net Profit Recommendation' : 'Recommended Least-Crowded Mandi'}
                      </p>
                      <p className="text-xs text-slate-700 dark:text-neutral-300 font-sans mt-0.5 leading-relaxed">
                        {suggestion.netBenefit > 0 && suggestion.distanceKm !== null ? (
                          <>
                            Direct routing to <strong>{suggestion.centreName}</strong> on <strong>{suggestion.date}</strong> ({suggestion.slotWindow}).
                            Offering a <strong className="text-emerald-700 dark:text-emerald-400 font-mono">₹{suggestion.localBonus}</strong> local bonus per quintal.
                          </>
                        ) : (
                          <>
                            Recommended slot at <strong>{suggestion.centreName}</strong> ({suggestion.district}) on <strong>{suggestion.date}</strong> ({suggestion.slotWindow}).
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={applySuggestion}
                    className={`shrink-0 text-xs text-white px-3.5 py-1.5 rounded-xl font-display font-bold shadow-2xs transition-colors ${
                      suggestion.netBenefit > 0
                        ? 'bg-amber-700 hover:bg-amber-800'
                        : 'bg-emerald-700 hover:bg-emerald-800'
                    }`}
                  >
                    Apply Optimal Slot
                  </motion.button>
                </div>

                {suggestion.netBenefit > 0 && (
                  <div className="mt-3 bg-white/80 dark:bg-neutral-800/70 rounded-xl p-2.5 border border-amber-200/60 dark:border-amber-900/40 text-[11px] font-sans flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Estimated Net Gain:</span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      +₹{suggestion.netBenefit.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Wizard Card */}
        <div className="bg-white dark:bg-neutral-900 shadow-sm rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-neutral-800 ring-1 ring-slate-900/5 transition-all space-y-6">

          {/* Wizard Header & Stepper */}
          <div className="space-y-4 border-b border-slate-100 dark:border-neutral-800 pb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                Book a Procurement Slot
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Statutory MSP Slot Allotment • Transparent 3-Step Booking Protocol
              </p>
            </div>

            {/* Apple HIG Stepper Pills */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {[
                { num: 1, title: 'Mandi & Crop', icon: '🌾' },
                { num: 2, title: 'Date & Slot', icon: '📅' },
                { num: 3, title: 'Volume & Confirm', icon: '📋' },
              ].map((s, idx) => {
                const isCurrent = step === s.num;
                const isDone = step > s.num;

                return (
                  <div key={s.num} className="flex items-center flex-1 last:flex-none">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => { if (s.num < step) setStep(s.num); }}
                      disabled={s.num > step}
                      className={`flex items-center gap-2 text-xs font-display font-bold px-3 py-1.5 rounded-xl transition-all ${
                        isCurrent
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200 cursor-pointer'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-xs">{isDone ? '✓' : s.icon}</span>
                      <span className="hidden sm:inline">{s.title}</span>
                      <span className="sm:hidden">{s.num}</span>
                    </motion.button>
                    {idx < 2 && (
                      <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                        step > s.num ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-neutral-800'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Message Box */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </motion.div>
          )}

          {/* STEP 1: Mandi & Commodity */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                  1. {t('procurementCentre')} *
                </label>
                <div className="relative">
                  <select
                    className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-semibold appearance-none cursor-pointer"
                    value={centreId}
                    onChange={e => { setCentreId(e.target.value); setError(''); }}
                  >
                    <option value="">Select Mandi Centre</option>
                    {centres.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.district || 'Mandi'} ({c.state || 'Maharashtra'})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {centreStats && (
                  <div className="mt-3 bg-slate-50/80 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-3.5 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-display">
                      Mandi Operational Ledger
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="bg-white dark:bg-neutral-800 rounded-xl p-2.5 border border-slate-200/60 dark:border-neutral-700">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 block font-display">Farmers Served</span>
                        <p className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                          {centreStats.farmersServed}+
                        </p>
                      </div>

                      <div className="bg-white dark:bg-neutral-800 rounded-xl p-2.5 border border-slate-200/60 dark:border-neutral-700">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 block font-display">QC Rejection</span>
                        <p className={`text-sm font-black font-mono mt-0.5 ${centreStats.rejectionRate > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {centreStats.rejectionRate}%
                        </p>
                      </div>

                      {centreStats.distanceKm && (
                        <div className="bg-white dark:bg-neutral-800 rounded-xl p-2.5 border border-slate-200/60 dark:border-neutral-700 col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 block font-display">Radial Distance</span>
                          <p className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                            {centreStats.distanceKm} km
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Commodity Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                  2. {t('commodity')} *
                </label>
                <div className="relative">
                  <select
                    className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-semibold appearance-none cursor-pointer"
                    value={commodityId}
                    onChange={e => { setcommodityId(e.target.value); setError(''); }}
                  >
                    <option value="">Select Registered Commodity</option>
                    {commodities.map(c => {
                      const crop = getCropConfig(c.name);
                      return (
                        <option key={c.id} value={c.id}>
                          {crop.icon} {c.name} — Statutory MSP: ₹{Number(c.msp_rate_per_quintal).toLocaleString('en-IN')}/q
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {selectedComm && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-neutral-400 font-display">Target Crop:</span>
                      <CropBadge name={selectedComm.name} size="sm" />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-display block uppercase tracking-wider">Official MSP</span>
                      <span className="text-xs font-black font-mono text-emerald-800 dark:text-emerald-400">
                        ₹{Number(selectedComm.msp_rate_per_quintal).toLocaleString('en-IN')}/quintal
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quality & Moisture Advisory */}
              {selectedComm && (
                <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚖️</span>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 font-display">
                      Mandi Quality & Moisture Specification
                    </p>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-400 font-sans leading-relaxed">
                    {selectedComm.harvest_guidelines || (
                      selectedComm.name.toLowerCase().includes('wheat') || selectedComm.name.toLowerCase().includes('paddy')
                      ? 'Sun-dry produce for at least 48 hours. Max permissible moisture is 12-14%. Excessive moisture causes automatic rejection at the AI vision gate.'
                      : 'Ensure produce is sorted, free of stones, foreign plant matter, and moisture within statutory CACP guidelines.'
                    )}
                  </p>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => {
                  if (!centreId || !commodityId) {
                    setError('Please select both a Mandi centre and a Commodity to proceed.');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="w-full mt-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl py-3 font-display font-black text-sm shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue: Select Date & Time Slot</span>
                <span>&rarr;</span>
              </motion.button>
            </motion.div>
          )}

          {/* STEP 2: Date & Slot Window */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                    Mandi Daily Capacity & Date Selection *
                  </label>
                  {availability.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setshowCustomDate(!showCustomDate)}
                      className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-display font-bold cursor-pointer"
                    >
                      {showCustomDate ? '⚡ Show Live Capacity' : '📅 Custom Calendar Date'}
                    </button>
                  )}
                </div>

                {!showCustomDate && availability.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {availability.map((item) => {
                      const isSelected = date === item.date;
                      const d = new Date(item.date + 'T00:00:00');
                      const todayStr = new Date().toISOString().split('T')[0];
                      const tmrw = new Date();
                      tmrw.setDate(tmrw.getDate() + 1);
                      const tmrwStr = tmrw.toISOString().split('T')[0];

                      let dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
                      if (item.date === todayStr) dayName = 'Today';
                      else if (item.date === tmrwStr) dayName = 'Tomorrow';

                      const dayMonth = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                      const isLow = item.percent < 50;
                      const isMed = item.percent >= 50 && item.percent < 85;

                      return (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          key={item.date}
                          onClick={() => { setDate(item.date); setError(''); }}
                          className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-600/30 shadow-xs'
                              : 'border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-slate-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-bold font-display text-slate-900 dark:text-white block leading-tight">
                                {dayName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {dayMonth}
                              </span>
                            </div>
                            <span
                              className={`w-2 h-2 rounded-full mt-1 ${
                                isLow ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
                              }`}
                            />
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
                            <p className="text-[10px] font-mono font-bold text-slate-700 dark:text-neutral-300">
                              {item.available} slots left
                            </p>
                            <div className="w-full bg-slate-100 dark:bg-neutral-800 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isLow ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${item.percent}%` }}
                              />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="date"
                    className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none mb-2"
                    value={date}
                    onChange={e => { setDate(e.target.value); setError(''); }}
                  />
                )}
              </div>

              {/* Time Window Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                  {t('timeWindow')} *
                </label>
                <div className="relative">
                  <select
                    className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-mono font-bold appearance-none cursor-pointer"
                    value={slotWindow}
                    onChange={e => setSlotWindow(e.target.value)}
                  >
                    {SLOT_WINDOWS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Arrival within this 2-hour window guarantees priority weighbridge passage.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => { setError(''); setStep(1); }}
                  className="w-1/3 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-2xl py-3 font-display font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  &larr; Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    if (!date || !slotWindow) {
                      setError('Please select a date and time window.');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl py-3 font-display font-black text-xs sm:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                >
                  Continue: Volume & Confirmation &rarr;
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Quantity & Review Confirmation */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                  {t('expectedQuantity')} (Quintals) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="e.g. 25"
                    className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                    QUINTALS (q)
                  </div>
                </div>
              </div>

              {/* Live MSP Calculation Card */}
              {estPayout > 0 && (
                <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-emerald-900 dark:text-emerald-300 font-display font-bold text-xs">
                      💰 Projected Direct Benefit Transfer (DBT)
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-400 text-[11px] font-mono mt-0.5">
                      {quantity} q × ₹{Number(selectedComm?.msp_rate_per_quintal || 0).toLocaleString('en-IN')}/q
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black font-mono text-emerald-900 dark:text-emerald-200">
                      ₹<NumberTicker value={estPayout} />
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-display">Aadhaar PFMS Escrow</p>
                  </div>
                </div>
              )}

              {/* Statutory Appointment Summary Card */}
              <div className="bg-slate-50/80 dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-4 text-xs space-y-2.5">
                <p className="font-bold text-slate-900 dark:text-white text-xs border-b border-slate-200/60 dark:border-neutral-800 pb-2 font-display uppercase tracking-wider">
                  📋 Mandi Appointment Docket
                </p>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">Mandi Node:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedCentre?.name || '-'} ({selectedCentre?.district})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-neutral-400">Crop Consignment:</span>
                  <CropBadge name={selectedComm?.name} size="xs" />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">Procurement Date:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">{date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">Time Window:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">{slotWindow}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 dark:border-neutral-800 pt-2">
                  <span className="text-slate-500 dark:text-neutral-400">Moisture Threshold:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">&le; 12-14% Permissible</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => { setError(''); setStep(2); }}
                  className="w-1/3 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-2xl py-3 font-display font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  &larr; Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl py-3 font-display font-black text-xs sm:text-sm shadow-2xs hover:shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('bookingInProgress')}</span>
                    </>
                  ) : (
                    <span>Confirm Procurement Booking &rarr;</span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      <FarmerBottomNav />
    </div>
  );
}
