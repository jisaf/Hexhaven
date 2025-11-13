/**
 * E2E Test: Language changes to German, text expansion doesn't break layout
 *
 * User Story 6: Multi-Lingual Play (T184 and T194)
 * Test: Change to German language, verify text expands properly (30-50% longer)
 * without breaking UI layout. Ensures buttons, containers, and modals adapt.
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 6: German Language and Layout Support', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set German as the preferred language
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'de',
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['de', 'de-DE', 'en'],
      });
    });

    // Navigate to the app
    await page.goto('/');
  });

  test('should detect German from browser and display German UI', async ({ page }) => {
    // Wait for app to load
    await page.waitForLoadState('networkidle');

    // Check that the main title is in German
    const title = await page.textContent('h1');
    expect(title).toBe('Hexhaven Mehrspieler');

    // Check button texts are in German
    const createButton = await page.textContent('button.create-button');
    expect(createButton).toContain('Spiel Erstellen');

    const joinButton = await page.textContent('button.secondary-button');
    expect(joinButton).toContain('Beitreten');
  });

  test('should handle long German strings without text overflow', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check all buttons for overflow
    const buttons = await page.$$('button');

    for (const button of buttons) {
      const boundingBox = await button.boundingBox();
      if (!boundingBox) continue;

      // Check that button text doesn't overflow
      const scrollWidth = await button.evaluate(el => el.scrollWidth);
      const clientWidth = await button.evaluate(el => el.clientWidth);

      // ScrollWidth should not be significantly larger than clientWidth
      // Allow small difference for padding/borders
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    }
  });

  test('should maintain button minimum touch target size (44px) in German', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // All interactive buttons should maintain 44px minimum
    const buttons = await page.$$('button');

    for (const button of buttons) {
      const boundingBox = await button.boundingBox();
      if (!boundingBox) continue;

      // Check minimum touch target dimensions
      expect(boundingBox.height).toBeGreaterThanOrEqual(44);

      // Width can be flexible for text, but should be reasonable
      expect(boundingBox.width).toBeGreaterThan(0);
    }
  });

  test('should display German character descriptions without truncation', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Create a game to see character selection
    await page.click('button.create-button');
    await page.waitForTimeout(2000);

    // Find character description elements
    const descriptions = await page.$$('[data-character-class] .character-description');

    for (const desc of descriptions) {
      const text = await desc.textContent();
      if (!text) continue;

      // Check text is not truncated with ellipsis
      expect(text).not.toContain('…');
      expect(text).not.toContain('...');

      // Check scrollHeight vs clientHeight (no vertical overflow)
      const hasOverflow = await desc.evaluate(el => {
        return el.scrollHeight > el.clientHeight + 2; // Allow 2px tolerance
      });

      expect(hasOverflow).toBe(false);
    }
  });

  test('should properly layout German text in language selector dropdown', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Open language selector
    await page.click('[data-testid="language-button"]');
    await page.waitForSelector('[data-testid="language-dropdown"]', { state: 'visible' });

    // Check German option layout
    const germanOption = await page.$('[data-testid="language-option-de"]');
    expect(germanOption).toBeTruthy();

    if (germanOption) {
      const boundingBox = await germanOption.boundingBox();
      expect(boundingBox?.height).toBeGreaterThanOrEqual(44); // Touch target

      // Check text doesn't overflow
      const scrollWidth = await germanOption.evaluate(el => el.scrollWidth);
      const clientWidth = await germanOption.evaluate(el => el.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    }
  });

  test('should handle German error messages without layout breaks', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Switch to German manually to ensure it's active
    await page.click('[data-testid="language-button"]');
    await page.waitForSelector('[data-testid="language-dropdown"]', { state: 'visible' });
    await page.click('[data-testid="language-option-de"]');
    await page.waitForTimeout(500);

    // German error messages tend to be longer
    // Example: "Verbindungsfehler - bitte versuchen Sie es erneut"
    // vs English: "Connection error - please try again"

    // This test verifies that when errors occur, they don't break layout
    // We check that the error container can accommodate longer text

    const errorContainers = await page.$$('.error-message, [role="alert"]');

    for (const container of errorContainers) {
      const hasOverflow = await container.evaluate(el => {
        return el.scrollWidth > el.clientWidth + 5;
      });

      expect(hasOverflow).toBe(false);
    }
  });

  test('should display German lobby status messages with proper wrapping', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Create a game to see lobby messages
    await page.click('button.create-button');
    await page.waitForTimeout(2000);

    // German status messages are longer:
    // "Warte darauf, dass alle Spieler Charaktere auswählen..."
    // vs English: "Waiting for all players to select characters..."

    const statusElements = await page.$$('.waiting-message, .status-message, p');

    for (const element of statusElements) {
      const text = await element.textContent();
      if (!text || text.trim().length === 0) continue;

      // Check for horizontal overflow
      const hasHorizontalOverflow = await element.evaluate(el => {
        return el.scrollWidth > el.clientWidth + 5;
      });

      expect(hasHorizontalOverflow).toBe(false);

      // Text should wrap if needed (white-space should not be nowrap)
      const whiteSpace = await element.evaluate(el => {
        return window.getComputedStyle(el).whiteSpace;
      });

      if (text.length > 50) {
        // Long text should allow wrapping
        expect(whiteSpace).not.toBe('nowrap');
      }
    }
  });

  test('should maintain responsive layout with German text on mobile viewport', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to German
    await page.click('[data-testid="language-button"]');
    await page.waitForSelector('[data-testid="language-dropdown"]', { state: 'visible' });
    await page.click('[data-testid="language-option-de"]');
    await page.waitForTimeout(500);

    // Check no horizontal scrolling is needed
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const bodyClientWidth = await page.evaluate(() => document.body.clientWidth);

    expect(bodyScrollWidth).toBeLessThanOrEqual(bodyClientWidth + 1); // Allow 1px tolerance

    // Check all buttons are still clickable and properly sized
    const createButton = await page.$('button.create-button');
    if (createButton) {
      const box = await createButton.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeLessThanOrEqual(375); // Should fit in viewport
    }
  });

  test('should persist German language preference across navigation', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Verify German is detected
    const title = await page.textContent('h1');
    expect(title).toBe('Hexhaven Mehrspieler');

    // Check localStorage
    const storedLanguage = await page.evaluate(() => localStorage.getItem('i18nextLng'));
    expect(storedLanguage).toBe('de');

    // Navigate to a different page and back
    await page.goto('/game'); // Navigate away
    await page.goto('/'); // Navigate back
    await page.waitForLoadState('networkidle');

    // German should still be active
    const titleAfterNav = await page.textContent('h1');
    expect(titleAfterNav).toBe('Hexhaven Mehrspieler');
  });
});
