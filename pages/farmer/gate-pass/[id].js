import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';
import CropBadge from '../../../components/CropBadge';

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

  const mspRate = booking?.commodities?.msp_rate_per_quintal || 0;
  const acceptedQty = booking?.accepted_quantity_quintals || booking?.actual_weight_quintals || booking?.expected_quantity_quintals || 0;
  const totalVal = booking?.payments?.[0]?.amount || (acceptedQty * mspRate);

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-neutral-950 px-4 py-8 print:bg-white print:p-0 text-slate-900 dark:text-white transition-colors">
      <div className="max-w-xl mx-auto space-y-4">

        {/* Top Control Bar (Hidden during printing) */}
        <div className="flex justify-between items-center print:hidden bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs">
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

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => window.print()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-display font-bold shadow-2xs hover:shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Mandi Gate Pass (PDF)</span>
          </motion.button>
        </div>

        {!gatePass ? (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xs p-8 text-center border border-slate-200/80 dark:border-neutral-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-xl">
              ⏳
            </div>
            <div>
              <p className="text-slate-700 dark:text-neutral-200 font-display font-bold text-sm">
                {t('noGatePass')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Gate pass is authorized and issued once your commodity consignment is officially accepted at the Mandi weighbridge.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-lg border-2 border-emerald-900 dark:border-emerald-700 overflow-hidden print:shadow-none print:border-2 print:border-black print:rounded-none">

            {/* Sovereign National Tricolor Ribbon */}
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-white to-green-600 print:h-1.5" />

            {/* Sovereign Header */}
            <div className="p-6 bg-slate-50/90 dark:bg-neutral-950 border-b border-slate-200/80 dark:border-neutral-800 text-center print:bg-white print:border-b-2 print:border-black">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-600/30 flex items-center justify-center text-2xl font-bold text-amber-800 mb-2.5 print:hidden">
                🏛️
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 font-display print:text-black">
                Government of India • Ministry of Agriculture & Farmers Welfare
              </p>
              <h1 className="text-lg sm:text-xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-0.5 print:text-black">
                OFFICIAL MANDI PROCUREMENT GATE PASS
              </h1>
              <p className="text-xs text-emerald-800 dark:text-emerald-400 font-bold font-display mt-0.5 print:text-black">
                Central Farmer Procurement Platform (CFPP) • Statutory DBT Escrow
              </p>

              <div className="mt-3 inline-flex items-center gap-2 bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-3.5 py-1 rounded-full text-xs font-mono font-bold text-emerald-950 dark:text-emerald-200 print:border-black print:text-black print:bg-transparent">
                <span>PASS ID:</span>
                <span className="tracking-wider">#{gatePass.id.slice(0, 8).toUpperCase()}</span>
                <span>•</span>
                <span className="text-[10px] tracking-normal font-sans font-bold">VERIFIED APMC CLEARANCE</span>
              </div>
            </div>

            {/* Gate Pass Docket Body */}
            <div className="p-6 space-y-5 print:p-4 print:space-y-4">

              {/* Farmer Beneficiary & Mandi Node Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 dark:border-neutral-800 pb-4 print:border-b print:border-black">
                <div>
                  <p className="text-slate-400 dark:text-slate-500 uppercase font-black text-[10px] font-display print:text-black">
                    Beneficiary Farmer
                  </p>
                  <p className="text-sm font-black font-display text-slate-900 dark:text-white mt-0.5 print:text-black">
                    {booking?.profiles?.full_name || 'Verified Beneficiary'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono text-xs mt-0.5 print:text-black">
                    📱 {booking?.profiles?.phone || '—'}
                  </p>
                  {booking?.profiles?.village && (
                    <p className="text-slate-600 dark:text-slate-400 text-xs print:text-black">
                      📍 {booking.profiles.village}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-slate-400 dark:text-slate-500 uppercase font-black text-[10px] font-display print:text-black">
                    Designated Mandi Centre
                  </p>
                  <p className="text-sm font-black font-display text-slate-900 dark:text-white mt-0.5 print:text-black">
                    {booking?.centres?.name || 'Mandi Centre'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 print:text-black">
                    {booking?.centres?.district || '—'}, {booking?.centres?.state || 'Maharashtra'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono text-xs print:text-black">
                    📅 Date: {booking?.slot_date} ({booking?.slot_window})
                  </p>
                </div>
              </div>

              {/* Consignment & Weighment Breakdown Table */}
              <div>
                <p className="text-slate-400 dark:text-slate-500 uppercase font-black text-[10px] font-display mb-2 print:text-black">
                  Consignment & Statutory Weighment Breakdown
                </p>
                <div className="border border-slate-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden text-xs print:border print:border-black print:rounded-none">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-neutral-800/60 border-b border-slate-200/80 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-bold font-display uppercase tracking-wider text-[10px] print:bg-slate-100 print:text-black print:border-black">
                      <tr>
                        <th className="p-3">Commodity</th>
                        <th className="p-3">Grading</th>
                        <th className="p-3 text-right">Accepted Qty</th>
                        <th className="p-3 text-right">MSP Rate</th>
                        <th className="p-3 text-right">Direct Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 font-sans print:divide-black">
                      <tr className="print:text-black">
                        <td className="p-3 font-bold font-display text-slate-900 dark:text-white print:text-black">
                          <div className="flex items-center gap-1.5">
                            <span className="print:hidden"><CropBadge name={booking?.commodities?.name} size="xs" /></span>
                            <span>{booking?.commodities?.name || 'Wheat'}</span>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-emerald-800 dark:text-emerald-400 print:text-black">
                          {booking?.quality_grade || 'FAQ Standard (Grade A)'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white print:text-black">
                          {acceptedQty} q
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300 print:text-black">
                          ₹{Number(mspRate).toLocaleString('en-IN')}/q
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white text-sm print:text-black">
                          ₹{Number(totalVal).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* QR Verification & Sovereign Stamp Box */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-neutral-800 print:border-t print:border-black">
                <div className="flex items-center gap-3.5">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(gatePass.qr_code)}`}
                    alt="Digital Gate Pass QR"
                    className="border-2 border-slate-300 dark:border-neutral-700 rounded-xl p-1 bg-white print:border-2 print:border-black"
                    width={110}
                    height={110}
                  />
                  <div>
                    <p className="text-xs font-bold font-display text-slate-900 dark:text-white print:text-black">
                      Security Gate Scanner
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[190px] mt-0.5 leading-snug font-sans print:text-black">
                      Scan at Mandi entry boom-barrier for automated weighbridge clearance and barcode logging.
                    </p>
                    {gatePass.vehicle_number && (
                      <p className="text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 mt-1.5 print:text-black">
                        Vehicle: {gatePass.vehicle_number}
                      </p>
                    )}
                  </div>
                </div>

                {/* Mandi Stamp Watermark */}
                <div className="w-24 h-24 border-2 border-dashed border-emerald-700 dark:border-emerald-500 rounded-full flex flex-col items-center justify-center text-center p-1 text-emerald-800 dark:text-emerald-300 rotate-[-10deg] select-none shrink-0 print:border-black print:text-black">
                  <span className="text-[9px] font-bold uppercase font-display">APMC MANDI</span>
                  <span className="text-xs font-black font-display tracking-tight">PASSED</span>
                  <span className="text-[8px] font-mono font-bold">MSP VERIFIED</span>
                </div>
              </div>

              {/* Official Statutory Disclaimer */}
              <div className="bg-slate-50 dark:bg-neutral-950 rounded-2xl p-3.5 text-[10px] text-slate-500 dark:text-slate-400 text-center leading-relaxed border border-slate-200/80 dark:border-neutral-800 print:border print:border-black print:bg-white print:text-black">
                Notice: This electronic gate pass certifies that the consignment has been inspected, weighed, and accepted under official Minimum Support Price (MSP) procurement guidelines. Direct payment will be deposited into the farmer's linked Aadhaar DBT bank account.
              </div>

              <div className="text-center text-[10px] text-slate-400 font-mono print:text-black">
                Issued by National Mandi Authority on {new Date(gatePass.issued_at).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
