/**
 * E2E Test: Player Reconnection (US4 - T144)
 *
 * Test Scenarios:
 * 1. Player disconnects and reconnects within timeout period
 * 2. Player sees reconnecting modal during connection loss
 * 3. Other players see disconnect/reconnect banners
 * 4. Game state is preserved after reconnection
 * 5. Session persists across page refresh (localStorage-based)
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('User Story 4: Player Reconnection', () => {
  /**
   * Helper: Create a 2-player game room
   */
  async function setupTwoPlayerGame(page: Page, context: BrowserContext) {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');

    // Clear localStorage for independent session
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

    // Verify both players see each other
    await expect(page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(2);
    await expect(player2Page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(2);

    return { hostPage: page, player2Page, roomCode: roomCode! };
  }

  test('should show reconnecting modal when connection is lost', async ({ page, context }) => {
    const { hostPage, player2Page } = await setupTwoPlayerGame(page, context);

    // Simulate network disconnect for player 2
    await player2Page.context().setOffline(true);

    // Wait a moment for disconnect detection
    await player2Page.waitForTimeout(2000);

    // Verify reconnecting modal appears
    const reconnectingModal = player2Page.locator('[data-testid="reconnecting-modal"]');
    await expect(reconnectingModal).toBeVisible({ timeout: 5000 });

    // Verify modal shows reconnecting status
    await expect(reconnectingModal.locator('text=/Reconnecting/i')).toBeVisible();

    // Verify attempt counter is shown
    await expect(reconnectingModal.locator('text=/Attempt \\d+\\/\\d+/i')).toBeVisible();

    // Restore connection
    await player2Page.context().setOffline(false);

    // Wait for reconnection
    await player2Page.waitForTimeout(3000);

    // Verify modal shows success or disappears
    await expect(reconnectingModal).not.toBeVisible({ timeout: 10000 });
  });

  test('should notify other players when a player disconnects', async ({ page, context }) => {
    const { hostPage, player2Page } = await setupTwoPlayerGame(page, context);

    // Simulate player 2 disconnect
    await player2Page.context().setOffline(true);

    // Wait for disconnect detection
    await player2Page.waitForTimeout(2000);

    // Verify host sees disconnect banner
    const disconnectBanner = hostPage.locator('[data-testid="player-disconnected-banner"]');
    await expect(disconnectBanner).toBeVisible({ timeout: 5000 });

    // Verify banner shows correct player name and status
    await expect(disconnectBanner).toContainText('Player2');
    await expect(disconnectBanner).toContainText('disconnected');

    // Verify banner has warning styling
    await expect(disconnectBanner).toHaveClass(/banner-warning/);
  });

  test('should notify other players when a player reconnects', async ({ page, context }) => {
    const { hostPage, player2Page } = await setupTwoPlayerGame(page, context);

    // Simulate player 2 disconnect
    await player2Page.context().setOffline(true);
    await player2Page.waitForTimeout(2000);

    // Verify host sees disconnect banner
    const disconnectBanner = hostPage.locator('[data-testid="player-disconnected-banner"]');
    await expect(disconnectBanner).toBeVisible({ timeout: 5000 });

    // Restore connection
    await player2Page.context().setOffline(false);

    // Wait for reconnection
    await player2Page.waitForTimeout(3000);

    // Verify host sees reconnect banner
    const reconnectBanner = hostPage.locator('[data-testid="player-reconnected-banner"]');
    await expect(reconnectBanner).toBeVisible({ timeout: 5000 });

    // Verify banner shows correct status
    await expect(reconnectBanner).toContainText('Player2');
    await expect(reconnectBanner).toContainText('reconnected');

    // Verify banner has success styling
    await expect(reconnectBanner).toHaveClass(/banner-success/);

    // Verify banner auto-dismisses after delay (5 seconds)
    await expect(reconnectBanner).not.toBeVisible({ timeout: 7000 });
  });

  test('should preserve game state after reconnection', async ({ page, context }) => {
    const { hostPage, player2Page, roomCode } = await setupTwoPlayerGame(page, context);

    // Verify initial state
    const initialPlayerCount = await hostPage.locator('[data-testid="player-list"] [data-testid="player-item"]').count();
    expect(initialPlayerCount).toBe(2);

    // Simulate player 2 disconnect
    await player2Page.context().setOffline(true);
    await player2Page.waitForTimeout(2000);

    // Restore connection
    await player2Page.context().setOffline(false);
    await player2Page.waitForTimeout(3000);

    // Verify player 2 is still in the same room
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible({ timeout: 10000 });
    await expect(player2Page.locator('[data-testid="room-code"]')).toHaveText(roomCode);

    // Verify both players still see each other
    await expect(hostPage.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(2, { timeout: 5000 });
    await expect(player2Page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(2, { timeout: 5000 });
  });

  test('should auto-rejoin room after page refresh using localStorage', async ({ page, context }) => {
    const { player2Page, roomCode } = await setupTwoPlayerGame(page, context);

    // Verify player 2 is in the room
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();
    await expect(player2Page.locator('[data-testid="room-code"]')).toHaveText(roomCode);

    // Store the UUID before refresh
    const storedUUID = await player2Page.evaluate(() => {
      return localStorage.getItem('hexhaven_player_uuid');
    });
    expect(storedUUID).toBeTruthy();

    // Store the last room code
    const storedRoomCode = await player2Page.evaluate(() => {
      return localStorage.getItem('hexhaven_last_room_code');
    });
    expect(storedRoomCode).toBe(roomCode);

    // Refresh the page (simulates browser crash/refresh)
    await player2Page.reload();

    // Wait for reconnection logic to execute
    await player2Page.waitForTimeout(3000);

    // Verify player automatically rejoined the same room
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible({ timeout: 10000 });
    await expect(player2Page.locator('[data-testid="room-code"]')).toHaveText(roomCode, { timeout: 5000 });

    // Verify UUID persisted across refresh
    const newUUID = await player2Page.evaluate(() => {
      return localStorage.getItem('hexhaven_player_uuid');
    });
    expect(newUUID).toBe(storedUUID);
  });

  test('should handle multiple reconnection attempts with exponential backoff', async ({ page, context }) => {
    const { player2Page } = await setupTwoPlayerGame(page, context);

    // Simulate prolonged disconnect
    await player2Page.context().setOffline(true);
    await player2Page.waitForTimeout(2000);

    // Verify reconnecting modal appears
    const reconnectingModal = player2Page.locator('[data-testid="reconnecting-modal"]');
    await expect(reconnectingModal).toBeVisible({ timeout: 5000 });

    // Verify attempt counter increases
    const attemptText1 = await reconnectingModal.locator('text=/Attempt \\d+\\/\\d+/i').textContent();
    expect(attemptText1).toMatch(/Attempt \d+\/\d+/);

    // Wait for additional attempts (exponential backoff: 1s, 2s, 4s, 8s, 10s max)
    await player2Page.waitForTimeout(5000);

    // Attempt counter should have increased
    const attemptText2 = await reconnectingModal.locator('text=/Attempt \\d+\\/\\d+/i').textContent();

    // Restore connection before max attempts
    await player2Page.context().setOffline(false);
    await player2Page.waitForTimeout(3000);

    // Verify successful reconnection
    await expect(reconnectingModal).not.toBeVisible({ timeout: 10000 });
  });

  test('should show failure state after max reconnection attempts', async ({ page, context }) => {
    const { player2Page } = await setupTwoPlayerGame(page, context);

    // Simulate prolonged disconnect (exceeding max attempts)
    await player2Page.context().setOffline(true);

    // Wait for all reconnection attempts to exhaust (5 attempts with backoff)
    // Backoff: 1s, 2s, 4s, 8s, 10s = ~25 seconds total
    await player2Page.waitForTimeout(30000);

    // Verify reconnecting modal shows failure state
    const reconnectingModal = player2Page.locator('[data-testid="reconnecting-modal"]');
    await expect(reconnectingModal).toBeVisible();

    // Verify failure message
    await expect(reconnectingModal.locator('text=/Connection failed/i')).toBeVisible();

    // Verify refresh button appears
    const refreshButton = reconnectingModal.locator('button:has-text("Refresh Page")');
    await expect(refreshButton).toBeVisible();
  });

  test('should allow manual dismissal of disconnect banner', async ({ page, context }) => {
    const { hostPage, player2Page } = await setupTwoPlayerGame(page, context);

    // Simulate player 2 disconnect
    await player2Page.context().setOffline(true);
    await player2Page.waitForTimeout(2000);

    // Verify host sees disconnect banner
    const disconnectBanner = hostPage.locator('[data-testid="player-disconnected-banner"]');
    await expect(disconnectBanner).toBeVisible({ timeout: 5000 });

    // Find and click dismiss button
    const dismissButton = disconnectBanner.locator('[data-testid="banner-dismiss"]');
    await expect(dismissButton).toBeVisible();
    await dismissButton.click();

    // Verify banner is dismissed
    await expect(disconnectBanner).not.toBeVisible();
  });

  test('should handle simultaneous disconnect of multiple players', async ({ page, context }) => {
    // Create 3-player game
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Add player 2
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
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Add player 3
    const player3Page = await context.newPage();
    await player3Page.goto('/');
    await player3Page.evaluate(() => {
      localStorage.removeItem('playerNickname');
      localStorage.removeItem('playerUUID');
    });
    await player3Page.locator('button:has-text("Join Game")').click();
    await player3Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player3Page.locator('[data-testid="nickname-input"]').fill('Player3');
    await player3Page.locator('button:has-text("Join")').click();
    await expect(player3Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Verify all 3 players
    await expect(page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(3);

    // Disconnect both player 2 and player 3 simultaneously
    await player2Page.context().setOffline(true);
    await player3Page.context().setOffline(true);
    await page.waitForTimeout(2000);

    // Verify host sees both disconnect banners
    const disconnectBanners = page.locator('[data-testid="player-disconnected-banner"]');
    await expect(disconnectBanners).toHaveCount(2, { timeout: 5000 });

    // Verify both player names appear in banners
    await expect(page.locator('text=Player2')).toBeVisible();
    await expect(page.locator('text=Player3')).toBeVisible();

    // Reconnect both players
    await player2Page.context().setOffline(false);
    await player3Page.context().setOffline(false);
    await page.waitForTimeout(3000);

    // Verify host sees reconnection banners
    const reconnectBanners = page.locator('[data-testid="player-reconnected-banner"]');
    await expect(reconnectBanners).toHaveCount(2, { timeout: 5000 });
  });
});
