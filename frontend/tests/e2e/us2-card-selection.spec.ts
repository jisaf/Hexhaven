/**
 * E2E Test: Card Selection Phase and Initiative Determination (US2 - T072)
 *
 * Test Scenario:
 * 1. Two players start a game with a scenario
 * 2. Each player selects two ability cards (top and bottom actions)
 * 3. Turn order is calculated based on initiative values
 * 4. Turn order is displayed to all players
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 2: Card Selection and Initiative', () => {
  test('should allow card selection and determine turn order by initiative', async ({ page, context }) => {
    // Player 1: Create game and start
    await page.goto('/', { waitUntil: 'networkidle' });
    const createButton = page.locator('button:has-text("Create Game")');
    await createButton.first().waitFor({ state: 'visible', timeout: 20000 });
    await createButton.click();
    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Select character (Brute - has clear initiative values)
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();

    // Player 2: Join game in new tab
    const page2 = await context.newPage();
    await page2.goto('/', { waitUntil: 'networkidle' });
    const joinButton = page2.locator('button:has-text("Join Game")');
    await joinButton.first().waitFor({ state: 'visible', timeout: 20000 });
    await joinButton.click();
    await page2.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await page2.locator('button:has-text("Join")').click();

    // Player 2 selects character
    await page2.locator('[data-testid="character-select"]').click();
    await page2.locator('[data-testid="character-tinkerer"]').click();

    // Host starts game
    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for game board to load
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
    await expect(page2.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });

    // Card selection phase should begin
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible();
    await expect(page2.locator('[data-testid="card-selection-panel"]')).toBeVisible();

    // Player 1: Select two cards
    const player1Cards = page.locator('[data-testid^="ability-card-"]');
    await expect(player1Cards).toHaveCount(10); // Brute has 10 starting cards

    // Select card with high initiative (e.g., initiative 77)
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Player 2: Select two cards with lower initiative
    const player2Cards = page2.locator('[data-testid^="ability-card-"]');
    await expect(player2Cards).toHaveCount(12); // Tinkerer has 12 starting cards

    await page2.locator('[data-testid="ability-card-0"]').click();
    await page2.locator('[data-testid="ability-card-1"]').click();
    await page2.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for initiative calculation
    await page.waitForTimeout(1000);

    // Verify turn order is displayed
    const turnOrderDisplay = page.locator('[data-testid="turn-order-display"]');
    await expect(turnOrderDisplay).toBeVisible();

    // Verify turn order contains both players and monsters
    const turnOrderItems = turnOrderDisplay.locator('[data-testid^="turn-order-item-"]');
    await expect(turnOrderItems).toHaveCountGreaterThanOrEqual(2);

    // Verify current turn indicator is highlighted
    const currentTurnIndicator = page.locator('[data-testid="current-turn-indicator"]');
    await expect(currentTurnIndicator).toBeVisible();

    // Verify both players see the same turn order
    const turnOrder1 = await page.locator('[data-testid="turn-order-display"]').textContent();
    const turnOrder2 = await page2.locator('[data-testid="turn-order-display"]').textContent();
    expect(turnOrder1).toBe(turnOrder2);
  });

  test('should show selected cards to player during their turn', async ({ page }) => {
    // Setup: Create game, select character, start game
    await page.goto('/', { waitUntil: 'networkidle' });
    const createButton = page.locator('button:has-text("Create Game")');
    await createButton.first().waitFor({ state: 'visible', timeout: 20000 });
    await createButton.click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Select cards
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Verify selected cards are displayed during player turn
    const selectedCardsDisplay = page.locator('[data-testid="selected-cards-display"]');
    await expect(selectedCardsDisplay).toBeVisible();

    // Verify top and bottom actions are visible
    await expect(page.locator('[data-testid="top-action"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-action"]')).toBeVisible();
  });

  test('should enforce card selection limits (exactly 2 cards)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const createButton = page.locator('button:has-text("Create Game")');
    await createButton.first().waitFor({ state: 'visible', timeout: 20000 });
    await createButton.click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Try to confirm with 0 cards
    const confirmButton = page.locator('[data-testid="confirm-cards-button"]');
    await expect(confirmButton).toBeDisabled();

    // Select 1 card - should still be disabled
    await page.locator('[data-testid="ability-card-0"]').click();
    await expect(confirmButton).toBeDisabled();

    // Select 2 cards - should be enabled
    await page.locator('[data-testid="ability-card-1"]').click();
    await expect(confirmButton).toBeEnabled();

    // Try to select a 3rd card - should deselect automatically or be prevented
    await page.locator('[data-testid="ability-card-2"]').click();
    const selectedCards = page.locator('[data-testid^="ability-card-"][aria-selected="true"]');
    await expect(selectedCards).toHaveCount(2);
  });

  test('should show waiting state while other players select cards', async ({ page, context }) => {
    // Player 1: Create and select cards quickly
    await page.goto('/', { waitUntil: 'networkidle' });
    const createButton = page.locator('button:has-text("Create Game")');
    await createButton.first().waitFor({ state: 'visible', timeout: 20000 });
    await createButton.click();
    const roomCode = await page.locator('[data-testid="room-code"]').textContent();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();

    // Player 2: Join
    const page2 = await context.newPage();
    await page2.goto('/', { waitUntil: 'networkidle' });
    const joinButton = page2.locator('button:has-text("Join Game")');
    await joinButton.first().waitFor({ state: 'visible', timeout: 20000 });
    await joinButton.click();
    await page2.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await page2.locator('button:has-text("Join")').click();
    await page2.locator('[data-testid="character-select"]').click();
    await page2.locator('[data-testid="character-tinkerer"]').click();

    // Start game
    await page.locator('[data-testid="start-game-button"]').click();
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Player 1 selects cards
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Verify Player 1 sees "Waiting for other players"
    const waitingIndicator = page.locator('[data-testid="waiting-for-players"]');
    await expect(waitingIndicator).toBeVisible();
    await expect(waitingIndicator).toContainText('Waiting for other players');

    // Player 2 selects cards
    await page2.locator('[data-testid="ability-card-0"]').click();
    await page2.locator('[data-testid="ability-card-1"]').click();
    await page2.locator('[data-testid="confirm-cards-button"]').click();

    // Verify waiting indicator disappears and turn order appears
    await expect(waitingIndicator).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="turn-order-display"]')).toBeVisible();
  });

  test('should handle long rest action during card selection', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const createButton = page.locator('button:has-text("Create Game")');
    await createButton.first().waitFor({ state: 'visible', timeout: 20000 });
    await createButton.click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Click "Long Rest" button instead of selecting cards
    const longRestButton = page.locator('[data-testid="long-rest-button"]');
    await expect(longRestButton).toBeVisible();
    await longRestButton.click();

    // Verify long rest confirmation appears
    await expect(page.locator('[data-testid="long-rest-confirmation"]')).toBeVisible();
    await expect(page.locator('text=You will recover all cards from discard')).toBeVisible();

    // Confirm long rest
    await page.locator('[data-testid="confirm-long-rest"]').click();

    // Verify player has initiative 99 (long rest initiative)
    await page.waitForTimeout(1000);
    const turnOrder = page.locator('[data-testid="turn-order-display"]');
    await expect(turnOrder).toContainText('99'); // Long rest has initiative 99
  });
});
