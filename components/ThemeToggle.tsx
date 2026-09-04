import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className="fixed top-3 right-3 z-50 w-9 h-9 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-sm"
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="fixed top-3 right-3 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-gray-200 dark:border-neutral-700 shadow-sm hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <span className="text-base" role="img" aria-label="Sun">
          ☀️
        </span>
      ) : (
        <span className="text-base" role="img" aria-label="Moon">
          🌙
        </span>
      )}
    </motion.button>
  );
}
