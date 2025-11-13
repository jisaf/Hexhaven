/**
 * Unit Test: Translation keys exist for all UI strings
 *
 * User Story 6: Multi-Lingual Play (T185)
 * Test: Verify all required translation keys exist in all supported languages
 * Ensures consistency across language files and no missing translations
 */

import { describe, it, expect } from 'vitest';
import enTranslation from '../../src/i18n/locales/en/translation.json';
import esTranslation from '../../src/i18n/locales/es/translation.json';
import frTranslation from '../../src/i18n/locales/fr/translation.json';
import deTranslation from '../../src/i18n/locales/de/translation.json';
import zhTranslation from '../../src/i18n/locales/zh/translation.json';

describe('i18n Translation Completeness', () => {
  const languages = {
    en: enTranslation,
    es: esTranslation,
    fr: frTranslation,
    de: deTranslation,
    zh: zhTranslation,
  };

  /**
   * Recursively get all translation keys from a nested object
   */
  function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
    const keys: string[] = [];

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Recurse into nested objects
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        // Leaf node - this is a translation key
        keys.push(fullKey);
      }
    }

    return keys;
  }

  /**
   * Get a nested value from an object using dot notation
   */
  function getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  it('should have English translation file with all base keys', () => {
    expect(enTranslation).toBeDefined();
    expect(enTranslation.common).toBeDefined();
    expect(enTranslation.lobby).toBeDefined();
    expect(enTranslation.game).toBeDefined();
    expect(enTranslation.characters).toBeDefined();
  });

  it('should have all supported language files', () => {
    expect(languages.en).toBeDefined();
    expect(languages.es).toBeDefined();
    expect(languages.fr).toBeDefined();
    expect(languages.de).toBeDefined();
    expect(languages.zh).toBeDefined();
  });

  it('should have matching keys across all languages', () => {
    const enKeys = getAllKeys(enTranslation);
    expect(enKeys.length).toBeGreaterThan(0);

    // Each language should have the same keys as English
    for (const [langCode, translation] of Object.entries(languages)) {
      if (langCode === 'en') continue; // Skip English (reference)

      const langKeys = getAllKeys(translation);

      // Should have the same number of keys
      expect(langKeys.length).toBe(enKeys.length);

      // Every English key should exist in this language
      for (const key of enKeys) {
        const value = getNestedValue(translation, key);
        expect(value).toBeDefined();
        expect(value).not.toBe('');
      }
    }
  });

  it('should have no missing translations in Spanish', () => {
    const enKeys = getAllKeys(enTranslation);

    for (const key of enKeys) {
      const value = getNestedValue(esTranslation, key);
      expect(value, `Missing Spanish translation for key: ${key}`).toBeDefined();
      expect(value, `Empty Spanish translation for key: ${key}`).not.toBe('');
    }
  });

  it('should have no missing translations in French', () => {
    const enKeys = getAllKeys(enTranslation);

    for (const key of enKeys) {
      const value = getNestedValue(frTranslation, key);
      expect(value, `Missing French translation for key: ${key}`).toBeDefined();
      expect(value, `Empty French translation for key: ${key}`).not.toBe('');
    }
  });

  it('should have no missing translations in German', () => {
    const enKeys = getAllKeys(enTranslation);

    for (const key of enKeys) {
      const value = getNestedValue(deTranslation, key);
      expect(value, `Missing German translation for key: ${key}`).toBeDefined();
      expect(value, `Empty German translation for key: ${key}`).not.toBe('');
    }
  });

  it('should have no missing translations in Chinese', () => {
    const enKeys = getAllKeys(enTranslation);

    for (const key of enKeys) {
      const value = getNestedValue(zhTranslation, key);
      expect(value, `Missing Chinese translation for key: ${key}`).toBeDefined();
      expect(value, `Empty Chinese translation for key: ${key}`).not.toBe('');
    }
  });

  it('should have translated all common UI elements', () => {
    const requiredCommonKeys = [
      'common.create',
      'common.join',
      'common.start',
      'common.cancel',
      'common.confirm',
      'common.loading',
      'common.error',
    ];

    for (const [langCode, translation] of Object.entries(languages)) {
      for (const key of requiredCommonKeys) {
        const value = getNestedValue(translation, key);
        expect(value, `Missing ${langCode} translation for ${key}`).toBeDefined();
        expect(value, `Empty ${langCode} translation for ${key}`).not.toBe('');
      }
    }
  });

  it('should have translated all character classes', () => {
    const characterClasses = [
      'characters.Brute',
      'characters.Tinkerer',
      'characters.Spellweaver',
      'characters.Scoundrel',
      'characters.Cragheart',
      'characters.Mindthief',
    ];

    for (const [langCode, translation] of Object.entries(languages)) {
      for (const charClass of characterClasses) {
        const value = getNestedValue(translation, charClass);
        expect(value, `Missing ${langCode} translation for ${charClass}`).toBeDefined();
        expect(value).toHaveProperty('name');
        expect(value).toHaveProperty('description');
      }
    }
  });

  it('should have translated all lobby strings', () => {
    const requiredLobbyKeys = [
      'lobby.title',
      'lobby.welcome',
      'lobby.createGame',
      'lobby.joinGame',
      'lobby.selectCharacter',
      'lobby.startGame',
      'lobby.players',
    ];

    for (const [langCode, translation] of Object.entries(languages)) {
      for (const key of requiredLobbyKeys) {
        const value = getNestedValue(translation, key);
        expect(value, `Missing ${langCode} translation for ${key}`).toBeDefined();
        expect(value, `Empty ${langCode} translation for ${key}`).not.toBe('');
      }
    }
  });

  it('should have translated all game strings', () => {
    const requiredGameKeys = [
      'game.title',
      'game.yourTurn',
      'game.move',
      'game.attack',
      'game.endTurn',
      'game.health',
    ];

    for (const [langCode, translation] of Object.entries(languages)) {
      for (const key of requiredGameKeys) {
        const value = getNestedValue(translation, key);
        expect(value, `Missing ${langCode} translation for ${key}`).toBeDefined();
        expect(value, `Empty ${langCode} translation for ${key}`).not.toBe('');
      }
    }
  });

  it('should have translated all error messages', () => {
    const requiredErrorKeys = [
      'errors.roomNotFound',
      'errors.roomFull',
      'errors.invalidMove',
      'errors.notYourTurn',
    ];

    for (const [langCode, translation] of Object.entries(languages)) {
      for (const key of requiredErrorKeys) {
        const value = getNestedValue(translation, key);
        expect(value, `Missing ${langCode} translation for ${key}`).toBeDefined();
        expect(value, `Empty ${langCode} translation for ${key}`).not.toBe('');
      }
    }
  });

  it('should have translated connection status strings', () => {
    const connectionKeys = [
      'connection.connected',
      'connection.disconnected',
      'connection.reconnecting',
      'connection.reconnected',
    ];

    for (const [langCode, translation] of Object.entries(languages)) {
      for (const key of connectionKeys) {
        const value = getNestedValue(translation, key);
        expect(value, `Missing ${langCode} translation for ${key}`).toBeDefined();
        expect(value, `Empty ${langCode} translation for ${key}`).not.toBe('');
      }
    }
  });

  it('should not have hardcoded English strings in non-English languages', () => {
    // Check that non-English translations don't just copy English values
    const sampleKeys = [
      'common.create',
      'lobby.title',
      'game.attack',
      'characters.Brute.name',
    ];

    for (const key of sampleKeys) {
      const enValue = getNestedValue(enTranslation, key);

      // Spanish should not equal English
      const esValue = getNestedValue(esTranslation, key);
      expect(esValue).not.toBe(enValue);

      // French should not equal English
      const frValue = getNestedValue(frTranslation, key);
      expect(frValue).not.toBe(enValue);

      // German should not equal English (some words might be same, skip those)
      const deValue = getNestedValue(deTranslation, key);
      if (enValue !== 'Error') { // 'Error' is same in German
        expect(deValue).not.toBe(enValue);
      }
    }
  });
});
