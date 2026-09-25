import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import LanguageToggle from '../../components/LanguageToggle';
import { useLanguage } from '../../lib/i18n';
import { getCropConfig } from '../../lib/cropIcons';
import NumberTicker from '../../components/NumberTicker';

export default function NetCalculator() {
  const [commodities, setCommodities] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [quantity, setQuantity] = useState('25');
  const [distance, setDistance] = useState('20');
  const [transportMode, setTransportMode] = useState('solo');
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    const fetchCommodities = async () => {
      const { data } = await supabase.from('commodities').select('*').order('name');
      setCommodities(data || []);
      if (data?.length > 0) setSelectedCrop(data[0].id);
      setLoading(false);
    };
    fetchCommodities();
  }, []);

  const crop = commodities.find(c => c.id === selectedCrop);
  const msp = crop ? Number(crop.msp_rate_per_quintal) : 0;
  const q = Number(quantity) || 0;
  const d = Number(distance) || 0;

  // Real-world Mandi Logistics & Statutory Rate Schedules
  const PER_KM_RATE = transportMode === 'solo' ? 45 : 18; // Pooled transport is much cheaper
  const LABOUR_PER_Q = 12; // Loading/unloading (Hamali)
  const APMC_FEE_PCT = 0.01; // 1% mandi fee
  const BAG_COST = 25; // Standard 50kg jute gunny bag per quintal

  const grossValue = msp * q;
  const freight = d * PER_KM_RATE * (q > 0 ? (q / 20 > 1 ? q / 20 : 1) : 0); // Scale by trips
  const handling = q * LABOUR_PER_Q;
  const bags = q * BAG_COST;
  const apmcFee = grossValue * APMC_FEE_PCT;

  const totalDeductions = freight + handling + bags + apmcFee;
  const netTakeHome = Math.max(0, grossValue - totalDeductions);
  const realizationPct = grossValue > 0 ? (netTakeHome / grossValue) * 100 : 0;
  const pooledSavings = d * (45 - 18) * (q > 0 ? (q / 20 > 1 ? q / 20 : 1) : 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/90 dark:bg-neutral-950 pb-28 sm:pb-12 text-slate-900 dark:text-slate-100 transition-colors">
      <Head>
        <title>{t('netCalculatorTitle')} | Kisan Setu</title>
      </Head>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5 sm:border-x sm:border-slate-200/80 dark:sm:border-neutral-800/60 sm:min-h-screen sm:bg-slate-50/50 dark:sm:bg-neutral-950 sm:shadow-xs">
        {/* Top Brand Bar & Trust Indicators */}
        <div className="flex justify-between items-center bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-center gap-2">
            <motion.div whileTap={{ scale: 0.94 }}>
              <Link
                href="/farmer/dashboard"
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 flex items-center justify-center transition shadow-2xs"
                title={t('back', 'Back')}
                aria-label="Back to Dashboard"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            </motion.div>

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
          </div>
        </div>

        {/* Executive Service Identity Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-neutral-800/80 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600/10 dark:bg-emerald-400/10 border border-emerald-500/25 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 shadow-2xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-neutral-700">
                    {t('calculatorCertBadge')}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    CACP • MSAMB SLA
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-0.5">
                  {t('netCalculatorTitle')}
                </h1>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {t('netCalculatorSubtitle')}
          </p>

          {/* Clean Trust Verification Badges */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-emerald-900 dark:text-emerald-300 pt-1">
            <span className="inline-flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300/60 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? 'हमीभाव (MSP) सुरक्षित' : language === 'hi' ? 'एमएसपी दर संरक्षित' : 'CACP MSP Protected'}</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300/60 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? 'दलालमुक्त थेट डीबीटी' : language === 'hi' ? 'दलालमुक्त प्रत्यक्ष डीबीटी' : 'Direct PFMS Escrow'}</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300/60 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? '१००% पारदर्शक वजावट' : language === 'hi' ? '100% पारदर्शी कटौती' : 'Zero Hidden Charges'}</span>
            </span>
          </div>
        </div>

        {/* Input Form Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 space-y-4">
          <div className="space-y-4">
            {/* Commodity Selector */}
            <div>
              <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1.5">
                {t('selectCropLabel')}
              </label>
              <div className="relative">
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all outline-none font-medium appearance-none cursor-pointer"
                >
                  {commodities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — MSP: ₹{Number(c.msp_rate_per_quintal).toLocaleString('en-IN')}/q
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Quantity and Distance Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1.5">
                  {t('quantityQuintalsLabel')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="25"
                    className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all outline-none font-bold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    qtl
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1.5">
                  {t('distanceMandiLabel')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="20"
                    className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all outline-none font-bold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    km
                  </span>
                </div>
              </div>
            </div>

            {/* Apple HIG Segmented Control for Transport Logistics */}
            <div>
              <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1.5">
                {t('transportModeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-neutral-800 rounded-2xl border border-slate-200/90 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setTransportMode('solo')}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold font-display transition-all flex items-center justify-center gap-2 relative ${
                    transportMode === 'solo'
                      ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span className="truncate">{t('soloTractorLabel')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransportMode('pooled')}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold font-display transition-all flex items-center justify-center gap-2 relative ${
                    transportMode === 'pooled'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="truncate">{t('pooledTransportLabel')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Realization Payout Results Card */}
        {q > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 overflow-hidden space-y-4"
          >
            {/* Header Realization Banner */}
            <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-neutral-900 dark:to-neutral-900 border-b border-emerald-100/80 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('grossValueMspLabel')}
                </p>
                <div className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white mt-0.5">
                  <NumberTicker value={Math.round(grossValue)} prefix="₹" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {crop?.name || 'Crop'} @ ₹{msp.toLocaleString('en-IN')}/qtl
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  {t('netRealizationLabel')}
                </p>
                <div className="text-2xl sm:text-3xl font-black font-display text-emerald-700 dark:text-emerald-400 mt-0.5">
                  <NumberTicker value={Math.round(netTakeHome)} prefix="₹" />
                </div>
                <span className="text-[10px] font-black font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-300/70 dark:border-emerald-800 px-2 py-0.5 rounded-full inline-block mt-1">
                  {realizationPct.toFixed(1)}% {t('realizationPercentLabel')}
                </span>
              </div>
            </div>

            {/* Itemized Deductions */}
            <div className="p-5 space-y-3 pt-1">
              <h2 className="text-xs font-black font-display text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-neutral-800">
                {t('estimatedDeductionsLabel')}
              </h2>

              <div className="space-y-2.5 text-xs font-medium">
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-neutral-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>{t('freightLabel')} ({d} km @ ₹{PER_KM_RATE}/km)</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -₹{Math.round(freight).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-neutral-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>{t('handlingLaborLabel')} (₹{LABOUR_PER_Q}/qtl)</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -₹{Math.round(handling).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-neutral-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>{t('apmcCommissionLabel')}</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -₹{Math.round(apmcFee).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-neutral-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>{t('gunnyBagsLabel')} (₹{BAG_COST}/qtl)</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -₹{Math.round(bags).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200/80 dark:border-neutral-800 flex justify-between items-center font-bold text-sm">
                  <span className="text-slate-900 dark:text-white font-display">
                    {t('totalDeductionsLabel')}
                  </span>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                    -₹{Math.round(totalDeductions).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Community Pooling Tip Box */}
              {transportMode === 'solo' && d > 10 && (
                <div className="mt-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300/70 dark:border-emerald-800/60 rounded-2xl p-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-black font-display text-emerald-900 dark:text-emerald-300">
                      {t('pooledTipTitle')}
                    </h3>
                    <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/80 mt-0.5 leading-relaxed font-medium">
                      {t('pooledSavingsTip')}{' '}
                      <strong className="font-bold underline decoration-emerald-500 underline-offset-2">
                        ₹{Math.round(pooledSavings).toLocaleString('en-IN')}
                      </strong>{' '}
                      {t('onFreight')}
                    </p>
                  </div>
                </div>
              )}

              {/* Statutory Micro Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 text-[10.5px] text-slate-400 flex items-center gap-1.5 font-medium">
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{t('mandiNoticeEscrow')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <FarmerBottomNav />
    </div>
  );
}
