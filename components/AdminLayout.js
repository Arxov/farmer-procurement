import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function AdminLayout({ children, title, subtitle }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isDark, setIsDark] = useState(false);

  // Initialize dark mode from localStorage or system preference
  React.useEffect(() => {
    const saved = localStorage.getItem('admin-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('admin-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('admin-theme', 'light');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { name: 'Grievances', href: '/admin/grievances', icon: '📋' },
    { name: 'Payments', href: '/admin/payments', icon: '💰' },
    { name: 'Users & Access', href: '/admin/users', icon: '👥' },
    { name: 'Mandi Centres', href: '/admin/centres', icon: '🏛️' },
    { name: 'Commodities', href: '/admin/commodities', icon: '🌾' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex font-sans text-gray-900 dark:text-neutral-100 transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-neutral-800">
            <h1 className="text-xl font-black text-emerald-700 dark:text-emerald-500 tracking-tight flex items-center gap-2">
              <span className="text-2xl">🌾</span> Setu Admin
            </h1>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <p className="px-2 text-[10px] font-black text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-3">Management</p>
            {navItems.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm' 
                      : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-neutral-100'
                  }`}
                >
                  <span className="text-lg opacity-80">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-neutral-800 space-y-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between px-3 py-2.5 w-full rounded-xl text-sm font-medium text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{isDark ? '🌙' : '☀️'}</span>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </div>
              <div className={`w-8 h-4 rounded-full transition-colors relative ${isDark ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-gray-600 dark:text-neutral-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <span className="text-lg opacity-80">🚪</span>
              Logout Session
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 dark:text-neutral-400">{subtitle}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Network Active
            </span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
