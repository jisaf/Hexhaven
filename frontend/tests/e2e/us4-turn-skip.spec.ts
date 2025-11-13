/**
 * E2E Test: Turn Skip on Disconnect Timeout (US4 - T145)
 *
 * Test Scenario:
 * 1. Start a 2-player game
 * 2. Player 2 disconnects during their turn
 * 3. After 60 seconds, their turn is automatically skipped
 * 4. Player 1 gets the next turn
 * 5. Player 2 can reconnect and rejoin later
 *
 * NOTE: This test is currently skipped because the turn timeout feature
 * has not been implemented yet. To enable this test:
 * 1. Implement turn timeout logic in backend/src/websocket/game.gateway.ts
 * 2. Add turn timer that tracks time since turn started
 * 3. Auto-skip turn after 60s if player is disconnected
 * 4. Broadcast turn_skipped event to all players
 * 5. Remove .skip from this test
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe.skip('User Story 4: Turn Skip on Disconnect Timeout', () => {
  /**
   * Helper: Setup a 2-player game and start scenario
   */
  async function setupTwoPlayerGameInProgress(page: Page, context: BrowserContext) {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.evaluate(() => {
      localStorage.removeItem('playerNickname');
      localStorage.removeItem('playerUUID');
    });

    await player2Page.locator('button:has-text("Join Game")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
    await player2Page.locator('button:has-text("Join")').click();

    // Wait for both to be in lobby
    await expect(page.locator('[data-testid="lobby-page"]')).toBeVisible();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Both players select characters
    await page.locator('[data-testid="character-brute"]').click();
    await player2Page.locator('[data-testid="character-tinkerer"]').click();

    // Host starts game
    await page.locator('button:has-text("Start Game")').click();

    // Wait for game board to load
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
    await expect(player2Page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });

    return { hostPage: page, player2Page, roomCode: roomCode! };
  }

  test('should skip disconnected player turn after 60 seconds', async ({ page, context }) => {
    const { hostPage, player2Page } = await setupTwoPlayerGameInProgress(page, context);

    // Wait for game to start and determine whose turn it is
    const currentTurnPlayer = await hostPage.locator('[data-testid="current-turn-player"]').textContent();

    // If it's Player2's turn, wait for their turn to start
    if (currentTurnPlayer?.includes('Player2')) {
      // Verify Player2's turn indicator is active
      await expect(player2Page.locator('[data-testid="your-turn-indicator"]')).toBeVisible();

      // Player 2 disconnects during their turn
      await player2Page.context().setOffline(true);
      await player2Page.waitForTimeout(1000);

      // Verify disconnection indicator appears for host
      await expect(hostPage.locator('[data-testid="player-disconnected-banner"]')).toBeVisible({ timeout: 5000 });

      // Wait for 60 second timeout (with small buffer)
      await hostPage.waitForTimeout(62000);

      // Verify turn was skipped and next player's turn started
      await expect(hostPage.locator('[data-testid="turn-skipped-notification"]')).toBeVisible();
      await expect(hostPage.locator('[data-testid="current-turn-player"]')).not.toContainText('Player2');

      // Host should now have the turn
      await expect(hostPage.locator('[data-testid="your-turn-indicator"]')).toBeVisible();
    } else {
      // If it's Host's turn, wait for Player2's turn to come up
      // Complete host's turn first
      await hostPage.locator('[data-testid="end-turn-button"]').click();

      // Now Player2 should have the turn
      await expect(player2Page.locator('[data-testid="your-turn-indicator"]')).toBeVisible({ timeout: 5000 });

      // Player 2 disconnects
      await player2Page.context().setOffline(true);
      await player2Page.waitForTimeout(1000);

      // Wait for 60 second timeout
      await hostPage.waitForTimeout(62000);

      // Verify turn was skipped
      await expect(hostPage.locator('[data-testid="turn-skipped-notification"]')).toBeVisible();
      await expect(hostPage.locator('[data-testid="current-turn-player"]')).not.toContainText('Player2');
    }
  });

  test('should allow disconnected player to rejoin after turn skip', async ({ page, context }) => {
    const { hostPage, player2Page } = await setupTwoPlayerGameInProgress(page, context);

    // Ensure Player2 has the turn
    let currentTurnPlayer = await hostPage.locator('[data-testid="current-turn-player"]').textContent();
    if (!currentTurnPlayer?.includes('Player2')) {
      await hostPage.locator('[data-testid="end-turn-button"]').click();
      await hostPage.waitForTimeout(1000);
    }

    // Player 2 disconnects during their turn
    await player2Page.context().setOffline(true);
    await player2Page.waitForTimeout(1000);

    // Wait for turn skip (60 seconds)
    await hostPage.waitForTimeout(62000);

    // Verify turn was skipped
    await expect(hostPage.locator('[data-testid="turn-skipped-notification"]')).toBeVisible();

    // Player 2 reconnects
    await player2Page.context().setOffline(false);
    await player2Page.waitForTimeout(3000);

    // Verify Player2 successfully rejoined
    await expect(player2Page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });

    // Verify host sees reconnection notification
    await expect(hostPage.locator('[data-testid="player-reconnected-banner"]')).toBeVisible({ timeout: 5000 });

    // Verify Player2 can see current game state
    currentTurnPlayer = await player2Page.locator('[data-testid="current-turn-player"]').textContent();
    expect(currentTurnPlayer).toBeTruthy();

    // Player2 should be able to take actions when their next turn comes
    // (This verifies they haven't been removed from the game)
    const playerList = await player2Page.locator('[data-testid="player-item"]').count();
    expect(playerList).toBeGreaterThanOrEqual(2);
  });

  test('should show timeout countdown to disconnected player when they reconnect', async ({ page, context }) => {
    const { hostPage, player2Page } = await setupTwoPlayerGameInProgress(page, context);

    // Ensure Player2 has the turn
    const currentTurnPlayer = await hostPage.locator('[data-testid="current-turn-player"]').textContent();
    if (!currentTurnPlayer?.includes('Player2')) {
      await hostPage.locator('[data-testid="end-turn-button"]').click();
      await hostPage.waitForTimeout(1000);
    }

    // Player 2 disconnects
    await player2Page.context().setOffline(true);
    await player2Page.waitForTimeout(1000);

    // Wait 30 seconds (halfway through timeout)
    await hostPage.waitForTimeout(30000);

    // Player 2 reconnects before timeout
    await player2Page.context().setOffline(false);
    await player2Page.waitForTimeout(3000);

    // Verify Player2 sees remaining timeout countdown
    await expect(player2Page.locator('[data-testid="turn-timeout-warning"]')).toBeVisible({ timeout: 5000 });
    const remainingTime = await player2Page.locator('[data-testid="timeout-countdown"]').textContent();

    // Should show approximately 30 seconds remaining (with some tolerance)
    expect(remainingTime).toMatch(/[2-3][0-9]/); // 20-39 seconds
  });

  test('should not skip turn if player reconnects before timeout', async ({ page, context }) => {
    const { hostPage, player2Page } = await setupTwoPlayerGameInProgress(page, context);

    // Ensure Player2 has the turn
    const currentTurnPlayer = await hostPage.locator('[data-testid="current-turn-player"]').textContent();
    if (!currentTurnPlayer?.includes('Player2')) {
      await hostPage.locator('[data-testid="end-turn-button"]').click();
      await hostPage.waitForTimeout(1000);
    }

    // Player 2 disconnects
    await player2Page.context().setOffline(true);
    await player2Page.waitForTimeout(1000);

    // Wait 45 seconds (before 60 second timeout)
    await hostPage.waitForTimeout(45000);

    // Player 2 reconnects
    await player2Page.context().setOffline(false);
    await player2Page.waitForTimeout(3000);

    // Verify Player2 still has their turn
    await expect(player2Page.locator('[data-testid="your-turn-indicator"]')).toBeVisible({ timeout: 5000 });

    // Verify no turn skip notification
    await expect(hostPage.locator('[data-testid="turn-skipped-notification"]')).not.toBeVisible();

    // Player2 should be able to complete their turn normally
    await player2Page.locator('[data-testid="end-turn-button"]').click();

    // Turn should advance to next player
    await expect(hostPage.locator('[data-testid="your-turn-indicator"]')).toBeVisible({ timeout: 5000 });
  });

  test('should handle multiple consecutive turn skips for same player', async ({ page, context }) => {
    const { hostPage, player2Page } = await setupTwoPlayerGameInProgress(page, context);

    // First turn skip
    const currentTurnPlayer = await hostPage.locator('[data-testid="current-turn-player"]').textContent();
    if (!currentTurnPlayer?.includes('Player2')) {
      await hostPage.locator('[data-testid="end-turn-button"]').click();
      await hostPage.waitForTimeout(1000);
    }

    await player2Page.context().setOffline(true);
    await hostPage.waitForTimeout(62000);
    await expect(hostPage.locator('[data-testid="turn-skipped-notification"]')).toBeVisible();

    // Complete Host's turn, should come back to Player2
    await hostPage.locator('[data-testid="end-turn-button"]').click();
    await hostPage.waitForTimeout(1000);

    // Second turn skip (Player2 still disconnected)
    await hostPage.waitForTimeout(62000);
    await expect(hostPage.locator('[data-testid="turn-skipped-notification"]')).toBeVisible();

    // Verify game continues functioning
    await expect(hostPage.locator('[data-testid="game-board"]')).toBeVisible();
  });
});
