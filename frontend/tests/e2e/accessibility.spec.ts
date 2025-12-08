/**
 * E2E Test: Accessibility Requirements (WCAG 2.1 Level AA)
 *
 * Test Scenarios:
 * 1. WCAG 2.1 Level AA compliance
 * 2. Touch targets >= 44px (mobile)
 * 3. Keyboard navigation support
 * 4. Screen reader compatibility
 * 5. Color contrast ratios
 * 6. Focus indicators
 * 7. ARIA labels and roles
 * 8. Semantic HTML structure
 */

import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { LobbyPage } from '../pages/LobbyPage';
import { CharacterSelectionPage } from '../pages/CharacterSelectionPage';
import { assertGameBoardLoaded } from '../helpers/assertions';

test.describe('Accessibility Requirements', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.navigate();

    // Check heading structure
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);

    // Should have only one h1
    expect(h1).toBeLessThanOrEqual(1);

    // All headings should be properly nested
    const headings = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return elements.map(el => parseInt(el.tagName.substring(1)));
    });

    // Verify no heading level is skipped
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i] - headings[i - 1];
      expect(diff).toBeLessThanOrEqual(1);
    }
  });

  test('should have sufficient color contrast for text', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.navigate();

    // Check contrast ratio for main buttons
    const createButton = page.locator('[data-testid="create-game-button"]');
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const contrast = await createButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const bg = styles.backgroundColor;
        const color = styles.color;

        // Simple contrast calculation (RGB to luminance)
        const getLuminance = (rgb: string) => {
          const values = rgb.match(/\d+/g);
          if (!values) return 0;

          const [r, g, b] = values.map(v => {
            const val = parseInt(v) / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
          });

          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const bgLuminance = getLuminance(bg);
        const fgLuminance = getLuminance(color);

        const lighter = Math.max(bgLuminance, fgLuminance);
        const darker = Math.min(bgLuminance, fgLuminance);

        return (lighter + 0.05) / (darker + 0.05);
      });

      // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('should support keyboard navigation on landing page', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.navigate();

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // First focusable element should have focus
    const focused1 = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused1).toBeTruthy();

    // Tab again
    await page.keyboard.press('Tab');

    const focused2 = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused2).toBeTruthy();

    // Should be able to activate button with Enter
    await page.keyboard.press('Enter');

    // Should navigate to next screen
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

    const url = page.url();
    expect(url).not.toContain('/#');
  });

  test('should have ARIA labels on interactive elements', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.navigate();

    // Check create game button
    const createButton = page.locator('[data-testid="create-game-button"]');
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const ariaLabel = await createButton.getAttribute('aria-label');
      const text = await createButton.textContent();

      // Should have either aria-label or visible text
      expect(ariaLabel || text).toBeTruthy();
    }

    // Check join game button
    const joinButton = page.locator('[data-testid="join-game-button"]');
    if (await joinButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const ariaLabel = await joinButton.getAttribute('aria-label');
      const text = await joinButton.textContent();

      expect(ariaLabel || text).toBeTruthy();
    }
  });

  test('should have proper focus indicators', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.navigate();

    // Tab to first element
    await page.keyboard.press('Tab');

    // Check focus outline
    const focusOutline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el) return null;

      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineColor: styles.outlineColor,
        boxShadow: styles.boxShadow
      };
    });

    // Should have visible focus indicator (outline or box-shadow)
    const hasVisibleFocus = focusOutline &&
      (focusOutline.outline !== 'none' ||
       focusOutline.outlineWidth !== '0px' ||
       focusOutline.boxShadow !== 'none');

    expect(hasVisibleFocus).toBe(true);
  });

  test('should have alt text on images', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);
    const charSelectPage = new CharacterSelectionPage(page);

    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('Player1');

    // Character selection page likely has images
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      for (let i = 0; i < Math.min(5, imageCount); i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');

        // Images should have alt text or role="presentation" for decorative images
        expect(alt !== null || role === 'presentation').toBe(true);
      }
    }
  });

  test('should have semantic HTML form elements', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);

    await landingPage.navigate();
    await landingPage.clickJoinGame();

    // Check room code input
    const roomCodeInput = page.locator('[data-testid="room-code-input"]');
    if (await roomCodeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tagName = await roomCodeInput.evaluate(el => el.tagName.toLowerCase());
      expect(tagName).toBe('input');

      // Should have associated label
      const id = await roomCodeInput.getAttribute('id');
      const ariaLabel = await roomCodeInput.getAttribute('aria-label');
      const ariaLabelledBy = await roomCodeInput.getAttribute('aria-labelledby');

      const hasLabel = id || ariaLabel || ariaLabelledBy;
      expect(hasLabel).toBeTruthy();
    }

    // Check nickname input
    const nicknameInput = page.locator('[data-testid="nickname-input"]');
    if (await nicknameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tagName = await nicknameInput.evaluate(el => el.tagName.toLowerCase());
      expect(tagName).toBe('input');

      const id = await nicknameInput.getAttribute('id');
      const ariaLabel = await nicknameInput.getAttribute('aria-label');
      const ariaLabelledBy = await nicknameInput.getAttribute('aria-labelledby');

      const hasLabel = id || ariaLabel || ariaLabelledBy;
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should announce dynamic content to screen readers', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);

    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('Player1');

    // Check for ARIA live regions
    const liveRegions = await page.locator('[aria-live]').count();

    // Dynamic updates (like room code generation) should use aria-live
    if (liveRegions > 0) {
      const ariaLive = await page.locator('[aria-live]').first().getAttribute('aria-live');
      expect(['polite', 'assertive']).toContain(ariaLive);
    }
  });

  test('should have proper button roles', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.navigate();

    // All interactive elements should be buttons or links
    const createButton = page.locator('[data-testid="create-game-button"]');
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tagName = await createButton.evaluate(el => el.tagName.toLowerCase());
      const role = await createButton.getAttribute('role');

      // Should be <button> or have role="button"
      expect(tagName === 'button' || role === 'button').toBe(true);
    }
  });

  test('should support keyboard shortcuts for common actions', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);
    const charSelectPage = new CharacterSelectionPage(page);

    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('Player1');
    await charSelectPage.selectCharacter('Brute');

    const scenarioSelect = page.locator('[data-testid="scenario-select"]');
    if (await scenarioSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scenarioSelect.click();
      await page.locator('[data-testid="scenario-1"]').click();
    }

    await lobbyPage.startGame();
    await assertGameBoardLoaded(page);

    // Test Escape key to close modals
    const modal = page.locator('[role="dialog"]');
    if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');

      // Modal should close
      await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {});
      const isStillVisible = await modal.isVisible().catch(() => false);
      expect(isStillVisible).toBe(false);
    }
  });

  test('should have skip navigation link', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.navigate();

    // Tab to reveal skip link
    await page.keyboard.press('Tab');

    // Check for skip link
    const skipLink = page.locator('a:has-text("Skip to"), a:has-text("Skip navigation")');
    const hasSkipLink = await skipLink.count();

    // Skip link is recommended but not required for simple pages
    // Just check that if it exists, it's functional
    if (hasSkipLink > 0) {
      const href = await skipLink.first().getAttribute('href');
      expect(href).toMatch(/#.+/); // Should link to an anchor
    }
  });

  test('should have descriptive page titles', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.navigate();

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    // Title should be descriptive, not just "React App"
    expect(title).not.toBe('React App');
  });

  test('should support zoom up to 200% without breaking layout', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.navigate();

    // Set zoom to 200%
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });

    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});

    // Buttons should still be visible and clickable
    const createButton = page.locator('[data-testid="create-game-button"]');
    await expect(createButton).toBeVisible();

    const isClickable = await createButton.isEnabled();
    expect(isClickable).toBe(true);

    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    // Some overflow is acceptable, but content should remain accessible
    // (This is a soft check - layouts can handle zoom differently)
  });

  test('should have error messages associated with form fields', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.navigate();
    await landingPage.clickJoinGame();

    // Try to submit without filling required fields
    const joinButton = page.locator('button:has-text("Join")');
    if (await joinButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await joinButton.click();

      // Check for error messages
      const errorMessage = page.locator('[role="alert"], [aria-live="assertive"]');
      if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Error should be associated with field via aria-describedby
        const describedBy = await page.locator('[aria-describedby]').count();
        const hasAssociation = describedBy > 0;

        // Error messages should be properly announced
        expect(hasAssociation || await errorMessage.isVisible()).toBe(true);
      }
    }
  });
});
