'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'en';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (value: AppLanguage) => void;
  t: (value: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language] = useState<AppLanguage>('en');

  useEffect(() => {
    try {
      window.localStorage.removeItem('app-language');
      window.localStorage.setItem('app-language', 'en');
    } catch {}
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (input: string) => input
    };
  }, []);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    return {
      language: 'en' as AppLanguage,
      setLanguage: () => {},
      t: (input: string) => input
    };
  }
  return value;
}
