/**
 * E2E Test: Pan Gesture on Game Board (US3 - T127)
 *
 * Test Scenario:
 * 1. Player opens game on mobile viewport
 * 2. Player performs drag/pan gesture on hex grid
 * 3. Viewport pans smoothly to show different areas
 * 4. Pan has momentum/inertia (continues after finger lifted)
 * 5. Pan is constrained within board boundaries
 */

import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone SE'],
});

test.describe('User Story 3: Pan Gesture on Game Board', () => {
  test('should pan hex grid on drag gesture', async ({ page }) => {
    // Setup game
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for game board
    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexGrid = page.locator('[data-testid="hex-grid"]');
    const hexGridBox = await hexGrid.boundingBox();
    expect(hexGridBox).toBeTruthy();

    if (hexGridBox) {
      const startX = hexGridBox.x + hexGridBox.width / 2;
      const startY = hexGridBox.y + hexGridBox.height / 2;

      // Get initial viewport position
      const initialTransform = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      // Perform pan gesture (drag from center to left)
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 100, startY, { steps: 10 });
      await page.mouse.up();

      await page.waitForTimeout(500);

      // Verify viewport position changed
      const pannedTransform = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      expect(pannedTransform).not.toBe(initialTransform);
    }
  });

  test('should pan in all directions', async ({ page }) => {
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
      const centerX = hexGridBox.x + hexGridBox.width / 2;
      const centerY = hexGridBox.y + hexGridBox.height / 2;

      // Test panning in 4 directions
      const directions = [
        { name: 'left', dx: -50, dy: 0 },
        { name: 'right', dx: 50, dy: 0 },
        { name: 'up', dx: 0, dy: -50 },
        { name: 'down', dx: 0, dy: 50 },
      ];

      for (const dir of directions) {
        const initialTransform = await hexGrid.evaluate((el) =>
          window.getComputedStyle(el).transform
        );

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + dir.dx, centerY + dir.dy, { steps: 5 });
        await page.mouse.up();

        await page.waitForTimeout(300);

        const pannedTransform = await hexGrid.evaluate((el) =>
          window.getComputedStyle(el).transform
        );

        expect(pannedTransform).not.toBe(initialTransform);
      }
    }
  });

  test('should have momentum/inertia after pan gesture', async ({ page }) => {
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
      const startX = hexGridBox.x + hexGridBox.width / 2;
      const startY = hexGridBox.y + hexGridBox.height / 2;

      // Perform quick pan gesture
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 150, startY, { steps: 5 }); // Fast movement
      await page.mouse.up();

      // Immediately after release, capture position
      await page.waitForTimeout(50);
      const positionAfterRelease = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      // Wait for inertia to complete
      await page.waitForTimeout(1000);

      const positionAfterInertia = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      // Position should have changed due to momentum
      expect(positionAfterInertia).not.toBe(positionAfterRelease);
    }
  });

  test('should respect board boundaries when panning', async ({ page }) => {
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
      const centerX = hexGridBox.x + hexGridBox.width / 2;
      const centerY = hexGridBox.y + hexGridBox.height / 2;

      // Try to pan beyond board boundaries multiple times
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 200, centerY, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
      }

      // Verify hex grid is still visible (not panned off-screen)
      await expect(hexGrid).toBeVisible();

      // Verify at least some hex tiles are visible
      const hexTiles = page.locator('[data-testid^="hex-tile"]');
      const tileCount = await hexTiles.count();
      expect(tileCount).toBeGreaterThan(0);
    }
  });

  test('should not pan when tapping on interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for card selection
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    const hexGrid = page.locator('[data-testid="hex-grid"]');
    const initialTransform = await hexGrid.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Try to drag on a button (interactive element)
    const button = page.locator('[data-testid="confirm-cards-button"]');
    const buttonBox = await button.boundingBox();

    if (buttonBox) {
      await page.mouse.move(buttonBox.x + 10, buttonBox.y + 10);
      await page.mouse.down();
      await page.mouse.move(buttonBox.x + 50, buttonBox.y + 10, { steps: 5 });
      await page.mouse.up();

      await page.waitForTimeout(300);

      // Verify grid didn't pan (transform unchanged)
      const afterTransform = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      expect(afterTransform).toBe(initialTransform);
    }
  });

  test('should not pan when dragging to select units', async ({ page }) => {
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
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for player turn
    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });

    const character = page.locator('[data-testid^="character"]').first();
    await expect(character).toBeVisible({ timeout: 2000 });

    const hexGrid = page.locator('[data-testid="hex-grid"]');
    const initialTransform = await hexGrid.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // Try to drag starting from character (should select, not pan)
    const characterBox = await character.boundingBox();

    if (characterBox) {
      await page.mouse.move(characterBox.x + 10, characterBox.y + 10);
      await page.mouse.down();
      await page.mouse.move(characterBox.x + 30, characterBox.y + 10, { steps: 3 });
      await page.mouse.up();

      await page.waitForTimeout(300);

      // Verify character is selected (not panned)
      await expect(character).toHaveAttribute('data-selected', 'true', { timeout: 1000 });
    }
  });

  test('should smoothly pan with touch scroll', async ({ page }) => {
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
      const centerX = hexGridBox.x + hexGridBox.width / 2;
      const centerY = hexGridBox.y + hexGridBox.height / 2;

      const initialTransform = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      // Simulate touch scroll
      await page.touchscreen.tap(centerX, centerY);

      // Perform multi-step pan for smooth movement
      const steps = 20;
      const distance = 100;

      for (let i = 0; i <= steps; i++) {
        const x = centerX - (distance * i / steps);
        await page.mouse.move(x, centerY);
        await page.waitForTimeout(10);
      }

      await page.waitForTimeout(300);

      const pannedTransform = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      expect(pannedTransform).not.toBe(initialTransform);
    }
  });

  test('should allow panning while zoomed in', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexGrid = page.locator('[data-testid="hex-grid"]');

    // Zoom in first
    await hexGrid.evaluate((el) => {
      el.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true
      }));
    });

    await page.waitForTimeout(500);

    // Now try panning
    const hexGridBox = await hexGrid.boundingBox();
    expect(hexGridBox).toBeTruthy();

    if (hexGridBox) {
      const centerX = hexGridBox.x + hexGridBox.width / 2;
      const centerY = hexGridBox.y + hexGridBox.height / 2;

      const beforePan = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX - 100, centerY, { steps: 10 });
      await page.mouse.up();

      await page.waitForTimeout(500);

      const afterPan = await hexGrid.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      // Transform should change (pan while zoomed)
      expect(afterPan).not.toBe(beforePan);
    }
  });
});
