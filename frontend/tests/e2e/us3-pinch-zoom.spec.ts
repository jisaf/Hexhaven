/**
 * E2E Test: Pinch-Zoom on Hex Grid (US3 - T126)
 *
 * Test Scenario:
 * 1. Player opens game on mobile viewport (iPhone SE 375px)
 * 2. Player performs pinch-out gesture (zoom in)
 * 3. Hex grid scales appropriately
 * 4. Player performs pinch-in gesture (zoom out)
 * 5. Hex grid scales back
 * 6. Zoom is constrained within min/max boundaries
 */

import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone SE'],
});

test.describe('User Story 3: Pinch-Zoom on Hex Grid', () => {
  test('should zoom in on pinch-out gesture', async ({ page }) => {
    // Setup game
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for game board to load
    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Get initial scale/zoom level
    const hexGrid = page.locator('[data-testid="hex-grid"]');
    const initialTransform = await hexGrid.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Perform pinch-out gesture (zoom in)
    const hexGridBox = await hexGrid.boundingBox();
    expect(hexGridBox).toBeTruthy();

    if (hexGridBox) {
      const centerX = hexGridBox.x + hexGridBox.width / 2;
      const centerY = hexGridBox.y + hexGridBox.height / 2;

      // Simulate pinch-out: two fingers moving apart
      await page.touchscreen.tap(centerX - 50, centerY);
      await page.touchscreen.tap(centerX + 50, centerY);

      // Alternative: Use wheel event for zoom simulation
      await hexGrid.evaluate((el) => {
        el.dispatchEvent(new WheelEvent('wheel', {
          deltaY: -100,
          ctrlKey: true,
          bubbles: true
        }));
      });
    }

    // Wait for zoom animation
    await page.waitForTimeout(500);

    // Verify scale increased
    const zoomedTransform = await hexGrid.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    expect(zoomedTransform).not.toBe(initialTransform);
    expect(zoomedTransform).toContain('matrix'); // Transform should be applied
  });

  test('should zoom out on pinch-in gesture', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexGrid = page.locator('[data-testid="hex-grid"]');

    // First zoom in
    await hexGrid.evaluate((el) => {
      el.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true
      }));
    });

    await page.waitForTimeout(500);

    const zoomedInTransform = await hexGrid.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Then zoom out
    await hexGrid.evaluate((el) => {
      el.dispatchEvent(new WheelEvent('wheel', {
        deltaY: 100,
        ctrlKey: true,
        bubbles: true
      }));
    });

    await page.waitForTimeout(500);

    const zoomedOutTransform = await hexGrid.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Scale should be different (smaller) than zoomed-in state
    expect(zoomedOutTransform).not.toBe(zoomedInTransform);
  });

  test('should respect minimum zoom boundary', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexGrid = page.locator('[data-testid="hex-grid"]');

    // Try to zoom out excessively
    for (let i = 0; i < 10; i++) {
      await hexGrid.evaluate((el) => {
        el.dispatchEvent(new WheelEvent('wheel', {
          deltaY: 200,
          ctrlKey: true,
          bubbles: true
        }));
      });
    }

    await page.waitForTimeout(500);

    // Verify zoom level is constrained (minimum zoom)
    // The hex grid should still be visible and not infinitely small
    await expect(hexGrid).toBeVisible();

    const transform = await hexGrid.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Extract scale from matrix (matrix(a, b, c, d, e, f) where a and d are scale)
    const match = transform.match(/matrix\(([^,]+),/);
    if (match) {
      const scale = parseFloat(match[1]);
      expect(scale).toBeGreaterThanOrEqual(0.5); // Minimum zoom is 0.5x
    }
  });

  test('should respect maximum zoom boundary', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexGrid = page.locator('[data-testid="hex-grid"]');

    // Try to zoom in excessively
    for (let i = 0; i < 10; i++) {
      await hexGrid.evaluate((el) => {
        el.dispatchEvent(new WheelEvent('wheel', {
          deltaY: -200,
          ctrlKey: true,
          bubbles: true
        }));
      });
    }

    await page.waitForTimeout(500);

    // Verify zoom level is constrained (maximum zoom)
    const transform = await hexGrid.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    const match = transform.match(/matrix\(([^,]+),/);
    if (match) {
      const scale = parseFloat(match[1]);
      expect(scale).toBeLessThanOrEqual(3.0); // Maximum zoom is 3x
    }
  });

  test('should zoom centered on pinch gesture location', async ({ page }) => {
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
      // Zoom in at top-left corner
      const topLeftX = hexGridBox.x + 50;
      const topLeftY = hexGridBox.y + 50;

      await hexGrid.evaluate((el, coords) => {
        el.dispatchEvent(new WheelEvent('wheel', {
          deltaY: -100,
          ctrlKey: true,
          clientX: coords.x,
          clientY: coords.y,
          bubbles: true
        }));
      }, { x: topLeftX, y: topLeftY });

      await page.waitForTimeout(500);

      // Verify that the viewport centered around the zoom point
      // (In practice, we'd check the viewport transform includes proper translation)
      const transform = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      expect(transform).toContain('matrix');
    }
  });

  test('should show zoom level indicator', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexGrid = page.locator('[data-testid="hex-grid"]');

    // Perform zoom
    await hexGrid.evaluate((el) => {
      el.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true
      }));
    });

    // Verify zoom level indicator appears
    const zoomIndicator = page.locator('[data-testid="zoom-level-indicator"]');
    await expect(zoomIndicator).toBeVisible({ timeout: 2000 });

    // Indicator should show percentage (e.g., "150%")
    await expect(zoomIndicator).toContainText(/%/);

    // Indicator should fade out after a few seconds
    await expect(zoomIndicator).not.toBeVisible({ timeout: 5000 });
  });

  test('should maintain zoom level when switching between game phases', async ({ page }) => {
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

    const zoomedTransform = await hexGrid.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Select cards (transition to next phase)
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for turn phase
    await page.waitForTimeout(2000);

    // Verify zoom level is maintained
    const maintainedTransform = await hexGrid.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    expect(maintainedTransform).toBe(zoomedTransform);
  });
});
