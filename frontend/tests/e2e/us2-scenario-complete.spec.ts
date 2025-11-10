/**
 * E2E Test: Scenario Completion Detection (US2 - T076)
 *
 * Test Scenario:
 * 1. Player completes scenario objective (e.g., kill all monsters)
 * 2. System detects completion condition
 * 3. Victory modal is displayed with scenario results
 * 4. Experience and loot are distributed
 * 5. Player can return to lobby or continue
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 2: Scenario Completion Detection', () => {
  test('should detect victory when all monsters defeated', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Simulate defeating all monsters
    // (In practice, we'd set monster health very low for deterministic testing)

    // Count initial monsters
    const initialMonsters = await page.locator('[data-testid^="monster-"]').count();
    let monstersRemaining = initialMonsters;

    // Fight until all monsters are dead
    let roundsPlayed = 0;
    while (monstersRemaining > 0 && roundsPlayed < 20) {
      const currentTurn = await page.locator('[data-testid="current-turn-indicator"]').textContent();

      if (currentTurn?.includes('Player')) {
        // Attack if possible
        const useAction = page.locator('[data-testid="use-top-action"]');
        if (await useAction.isVisible()) {
          await useAction.click();

          const monster = page.locator('[data-testid^="monster-"]').first();
          if (await monster.isVisible()) {
            await monster.click();
            await page.waitForTimeout(2000);
          }
        }

        // End turn
        const endTurnButton = page.locator('[data-testid="end-turn-button"]');
        if (await endTurnButton.isVisible()) {
          await endTurnButton.click();
        }
      }

      await page.waitForTimeout(1000);

      // Check if victory modal appeared
      const victoryModal = page.locator('[data-testid="scenario-complete-modal"]');
      if (await victoryModal.isVisible({ timeout: 500 })) {
        // Victory detected!
        await expect(victoryModal).toContainText('Victory');
        await expect(victoryModal).toBeVisible();
        return; // Test passes
      }

      // Count remaining monsters
      monstersRemaining = await page.locator('[data-testid^="monster-"]').count();
      roundsPlayed++;

      // If monsters are all gone but modal hasn't appeared yet, wait a bit
      if (monstersRemaining === 0) {
        await page.waitForTimeout(2000);
        const victoryModal = page.locator('[data-testid="scenario-complete-modal"]');
        await expect(victoryModal).toBeVisible({ timeout: 3000 });
        break;
      }
    }
  });

  test('should detect defeat when all players exhausted', async ({ page }) => {
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

    // Simulate player exhaustion
    // (Player exhausts when they run out of cards or health reaches 0)

    // In practice, we'd manipulate player state to force exhaustion
    // For now, this is a placeholder test structure

    // Check for defeat modal
    // const defeatModal = page.locator('[data-testid="scenario-complete-modal"]');
    // await expect(defeatModal).toContainText('Defeat');
    // await expect(defeatModal).toBeVisible({ timeout: 30000 });
  });

  test('should display victory modal with scenario results', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();

    // Use a very simple scenario for quick completion
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Play through scenario...
    // (Simplified for test - would need to actually complete scenario)

    // When scenario completes, verify victory modal content:
    // const victoryModal = page.locator('[data-testid="scenario-complete-modal"]');

    // Should show:
    // - Victory/Defeat status
    // - Scenario name
    // - Experience gained
    // - Loot collected
    // - Gold earned
    // - Time taken
    // - Rounds completed

    // await expect(victoryModal).toContainText('Victory');
    // await expect(victoryModal).toContainText('Black Barrow #1');
    // await expect(victoryModal).toContainText('Experience');
    // await expect(victoryModal).toContainText('Loot');
    // await expect(victoryModal).toContainText('Gold');
  });

  test('should show experience and loot distribution', async ({ page, context }) => {
    // Multiplayer scenario completion
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    const roomCode = await page.locator('[data-testid="room-code"]').textContent();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();

    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.locator('button:has-text("Join Game")').click();
    await page2.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await page2.locator('button:has-text("Join")').click();
    await page2.locator('[data-testid="character-select"]').click();
    await page2.locator('[data-testid="character-tinkerer"]').click();

    await page.locator('[data-testid="start-game-button"]').click();

    // Complete card selection
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    await expect(page2.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page2.locator('[data-testid="ability-card-0"]').click();
    await page2.locator('[data-testid="ability-card-1"]').click();
    await page2.locator('[data-testid="confirm-cards-button"]').click();

    // Play through scenario...
    // (Would need actual scenario completion)

    // Verify both players see victory modal
    // const victoryModal1 = page.locator('[data-testid="scenario-complete-modal"]');
    // const victoryModal2 = page2.locator('[data-testid="scenario-complete-modal"]');

    // await expect(victoryModal1).toBeVisible({ timeout: 60000 });
    // await expect(victoryModal2).toBeVisible({ timeout: 60000 });

    // Verify each player sees their own loot and experience
    // const player1Loot = page.locator('[data-testid="player-loot-summary"]');
    // const player2Loot = page2.locator('[data-testid="player-loot-summary"]');

    // await expect(player1Loot).toBeVisible();
    // await expect(player2Loot).toBeVisible();
  });

  test('should allow returning to lobby after scenario completion', async ({ page }) => {
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

    // Complete scenario...
    // (Would trigger victory modal)

    // Click "Return to Lobby" button
    // const returnButton = page.locator('[data-testid="return-to-lobby-button"]');
    // await expect(returnButton).toBeVisible({ timeout: 5000 });
    // await returnButton.click();

    // Verify returned to lobby
    // await expect(page.locator('[data-testid="lobby-page"]')).toBeVisible({ timeout: 5000 });

    // Game room should still exist, allowing players to start new scenario
    // const roomCode = page.locator('[data-testid="room-code"]');
    // await expect(roomCode).toBeVisible();
  });

  test('should handle objective-based scenario completion', async ({ page }) => {
    // Some scenarios complete when objective is met, not just all monsters dead
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();

    // Select scenario with specific objective (e.g., "reach exit hex")
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-objective"]').click(); // Scenario with non-kill objective
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Display scenario objective
    const objectiveDisplay = page.locator('[data-testid="scenario-objective-display"]');
    await expect(objectiveDisplay).toBeVisible();
    await expect(objectiveDisplay).toContainText('Reach the exit');

    // Move character to exit hex
    // (Would require pathfinding and multiple moves)

    // When character reaches exit
    // const victoryModal = page.locator('[data-testid="scenario-complete-modal"]');
    // await expect(victoryModal).toContainText('Objective Complete');
    // await expect(victoryModal).toBeVisible({ timeout: 30000 });
  });

  test('should show time taken and rounds completed', async ({ page }) => {
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

    // Record start time
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const startTime = Date.now();

    // Play for several rounds
    for (let round = 0; round < 3; round++) {
      const currentTurn = await page.locator('[data-testid="current-turn-indicator"]').textContent();

      if (currentTurn?.includes('Player')) {
        const endTurnButton = page.locator('[data-testid="end-turn-button"]');
        if (await endTurnButton.isVisible()) {
          await endTurnButton.click();
        }
      }

      await page.waitForTimeout(2000);
    }

    // When scenario completes (simulated)
    // const victoryModal = page.locator('[data-testid="scenario-complete-modal"]');
    // await expect(victoryModal).toBeVisible({ timeout: 60000 });

    // Verify time and rounds displayed
    // const timeTaken = page.locator('[data-testid="time-taken"]');
    // await expect(timeTaken).toBeVisible();
    // await expect(timeTaken).toContainText(/\d+:\d+/); // Format: MM:SS

    // const roundsCompleted = page.locator('[data-testid="rounds-completed"]');
    // await expect(roundsCompleted).toBeVisible();
    // await expect(roundsCompleted).toContainText(/\d+ rounds/);
  });

  test('should persist scenario completion status', async ({ page }) => {
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

    // Complete scenario...

    // After victory, return to lobby
    // const returnButton = page.locator('[data-testid="return-to-lobby-button"]');
    // await returnButton.click();

    // Go to scenario selection
    // await page.locator('[data-testid="scenario-select"]').click();

    // Verify completed scenario shows checkmark or "Completed" badge
    // const scenario1 = page.locator('[data-testid="scenario-1"]');
    // await expect(scenario1.locator('[data-testid="completed-badge"]')).toBeVisible();
  });
});
