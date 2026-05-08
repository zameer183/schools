'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/components/language/language-provider';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-[#d4dee7] bg-white px-2 py-1.5 text-xs font-semibold text-[#1a1c1c]">
      <Languages className="h-3.5 w-3.5 text-[#6f7979]" />
      <span className="hidden sm:inline">{t('Language')}</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value === 'ur' ? 'ur' : 'en')}
        className="bg-transparent text-xs font-semibold outline-none"
        aria-label={t('Language')}
      >
        <option value="en">{t('English')}</option>
        <option value="ur">{t('Urdu')}</option>
      </select>
    </label>
  );
}
