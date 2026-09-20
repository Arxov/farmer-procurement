import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  // Hydrate language preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_language');
      if (saved && (saved === 'en' || saved === 'mr' || saved === 'hi') && translations[saved]) {
        setLanguage(saved);
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('lang', saved);
        }
      }
    } catch (e) {
      console.warn('[i18n] Error reading language from storage', e);
    }
  }, []);

  const changeLanguage = useCallback((lang) => {
    if (!['en', 'mr', 'hi'].includes(lang)) return;
    setLanguage(lang);
    try {
      localStorage.setItem('app_language', lang);
    } catch (e) {
      console.warn('[i18n] Error saving language to storage', e);
    }

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);

      // Prevent Google Translate from interfering with our native dictionary translations
      document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;

      const select = document.querySelector('.goog-te-combo');
      if (select && select.value) {
        select.value = '';
        select.dispatchEvent(new Event('change'));
      }
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const next = language === 'en' ? 'mr' : language === 'mr' ? 'hi' : 'en';
    changeLanguage(next);
  }, [language, changeLanguage]);

  const t = useCallback((key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language]);

  const formatNumber = useCallback((num, options = {}) => {
    if (typeof num !== 'number') return num;
    if (language === 'hi' || language === 'mr') {
      return num.toLocaleString(language === 'hi' ? 'hi-IN' : 'mr-IN', { ...options, numberingSystem: 'deva' });
    }
    return num.toLocaleString('en-IN', options);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, changeLanguage, t, formatNumber }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
