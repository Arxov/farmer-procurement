import { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('app_language');
    if (saved && translations[saved]) setLanguage(saved);
  }, []);

  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const html = document.documentElement;
      if (html.classList.contains('translated-ltr') || html.classList.contains('translated-rtl')) {
        const langStr = html.getAttribute('lang');
        if (langStr && (langStr.includes('hi') || langStr.includes('mr'))) {
          const newLang = langStr.substring(0, 2);
          if (newLang !== language) {
            setLanguage(newLang);
            localStorage.setItem('app_language', newLang);
          }
        }
      } else {
        if (language !== 'en') {
          setLanguage('en');
          localStorage.setItem('app_language', 'en');
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'class'] });
    return () => observer.disconnect();
  }, [language]);

  const toggleLanguage = () => {
    const next = language === 'en' ? 'hi' : 'en';
    setLanguage(next);
    localStorage.setItem('app_language', next);
  };

  
  useEffect(() => {
    const originalToLocaleString = Number.prototype.toLocaleString;
    Number.prototype.toLocaleString = function(locales, options) {
      if (language === 'hi' || language === 'mr') {
        const devaOptions = { ...options, numberingSystem: 'deva' };
        return originalToLocaleString.call(this, language === 'hi' ? 'hi-IN' : 'mr-IN', devaOptions);
      }
      return originalToLocaleString.call(this, locales, options);
    };
    return () => {
      Number.prototype.toLocaleString = originalToLocaleString;
    };
  }, [language]);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);

    // Seamlessly trigger Google Translate widget without reloading
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = lang === 'en' ? 'en' : lang;
      select.dispatchEvent(new Event('change'));
    } else {
      // Fallback: if widget not loaded yet, set cookie so it loads translated
      document.cookie = `googtrans=/en/${lang}; path=/`;
      document.cookie = `googtrans=/en/${lang}; domain=${window.location.hostname}; path=/`;
    }
  };

  const t = (key) => translations[language]?.[key] || translations['en']?.[key] || key;

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
