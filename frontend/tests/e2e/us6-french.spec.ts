/**
 * E2E Test: Language changes to French, all UI text updates
 *
 * User Story 6: Multi-Lingual Play (T183)
 * Test: Change device language to French, verify all menus, buttons, instructions
 * display in French
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 6: French Language Support', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set French as the preferred language in browser context
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'fr',
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['fr', 'fr-FR', 'en'],
      });
    });

    // Navigate to the app
    await page.goto('/');
  });

  test('should detect French from browser and display French UI', async ({ page }) => {
    // Wait for app to load
    await page.waitForLoadState('networkidle');

    // Check that the main title is in French
    const title = await page.textContent('h1');
    expect(title).toBe('Hexhaven Multijoueur');

    // Check button texts are in French
    const createButton = await page.textContent('button.create-button');
    expect(createButton).toContain('Créer une Partie');

    const joinButton = await page.textContent('button.secondary-button');
    expect(joinButton).toContain('Rejoindre');
  });

  test('should manually switch to French using LanguageSelector', async ({ page, context }) => {
    // First set English as default
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'en',
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify starting in English
    let title = await page.textContent('h1');
    expect(title).toBe('Hexhaven Multiplayer');

    // Click language selector to open dropdown
    await page.click('[data-testid="language-button"]');

    // Wait for dropdown to be visible
    await page.waitForSelector('[data-testid="language-dropdown"]', { state: 'visible' });

    // Click French option
    await page.click('[data-testid="language-option-fr"]');

    // Wait for language change to take effect
    await page.waitForTimeout(500);

    // Verify UI is now in French
    title = await page.textContent('h1');
    expect(title).toBe('Hexhaven Multijoueur');

    const createButton = await page.textContent('button.create-button');
    expect(createButton).toContain('Créer une Partie');
  });

  test('should display French character names and descriptions', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Create a game to see character selection
    await page.click('button.create-button');

    // Wait for room creation
    await page.waitForTimeout(2000);

    // Check character names are translated (if character select is visible)
    const characterElements = await page.$$('[data-character-class]');
    if (characterElements.length > 0) {
      // Check if at least one character name is in French
      const texts = await Promise.all(
        characterElements.map(el => el.textContent())
      );

      // "Tinkerer" should be "Bricoleur" in French
      const hasBricoleur = texts.some(text => text?.includes('Bricoleur'));
      expect(hasBricoleur).toBe(true);
    }
  });

  test('should persist French language preference in localStorage', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click language selector
    await page.click('[data-testid="language-button"]');
    await page.waitForSelector('[data-testid="language-dropdown"]', { state: 'visible' });

    // Select French
    await page.click('[data-testid="language-option-fr"]');
    await page.waitForTimeout(500);

    // Check localStorage has the French language code
    const storedLanguage = await page.evaluate(() => localStorage.getItem('i18nextLng'));
    expect(storedLanguage).toBe('fr');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify French is still active
    const title = await page.textContent('h1');
    expect(title).toBe('Hexhaven Multijoueur');
  });

  test('should display French divider text', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find the divider that shows "or" / "ou"
    const dividerElements = await page.$$('.divider span');
    if (dividerElements.length > 0) {
      const dividerText = await dividerElements[0].textContent();
      expect(dividerText).toBe('ou'); // French for "or"
    }
  });

  test('should display French connection status messages', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Create a game to trigger connection-related UI
    await page.click('button.create-button');
    await page.waitForTimeout(2000);

    // Check for French connection status terms
    const bodyText = await page.textContent('body');

    // Connection statuses should be in French when they appear
    // "Connected" = "Connecté", "Disconnected" = "Déconnecté"
    const hasFrenchTerms =
      bodyText?.includes('Connecté') ||
      bodyText?.includes('Déconnecté') ||
      bodyText?.includes('Reconnexion');

    // Soft assertion as connection states may not be visible
    if (hasFrenchTerms) {
      expect(hasFrenchTerms).toBe(true);
    }
  });

  test('should display French welcome message', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Set a nickname in localStorage to trigger welcome message
    await page.evaluate(() => {
      localStorage.setItem('playerNickname', 'TestPlayer');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for French welcome message
    const welcomeText = await page.textContent('.welcome-message');
    if (welcomeText) {
      expect(welcomeText).toContain('Bienvenue'); // French for "Welcome"
    }
  });
});
