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
 *
 * Namespaces:
 * - common: Shared UI strings (buttons, labels)
 * - lobby: Lobby and room creation
 * - game: In-game UI (health, turns, etc.)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

// Lazy load translation resources
const loadResources = resourcesToBackend(
  (language: string, namespace: string) =>
    import(`./locales/${language}/${namespace}.json`)
);

// Initialize i18next with lazy loading
void i18n
  .use(loadResources) // Lazy load namespaces
  .use(LanguageDetector) // Detect user language from browser
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    fallbackLng: 'en', // Fallback to English if translation missing
    supportedLngs: ['en', 'es', 'fr', 'de', 'zh'],
    ns: ['common', 'lobby', 'game'], // Available namespaces
    defaultNS: 'common', // Default namespace
    debug: import.meta.env.DEV, // Enable debug in development
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: true, // Enable suspense for lazy loading
    },
    detection: {
      // Order of language detection: navigator (device), then localStorage, then cookie
      order: ['navigator', 'localStorage', 'cookie', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
      lookupLocalStorage: 'i18nextLng',
      lookupCookie: 'i18next',
    },
    // Preload common namespace for all languages
    preload: ['en'],
    // Load namespaces on demand
    load: 'languageOnly', // Don't load region-specific (e.g., en-US, just en)
  });

export default i18n;
