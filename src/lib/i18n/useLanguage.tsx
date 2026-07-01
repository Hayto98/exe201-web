'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Language } from './translations';

interface LanguageContextValue {
  lang: Language;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'vi',
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('vi');

  useEffect(() => {
    const saved = localStorage.getItem('esmery-lang') as Language | null;
    if (saved === 'en' || saved === 'vi') setLang(saved);
  }, []);

  const toggle = () => {
    setLang((prev) => {
      const next = prev === 'en' ? 'vi' : 'en';
      localStorage.setItem('esmery-lang', next);
      return next;
    });
  };

  return (
    <LanguageContext.Provider value={{ lang, toggle }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
