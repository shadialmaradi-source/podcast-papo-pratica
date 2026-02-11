import type { LanguageCode } from './translations';

/**
 * Detect the user's preferred UI language from the browser settings.
 * Maps navigator.language to our supported LanguageCode set.
 * Falls back to 'en' if the browser language is not supported.
 */
export function detectUILanguage(): LanguageCode {
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  const supported: LanguageCode[] = ['en', 'es', 'fr', 'it', 'pt'];
  return supported.includes(browserLang as LanguageCode)
    ? (browserLang as LanguageCode)
    : 'en';
}
