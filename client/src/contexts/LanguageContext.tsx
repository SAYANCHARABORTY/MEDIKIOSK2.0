import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { SupportedLanguage } from '@medikiosk/shared';
import { getTranslation, formatLocalizedNumber } from '../i18n';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, defaultText?: string, params?: Record<string, string | number>) => string;
  formatNumber: (n: number | string) => string;
}

const STORAGE_KEY = 'medikiosk_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
      if (saved === 'hi' || saved === 'bn' || saved === 'en') {
        return saved;
      }
    } catch (e) {
      console.warn('Unable to read saved language from localStorage:', e);
    }
    return 'en';
  });

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {}
  }, [language]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch (e) {
      console.warn('Unable to persist language to localStorage:', e);
    }
  }, []);

  const t = useCallback(
    (key: string, defaultText?: string, params?: Record<string, string | number>) => {
      return getTranslation(language, key, defaultText, params);
    },
    [language]
  );

  const formatNumber = useCallback(
    (n: number | string) => {
      return formatLocalizedNumber(n, language);
    },
    [language]
  );

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      formatNumber
    }),
    [language, setLanguage, t, formatNumber]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation(): {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, defaultText?: string, params?: Record<string, string | number>) => string;
  formatNumber: (n: number | string) => string;
} {
  return useLanguage();
}
