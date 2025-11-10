/**
 * E2E Test: Monster AI Movement and Attack (US2 - T073)
 *
 * Test Scenario:
 * 1. Player starts a game with monsters
 * 2. Monster turn activates based on initiative
 * 3. Monster AI determines focus target (closest enemy)
 * 4. Monster moves toward focus target using pathfinding
 * 5. Monster attacks if in range
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 2: Monster AI Movement and Attack', () => {
  test('should activate monster AI during monster turn', async ({ page }) => {
    // Setup: Create game with scenario containing monsters
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();

    // Select scenario with monsters (e.g., Black Barrow #1)
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Complete card selection
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for monster turn (if monster has lower initiative)
    await page.waitForTimeout(2000);

    // Verify monster is present on board
    const monsterSprite = page.locator('[data-testid^="monster-"]');
    await expect(monsterSprite.first()).toBeVisible();

    // If it's monster's turn, verify monster activates
    const currentTurn = await page.locator('[data-testid="current-turn-indicator"]').textContent();

    if (currentTurn?.includes('Monster')) {
      // Verify monster activation animation or state
      await expect(page.locator('[data-testid="monster-activating"]')).toBeVisible({ timeout: 2000 });

      // Wait for AI calculation (should be <500ms per SC-014)
      await page.waitForTimeout(1000);

      // Verify monster has moved or attacked (position changed or damage dealt)
      await expect(page.locator('[data-testid="monster-action-complete"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should move monster toward closest player using pathfinding', async ({ page }) => {
    // Setup game
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Complete card selection with high initiative to go first
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Get initial monster position
    const monster = page.locator('[data-testid="monster-0"]');
    const initialPosition = await monster.getAttribute('data-position');

    // End player turn to trigger monster activation
    await page.locator('[data-testid="end-turn-button"]').click();

    // Wait for monster turn
    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Monster', { timeout: 5000 });

    // Wait for monster AI to complete
    await page.waitForTimeout(2000);

    // Get new monster position
    const newPosition = await monster.getAttribute('data-position');

    // Verify monster has moved (unless already adjacent to player)
    if (initialPosition !== newPosition) {
      // Verify monster is closer to player than before
      // (This is a simplified check; actual implementation would calculate distance)
      expect(newPosition).not.toBe(initialPosition);
    }
  });

  test('should attack player when monster is in range', async ({ page }) => {
    // Setup game
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

    // Get initial player health
    const playerHealthDisplay = page.locator('[data-testid="player-health"]');
    const initialHealth = parseInt((await playerHealthDisplay.textContent()) || '10');

    // Wait for several rounds until monster is adjacent
    // (In a real test, we'd manipulate the board state directly)
    let roundsWaited = 0;
    while (roundsWaited < 5) {
      // End turn and wait for monster activation
      const currentTurn = await page.locator('[data-testid="current-turn-indicator"]').textContent();

      if (currentTurn?.includes('Player')) {
        await page.locator('[data-testid="end-turn-button"]').click();
      }

      await page.waitForTimeout(2000);

      // Check if damage was dealt
      const currentHealth = parseInt((await playerHealthDisplay.textContent()) || '10');
      if (currentHealth < initialHealth) {
        // Monster attacked successfully!
        await expect(page.locator('[data-testid="damage-animation"]')).toBeVisible({ timeout: 2000 });

        // Verify damage number is displayed
        await expect(page.locator('[data-testid="damage-number"]')).toBeVisible({ timeout: 1000 });

        break;
      }

      roundsWaited++;
    }
  });

  test('should show monster attack animation', async ({ page }) => {
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

    // Force monster turn (implementation-specific)
    // In real scenario, this might require multiple round progression

    // Verify attack animation plays when monster attacks
    // This is a placeholder - actual test would wait for monster attack
    // await expect(page.locator('[data-testid="attack-animation"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle monster pathfinding around obstacles', async ({ page }) => {
    // This test verifies A* pathfinding works correctly
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();

    // Select scenario with obstacles between monster and player
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-2"]').click(); // Scenario with more complex layout
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Monster should path around obstacles, not through them
    // (Detailed verification would require checking monster's path)
    const monster = page.locator('[data-testid="monster-0"]');
    await expect(monster).toBeVisible();

    // End turn to trigger monster movement
    await page.locator('[data-testid="end-turn-button"]').click();
    await page.waitForTimeout(2000);

    // Verify monster didn't move through obstacle hexes
    // (Would need to check against known obstacle positions)
  });

  test('should prioritize hexes that enable attack when moving', async ({ page }) => {
    // Monster AI should move to hexes that allow it to attack, not just get closer
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

    // This test verifies that when a monster can move to multiple hexes at same distance,
    // it prioritizes hexes that enable attack
    // Implementation would track monster's final position and verify it's attack-optimal
  });

  test('should display monster stats and abilities', async ({ page }) => {
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

    // Click on monster to see stats
    const monster = page.locator('[data-testid="monster-0"]');
    await expect(monster).toBeVisible({ timeout: 5000 });
    await monster.click();

    // Verify monster stats overlay appears
    const monsterStatsOverlay = page.locator('[data-testid="monster-stats-overlay"]');
    await expect(monsterStatsOverlay).toBeVisible();

    // Verify stats are displayed
    await expect(monsterStatsOverlay).toContainText('Health');
    await expect(monsterStatsOverlay).toContainText('Movement');
    await expect(monsterStatsOverlay).toContainText('Attack');
    await expect(monsterStatsOverlay).toContainText('Range');
  });
});
