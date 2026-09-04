import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import { addToOfflineQueue } from '../../lib/offlineQueue';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import CropBadge from '../../components/CropBadge';
import { getCropConfig } from '../../lib/cropIcons';
import { useCentres } from '../../hooks/useCentres';
import { useCommodities } from '../../hooks/useCommodities';
import confetti from 'canvas-confetti';

const SLOT_WINDOWS = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

export default function BookSlot() {
  const { data: centres = [] } = useCentres();
  const { data: commodities = [] } = useCommodities();
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
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (router.query.commodityId) {
      setcommodityId(router.query.commodityId);
    }
  }, [router.query.commodityId]);

  useEffect(() => {
    // Fetch auto-suggestion
    const fetchSuggestion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch('/api/bookings/suggest', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const { suggestion: s } = await res.json();
          setSuggestion(s);
        }
      } catch (e) { /* ignore */ }
    };
    fetchSuggestion();
  }, []);

  const applySuggestion = () => {
    if (!suggestion) return;
    setCentreId(suggestion.centreId);
    setDate(suggestion.date);
    setSlotWindow(suggestion.slotWindow);
  };

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

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('slot_date')
        .eq('centre_id', centreId)
        .in('slot_date', dates)
        .neq('status', 'cancelled');

      const countMap = {};
      (bookingsData || []).forEach(b => {
        countMap[b.slot_date] = (countMap[b.slot_date] || 0) + 1;
      });

      const list = dates.map(dStr => {
        const booked = countMap[dStr] || 0;
        const available = Math.max(0, capacity - booked);
        const percent = Math.min(100, Math.round((booked / capacity) * 100));
        return {
          date: dStr,
          booked,
          capacity,
          available,
          percent,
        };
      });

      setAvailability(list);
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

    const bookingPayload = { centreId, commodityId, date, slotWindow, quantity };

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

      // If rescheduling, cancel the old booking
      const rescheduleId = router.query.reschedule;
      if (rescheduleId) {
        await fetch(`/api/bookings/${rescheduleId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ status: 'cancelled' }),
        }).catch(() => {});
      }
      // Success celebrations
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#059669', '#10b981', '#34d399', '#fbbf24'] // Green & Gold
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
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 px-4 pt-8 pb-28 sm:pb-10">
      <div className="max-w-lg mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-4">
          <Link href="/farmer/dashboard" className="text-green-800 text-sm font-medium hover:underline inline-flex items-center gap-1">
            &larr; {t('back')} 
          </Link>
        </div>

        {/* Auto-suggestion banner */}
        {suggestion && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">💡</span>
              <p className="text-sm font-bold text-emerald-900">{t('suggestedSlot')}</p>
            </div>
            <p className="text-xs text-emerald-800">
              Least crowded slot: <strong>{suggestion.centreName}</strong> ({suggestion.district}) on <strong>{suggestion.date}</strong> at <strong>{suggestion.slotWindow}</strong>
            </p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">
              ⚡ {suggestion.remainingCapacity} of {suggestion.dailyCapacity} slots remaining
            </p>
            <button
              onClick={applySuggestion}
              className="mt-2.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg font-semibold shadow-xs transition"
            >
              Apply Recommended Slot
            </button>
          </div>
        )}

        {/* Main Booking Wizard Card */}
        <div className="bg-white dark:bg-neutral-800 shadow-xl rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-neutral-700 transition-all">
          <div className="border-b border-gray-100 dark:border-neutral-700 pb-3 mb-5">
            <h1 className="text-xl font-bold text-gray-900 dark:text-neutral-100">Book a Procurement Slot</h1>
            <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mt-0.5">Government MSP Slot Allotment • Transparent 3-Step Booking</p>
          </div>

          {/* Stepper Header Pills */}
          <div className="flex items-center justify-between mb-6 px-1">
            {[
              { num: 1, title: 'Mandi & Crop', icon: '🌾' },
              { num: 2, title: 'date & Slot', icon: '📅' },
              { num: 3, title: 'Review & Book', icon: '📋' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => {
                    if (s.num < step) setStep(s.num);
                  }}
                  disabled={s.num > step}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                    step === s.num
                      ? 'bg-green-700 text-white shadow-sm ring-2 ring-green-100'
                      : step > s.num
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                      : 'bg-gray-100 dark:bg-neutral-800 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>{step > s.num ? '✓' : s.icon}</span>
                  <span className="hidden sm:inline">{s.title}</span>
                  <span className="sm:hidden">{s.num}</span>
                </button>
                {idx < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      step > s.num ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="mb-4 text-red-600 text-xs bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Mandi & Commodity */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                  1. {t('procurementCentre')} *
                </label>
                <select
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={centreId}
                  onChange={e => { setCentreId(e.target.value); setError(''); }}
                >
                  <option value="">Select centre</option>
                  {centres.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.district || 'Mandi'} ({c.state || 'Maharashtra'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Select the APMC yard closest to your farmland.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                  2. {t('Commodity')} *
                </label>
                <select
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={commodityId}
                  onChange={e => { setcommodityId(e.target.value); setError(''); }}
                >
                  <option value="">Select commodity</option>
                  {commodities.map(c => {
                    const crop = getCropConfig(c.name);
                    return (
                      <option key={c.id} value={c.id}>
                        {crop.icon} {c.name} — Govt MSP: ₹{Number(c.msp_rate_per_quintal).toLocaleString()}/quintal
                      </option>
                    );
                  })}
                </select>
                {selectedComm && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Selected Crop:</span>
                      <CropBadge name={selectedComm.name} size="sm" />
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-gray-500 dark:text-neutral-400 dark:text-neutral-400 block">MSP Rate</span>
                      <span className="text-xs font-bold text-green-800">₹{Number(selectedComm.msp_rate_per_quintal).toLocaleString()}/q</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!centreId || !commodityId) {
                    setError('Please select both a Mandi centre and a Commodity to proceed.');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="w-full mt-4 bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2"
              >
                Next: Choose date & Time Slot &rarr;
              </button>
            </div>
          )}

          {/* STEP 2: date & Time Window */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider">
                    Date & Mandi Capacity *
                  </label>
                  {availability.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setshowCustomDate(!showCustomDate)}
                      className="text-[11px] text-green-700 hover:text-green-800 font-semibold"
                    >
                      {showCustomDate ? '⚡ Show Capacity Cards' : '📅 Or pick specific calendar date'}
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
                        <button
                          type="button"
                          key={item.date}
                          onClick={() => { setDate(item.date); setError(''); }}
                          className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                            isSelected
                              ? 'border-green-600 bg-green-50/70 ring-2 ring-green-600/20 shadow-xs'
                              : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:border-neutral-600'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[11px] font-bold text-gray-900 dark:text-neutral-100 block leading-tight">{dayName}</span>
                              <span className="text-[10px] text-gray-500 dark:text-neutral-400 dark:text-neutral-400">{dayMonth}</span>
                            </div>
                            <span
                              className={`w-2 h-2 rounded-full mt-1 ${
                                isLow ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
                              }`}
                            />
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-neutral-700">
                            <p className="text-[10px] font-semibold text-gray-700 dark:text-neutral-300">
                              {item.available} <span className="text-[9px] font-normal text-gray-500 dark:text-neutral-400 dark:text-neutral-400">left</span>
                            </p>
                            <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-1 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isLow ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${item.percent}%` }}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="date"
                    className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none mb-2"
                    value={date}
                    onChange={e => { setDate(e.target.value); setError(''); }}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                  {t('timeWindow')} *
                </label>
                <select
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={slotWindow}
                  onChange={e => setSlotWindow(e.target.value)}
                >
                  {SLOT_WINDOWS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Arrival within this window guarantees priority weighbridge access.</p>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setError(''); setStep(1); }}
                  className="flex-1 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 text-gray-700 dark:text-neutral-300 rounded-xl py-3 font-semibold text-sm transition"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!date || !slotWindow) {
                      setError('Please select a date and time window.');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold text-sm shadow-sm transition"
                >
                  Next: Quantity & Review &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Quantity & Review Confirmation */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                  {t('expectedQuantity')} (Quintals)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="e.g. 25"
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                />
                <p className="text-[11px] text-gray-400 mt-1">Approximate harvest weight. Actual weight will be recorded at the digital weighbridge.</p>
              </div>

              {/* Live MSP Calculation Box */}
              {estPayout > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex justify-between items-center">
                  <div>
                    <p className="text-emerald-800 font-semibold">💰 Estimated Direct Benefit (DBT)</p>
                    <p className="text-emerald-600 text-[11px]">
                      {quantity} quintals × ₹{Number(selectedComm?.msp_rate_per_quintal || 0).toLocaleString()}/q
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-emerald-900">₹{Number(estPayout).toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-700">Directly deposited to bank account</p>
                  </div>
                </div>
              )}

              {/* Booking Summary Card */}
              <div className="bg-slate-50 dark:bg-neutral-950 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <p className="font-bold text-gray-800 dark:text-neutral-200 text-sm border-b border-slate-200 pb-1.5">
                  📋 Appointment Summary
                </p>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Mandi Centre:</span>
                  <span className="font-semibold text-gray-800 dark:text-neutral-200">{selectedCentre?.name || '-'} ({selectedCentre?.district})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Commodity:</span>
                  <CropBadge name={selectedComm?.name} size="xs" />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Inspection date:</span>
                  <span className="font-semibold text-gray-800 dark:text-neutral-200">{date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Time Window:</span>
                  <span className="font-semibold text-gray-800 dark:text-neutral-200">{slotWindow}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Moisture Standard:</span>
                  <span className="font-semibold text-emerald-700">&le; 12-14% Required</span>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setError(''); setStep(2); }}
                  className="flex-1 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 text-gray-700 dark:text-neutral-300 rounded-xl py-3 font-semibold text-sm transition"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold text-sm shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('bookingInProgress')}</span>
                    </>
                  ) : (
                    <span>Confirm Booking →</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <FarmerBottomNav />
    </div>
  );
}


