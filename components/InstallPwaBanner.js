import { useState, useEffect } from 'react';

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    if (typeof window !== 'undefined' && sessionStorage.getItem('pwa_install_dismissed')) {
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also detect if already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      setIsVisible(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa_install_dismissed', 'true');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 max-w-md mx-auto z-40 animate-fadeIn">
      <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-600/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-800 flex items-center justify-center text-xl shadow-xs shrink-0">
            🌾
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Install CFPP Kisan App</p>
            <p className="text-[10px] text-emerald-200 mt-0.5 leading-tight">
              Fast offline booking & gate pass access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="bg-white dark:bg-neutral-800 hover:bg-emerald-50 text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-emerald-300 hover:text-white text-base px-1 leading-none"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}
