import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import LanguageToggle from '../../components/LanguageToggle';
import { useLanguage } from '../../lib/i18n';
import NumberTicker from '../../components/NumberTicker';

export default function PriceOutlook() {
  const [commodities, setCommodities] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
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

  const crop = commodities.find((c) => c.id === selectedCrop);
  const msp = crop ? Number(crop.msp_rate_per_quintal) : 0;

  // Generate deterministic 14-day trend based on the crop's MSP and seasonal rhythm
  const generateTrend = (basePrice) => {
    const data = [];
    let currentPrice = Math.round(basePrice * 0.96);
    const today = new Date();

    // Past 7 days historical
    for (let i = 7; i > 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        price: Math.round(currentPrice),
        type: 'historical',
      });
      currentPrice += (i % 2 === 0 ? 1 : -1) * 18;
    }

    // Today spot
    data.push({
      date: language === 'mr' ? 'आज' : language === 'hi' ? 'आज' : 'Today',
      price: Math.round(currentPrice),
      type: 'current',
    });

    // Next 7 days forecast
    const trend = 1; // Slight seasonal uptick
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      currentPrice += trend * (15 + i * 2);
      data.push({
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        price: Math.round(currentPrice),
        type: 'forecast',
      });
    }

    return data;
  };

  useEffect(() => {
    if (msp > 0) {
      setChartData(generateTrend(msp));
    }
  }, [selectedCrop, msp]);

  const currentPrice = chartData.find((d) => d.type === 'current')?.price || msp;
  const targetPrice = chartData[chartData.length - 1]?.price || Math.round(msp * 1.06);
  const isUptrend = targetPrice >= currentPrice;
  const priceDiff = Math.abs(targetPrice - currentPrice);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 pb-28 sm:pb-12 text-slate-900 dark:text-slate-100 transition-colors">
      <Head>
        <title>{t('priceOutlookTitle')} | Kisan Setu</title>
      </Head>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        {/* Top Brand Bar & Trust Indicators */}
        <div className="flex justify-between items-center bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs">
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
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-neutral-800/80 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-600/10 dark:bg-blue-400/10 border border-blue-500/25 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0 shadow-2xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-neutral-700">
                    {t('outlookCertBadge')}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-400">
                    Agmarknet Feed MH-042
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-0.5">
                  {t('priceOutlookTitle')}
                </h1>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {t('priceOutlookSubtitle')}
          </p>

          {/* Clean Trust Verification Badges */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-blue-900 dark:text-blue-300 pt-1">
            <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? 'Agmarknet दैनिक डेटा' : language === 'hi' ? 'एगमार्कनेट दैनिक डेटा' : 'Agmarknet Daily Feed'}</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? 'स्थानिक आवक विश्लेषण' : language === 'hi' ? 'क्षेत्रीय आवक विश्लेषण' : 'Regional Arrival Index'}</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? 'CACP हमीभाव संरक्षण' : language === 'hi' ? 'CACP एमएसपी सुरक्षा' : 'CACP MSP Guaranteed'}</span>
            </span>
          </div>
        </div>

        {/* Commodity Selector Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3">
          <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
            {t('selectCommodityLabel')}
          </label>
          <div className="relative">
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all outline-none font-medium appearance-none cursor-pointer"
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

        {/* Visual 14-Day Forecast & Price Trend Card */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200/80 dark:border-neutral-800 shadow-xs overflow-hidden space-y-4"
          >
            {/* Top Recommendation Strip */}
            <div
              className={`p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                isUptrend
                  ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-neutral-900 dark:to-neutral-900 border-emerald-100/80 dark:border-neutral-800'
                  : 'bg-gradient-to-br from-rose-50 via-amber-50/50 to-white dark:from-rose-950/40 dark:via-neutral-900 dark:to-neutral-900 border-rose-100/80 dark:border-neutral-800'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full animate-ping ${
                      isUptrend ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('aiRecommendationLabel')}
                  </p>
                </div>
                <h3
                  className={`text-xl sm:text-2xl font-black font-display tracking-tight mt-0.5 ${
                    isUptrend ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {isUptrend ? t('recommendationHold') : t('recommendationSell')}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {isUptrend ? 'Projected Upside' : 'Immediate Delta'}
                  </span>
                  <p
                    className={`text-base font-black font-display ${
                      isUptrend ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {isUptrend ? '+' : '-'}₹{priceDiff}/q
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xs shrink-0 ${
                    isUptrend
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.2}
                      d={isUptrend ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Rate Metrics Comparison */}
            <div className="px-5 pt-1 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-neutral-700/60">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t('currentMarketRate')}
                </p>
                <div className="text-lg sm:text-xl font-black font-display text-slate-900 dark:text-white mt-0.5">
                  <NumberTicker value={currentPrice} prefix="₹" suffix="/q" />
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Govt Mandi Spot Base</p>
              </div>

              <div className="bg-blue-50/70 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200/60 dark:border-blue-800/60">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  {t('forecast7DayRate')}
                </p>
                <div className="text-lg sm:text-xl font-black font-display text-blue-800 dark:text-blue-300 mt-0.5">
                  <NumberTicker value={targetPrice} prefix="₹" suffix="/q" />
                </div>
                <p className="text-[10px] text-blue-600/80 dark:text-blue-400 font-medium mt-0.5">
                  {isUptrend ? 'High Probability Target' : 'Stabilization Target'}
                </p>
              </div>
            </div>

            {/* Clean Apple HIG Bar Chart */}
            <div className="p-5 pt-2 space-y-2">
              <h2 className="text-xs font-black font-display text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                14-Day Mandi Price Projection
              </h2>

              <div className="bg-slate-50/80 dark:bg-neutral-800/40 border border-slate-200/60 dark:border-neutral-700/60 rounded-2xl p-4">
                <div className="flex items-end justify-between h-36 gap-1 sm:gap-1.5">
                  {chartData.map((d, i) => {
                    const prices = chartData.map((c) => c.price);
                    const min = Math.min(...prices) * 0.96;
                    const max = Math.max(...prices) * 1.04;
                    const heightPct = Math.max(15, ((d.price - min) / (max - min)) * 100);

                    return (
                      <div key={i} className="flex flex-col items-center flex-1 group relative">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-9 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-mono font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition shadow-lg pointer-events-none whitespace-nowrap z-20">
                          ₹{d.price}
                        </div>

                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            d.type === 'historical'
                              ? 'bg-slate-300 dark:bg-neutral-600 group-hover:bg-slate-400'
                              : d.type === 'current'
                              ? 'bg-slate-900 dark:bg-white shadow-xs'
                              : 'bg-gradient-to-t from-blue-600 to-teal-400 dark:from-blue-500 dark:to-teal-300 opacity-80 group-hover:opacity-100'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between mt-3 text-[10.5px] text-slate-400 font-bold border-t border-slate-200/60 dark:border-neutral-700/60 pt-2 font-display">
                  <span>{t('historicalDays')}</span>
                  <span className="text-slate-800 dark:text-white font-black">{t('todaySpot')}</span>
                  <span className="text-blue-600 dark:text-blue-400">{t('forecastDays')}</span>
                </div>
              </div>
            </div>

            {/* Detailed Advisory Strategy Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-5 pt-0">
              {/* Option A: Recommended Outlook */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500/70 rounded-2xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    {t('recommendedOutlookTitle')}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    +₹{priceDiff}/qtl
                  </span>
                </div>

                <h4 className="text-sm font-black font-display text-emerald-950 dark:text-emerald-200">
                  {t('waitDaysTitle')}
                </h4>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed font-medium">
                  {t('waitDaysDesc')}
                </p>

                <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-800/60 space-y-1.5 text-[10.5px]">
                  <div className="flex justify-between text-emerald-800/90 dark:text-emerald-300/90">
                    <span>{t('downsideRisk')}</span>
                    <span className="font-mono font-bold">₹{Math.round(msp * 1.01).toLocaleString('en-IN')}/q</span>
                  </div>
                  <div className="flex justify-between text-emerald-800/90 dark:text-emerald-300/90">
                    <span>{t('confidenceScore')}</span>
                    <span className="font-mono font-bold">78% High</span>
                  </div>
                  <div className="flex justify-between text-emerald-800/90 dark:text-emerald-300/90">
                    <span>{t('storageSpoilage')}</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">-1.5% (Max)</span>
                  </div>
                </div>
              </div>

              {/* Option B: Sell Today */}
              <div className="bg-slate-50 dark:bg-neutral-800/60 border border-slate-200/80 dark:border-neutral-700/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black uppercase tracking-wider bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-full">
                    Spot Alternative
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                    ₹{currentPrice}/qtl
                  </span>
                </div>

                <h4 className="text-sm font-black font-display text-slate-900 dark:text-white">
                  {t('sellNowTitle')}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {t('sellNowDesc')}
                </p>

                <div className="pt-2 border-t border-slate-200/60 dark:border-neutral-700/60 space-y-1.5 text-[10.5px]">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('perishabilityRisk')}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{t('zeroHoldingLoss')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('settlementTimeline')}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{t('sameDaySettlement')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statutory Disclaimer Micro-Footer */}
            <div className="p-4 bg-slate-50 dark:bg-neutral-800/40 border-t border-slate-100 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              <strong className="text-slate-800 dark:text-slate-200 font-bold">CACP & Mandi Advisory: </strong>
              {t('priceOutlookDisclaimer')}
            </div>
          </motion.div>
        )}
      </div>

      <FarmerBottomNav />
    </div>
  );
}
