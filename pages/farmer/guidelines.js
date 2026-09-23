import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../lib/i18n';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import LanguageToggle from '../../components/LanguageToggle';

export default function Guidelines() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: t('tabGeneralSetup') },
    { id: 'crops', label: t('tabCropPrecautions') },
    { id: 'market', label: t('tabMarketDemand') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 pb-28 sm:pb-12 text-slate-900 dark:text-slate-100 transition-colors">
      <Head>
        <title>{t('guidelinesTitle')} | Kisan Setu</title>
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
              <div className="w-11 h-11 rounded-2xl bg-amber-600/10 dark:bg-amber-400/10 border border-amber-500/25 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 shadow-2xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-neutral-700">
                    {t('guidelinesCertBadge')}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400">
                    AGRI-DOC-2026/G1
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-0.5">
                  {t('guidelinesTitle')}
                </h1>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {t('guidelinesSubtitle')}
          </p>

          {/* Clean Trust Verification Badges */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-amber-900 dark:text-amber-300 pt-1">
            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? 'ग्रेड-A आर्द्रता मानके' : language === 'hi' ? 'ग्रेड-A नमी मानक' : 'Grade-A Moisture Norms'}</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? 'वजनमापे कायदा २००९' : language === 'hi' ? 'विधिक मापविज्ञान अधिनियम २००९' : 'Legal Metrology Act 2009'}</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? 'थेट बँक खात्यात जमा (DBT)' : language === 'hi' ? 'प्रत्यक्ष लाभ अंतरण (DBT)' : 'Direct PFMS DBT Payout'}</span>
            </span>
          </div>
        </div>

        {/* Apple HIG Segmented Pill Controls */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-neutral-800/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-neutral-700/80">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-2.5 px-2 rounded-xl text-xs font-black font-display tracking-tight transition-all duration-200 text-center ${
                  isActive
                    ? 'text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeGuidelineTab"
                    className="absolute inset-0 bg-white dark:bg-neutral-900 rounded-xl"
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  />
                )}
                <span className="relative z-10 block truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: General Setup & Mandatory Documents */}
        <AnimatePresence mode="wait">
          {activeTab === 'general' && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* Statutory Documents Required */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-neutral-800 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black font-display text-slate-900 dark:text-white">
                      {t('reqDocsTitle')}
                    </h3>
                    <p className="text-[10.5px] text-slate-500 font-medium">Verify before dispatch to avoid gate turnaround</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { label: t('reqDocAadhaar'), badge: 'Identity Proof', code: 'UIDAI OTP' },
                    { label: t('reqDocPassbook'), badge: 'DBT Bank', code: 'NPCI Seeded' },
                    { label: t('reqDocLand'), badge: 'Land Ownership', code: '7/12 Extract' },
                    { label: t('reqDocToken'), badge: 'Slot Pass', code: 'Form 4-A QR' },
                  ].map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-neutral-800/60 rounded-2xl border border-slate-200/60 dark:border-neutral-700/60 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                            {doc.label}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{doc.code}</span>
                        </div>
                      </div>
                      <span className="text-[9.5px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-md shrink-0">
                        {doc.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal Metrology Weighbridge Protocol */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-neutral-800 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black font-display text-slate-900 dark:text-white">
                      {t('weighbridgeProcessTitle')}
                    </h3>
                    <p className="text-[10.5px] text-slate-500 font-medium">Standard Operating Procedure at Mandi Inward</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { step: '01', title: 'Arrival Window', desc: t('step1Weigh') },
                    { step: '02', title: 'Gross Tare Weighing', desc: t('step2Weigh') },
                    { step: '03', title: 'Quality Assay & Tare', desc: t('step3Weigh') },
                    { step: '04', title: 'Certified Receipt', desc: t('step4Weigh') },
                  ].map((st, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-200/60 dark:border-blue-900/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/70 px-1.5 py-0.5 rounded-md">
                          Step {st.step}
                        </span>
                        <span className="text-xs font-black font-display text-blue-900 dark:text-blue-200">
                          {st.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        {st.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Moisture & Quality Norms */}
          {activeTab === 'crops' && (
            <motion.div
              key="crops"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* Cereals (Wheat, Paddy) */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-black font-display text-slate-900 dark:text-white">
                        {t('cerealTitle')}
                      </h3>
                      <p className="text-[10.5px] text-slate-500 font-medium">Standard Quality Specification (FAQ)</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-800">
                    {t('cerealMoisture')}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  {[
                    t('cerealRule1'),
                    t('cerealRule2'),
                    t('cerealRule3'),
                    t('cerealRule4'),
                  ].map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-neutral-800/60 rounded-xl">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="font-medium leading-relaxed">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pulses & Oilseeds */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-400 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-black font-display text-slate-900 dark:text-white">
                        {t('pulseTitle')}
                      </h3>
                      <p className="text-[10.5px] text-slate-500 font-medium">Protein & Oil Content Protection</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded-lg border border-orange-300 dark:border-orange-800">
                    {t('pulseMoisture')}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  {[
                    t('pulseRule1'),
                    t('pulseRule2'),
                    t('pulseRule3'),
                    t('pulseRule4'),
                  ].map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-neutral-800/60 rounded-xl">
                      <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="font-medium leading-relaxed">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: Market Demand & Regional Inflow */}
          {activeTab === 'market' && (
            <motion.div
              key="market"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-black font-display text-slate-900 dark:text-white">
                    {t('marketDemandTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {t('marketDemandDesc')}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Warning / Inflow Alert */}
                  <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                          Gate Inflow Advisory
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-md">
                        Queue: 35m
                      </span>
                    </div>

                    <h4 className="text-sm font-black font-display text-rose-900 dark:text-rose-200">
                      {t('wheatAbundanceTitle')}
                    </h4>
                    <p className="text-xs text-rose-800/90 dark:text-rose-300/90 leading-relaxed font-medium">
                      {t('wheatAbundanceDesc')}
                    </p>
                  </div>

                  {/* High Demand / Fast Track */}
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          Priority Queue Open
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                        Direct Gate Access
                      </span>
                    </div>

                    <h4 className="text-sm font-black font-display text-emerald-900 dark:text-emerald-200">
                      {t('turDemandTitle')}
                    </h4>
                    <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed font-medium">
                      {t('turDemandDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mandi Statutory Micro-Footer Notice */}
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
          <strong className="text-slate-800 dark:text-slate-200 font-bold">FCI & State Procurement Notice: </strong>
          {t('mandiNoticeEscrow')}
        </div>
      </div>

      <FarmerBottomNav />
    </div>
  );
}
