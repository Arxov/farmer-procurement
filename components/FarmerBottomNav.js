import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useLanguage } from '../lib/i18n';
import { supabase } from '../lib/supabaseClient';

export default function FarmerBottomNav() {
  const router = useRouter();
  const { t, language, toggleLanguage } = useLanguage();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    {
      label: t('home', 'Home'),
      href: '/farmer/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: t('bookSlotNav', 'Book Slot'),
      href: '/farmer/book-slot',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      label: t('grievances', 'Grievances'),
      href: '/farmer/grievances',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const nextLangLabel = language === 'en' ? 'मराठी' : language === 'mr' ? 'हिंदी' : 'English';

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-neutral-800 py-1 px-4 sm:hidden shadow-lg print:hidden"
      data-bottom-nav="true"
    >
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(item => {
          const isActive = router.pathname === item.href;
          return (
            <motion.div key={item.href} whileTap={{ scale: 0.92 }}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-xl text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-emerald-950/40'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100'
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="text-[10px] mt-0.5 font-bold font-display">{item.label}</span>
              </Link>
            </motion.div>
          );
        })}

        {/* Tri-Lingual Quick Switcher */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggleLanguage}
          aria-label="Switch Language"
          className="flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-xl text-xs text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <svg className="w-5 h-5 text-emerald-700 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.6 9h16.8M3.6 15h16.8" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3a17 17 0 000 18M12 3a17 17 0 010 18" />
          </svg>
          <span className="text-[10px] mt-0.5 font-bold font-display text-emerald-800 dark:text-emerald-300">{nextLangLabel}</span>
        </motion.button>

        {/* Quick Logout */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleLogout}
          aria-label="Sign out"
          className="flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-xl text-xs text-slate-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-[10px] mt-0.5 font-bold font-display">{t('logout', 'Logout')}</span>
        </motion.button>
      </div>
    </nav>
  );
}
