import { useLanguage } from '../lib/i18n';

export default function LanguageToggle() {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="flex bg-white dark:bg-neutral-800 rounded-lg shadow-xs border border-gray-200 p-0.5 w-fit">
      <button 
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${language === 'en' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-emerald-700 hover:bg-gray-50'}`}
      >
        EN
      </button>
      <button 
        onClick={() => changeLanguage('mr')}
        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${language === 'mr' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-emerald-700 hover:bg-gray-50'}`}
      >
        मराठी
      </button>
      <button 
        onClick={() => changeLanguage('hi')}
        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${language === 'hi' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-emerald-700 hover:bg-gray-50'}`}
      >
        हिंदी
      </button>
    </div>
  );
}

