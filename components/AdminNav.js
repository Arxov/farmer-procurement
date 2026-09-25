import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';
import LanguageToggle from './LanguageToggle';

const NAV_ITEMS = [
  {
    href: '/admin/dashboard',
    labelEn: 'Overview',
    labelMr: 'आढावा',
    labelHi: 'अवलोकन',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/admin/centres',
    labelEn: 'Centres',
    labelMr: 'केंद्रे',
    labelHi: 'केंद्र',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/admin/commodities',
    labelEn: 'Commodities & MSP',
    labelMr: 'शेतमाल व हमीभाव',
    labelHi: 'जिंस व एमएसपी',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    href: '/admin/grievances',
    labelEn: 'Grievances',
    labelMr: 'तक्रार निवारण',
    labelHi: 'शिकायत निवारण',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    href: '/admin/payments',
    labelEn: 'PFMS Payments',
    labelMr: 'देयक व हस्तांतरण',
    labelHi: 'भुगतान व निपटान',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    labelEn: 'Users & Roles',
    labelMr: 'वापरकर्ता व भूमिका',
    labelHi: 'उपयोगकर्ता व भूमिकाएं',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export default function AdminNav({ activeTab }) {
  const router = useRouter();
  const { t, language } = useLanguage();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getLabel = (item) => {
    if (language === 'mr') return item.labelMr;
    if (language === 'hi') return item.labelHi;
    return item.labelEn;
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Executive Government Brand Bar */}
      <div className="flex justify-between items-center bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white dark:from-emerald-600 dark:to-emerald-800 flex items-center justify-center shadow-xs shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-tight text-slate-900 dark:text-emerald-400 font-display">
                KISAN SETU
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
                • Apex Administrative Cell
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                APMC Realtime Ledger
              </span>
              <span className="text-slate-300 dark:text-neutral-700 hidden sm:inline">•</span>
              <span className="hidden sm:inline font-mono">FCI / CACP Statutory Grid</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleLogout}
            title={t('logout') || 'Logout'}
            className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-2xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Apple HIG Segmented Control Navigation Bar */}
      <div className="bg-slate-100/90 dark:bg-neutral-800/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-neutral-700/80 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {NAV_ITEMS.map((item) => {
            const isActive = router.pathname === item.href || activeTab === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative"
              >
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-display font-semibold transition-all select-none relative z-10 ${
                    isActive
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <span className={`${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span>{getLabel(item)}</span>
                </motion.div>
                {isActive && (
                  <motion.div
                    layoutId="adminNavPill"
                    transition={{ type: 'spring', damping: 25, stiffness: 240 }}
                    className="absolute inset-0 bg-white dark:bg-neutral-900 rounded-xl shadow-xs border border-slate-200/80 dark:border-neutral-700"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
