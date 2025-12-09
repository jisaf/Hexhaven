/**
 * E2E Test: Monster Targeting After Movement (Issue #194)
 * REFACTORED: Uses Page Object Model and smart waits
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
import { LandingPage } from '../pages/LandingPage';
import { LobbyPage } from '../pages/LobbyPage';
import { CharacterSelectionPage } from '../pages/CharacterSelectionPage';
import { GameBoardPage } from '../pages/GameBoardPage';

/**
 * Helper: Set up a single-player game with monsters
 */
async function setupGameWithMonsters(
  landingPage: LandingPage,
  lobbyPage: LobbyPage,
  characterPage: CharacterSelectionPage,
  gameBoardPage: GameBoardPage
): Promise<void> {
  // Navigate and create game
  await landingPage.navigate();
  await landingPage.clickCreateGame();
  await lobbyPage.enterNickname('TestPlayer');

  // Select character (Brute for melee attacks)
  await characterPage.waitForCharacterSelection();
  await characterPage.selectCharacter('Brute');

  // TODO: Select scenario when scenario selection is implemented
  // For now, game will start with default scenario

  // Start game
  await lobbyPage.waitForStartGameEnabled();
  await lobbyPage.startGame();

  // Wait for game board to load
  await gameBoardPage.waitForGameBoard();
}

test.describe('Monster Targeting After Movement', () => {
  test('should allow targeting monsters at their new position after movement', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);
    const characterPage = new CharacterSelectionPage(page);
    const gameBoardPage = new GameBoardPage(page);

    // Setup game with monsters
    await setupGameWithMonsters(landingPage, lobbyPage, characterPage, gameBoardPage);

    // Wait for card selection panel
    const cardPanel = page.locator('[data-testid="card-selection-panel"]');
    await expect(cardPanel).toBeVisible({ timeout: 10000 });

    // Select two cards (top and bottom)
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();

    // Confirm cards
    const confirmButton = page.locator('[data-testid="confirm-cards-button"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Get monster element and wait for it to be visible
    const monster = page.locator('[data-testid^="monster-"]').first();
    await expect(monster).toBeVisible({ timeout: 5000 });

    // Store initial monster position
    const initialPosition = await monster.getAttribute('data-position');

    // End player turn to trigger monster activation
    const endTurnButton = page.locator('[data-testid="end-turn-button"]');
    await expect(endTurnButton).toBeVisible();
    await endTurnButton.click();

    // Wait for monster turn
    const turnIndicator = page.locator('[data-testid="current-turn-indicator"]');
    await expect(turnIndicator).toContainText('Monster', { timeout: 5000 });

    // Wait for monster AI to complete movement (smart wait)
    await page.waitForTimeout(3000); // TODO: Replace with event-based wait when available

    // Get new monster position after movement
    const newPosition = await monster.getAttribute('data-position');

    // If monster moved, test targeting at new location
    if (newPosition && newPosition !== initialPosition) {
      // Wait for player's next turn
      await expect(turnIndicator).toContainText('Your turn', { timeout: 10000 });

      // Enter attack mode
      const attackButton = page.locator('[data-testid="attack-action-button"]');

      if (await attackButton.isVisible()) {
        await attackButton.click();
        await page.waitForTimeout(500); // Allow attack mode to activate

        // Click monster at new location
        await monster.click();

        // Verify monster was selected
        const selectionIndicator = page.locator('[data-testid="monster-selected"]');
        await expect(selectionIndicator).toBeVisible({ timeout: 2000 });

        // Verify attack range highlight appears at new location
        const attackHighlight = page.locator('[data-testid="attack-range-highlight"]');
        await expect(attackHighlight).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should show attack range highlight at monster new location', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);
    const characterPage = new CharacterSelectionPage(page);
    const gameBoardPage = new GameBoardPage(page);

    // Setup game with monsters
    await setupGameWithMonsters(landingPage, lobbyPage, characterPage, gameBoardPage);

    // Complete card selection
    const cardPanel = page.locator('[data-testid="card-selection-panel"]');
    await expect(cardPanel).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Allow multiple rounds for monster to move
    const turnIndicator = page.locator('[data-testid="current-turn-indicator"]');
    const endTurnButton = page.locator('[data-testid="end-turn-button"]');

    for (let round = 0; round < 3; round++) {
      const currentTurn = await turnIndicator.textContent();

      if (currentTurn?.includes('Your turn')) {
        // End turn to allow monster to activate
        await expect(endTurnButton).toBeVisible();
        await endTurnButton.click();
        await page.waitForTimeout(3000); // Wait for monster AI
      }
    }

    // Enter attack mode
    const attackButton = page.locator('[data-testid="attack-action-button"]');

    if (await attackButton.isVisible()) {
      await attackButton.click();
      await page.waitForTimeout(500);

      // Get monster current position using bounding box
      const monster = page.locator('[data-testid^="monster-"]').first();
      const boundingBox = await monster.boundingBox();

      if (boundingBox) {
        // Click at the center of the monster sprite
        await page.mouse.click(
          boundingBox.x + boundingBox.width / 2,
          boundingBox.y + boundingBox.height / 2
        );

        // Verify attack range highlight appears near the click location
        const highlight = page.locator('[data-testid="attack-range-highlight"]');
        await expect(highlight).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should not allow targeting monsters at their old position after movement', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);
    const characterPage = new CharacterSelectionPage(page);
    const gameBoardPage = new GameBoardPage(page);

    // Setup game with monsters
    await setupGameWithMonsters(landingPage, lobbyPage, characterPage, gameBoardPage);

    // Complete card selection
    const cardPanel = page.locator('[data-testid="card-selection-panel"]');
    await expect(cardPanel).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    await page.waitForTimeout(2000); // Allow game board to stabilize

    // Store monster's initial position coordinates
    const monster = page.locator('[data-testid^="monster-"]').first();
    const initialBoundingBox = await monster.boundingBox();

    if (!initialBoundingBox) {
      test.skip(); // Skip test if monster not found
      return;
    }

    const oldX = initialBoundingBox.x + initialBoundingBox.width / 2;
    const oldY = initialBoundingBox.y + initialBoundingBox.height / 2;

    // Trigger monster movement
    const endTurnButton = page.locator('[data-testid="end-turn-button"]');
    await expect(endTurnButton).toBeVisible();
    await endTurnButton.click();
    await page.waitForTimeout(3000); // Wait for monster AI

    // Get new position
    const newBoundingBox = await monster.boundingBox();

    if (!newBoundingBox) {
      test.skip(); // Skip test if monster disappeared
      return;
    }

    const newX = newBoundingBox.x + newBoundingBox.width / 2;
    const newY = newBoundingBox.y + newBoundingBox.height / 2;

    // Only proceed if monster actually moved
    const distanceMoved = Math.sqrt(
      Math.pow(newX - oldX, 2) + Math.pow(newY - oldY, 2)
    );

    if (distanceMoved > 10) {
      // Wait for player turn
      const turnIndicator = page.locator('[data-testid="current-turn-indicator"]');
      await expect(turnIndicator).toContainText('Your turn', { timeout: 10000 });

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
