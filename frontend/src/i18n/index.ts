/**
 * i18n Configuration with react-i18next
 *
 * Provides internationalization support with English as default language.
 * Configured for namespace-based lazy loading for better performance.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en/translation.json';

// Initialize i18next
void i18n
  .use(LanguageDetector) // Detect user language from browser
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
    },
    fallbackLng: 'en',
    lng: 'en', // Force English to avoid async language detection
    debug: import.meta.env.DEV, // Enable debug in development
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense to avoid async issues
    },
    detection: {
      // Order of language detection
      order: ['navigator', 'localStorage', 'cookie'],
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;
