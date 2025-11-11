/**
 * E2E Test: Long-Press Context Menu (US3 - T128)
 *
 * Test Scenario:
 * 1. Player long-presses on a hex tile
 * 2. Context menu appears with available actions
 * 3. Player can select an action from menu
 * 4. Menu dismisses on tap outside
 * 5. Different elements show different context menus
 */

import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone SE'],
});

test.describe('User Story 3: Long-Press Context Menu', () => {
  test('should show context menu on long-press of hex tile', async ({ page }) => {
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

    // Find an empty hex tile
    const hexTile = page.locator('[data-testid^="hex-tile"]').first();
    await expect(hexTile).toBeVisible();

    // Perform long-press (hold for >500ms)
    await hexTile.hover();
    await page.mouse.down();
    await page.waitForTimeout(600); // Long press duration
    await page.mouse.up();

    // Verify context menu appears
    const contextMenu = page.locator('[data-testid="hex-context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 1000 });

    // Context menu should show coordinates
    await expect(contextMenu).toContainText(/\(\d+,\s*\d+\)/); // (q, r) format
  });

  test('should show character actions in context menu', async ({ page }) => {
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
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for player turn
    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });

    // Long-press on character
    const character = page.locator('[data-testid^="character"]').first();
    await expect(character).toBeVisible();

    await character.hover();
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    // Context menu should show character-specific actions
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 1000 });

    // Should show available actions
    await expect(contextMenu).toContainText(/Move|Attack|Abilities/);

    // Should show character stats
    await expect(contextMenu).toContainText(/Health|Cards/);
  });

  test('should show monster info in context menu', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Long-press on monster
    const monster = page.locator('[data-testid^="monster"]').first();
    await expect(monster).toBeVisible({ timeout: 5000 });

    await monster.hover();
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    // Context menu should show monster stats
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 1000 });

    // Should show monster details
    await expect(contextMenu).toContainText(/Health|Move|Attack|Range/);

    // Should show if elite or normal
    await expect(contextMenu).toContainText(/Elite|Normal/);
  });

  test('should dismiss context menu on tap outside', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Show context menu
    const hexTile = page.locator('[data-testid^="hex-tile"]').first();
    await hexTile.hover();
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 1000 });

    // Tap outside context menu
    const hexGrid = page.locator('[data-testid="hex-grid"]');
    const hexGridBox = await hexGrid.boundingBox();

    if (hexGridBox) {
      await page.mouse.click(hexGridBox.x + 50, hexGridBox.y + 50);
    }

    // Context menu should dismiss
    await expect(contextMenu).not.toBeVisible({ timeout: 1000 });
  });

  test('should execute action selected from context menu', async ({ page }) => {
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
    await page.locator('[data-testid="ability-card-move"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for player turn
    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });

    // Long-press on character
    const character = page.locator('[data-testid^="character"]').first();
    await character.hover();
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).toBeVisible({ timeout: 1000 });

    // Select "Move" action from menu
    const moveAction = contextMenu.locator('button:has-text("Move")');
    if (await moveAction.isVisible()) {
      await moveAction.click();

      // Verify movement mode is activated
      await expect(page.locator('[data-testid="movement-mode"]')).toBeVisible({ timeout: 1000 });

      // Context menu should dismiss
      await expect(contextMenu).not.toBeVisible();
    }
  });

  test('should not show context menu on quick tap', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexTile = page.locator('[data-testid^="hex-tile"]').first();

    // Quick tap (less than long-press threshold)
    await hexTile.hover();
    await page.mouse.down();
    await page.waitForTimeout(100); // Short tap
    await page.mouse.up();

    // Context menu should NOT appear
    const contextMenu = page.locator('[data-testid="context-menu"]');
    await expect(contextMenu).not.toBeVisible({ timeout: 1000 });
  });

  test('should show visual feedback during long-press', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexTile = page.locator('[data-testid^="hex-tile"]').first();

    // Start long-press
    await hexTile.hover();
    await page.mouse.down();

    // During long-press, visual feedback should appear
    await page.waitForTimeout(300);

    // Check for long-press indicator (ripple effect, highlight, or progress ring)
    const longPressIndicator = page.locator('[data-testid="long-press-indicator"]');
    await expect(longPressIndicator).toBeVisible({ timeout: 500 });

    await page.waitForTimeout(300);
    await page.mouse.up();

    // Indicator should disappear after release
    await expect(longPressIndicator).not.toBeVisible({ timeout: 500 });
  });

  test('should cancel long-press if finger moves away', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    const hexTile = page.locator('[data-testid^="hex-tile"]').first();
    const tileBox = await hexTile.boundingBox();
    expect(tileBox).toBeTruthy();

    if (tileBox) {
      // Start long-press
      await page.mouse.move(tileBox.x + 10, tileBox.y + 10);
      await page.mouse.down();
      await page.waitForTimeout(300);

      // Move finger away (drag)
      await page.mouse.move(tileBox.x + 50, tileBox.y + 50, { steps: 5 });
      await page.waitForTimeout(300);
      await page.mouse.up();

      // Context menu should NOT appear (long-press was cancelled by movement)
      const contextMenu = page.locator('[data-testid="context-menu"]');
      await expect(contextMenu).not.toBeVisible({ timeout: 1000 });
    }
  });

  test('should show different menu items based on game state', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // During card selection phase - no movement actions available
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    const hexTile = page.locator('[data-testid^="hex-tile"]').first();
    await hexTile.hover();
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    let contextMenu = page.locator('[data-testid="context-menu"]');
    if (await contextMenu.isVisible()) {
      // During card selection, movement options should not be available
      await expect(contextMenu).not.toContainText(/Move here|Attack/);
    }

    // Dismiss menu
    await page.keyboard.press('Escape');

    // Select cards and move to action phase
    await page.locator('[data-testid="ability-card-move"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });

    // Now long-press during action phase
    await hexTile.hover();
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    contextMenu = page.locator('[data-testid="context-menu"]');
    if (await contextMenu.isVisible()) {
      // During action phase with move card, move option should be available
      await expect(contextMenu).toContainText(/Move|View/);
    }
  });

  test('should position context menu to avoid screen edges', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Get viewport dimensions
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();

    if (viewport) {
      // Try to trigger context menu near bottom-right corner
      const hexGrid = page.locator('[data-testid="hex-grid"]');

      // Pan to bottom-right area
      await page.mouse.move(viewport.width - 50, viewport.height - 50);
      await page.mouse.down();
      await page.waitForTimeout(600);
      await page.mouse.up();

      const contextMenu = page.locator('[data-testid="context-menu"]');
      if (await contextMenu.isVisible({ timeout: 1000 })) {
        const menuBox = await contextMenu.boundingBox();

        if (menuBox) {
          // Menu should not overflow viewport
          expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width);
          expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height);
          expect(menuBox.x).toBeGreaterThanOrEqual(0);
          expect(menuBox.y).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
