import { SupportedLanguage } from '@medikiosk/shared';
import { en } from './en';
import { hi } from './hi';
import { bn } from './bn';

export { en, hi, bn };

export type TranslationKey = string;

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  en,
  hi,
  bn
};

/**
 * Core translation function with fallback and string interpolation.
 * Example: t('queue.patients_waiting', '{count} patients waiting', { count: 3 })
 */
export function getTranslation(
  lang: SupportedLanguage,
  key: string,
  defaultText?: string,
  params?: Record<string, string | number>
): string {
  const currentDict = translations[lang] || translations.en;
  let text = currentDict[key] || translations.en[key] || defaultText || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    });
  }

  return text;
}

/**
 * Format numerals according to selected language
 */
export function formatLocalizedNumber(num: number | string, lang: SupportedLanguage): string {
  if (lang === 'bn') {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (w) => bengaliDigits[+w]);
  }
  if (lang === 'hi') {
    const hindiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(num).replace(/[0-9]/g, (w) => hindiDigits[+w]);
  }
  return String(num);
}
