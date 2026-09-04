import { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('app_language');
    if (saved && translations[saved]) setLanguage(saved);
  }, []);

  const toggleLanguage = () => {
    const next = language === 'en' ? 'hi' : 'en';
    setLanguage(next);
    localStorage.setItem('app_language', next);
  };

  const t = (key) => translations[language]?.[key] || translations['en']?.[key] || key;

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
