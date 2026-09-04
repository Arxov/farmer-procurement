import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';

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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>{t('loading')}</p></div>;

  const mspRate = booking?.commodities?.msp_rate_per_quintal || 0;
  const acceptedQty = booking?.accepted_quantity_quintals || booking?.actual_weight_quintals || booking?.expected_quantity_quintals || 0;
  const totalVal = booking?.payments?.[0]?.amount || (acceptedQty * mspRate);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-neutral-900 px-4 py-8 print:bg-white dark:bg-neutral-800 print:p-0">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-4 print:hidden">
          <Link href="/farmer/dashboard" className="text-green-800 text-sm font-medium hover:underline inline-flex items-center gap-1">
            &larr; {t('back')} to Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm inline-flex items-center gap-1.5"
          >
            🖨️ Print / Save PDF
          </button>
        </div>

        {!gatePass ? (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-8 text-center border border-gray-200 dark:border-neutral-700">
            <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400 font-medium">{t('noGatePass')}</p>
            <p className="text-xs text-gray-400 mt-1">Gate pass is issued once your booking has been accepted by the mandi procurement officer.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border-2 border-emerald-800 overflow-hidden print:shadow-none print:border print:rounded-none">
            {/* National Tricolor Top Strip */}
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-white to-green-600" />

            {/* Official Header */}
            <div className="p-6 bg-slate-50 dark:bg-neutral-950 border-b border-gray-200 dark:border-neutral-700 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-600/30 flex items-center justify-center text-2xl font-bold text-amber-800 mb-2">
                🏛️
              </div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Government of India • Ministry of Consumer Affairs</p>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-neutral-100 mt-0.5">OFFICIAL MANDI PROCUREMENT GATE PASS</h1>
              <p className="text-xs text-emerald-800 font-semibold mt-0.5">Central Farmer Procurement Platform (CFPP) • DBT Integrated</p>

              <div className="mt-3 inline-flex items-center gap-2 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-full text-xs font-mono font-semibold text-emerald-900">
                PASS #{gatePass.id.slice(0, 8).toUpperCase()} • VERIFIED
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5">
              {/* Farmer & Centre Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-gray-100 dark:border-neutral-700 pb-4">
                <div>
                  <p className="text-gray-400 uppercase font-semibold text-[10px]">Farmer Information</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-neutral-200 mt-0.5">{booking?.profiles?.full_name || 'N/A'}</p>
                  <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">📱 {booking?.profiles?.phone || '-'}</p>
                  {booking?.profiles?.village && <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">📍 {booking.profiles.village}</p>}
                </div>
                <div>
                  <p className="text-gray-400 uppercase font-semibold text-[10px]">Procurement Centre</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-neutral-200 mt-0.5">{booking?.centres?.name || 'Mandi Centre'}</p>
                  <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">{booking?.centres?.district || '-'}, {booking?.centres?.state || 'Maharashtra'}</p>
                  <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">📅 Date: {booking?.slot_date} ({booking?.slot_window})</p>
                </div>
              </div>

              {/* Consignment Table */}
              <div>
                <p className="text-gray-400 uppercase font-semibold text-[10px] mb-2">Consignment & Weighment Breakdown</p>
                <div className="border border-gray-200 dark:border-neutral-700 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 dark:text-neutral-400 font-semibold">
                      <tr>
                        <th className="p-2.5">Commodity</th>
                        <th className="p-2.5">Grade</th>
                        <th className="p-2.5 text-right">Accepted Qty</th>
                        <th className="p-2.5 text-right">MSP Rate</th>
                        <th className="p-2.5 text-right">Total Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="p-2.5 font-medium text-gray-900 dark:text-neutral-100">{booking?.commodities?.name || 'Wheat'}</td>
                        <td className="p-2.5 font-semibold text-emerald-700">{booking?.quality_grade || 'FAQ Standard'}</td>
                        <td className="p-2.5 text-right font-medium">{acceptedQty} q</td>
                        <td className="p-2.5 text-right text-gray-600 dark:text-neutral-400 dark:text-neutral-400">₹{Number(mspRate).toLocaleString()}</td>
                        <td className="p-2.5 text-right font-bold text-gray-900 dark:text-neutral-100">₹{Number(totalVal).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* QR Verification & Stamp Box */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(gatePass.qr_code)}`}
                    alt="Digital Gate Pass QR"
                    className="border border-gray-300 dark:border-neutral-600 rounded-lg p-1 bg-white dark:bg-neutral-800"
                    width={110}
                    height={110}
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-neutral-200">Security Gate Scanner</p>
                    <p className="text-[11px] text-gray-500 dark:text-neutral-400 dark:text-neutral-400 max-w-[180px] mt-0.5 leading-snug">
                      Scan at mandi entrance/exit boom-barrier for automated weighbridge clearance.
                    </p>
                    {gatePass.vehicle_number && (
                      <p className="text-xs font-mono font-bold text-gray-700 dark:text-neutral-300 mt-1">
                        Vehicle: {gatePass.vehicle_number}
                      </p>
                    )}
                  </div>
                </div>

                {/* Mandi Stamp Watermark / Mockup */}
                <div className="w-24 h-24 border-2 border-dashed border-emerald-600 rounded-full flex flex-col items-center justify-center text-center p-1 text-emerald-800 rotate-[-10deg] select-none opacity-85">
                  <span className="text-[9px] font-bold uppercase">APMC Mandi</span>
                  <span className="text-[11px] font-extrabold">PASSED</span>
                  <span className="text-[8px]">MSP VERIFIED</span>
                </div>
              </div>

              {/* Official Disclaimer */}
              <div className="bg-slate-50 dark:bg-neutral-950 rounded-xl p-3 text-[10px] text-gray-500 dark:text-neutral-400 dark:text-neutral-400 text-center leading-relaxed border border-gray-100 dark:border-neutral-700">
                Notice: This electronic gate pass certifies that the consignment has been inspected, weighed, and accepted under official Minimum Support Price (MSP) procurement guidelines. Direct payment will be deposited into the farmer's linked Aadhaar DBT bank account.
              </div>

              <div className="text-center text-[10px] text-gray-400">
                Issued by National Mandi Authority on {new Date(gatePass.issued_at).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
