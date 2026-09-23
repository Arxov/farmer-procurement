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
    { label: 'Home', href: '/farmer/dashboard', icon: '🏠' },
    { label: 'Book Slot', href: '/farmer/book-slot', icon: '➕' },
    { label: 'Grievances', href: '/farmer/grievances', icon: '📋' },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--chassis)] border-t border-white/50 py-2 px-4 sm:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)] print:hidden"
      data-bottom-nav="true"
    >
      <div className="flex justify-around items-center max-w-md mx-auto gap-2">
        {navItems.map(item => {
          const isActive = router.pathname === item.href;
          return (
            <motion.div key={item.href} whileTap={{ scale: 0.95 }} className="flex-1 flex justify-center">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center w-full min-h-[48px] py-1.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 focus:outline-none ${
                  isActive ? 'text-emerald-700 bg-[#e0e5ec] shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]' : 'text-slate-500 bg-[var(--chassis)] shadow-[4px_4px_8px_rgba(163,177,198,0.4),-4px_-4px_8px_rgba(255,255,255,0.7)] hover:text-emerald-600'
                }`}
              >
                <span className="text-xl mb-1" aria-hidden="true">{item.icon}</span>
                <span className="text-[9px]">{item.label}</span>
              </Link>
            </motion.div>
          );
        })}

        {/* Language quick switcher */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleLanguage}
          aria-label="Switch Language"
          className="flex-1 flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2 rounded-xl text-xs text-slate-500 bg-[var(--chassis)] shadow-[4px_4px_8px_rgba(163,177,198,0.4),-4px_-4px_8px_rgba(255,255,255,0.7)] hover:text-emerald-600 focus:outline-none font-bold uppercase tracking-wider transition-all duration-150 active:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]"
        >
          <span className="text-xl mb-1" aria-hidden="true">🌐</span>
          <span className="text-[9px]">{language === 'hi' ? 'EN' : 'HI'}</span>
        </motion.button>

        {/* Quick Logout */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          aria-label="Sign out"
          className="flex-1 flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2 rounded-xl text-xs text-slate-500 bg-[var(--chassis)] shadow-[4px_4px_8px_rgba(163,177,198,0.4),-4px_-4px_8px_rgba(255,255,255,0.7)] hover:text-red-600 focus:outline-none font-bold uppercase tracking-wider transition-all duration-150 active:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]"
        >
          <span className="text-xl mb-1" aria-hidden="true">🚪</span>
          <span className="text-[9px]">EXIT</span>
        </motion.button>
      </div>
    </nav>
  );
}
