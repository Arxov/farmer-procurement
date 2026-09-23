import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

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

  if (loading) return <div className="min-h-screen bg-[var(--chassis)] flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest">{t('loading')}</div>;

  if (!booking) {
    return (
      <div className="min-h-screen bg-[var(--chassis)] flex items-center justify-center p-4">
        <Card elevated={true} withScrews={true} className="p-6 text-center">
          <p className="text-slate-600 font-bold mb-4">Booking not found.</p>
          <Button variant="secondary" onClick={() => router.push('/farmer/dashboard')}>
            &larr; Back to Dashboard
          </Button>
        </Card>
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
    <div className="min-h-screen bg-[var(--chassis)] px-4 py-8 print:bg-white print:p-0">
      <div className="max-w-lg mx-auto">
        {/* Navigation Actions */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Link href="/farmer/dashboard" className="text-emerald-700 text-xs font-bold uppercase tracking-wider hover:text-emerald-800 transition">
            &larr; Dashboard
          </Link>
          <div className="flex gap-2">
            <Button
              onClick={readAloud}
              variant={isPlayingAudio ? 'primary' : 'secondary'}
              className="text-[10px] px-3 py-1.5 h-auto"
            >
              {isPlayingAudio ? '⏹️ STOP AUDIO' : '🔊 LISTEN (TTS)'}
            </Button>
            <Button
              onClick={() => window.print()}
              variant="primary"
              className="text-[10px] px-3 py-1.5 h-auto"
            >
              🖨️ PRINT SLIP
            </Button>
          </div>
        </div>

        {/* Physical Stamped Card / Receipt */}
        <Card elevated={true} withScrews={true} className="bg-[#e8ecef] p-0 border border-white/50 overflow-hidden shadow-floating relative print:shadow-none print:border-black print:rounded-none">
          {/* Hardware Stripe */}
          <div className="h-3 w-full bg-gradient-to-r from-orange-500 via-slate-300 to-emerald-600 border-b-2 border-white/40" />

          {/* Header Panel */}
          <div className="p-6 pb-4 bg-slate-100/50 border-b-4 border-slate-300/40 text-center relative shadow-recessed mx-4 mt-4 rounded-xl">
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981,inset_0_1px_3px_rgba(255,255,255,0.4)] animate-pulse" />
            
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter mt-1">ENTRY & WEIGHBRIDGE SLIP</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Dept of Food & Public Distribution • Govt of India</p>

            <div className="mt-4 text-xs font-mono font-black text-emerald-800 bg-[var(--chassis)] border border-emerald-900/10 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1),inset_-1px_-1px_3px_rgba(255,255,255,1)] inline-block px-4 py-1.5 rounded-md tracking-widest">
              TOKEN #{booking.id.slice(0, 8).toUpperCase()}
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Centre & Slot Screen */}
            <div className="bg-[#2d3436] rounded-xl p-4 shadow-recessed border-2 border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 opacity-20"><span className="text-4xl">🏭</span></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Designated Mandi Centre</p>
                  <p className="text-sm font-bold text-slate-100 mt-1 uppercase">{booking.centres?.name}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{booking.centres?.district}, {booking.centres?.state || 'MH'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Scheduled Window</p>
                  <p className="text-lg font-black text-emerald-500 mt-0.5 leading-none">{booking.slot_date}</p>
                  <p className="text-xs font-bold text-slate-300 mt-1 uppercase">{booking.slot_window}</p>
                </div>
              </div>
            </div>

            {/* Farmer & Consignment Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--chassis)] border border-white/50 shadow-recessed rounded-xl p-4">
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider mb-2">Farmer Details</p>
                <p className="font-black text-slate-800 text-sm uppercase">{booking.profiles?.full_name || 'N/A'}</p>
                <p className="text-slate-500 font-mono font-bold text-[10px] mt-1">{booking.profiles?.phone}</p>
                {booking.profiles?.village && <p className="text-slate-500 font-bold text-[10px] uppercase mt-0.5">{booking.profiles.village}</p>}
              </div>

              <div className="bg-[var(--chassis)] border border-white/50 shadow-recessed rounded-xl p-4">
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider mb-2">Consignment Info</p>
                <p className="font-black text-slate-800 text-sm uppercase">{booking.commodities?.name}</p>
                <p className="text-slate-600 font-bold text-[10px] mt-1">QTY: <span className="font-black">{booking.expected_quantity_quintals || '—'} Q</span></p>
                <p className="text-emerald-700 font-bold text-[10px] mt-0.5">MSP: ₹{Number(booking.commodities?.msp_rate_per_quintal || 0).toLocaleString()}/Q</p>
              </div>
            </div>

            {/* Verification Barcode / QR */}
            <div className="flex items-center justify-between gap-4 py-4 border-y-2 border-slate-300/40 border-dashed">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-lg shadow-card border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`}
                    alt="Entry Scanner QR"
                    className="w-20 h-20"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide">GATE VERIFICATION</p>
                  <p className="text-[9px] font-bold text-slate-500 leading-snug mt-1 max-w-[150px]">
                    SCAN QR CODE AT MANDI ENTRY BARRIER FOR SECURE HARDWARE CHECK-IN.
                  </p>
                </div>
              </div>
            </div>

            {/* Mandi Rules Checklist */}
            <div className="bg-[#fefce8] shadow-recessed rounded-xl p-4 border border-amber-200">
              <p className="font-black text-[10px] text-amber-900 uppercase tracking-widest mb-2 border-b border-amber-200/50 pb-1">⚠️ SYSTEM INSTRUCTIONS</p>
              <ul className="text-[9px] font-bold text-amber-800 space-y-1.5 uppercase tracking-wide">
                <li>&gt; ARRIVE 15 MINS PRIOR TO SCHEDULED WINDOW ({booking.slot_window}).</li>
                <li>&gt; MAINTAIN MOISTURE LIMITS (UNDER 12% REQ).</li>
                <li>&gt; BRING ORIGINAL AADHAAR & BANK PASSBOOK FOR DBT.</li>
              </ul>
            </div>

            <div className="text-center font-mono font-bold text-[9px] text-slate-400 pt-2 tracking-widest uppercase">
              GENERATED: {new Date(booking.created_at).toISOString().replace('T', ' ').slice(0,19)} • CFPP SECURE
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
