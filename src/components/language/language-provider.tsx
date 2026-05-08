'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'en' | 'ur';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (value: AppLanguage) => void;
  t: (value: string) => string;
};

const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {},
  ur: {
    Dashboard: 'ڈیش بورڈ',
    Students: 'طلبہ',
    Teachers: 'اساتذہ',
    Classes: 'کلاسز',
    Attendance: 'حاضری',
    Finance: 'مالیات',
    Reports: 'رپورٹس',
    Messages: 'پیغامات',
    Notifications: 'اطلاعات',
    'Role Management': 'رول مینجمنٹ',
    'Activity Logs': 'سرگرمی لاگز',
    Automation: 'آٹومیشن',
    Settings: 'سیٹنگز',
    Academics: 'تعلیمی امور',
    Progress: 'پیش رفت',
    Assignments: 'اسائنمنٹس',
    Schedule: 'شیڈول',
    Results: 'نتائج',
    Financials: 'فیس تفصیل',
    Performance: 'کارکردگی',
    Fees: 'فیس',
    Admin: 'ایڈمن',
    Teacher: 'ٹیچر',
    Student: 'اسٹوڈنٹ',
    Parent: 'والدین',
    Logout: 'لاگ آؤٹ',
    Language: 'زبان',
    English: 'انگلش',
    Urdu: 'اردو',
    'Manarah Institute': 'منارہ انسٹیٹیوٹ'
  }
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    const saved = window.localStorage.getItem('app-language');
    if (saved === 'en' || saved === 'ur') {
      setLanguageState(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('app-language', language);
    document.documentElement.lang = language === 'ur' ? 'ur' : 'en';
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage: setLanguageState,
      t: (input: string) => TRANSLATIONS[language][input] ?? input
    };
  }, [language]);

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
