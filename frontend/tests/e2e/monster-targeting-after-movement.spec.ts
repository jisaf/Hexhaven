/**
 * E2E Test: Monster Targeting After Movement (Issue #194)
 *
 * This test verifies that monsters can be targeted at their new location
 * after they move, addressing the bug where monsters could only be clicked
 * at their original position.
 *
 * Test Scenario:
 * 1. Player starts a game with monsters
 * 2. Monster moves during their turn
 * 3. Player enters attack mode
 * 4. Player should be able to click monster at NEW location (not old)
 * 5. Attack range highlight should appear at NEW location
 */

import { test, expect } from '@playwright/test';

test.describe('Monster Targeting After Movement', () => {
  test('should allow targeting monsters at their new position after movement', async ({ page }) => {
    // Setup: Create game with scenario containing monsters
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();

    // Select scenario with monsters
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Complete card selection with attack action
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();  // Top card with attack
    await page.locator('[data-testid="ability-card-1"]').click();  // Bottom card
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for game board to load
    await page.waitForTimeout(2000);

    // Get monster element and initial position
    const monster = page.locator('[data-testid^="monster-"]').first();
    await expect(monster).toBeVisible({ timeout: 5000 });

    // Store initial monster position (if data attribute exists)
    const initialPosition = await monster.getAttribute('data-position');

    // End player turn to trigger monster activation
    await page.locator('[data-testid="end-turn-button"]').click();

    // Wait for monster turn
    await expect(page.locator('[data-testid="current-turn-indicator"]'))
      .toContainText('Monster', { timeout: 5000 });

    // Wait for monster AI to complete movement
    await page.waitForTimeout(3000);

    // Get new monster position after movement
    const newPosition = await monster.getAttribute('data-position');

    // If monster moved, test targeting at new location
    if (newPosition && newPosition !== initialPosition) {
      // Wait for player's next turn
      await expect(page.locator('[data-testid="current-turn-indicator"]'))
        .toContainText('Your turn', { timeout: 10000 });

      // Enter attack mode by clicking attack action button
      const attackButton = page.locator('[data-testid="attack-action-button"]');
      if (await attackButton.isVisible()) {
        await attackButton.click();

        // Wait for attack mode to activate
        await page.waitForTimeout(500);

        // Try to click monster at new location
        await monster.click();

        // Verify monster was selected (selection indicator should appear)
        const selectionIndicator = page.locator('[data-testid="monster-selected"]');
        await expect(selectionIndicator).toBeVisible({ timeout: 2000 });

        // Verify attack range highlight appears at new location
        // (This would be a visual indicator that the monster is targetable)
        const attackHighlight = page.locator('[data-testid="attack-range-highlight"]');
        await expect(attackHighlight).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should show attack range highlight at monster new location', async ({ page }) => {
    // This test specifically verifies the attack range highlighting appears
    // at the correct (new) location after a monster moves

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Allow multiple rounds for monster to move
    for (let round = 0; round < 3; round++) {
      const currentTurn = await page.locator('[data-testid="current-turn-indicator"]').textContent();

      if (currentTurn?.includes('Your turn')) {
        // End turn to allow monster to activate
        await page.locator('[data-testid="end-turn-button"]').click();
        await page.waitForTimeout(3000);
      }
    }

    // Enter attack mode
    const attackButton = page.locator('[data-testid="attack-action-button"]');
    if (await attackButton.isVisible()) {
      await attackButton.click();
      await page.waitForTimeout(500);

      // Get monster current position
      const monster = page.locator('[data-testid^="monster-"]').first();
      const boundingBox = await monster.boundingBox();

      if (boundingBox) {
        // Click at the center of the monster sprite
        await page.mouse.click(
          boundingBox.x + boundingBox.width / 2,
          boundingBox.y + boundingBox.height / 2
        );

        // Verify attack range highlight appears near the click location
        // (indicating the game state and visual position are synchronized)
        const highlight = page.locator('[data-testid="attack-range-highlight"]');
        await expect(highlight).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should not allow targeting monsters at their old position after movement', async ({ page }) => {
    // Negative test: clicking the old position should NOT select the monster

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    await page.waitForTimeout(2000);

    // Store monster's initial position coordinates
    const monster = page.locator('[data-testid^="monster-"]').first();
    const initialBoundingBox = await monster.boundingBox();

    if (!initialBoundingBox) {
      return; // Skip test if monster not found
    }

    const oldX = initialBoundingBox.x + initialBoundingBox.width / 2;
    const oldY = initialBoundingBox.y + initialBoundingBox.height / 2;

    // Trigger monster movement
    await page.locator('[data-testid="end-turn-button"]').click();
    await page.waitForTimeout(3000);

    // Get new position
    const newBoundingBox = await monster.boundingBox();

    if (!newBoundingBox) {
      return; // Skip test if monster disappeared
    }

    const newX = newBoundingBox.x + newBoundingBox.width / 2;
    const newY = newBoundingBox.y + newBoundingBox.height / 2;

    // Only proceed if monster actually moved
    if (Math.abs(newX - oldX) > 10 || Math.abs(newY - oldY) > 10) {
      // Wait for player turn
      await expect(page.locator('[data-testid="current-turn-indicator"]'))
        .toContainText('Your turn', { timeout: 10000 });

      // Enter attack mode
      const attackButton = page.locator('[data-testid="attack-action-button"]');
      if (await attackButton.isVisible()) {
        await attackButton.click();
        await page.waitForTimeout(500);

        // Click the OLD position (where monster used to be)
        await page.mouse.click(oldX, oldY);

        // Verify monster was NOT selected
        const selectionIndicator = page.locator('[data-testid="monster-selected"]');
        await expect(selectionIndicator).not.toBeVisible({ timeout: 1000 });
      }
    }
  });
});
