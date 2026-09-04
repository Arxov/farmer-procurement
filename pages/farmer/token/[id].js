import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';

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

  // Voice Readout for Accessibility (Illiterate / Vernacular Farmers)
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
      speechText = `नमस्ते ${farmerName} जी। आपका मंडी स्लॉट ${crop} के लिए ${centreName} में दिनांक ${date} को समय ${windowTime} बजे बुक है। कृपया अपना आधार कार्ड साथ लाएं।`;
      speechLang = 'hi-IN';
    } else {
      speechText = `Hello ${farmerName}. Your procurement slot for ${crop} at ${centreName} is confirmed for ${date} between ${windowTime}. Please carry your Aadhaar card to the centre.`;
      speechLang = 'en-IN';
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = speechLang;
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>{t('loading')}</p></div>;

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl shadow text-center">
          <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Booking not found.</p>
          <Link href="/farmer/dashboard" className="text-green-700 text-sm font-semibold mt-2 inline-block">
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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-neutral-900 px-4 py-8 print:bg-white dark:bg-neutral-800 print:p-0">
      <div className="max-w-lg mx-auto">
        {/* Navigation Actions */}
        <div className="flex justify-between items-center mb-4 print:hidden">
          <Link href="/farmer/dashboard" className="text-green-800 text-xs font-semibold hover:underline inline-flex items-center gap-1">
            &larr; {t('back')} to Dashboard
          </Link>
          <div className="flex gap-2">
            <button
              onClick={readAloud}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition ${
                isPlayingAudio
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:bg-neutral-900'
              }`}
            >
              <span>{isPlayingAudio ? '⏹️ Stop' : '🔊 Listen'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="bg-green-700 hover:bg-green-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs inline-flex items-center gap-1"
            >
              🖨️ Print Slip
            </button>
          </div>
        </div>

        {/* Appointment Token Pass Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border-2 border-emerald-700 overflow-hidden print:shadow-none print:border print:rounded-none">
          {/* Tricolor Stripe */}
          <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-white to-green-600" />

          {/* Header */}
          <div className="p-5 bg-slate-50 dark:bg-neutral-950 border-b border-gray-200 dark:border-neutral-700 text-center relative">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block mb-1">
              Confirmed Appointment Token
            </span>
            <h1 className="text-lg font-black text-gray-900 dark:text-neutral-100">MANDI ENTRY & WEIGHBRIDGE SLIP</h1>
            <p className="text-[11px] text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Department of Food & Public Distribution • Govt. of India</p>

            <div className="mt-2 text-xs font-mono font-bold text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 inline-block px-3 py-1 rounded-lg">
              TOKEN #{booking.id.slice(0, 8).toUpperCase()}
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Centre & Slot Alert */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Designated Mandi Centre</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-neutral-100 mt-0.5">{booking.centres?.name}</p>
                  <p className="text-xs text-gray-600 dark:text-neutral-400 dark:text-neutral-400">{booking.centres?.district}, {booking.centres?.state || 'Maharashtra'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Scheduled Window</p>
                  <p className="text-sm font-black text-emerald-900 mt-0.5">{booking.slot_date}</p>
                  <p className="text-xs font-semibold text-emerald-700">{booking.slot_window}</p>
                </div>
              </div>
            </div>

            {/* Farmer & Consignment Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-xs border border-gray-100 dark:border-neutral-700 rounded-xl p-3.5 bg-slate-50 dark:bg-neutral-950">
              <div>
                <p className="text-gray-400 font-semibold text-[10px] uppercase">Farmer Details</p>
                <p className="font-bold text-gray-800 dark:text-neutral-200 mt-0.5">{booking.profiles?.full_name || 'N/A'}</p>
                <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400 font-mono text-[11px]">{booking.profiles?.phone}</p>
                {booking.profiles?.village && <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">{booking.profiles.village}</p>}
              </div>

              <div>
                <p className="text-gray-400 font-semibold text-[10px] uppercase">Consignment Info</p>
                <p className="font-bold text-gray-800 dark:text-neutral-200 mt-0.5">{booking.commodities?.name}</p>
                <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Expected: <strong>{booking.expected_quantity_quintals || '—'} q</strong></p>
                <p className="text-emerald-700 font-semibold">MSP: ₹{Number(booking.commodities?.msp_rate_per_quintal || 0).toLocaleString()}/q</p>
              </div>
            </div>

            {/* Verification Barcode / QR */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}`}
                  alt="Entry Scanner QR"
                  className="border border-gray-300 dark:border-neutral-600 rounded-lg p-1 bg-white dark:bg-neutral-800"
                  width={100}
                  height={100}
                />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-neutral-100">Mandi Gate Verification</p>
                  <p className="text-[11px] text-gray-500 dark:text-neutral-400 dark:text-neutral-400 leading-snug mt-0.5">
                    Show this QR code at the Mandi entry barrier for automated driver check-in.
                  </p>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="inline-block px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                  {(booking.status || '').replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Mandi Rules Checklist */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
              <p className="font-bold text-xs text-amber-950">📋 Instructions for Farmer:</p>
              <p>• Arrive 15 minutes before your scheduled window (<strong>{booking.slot_window}</strong>).</p>
              <p>• Keep moisture content within government permissible limits (under 12% for Wheat).</p>
              <p>• Bring original Aadhaar card and bank account passbook for DBT verification.</p>
            </div>

            <div className="text-center text-[10px] text-gray-400 pt-1">
              System Generated on {new Date(booking.created_at).toLocaleString()} • CFPP Portal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
