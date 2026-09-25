import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';
import CropBadge from '../../../components/CropBadge';
import NumberTicker from '../../../components/NumberTicker';

export default function AppointmentTokenPage() {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const router = useRouter();
  const { id } = router.query;
  const { t, language } = useLanguage();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*, centres(name, district, state), commodities(name, msp_rate_per_quintal), profiles(full_name, phone, village), queue_entries(queue_position, estimated_wait_minutes)')
        .eq('id', id)
        .single();

      setBooking(bookingData);
      setLoading(false);
    };
    load();
  }, [id, router]);

  // Voice Readout for Vernacular / Audio Accessibility
  const readAloud = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported on this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }

    const farmerName = booking?.profiles?.full_name || 'किसान';
    const centreName = booking?.centres?.name || 'मंडी केंद्र';
    const crop = booking?.commodities?.name || 'फसल';
    const date = booking?.slot_date || '';
    const windowTime = booking?.slot_window || '';

    let speechText = '';
    let speechLang = 'hi-IN';

    if (language === 'hi') {
      speechText = `नमस्ते ${farmerName} जी। आपका मंडी स्लॉट ${crop} के लिए ${centreName} में दिनांक ${date} को समय ${windowTime} बजे बुक है। कृपया अपना आधार कार्ड और बैंक पासबुक साथ लाएं।`;
      speechLang = 'hi-IN';
    } else {
      speechText = `Hello ${farmerName}. Your procurement slot for ${crop} at ${centreName} is confirmed for ${date} between ${windowTime}. Please carry your Aadhaar card and bank passbook to the centre.`;
      speechLang = 'en-IN';
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = speechLang;
    utterance.rate = 0.92;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
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

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-2xs border border-slate-200/80 dark:border-neutral-800 text-center space-y-3 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <p className="text-slate-800 dark:text-neutral-200 font-display font-bold">Booking Not Found</p>
          <p className="text-xs text-slate-500">The procurement record may have been reassigned or removed.</p>
          <Link
            href="/farmer/dashboard"
            className="inline-block bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-display font-bold transition shadow-2xs"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const qrData = JSON.stringify({
    token_id: booking.id,
    farmer: booking.profiles?.full_name,
    centre: booking.centres?.name,
    crop: booking.commodities?.name,
    date: booking.slot_date,
    slot: booking.slot_window,
  });

  const queueEntry = booking.queue_entries?.[0];

  return (
    <div className="min-h-screen bg-slate-100/90 dark:bg-neutral-950 px-4 py-8 print:bg-white print:p-0 text-slate-900 dark:text-white transition-colors">
      <div className="max-w-lg mx-auto space-y-4 sm:border-x sm:border-slate-200/80 dark:sm:border-neutral-800/60 sm:min-h-screen sm:bg-slate-50/50 dark:sm:bg-neutral-950 sm:shadow-xs sm:px-4">

        {/* Executive Action Header (Hidden during print) */}
        <div className="flex justify-between items-center print:hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Link
              href="/farmer/dashboard"
              className="text-emerald-800 dark:text-emerald-400 text-xs font-bold font-display hover:underline inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t('back')} to Dashboard</span>
            </Link>
          </motion.div>

          <div className="flex items-center gap-2">
            {/* Tactile Voice Readout Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={readAloud}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                isPlayingAudio
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
                  : 'bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <span className="flex gap-0.5 items-end h-3">
                    <span className="w-1 bg-white animate-bounce h-2" />
                    <span className="w-1 bg-white animate-bounce delay-75 h-3" />
                    <span className="w-1 bg-white animate-bounce delay-150 h-1.5" />
                  </span>
                  <span>Stop Voice</span>
                </>
              ) : (
                <>
                  <span>🔊</span>
                  <span>Audio Readout</span>
                </>
              )}
            </motion.button>

            {/* Print Slip Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => window.print()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-display font-bold shadow-2xs hover:shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Slip</span>
            </motion.button>
          </div>
        </div>

        {/* Apple Wallet Style Digital Token Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl border border-slate-200/90 dark:border-emerald-700 ring-1 ring-slate-900/5 overflow-hidden print:shadow-none print:border-2 print:border-black print:rounded-none">

          {/* National Tricolor Apex Ribbon */}
          <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-white to-green-600 print:h-1.5" />

          {/* Sovereign Mandi Header */}
          <div className="p-6 bg-slate-50/90 dark:bg-neutral-950 border-b border-slate-200/80 dark:border-neutral-800 text-center relative print:bg-white print:border-b-2 print:border-black">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-900 dark:text-emerald-400 bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-3 py-0.5 rounded-full inline-block mb-1.5 font-display print:border-black print:text-black">
              Official Appointment Token
            </span>
            <h1 className="text-lg sm:text-xl font-black font-display text-slate-900 dark:text-white print:text-black">
              MANDI ENTRY & WEIGHBRIDGE SLIP
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-sans print:text-black">
              Department of Food & Public Distribution • Govt. of India
            </p>

            <div className="mt-3 inline-flex items-center gap-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 px-3.5 py-1 rounded-xl shadow-2xs print:border-black">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-display print:text-black">Pass ID:</span>
              <span className="text-xs font-mono font-black text-slate-900 dark:text-white print:text-black">
                #{booking.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Docket Content Body */}
          <div className="p-6 space-y-4 print:p-4 print:space-y-3">

            {/* Live Queue Position Alert (if in queue) */}
            {queueEntry && (
              <div className="bg-blue-50/90 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 font-display">
                    Live Weighbridge Queue Standing
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                    Estimated waiting interval: ~{queueEntry.estimated_wait_minutes || 15} mins
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-blue-950 dark:text-blue-200">
                    #<NumberTicker value={queueEntry.queue_position || 1} />
                  </span>
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">In Line</p>
                </div>
              </div>
            )}

            {/* Designated Mandi & Slot Badge */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-[10px] uppercase font-black text-emerald-900 dark:text-emerald-300 tracking-wider font-display">
                    Designated Mandi Centre
                  </p>
                  <p className="text-sm font-black font-display text-slate-900 dark:text-white mt-0.5">
                    {booking.centres?.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {booking.centres?.district}, {booking.centres?.state || 'Maharashtra'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase font-black text-emerald-900 dark:text-emerald-300 tracking-wider font-display">
                    Scheduled Window
                  </p>
                  <p className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-200 mt-0.5">
                    {booking.slot_date}
                  </p>
                  <p className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {booking.slot_window}
                  </p>
                </div>
              </div>
            </div>

            {/* Beneficiary & Consignment Split */}
            <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-4 bg-slate-50/70 dark:bg-neutral-950">
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase font-display">
                  Beneficiary Farmer
                </p>
                <p className="font-black font-display text-slate-900 dark:text-white mt-0.5 text-xs sm:text-sm">
                  {booking.profiles?.full_name || 'Verified Beneficiary'}
                </p>
                <p className="text-slate-600 dark:text-slate-400 font-mono text-xs mt-0.5">
                  📱 {booking.profiles?.phone || '—'}
                </p>
                {booking.profiles?.village && (
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                    📍 {booking.profiles.village}
                  </p>
                )}
              </div>

              <div>
                <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase font-display">
                  Consignment Profile
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CropBadge name={booking.commodities?.name} size="xs" />
                  <span className="font-black font-display text-slate-900 dark:text-white">
                    {booking.commodities?.name}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-mono text-xs mt-1">
                  Volume: <strong>{booking.expected_quantity_quintals || '—'} q</strong>
                </p>
                <p className="text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs">
                  MSP: ₹{Number(booking.commodities?.msp_rate_per_quintal || 0).toLocaleString('en-IN')}/q
                </p>
              </div>
            </div>

            {/* QR Gate Verification & Status */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}`}
                  alt="Entry Scanner QR"
                  className="border-2 border-slate-300 dark:border-neutral-700 rounded-xl p-1 bg-white print:border-2 print:border-black"
                  width={100}
                  height={100}
                />
                <div>
                  <p className="text-xs font-bold font-display text-slate-900 dark:text-white">
                    Mandi Gate Clearance
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 max-w-[190px]">
                    Present this QR code to the boom-barrier scanner for instant driver check-in.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                  {(booking.status || 'CONFIRMED').replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Mandi Rules Checklist */}
            <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-4 text-[11px] text-amber-900 dark:text-amber-300 space-y-1.5 font-sans">
              <p className="font-bold text-xs text-amber-950 dark:text-amber-200 font-display uppercase tracking-wider">
                📋 Mandatory Farmer Instructions:
              </p>
              <p>• Arrive at least 15 minutes before your scheduled window (<strong>{booking.slot_window}</strong>).</p>
              <p>• Permissible moisture limit is strictly under 12-14% under statutory CACP norms.</p>
              <p>• Carry physical Aadhaar card and bank account passbook for instant DBT Aadhaar escrow authentication.</p>
            </div>

            <div className="text-center text-[10px] text-slate-400 font-mono pt-1">
              System Generated on {new Date(booking.created_at).toLocaleString('en-IN')} • Central CFPP Registry
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
