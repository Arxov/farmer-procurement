import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';
import { Button } from '../../../components/ui/Button';

export default function GatePassPage() {
  const [gatePass, setGatePass] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = router.query;
  const { t } = useLanguage();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*, centres(name, district, state), commodities(name, msp_rate_per_quintal), profiles(full_name, phone, village), payments(amount, utr_reference, status)')
        .eq('id', id)
        .single();

      setBooking(bookingData);

      const { data: passData } = await supabase
        .from('gate_passes')
        .select('*')
        .eq('booking_id', id)
        .maybeSingle();

      setGatePass(passData);
      setLoading(false);
    };
    load();
  }, [id, router]);

  if (loading) return <div className="min-h-screen bg-[var(--chassis)] flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest"><div className="animate-spin w-6 h-6 border-4 border-slate-500 border-t-transparent rounded-full mr-3" /> RETRIEVING LOG...</div>;

  const mspRate = booking?.commodities?.msp_rate_per_quintal || 0;
  const acceptedQty = booking?.accepted_quantity_quintals || booking?.actual_weight_quintals || booking?.expected_quantity_quintals || 0;
  const totalVal = booking?.payments?.[0]?.amount || (acceptedQty * mspRate);

  return (
    <div className="min-h-screen bg-[var(--chassis)] px-4 py-8 print:bg-white print:p-0 font-sans selection:bg-emerald-500/30">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Link href="/farmer/dashboard" className="text-emerald-700 text-xs font-bold uppercase tracking-wider hover:text-emerald-800 transition">
            &larr; Dashboard
          </Link>
          <Button
            variant="primary"
            onClick={() => window.print()}
            className="text-[10px] py-1.5 h-auto bg-slate-700 border-slate-800 hover:bg-slate-800"
          >
            🖨️ PRINT HARDCOPY
          </Button>
        </div>

        {!gatePass ? (
          <div className="bg-[#e8ecef] rounded-xl p-8 text-center border border-slate-300 shadow-recessed">
            <p className="text-slate-500 font-black uppercase tracking-widest text-sm">NO GATE PASS DETECTED</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Pass generation pending official APMC sign-off.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Hanging screws / clip simulation for the top */}
            <div className="absolute -top-3 left-1/4 w-4 h-6 bg-slate-300 rounded shadow-sm border border-slate-400 z-10 print:hidden flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shadow-inner" />
            </div>
            <div className="absolute -top-3 right-1/4 w-4 h-6 bg-slate-300 rounded shadow-sm border border-slate-400 z-10 print:hidden flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shadow-inner" />
            </div>

            {/* The Physical Receipt Paper */}
            <div className="bg-[#fefce8] rounded-sm shadow-[0_4px_15px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.05)] border border-amber-900/10 overflow-hidden print:shadow-none print:border-none relative">
              
              {/* Paper texture/noise */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }} />

              {/* National Tricolor Header Strip */}
              <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-white to-green-600" />

              {/* Official Header */}
              <div className="p-6 border-b-2 border-dashed border-amber-900/20 text-center relative z-10">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-900/5 border-2 border-amber-900/20 flex items-center justify-center text-2xl mb-3 shadow-inner">
                  🏛️
                </div>
                <p className="text-[9px] uppercase tracking-widest font-black text-amber-900/60 font-mono">GOVT. OF INDIA • MIN. OF CONSUMER AFFAIRS</p>
                <h1 className="text-xl font-black text-amber-950 mt-1 uppercase tracking-tight">OFFICIAL MANDI GATE PASS</h1>
                <p className="text-[10px] text-emerald-900/80 font-bold mt-1 uppercase tracking-wider">CFPP • DBT INTEGRATED LOGISTICS</p>

                <div className="mt-4 inline-block bg-white border-2 border-slate-800 px-3 py-1 text-xs font-mono font-black text-slate-800 shadow-[2px_2px_0_#1e293b]">
                  PASS NO: {gatePass.id.slice(0, 8).toUpperCase()} • VERIFIED
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-6 relative z-10 font-mono">
                {/* Farmer & Centre Details Grid */}
                <div className="grid grid-cols-2 gap-6 text-xs border-b-2 border-dashed border-amber-900/20 pb-6">
                  <div>
                    <p className="text-amber-900/50 uppercase font-black text-[10px] tracking-widest border-b border-amber-900/10 pb-1 mb-2">FARMER IDENTITY</p>
                    <p className="text-sm font-bold text-amber-950 uppercase">{booking?.profiles?.full_name || 'N/A'}</p>
                    <p className="text-amber-900/70 mt-1 font-bold">MOB: {booking?.profiles?.phone || '-'}</p>
                    {booking?.profiles?.village && <p className="text-amber-900/70 font-bold uppercase mt-1">LOC: {booking.profiles.village}</p>}
                  </div>
                  <div>
                    <p className="text-amber-900/50 uppercase font-black text-[10px] tracking-widest border-b border-amber-900/10 pb-1 mb-2">APMC FACILITY</p>
                    <p className="text-sm font-bold text-amber-950 uppercase">{booking?.centres?.name || 'MANDI CENTRE'}</p>
                    <p className="text-amber-900/70 font-bold uppercase mt-1">{booking?.centres?.district || '-'}, {booking?.centres?.state || 'MAHARASHTRA'}</p>
                    <p className="text-amber-900/70 font-bold uppercase mt-1">DTE: {booking?.slot_date} ({booking?.slot_window})</p>
                  </div>
                </div>

                {/* Consignment Table */}
                <div>
                  <p className="text-amber-900/50 uppercase font-black text-[10px] tracking-widest mb-3">CONSIGNMENT LEDGER</p>
                  <div className="border-2 border-amber-900/20 text-[11px] font-bold text-amber-950">
                    <div className="grid grid-cols-12 bg-amber-900/5 border-b-2 border-amber-900/20 p-2">
                      <div className="col-span-4">COMMODITY</div>
                      <div className="col-span-3">GRADE</div>
                      <div className="col-span-2 text-right">QTY</div>
                      <div className="col-span-3 text-right">TOTAL (₹)</div>
                    </div>
                    <div className="grid grid-cols-12 p-3 bg-white/50">
                      <div className="col-span-4 uppercase">{booking?.commodities?.name || 'WHEAT'}</div>
                      <div className="col-span-3 uppercase text-emerald-800">{booking?.quality_grade || 'FAQ STD'}</div>
                      <div className="col-span-2 text-right">{acceptedQty}Q</div>
                      <div className="col-span-3 text-right text-sm font-black">₹{Number(totalVal).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-1 text-right text-[9px] text-amber-900/50 font-bold">
                    * CALC RATE: ₹{Number(mspRate).toLocaleString()}/QTL
                  </div>
                </div>

                {/* QR Verification & Stamp Box */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-dashed border-amber-900/20">
                  <div className="flex items-center gap-4 bg-white p-2 border-2 border-amber-900/20 shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(gatePass.qr_code)}`}
                      alt="Digital Gate Pass QR"
                      className="border border-amber-900/10 p-1"
                      width={90}
                      height={90}
                    />
                    <div className="max-w-[150px]">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 mb-1">SCAN AT BOOM-BARRIER</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase leading-tight">
                        AUTO-CLEARANCE AT EXIT GATE.
                      </p>
                      {gatePass.vehicle_number && (
                        <p className="text-[11px] font-black text-slate-900 mt-2 bg-slate-200 px-1 py-0.5 inline-block">
                          VEH: {gatePass.vehicle_number}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Physical Stamp Simulation */}
                  <div className="w-24 h-24 border-4 border-double border-red-700/60 rounded-full flex flex-col items-center justify-center text-center p-1 text-red-700/80 rotate-[-15deg] select-none shadow-sm mix-blend-multiply">
                    <span className="text-[8px] font-black uppercase tracking-widest">APMC REGIONAL</span>
                    <span className="text-sm font-black uppercase tracking-widest mt-1 border-y border-red-700/40 py-0.5">CLEARED</span>
                    <span className="text-[7px] font-bold uppercase mt-1">DBT INITIATED</span>
                  </div>
                </div>

                {/* Official Disclaimer */}
                <div className="bg-amber-900/5 p-3 text-[9px] text-amber-900/70 font-bold uppercase leading-relaxed text-justify border-l-4 border-amber-900/30">
                  NOTICE: THIS ELECTRONIC GATE PASS CERTIFIES THAT CONSIGNMENT WAS INSPECTED, WEIGHED, & ACCEPTED UNDER OFFICIAL MSP PROCUREMENT GUIDELINES. DBT WILL BE DEPOSITED INTO FARMER'S LINKED AADHAAR BANK ACCOUNT WITHIN SLA.
                </div>

                <div className="text-center text-[9px] text-amber-900/40 font-black tracking-widest border-t border-amber-900/10 pt-4">
                  ISSUED: {new Date(gatePass.issued_at).toLocaleString('en-IN').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
