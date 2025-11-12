/**
 * E2E Test: Character Selection and Game Start (US1 - T037)
 *
 * Test Scenario:
 * 1. Two players in lobby
 * 2. Each player selects a character class
 * 3. Host starts the game
 * 4. Game board loads with hex grid
 * 5. Characters are placed on starting positions
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 1: Character Selection and Game Start', () => {
  test('should allow character selection and game start', async ({ page, context }) => {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();

    // Fill in nickname for host
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join Game")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player 2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Host selects Brute character
    const hostCharacterSelect = page.locator('[data-testid="character-select"]');
    await expect(hostCharacterSelect).toBeVisible();
    const bruteCard = page.locator('[data-testid="character-card-Brute"]');
    await expect(bruteCard).toBeVisible();
    await bruteCard.click();

    // Verify host's selection is highlighted
    await expect(bruteCard).toHaveClass(/selected/);

    // Verify player 2 sees host's selection in real-time
    const player2HostSelection = player2Page.locator('[data-testid="player-item"]:has-text("Host") [data-testid="character-badge"]');
    await expect(player2HostSelection).toContainText('Brute', { timeout: 5000 });

    // Player 2 selects Tinkerer character
    const player2CharacterSelect = player2Page.locator('[data-testid="character-select"]');
    await expect(player2CharacterSelect).toBeVisible();
    const tinkererCard = player2Page.locator('[data-testid="character-card-Tinkerer"]');
    await tinkererCard.click();

    // Verify player 2's selection is highlighted
    await expect(tinkererCard).toHaveClass(/selected/);

    // Verify host sees player 2's selection in real-time
    const hostPlayer2Selection = page.locator('[data-testid="player-item"]:has-text("Player 2") [data-testid="character-badge"]');
    await expect(hostPlayer2Selection).toContainText('Tinkerer', { timeout: 5000 });

    // Verify start game button is enabled (all players selected)
    const startGameButton = page.locator('[data-testid="start-game-button"]');
    await expect(startGameButton).toBeEnabled();

    // Host starts game
    await startGameButton.click();

    // Verify both players transition to game board
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 5000 });
    await expect(player2Page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 5000 });

    // Verify hex grid is rendered
    const hexGrid = page.locator('[data-testid="hex-grid"]');
    await expect(hexGrid).toBeVisible();

    // Verify characters are placed on hex grid
    const bruteSprite = page.locator('[data-testid="character-sprite-Brute"]');
    await expect(bruteSprite).toBeVisible();

    const tinkererSprite = page.locator('[data-testid="character-sprite-Tinkerer"]');
    await expect(tinkererSprite).toBeVisible();

    // Verify player 2 sees same game state
    await expect(player2Page.locator('[data-testid="character-sprite-Brute"]')).toBeVisible();
    await expect(player2Page.locator('[data-testid="character-sprite-Tinkerer"]')).toBeVisible();
  });

  test('should disable start button until all players select characters', async ({ page, context }) => {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();

    // Fill in nickname for host
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join Game")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player 2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Verify start button is disabled (no selections yet)
    const startGameButton = page.locator('[data-testid="start-game-button"]');
    await expect(startGameButton).toBeDisabled();

    // Host selects character
    await page.locator('[data-testid="character-card-Brute"]').click();

    // Verify button still disabled (player 2 hasn't selected)
    await expect(startGameButton).toBeDisabled();

    // Player 2 selects character
    await player2Page.locator('[data-testid="character-card-Tinkerer"]').click();

    // Verify button is now enabled
    await expect(startGameButton).toBeEnabled({ timeout: 5000 });
  });

  test('should prevent selecting same character twice', async ({ page, context }) => {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();

    // Fill in nickname for host
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join Game")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player 2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Host selects Brute
    await page.locator('[data-testid="character-card-Brute"]').click();

    // Player 2 tries to select Brute (should be disabled)
    const player2BruteCard = player2Page.locator('[data-testid="character-card-Brute"]');
    await expect(player2BruteCard).toHaveClass(/disabled/, { timeout: 5000 });

    // Clicking should have no effect
    await player2BruteCard.click({ force: true });
    await expect(player2BruteCard).not.toHaveClass(/selected/);
  });

  test('should show all 6 character classes', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();

    // Fill in nickname for host
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    // Verify all 6 character cards are visible
    const expectedClasses = ['Brute', 'Tinkerer', 'Spellweaver', 'Scoundrel', 'Cragheart', 'Mindthief'];
    for (const characterClass of expectedClasses) {
      const card = page.locator(`[data-testid="character-card-${characterClass}"]`);
      await expect(card).toBeVisible();
    }
  });

  test('should only allow host to start game', async ({ page, context }) => {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();

    // Fill in nickname for host
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join Game")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player 2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Both players select characters
    await page.locator('[data-testid="character-card-Brute"]').click();
    await player2Page.locator('[data-testid="character-card-Tinkerer"]').click();

    // Verify host has start button
    await expect(page.locator('[data-testid="start-game-button"]')).toBeVisible();

    // Verify player 2 does NOT have start button
    await expect(player2Page.locator('[data-testid="start-game-button"]')).not.toBeVisible();
  });
});
