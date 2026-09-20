import { useLanguage } from '../lib/i18n';

export default function LanguageToggle() {
  const { language, changeLanguage } = useLanguage();

  const options = [
    { code: 'en', label: 'English' },
    { code: 'mr', label: 'मराठी' },
    { code: 'hi', label: 'हिंदी' },
  ];

  return (
    <div className="inline-flex items-center bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md p-1 rounded-full border border-emerald-900/10 dark:border-white/10 shadow-xs hover:shadow-md transition-all duration-200 select-none notranslate" translate="no">
      <div className="pl-2 pr-1 flex items-center text-emerald-700 dark:text-emerald-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a17 17 0 000 18M12 3a17 17 0 010 18" />
        </svg>
      </div>
      <div className="flex items-center gap-0.5">
        {options.map((opt) => {
          const isActive = language === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => changeLanguage(opt.code)}
              className={`relative px-2.5 py-1 text-[11px] font-bold rounded-full transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#0c5c36] text-white shadow-xs scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50/70 dark:hover:bg-neutral-700/50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
