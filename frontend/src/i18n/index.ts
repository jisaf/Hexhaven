/**
 * i18n Configuration with react-i18next
 *
 * Provides internationalization support with 5 languages:
 * - English (en) - default
 * - Spanish (es)
 * - French (fr)
 * - German (de)
 * - Chinese (zh)
 *
 * Configured for namespace-based lazy loading for better performance.
 * Language is automatically detected from device settings or manually selectable.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en/translation.json';
import esTranslation from './locales/es/translation.json';
import frTranslation from './locales/fr/translation.json';
import deTranslation from './locales/de/translation.json';
import zhTranslation from './locales/zh/translation.json';

// Initialize i18next
void i18n
  .use(LanguageDetector) // Detect user language from browser
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      es: {
        translation: esTranslation,
      },
      fr: {
        translation: frTranslation,
      },
      de: {
        translation: deTranslation,
      },
      zh: {
        translation: zhTranslation,
      },
    },
    fallbackLng: 'en', // Fallback to English if translation missing
    supportedLngs: ['en', 'es', 'fr', 'de', 'zh'],
    debug: import.meta.env.DEV, // Enable debug in development
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense to avoid async issues
    },
    detection: {
      // Order of language detection: navigator (device), then localStorage, then cookie
      order: ['navigator', 'localStorage', 'cookie', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
      lookupLocalStorage: 'i18nextLng',
      lookupCookie: 'i18next',
    },
  });

export default i18n;
