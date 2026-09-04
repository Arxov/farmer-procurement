import { useLanguage } from '../lib/i18n';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="hidden fixed top-3 right-14 z-50 bg-white dark:bg-neutral-800 dark:text-neutral-200 shadow-sm border border-gray-200 dark:border-neutral-700 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
      title="Switch language"
    >
      {language === 'en' ? 'à¤¹à¤¿à¤¨à¥à¤¦à¥€' : 'English'}
    </button>
  );
}

