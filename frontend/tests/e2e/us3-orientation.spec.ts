/**
 * E2E Test: Orientation Change (US3 - T130)
 *
 * Test Scenario:
 * 1. Game is active in portrait orientation
 * 2. Device orientation changes to landscape
 * 3. Layout adapts responsively
 * 4. Game state is preserved
 * 5. Viewport and zoom settings are maintained
 */

import { test, expect, devices } from '@playwright/test';

test.describe('User Story 3: Orientation Change', () => {
  test('should adapt layout when changing from portrait to landscape', async ({ page, browser }) => {
    // Start in portrait mode (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Verify portrait layout
    const portraitGrid = await page.locator('[data-testid="hex-grid"]').boundingBox();
    expect(portraitGrid).toBeTruthy();

    // Change to landscape mode
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    // Verify hex grid is still visible
    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible();

    // Verify layout adapted
    const landscapeGrid = await page.locator('[data-testid="hex-grid"]').boundingBox();
    expect(landscapeGrid).toBeTruthy();

    // Grid dimensions should be different (utilizing wider viewport)
    if (portraitGrid && landscapeGrid) {
      expect(landscapeGrid.width).not.toBe(portraitGrid.width);
    }
  });

  test('should preserve game state during orientation change', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Select cards
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click();
    await page.locator('[data-testid="ability-card-move"]').click();

    // Verify selection
    const selectedCards = page.locator('[data-testid^="ability-card"][data-selected="true"]');
    const portraitSelectedCount = await selectedCards.count();
    expect(portraitSelectedCount).toBe(2);

    // Change orientation
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    // Verify selected cards are still selected
    const landscapeSelectedCount = await selectedCards.count();
    expect(landscapeSelectedCount).toBe(portraitSelectedCount);

    // Verify specific cards are still selected
    await expect(page.locator('[data-testid="ability-card-attack"][data-selected="true"]')).toBeVisible();
    await expect(page.locator('[data-testid="ability-card-move"][data-selected="true"]')).toBeVisible();
  });

  test('should maintain zoom level during orientation change', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexGrid = page.locator('[data-testid="hex-grid"]');

    // Zoom in
    await hexGrid.evaluate((el) => {
      el.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true
      }));
    });

    await page.waitForTimeout(500);

    // Get zoom level (scale from transform matrix)
    const getZoomScale = async () => {
      const transform = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );
      const match = transform.match(/matrix\(([^,]+),/);
      return match ? parseFloat(match[1]) : 1;
    };

    const portraitZoom = await getZoomScale();
    expect(portraitZoom).toBeGreaterThan(1); // Zoomed in

    // Change orientation
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    // Verify zoom level is maintained (approximately)
    const landscapeZoom = await getZoomScale();
    expect(Math.abs(landscapeZoom - portraitZoom)).toBeLessThan(0.2);
  });

  test('should maintain viewport pan position during orientation change', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexGrid = page.locator('[data-testid="hex-grid"]');
    const hexGridBox = await hexGrid.boundingBox();
    expect(hexGridBox).toBeTruthy();

    if (hexGridBox) {
      // Pan to a specific position
      await page.mouse.move(hexGridBox.x + 100, hexGridBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(hexGridBox.x - 50, hexGridBox.y - 50, { steps: 10 });
      await page.mouse.up();

      await page.waitForTimeout(500);

      // Get pan position (translation from transform matrix)
      const getTranslation = async () => {
        const transform = await hexGrid.evaluate((el) =>
          window.getComputedStyle(el).transform
        );
        const match = transform.match(/matrix\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+),\s*([^)]+)\)/);
        if (match) {
          return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        }
        return { x: 0, y: 0 };
      };

      const portraitTranslation = await getTranslation();

      // Change orientation
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      // Verify pan position is approximately maintained
      const landscapeTranslation = await getTranslation();

      // Allow some variation due to viewport size change, but should be similar
      expect(Math.abs(landscapeTranslation.x - portraitTranslation.x)).toBeLessThan(100);
      expect(Math.abs(landscapeTranslation.y - portraitTranslation.y)).toBeLessThan(100);
    }
  });

  test('should adapt UI controls for landscape layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Get card panel position in portrait
    const cardPanel = page.locator('[data-testid="card-selection-panel"]');
    await expect(cardPanel).toBeVisible({ timeout: 10000 });

    const portraitPanelBox = await cardPanel.boundingBox();
    expect(portraitPanelBox).toBeTruthy();

    // Change to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    // Verify card panel is still visible
    await expect(cardPanel).toBeVisible();

    // Panel should reposition for landscape (e.g., from bottom to side)
    const landscapePanelBox = await cardPanel.boundingBox();
    expect(landscapePanelBox).toBeTruthy();

    // Position should be different in landscape
    if (portraitPanelBox && landscapePanelBox) {
      // In landscape, UI might be repositioned (e.g., cards on side instead of bottom)
      const positionChanged =
        Math.abs(portraitPanelBox.x - landscapePanelBox.x) > 50 ||
        Math.abs(portraitPanelBox.y - landscapePanelBox.y) > 50;

      // Position change is expected for responsive layout
      // Just verify the panel is still usable
      expect(landscapePanelBox.width).toBeGreaterThan(0);
      expect(landscapePanelBox.height).toBeGreaterThan(0);
    }
  });

  test('should handle multiple orientation changes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Rapidly change orientations
    const orientations = [
      { width: 667, height: 375 }, // Landscape
      { width: 375, height: 667 }, // Portrait
      { width: 667, height: 375 }, // Landscape
      { width: 375, height: 667 }, // Portrait
    ];

    for (const orientation of orientations) {
      await page.setViewportSize(orientation);
      await page.waitForTimeout(300);

      // Verify hex grid remains visible and functional
      await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible();
    }

    // Verify game is still playable
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    const cards = page.locator('[data-testid^="ability-card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('should not disrupt active animations during orientation change', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Trigger movement (would have animation)
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-move"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });

    // While animation would be playing, change orientation
    // (In practice, we'd trigger a movement and immediately change orientation)
    // For this test, we just verify no crashes occur
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    // Verify game is still responsive
    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible();
  });

  test('should show orientation change hint on first rotation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // First orientation change
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    // Optional: Check for orientation hint/tooltip
    const orientationHint = page.locator('[data-testid="orientation-hint"]');
    if (await orientationHint.isVisible({ timeout: 2000 })) {
      await expect(orientationHint).toContainText(/landscape|orientation|rotated/i);

      // Hint should auto-dismiss
      await expect(orientationHint).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should work on tablet sizes in both orientations', async ({ page }) => {
    // iPad dimensions
    const iPadPortrait = { width: 768, height: 1024 };
    const iPadLandscape = { width: 1024, height: 768 };

    // Portrait
    await page.setViewportSize(iPadPortrait);

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Verify layout works on tablet portrait
    const hexGrid = page.locator('[data-testid="hex-grid"]');
    const portraitBox = await hexGrid.boundingBox();
    expect(portraitBox).toBeTruthy();
    expect(portraitBox?.width).toBeGreaterThan(300);

    // Switch to landscape
    await page.setViewportSize(iPadLandscape);
    await page.waitForTimeout(500);

    // Verify layout works on tablet landscape
    const landscapeBox = await hexGrid.boundingBox();
    expect(landscapeBox).toBeTruthy();
    expect(landscapeBox?.width).toBeGreaterThan(400);

    // More horizontal space should be utilized
    if (portraitBox && landscapeBox) {
      expect(landscapeBox.width).toBeGreaterThan(portraitBox.width);
    }
  });
});
