import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useLanguage } from '../lib/i18n';
import { supabase } from '../lib/supabaseClient';

export default function FarmerBottomNav() {
  const router = useRouter();
  const { t, lang, toggleLanguage } = useLanguage();

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
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-neutral-800/95 backdrop-blur-md border-t border-gray-200 dark:border-neutral-700 py-1 px-4 sm:hidden shadow-lg print:hidden"
      data-bottom-nav="true"
    >
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(item => {
          const isActive = router.pathname === item.href;
          return (
            <motion.div key={item.href} whileTap={{ scale: 0.9 }}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-xl text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-green-600 ${
                  isActive ? 'text-green-700 font-bold bg-green-50/70' : 'text-gray-500 dark:text-neutral-400 dark:text-neutral-400 hover:text-gray-900 dark:text-neutral-100'
                }`}
              >
                <span className="text-xl" aria-hidden="true">{item.icon}</span>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </Link>
            </motion.div>
          );
        })}

        {/* Language quick switcher */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleLanguage}
          aria-label="Switch Language"
          className="flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-xl text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 hover:text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <span className="text-xl" aria-hidden="true">🌐</span>
          <span className="text-[10px] mt-0.5 font-medium">{lang === 'hi' ? 'English' : 'हिंदी'}</span>
        </motion.button>

        {/* Quick Logout */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLogout}
          aria-label="Sign out"
          className="flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-2 rounded-xl text-xs text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <span className="text-xl" aria-hidden="true">🚪</span>
          <span className="text-[10px] mt-0.5">Logout</span>
        </motion.button>
      </div>
    </nav>
  );
}
