/**
 * E2E Test: Join Game Room with Valid Code (US1 - T036)
 *
 * Test Scenario:
 * 1. Host creates a game room and gets room code
 * 2. Second player navigates to app
 * 3. Second player enters room code
 * 4. Second player joins the room
 * 5. Both players see each other in lobby
 * 6. Both players receive real-time updates
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 1: Join Game Room', () => {
  test('should join an existing room with valid code', async ({ page, context }) => {
    // Host creates a room
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('button:has-text("Create Game")').first().waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('button:has-text("Create Game")').click();

    // Fill in nickname for host
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Second player joins
    const player2Page = await context.newPage();
    await player2Page.goto('/', { waitUntil: 'networkidle' });

    // Clear localStorage for player2 to ensure independent nickname
    await player2Page.evaluate(() => {
      localStorage.removeItem('playerNickname');
      localStorage.removeItem('playerUUID');
    });

    // Click "Join Game" button (wait for it to be visible after i18n loads)
    const joinButton = player2Page.locator('button:has-text("Join Game")');
    await joinButton.first().waitFor({ state: 'visible', timeout: 20000 });
    await joinButton.click();

    // Enter room code and nickname
    const roomCodeInput = player2Page.locator('[data-testid="room-code-input"]');
    await expect(roomCodeInput).toBeVisible();
    await roomCodeInput.fill(roomCode!);

    const nicknameInput = player2Page.locator('[data-testid="nickname-input"]');
    await nicknameInput.fill('Player2');

    // Click join button (submit button in the form)
    const confirmJoinButton = player2Page.locator('button:has-text("Join")');
    await confirmJoinButton.click();

    // Wait for lobby to load
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible({ timeout: 5000 });

    // Verify room code is displayed for player 2
    await expect(player2Page.locator('[data-testid="room-code"]')).toHaveText(roomCode!);

    // Verify both players see each other
    await expect(page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(2);
    await expect(player2Page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(2);

    // Verify player 2 is not host
    await expect(player2Page.locator('[data-testid="host-indicator"]')).not.toBeVisible();
  });

  test('should show error for invalid room code', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const joinButton = page.locator('button:has-text("Join Game")');
    await joinButton.first().waitFor({ state: 'visible', timeout: 20000 });
    await joinButton.click();

    // Enter invalid room code
    const roomCodeInput = page.locator('[data-testid="room-code-input"]');
    await roomCodeInput.fill('INVALID');

    const nicknameInput = page.locator('[data-testid="nickname-input"]');
    await nicknameInput.fill('Test Player');

    const confirmJoinButton = page.locator('button:has-text("Join")');
    await confirmJoinButton.click();

    // Verify error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('Room not found');
  });

  test('should show error when room is full (4 players max)', async ({ page, context }) => {
    // Create room and add 4 players
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();

    // Fill in nickname for host
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Add 3 more players (total 4 with host)
    for (let i = 2; i <= 4; i++) {
      const playerPage = await context.newPage();
      await playerPage.goto('/');
      await playerPage.locator('button:has-text("Join Game")').click();
      await playerPage.locator('[data-testid="room-code-input"]').fill(roomCode!);
      await playerPage.locator('[data-testid="nickname-input"]').fill(`Player ${i}`);
      await playerPage.locator('button:has-text("Join")').click();
      await expect(playerPage.locator('[data-testid="lobby-page"]')).toBeVisible();
    }

    // Try to add 5th player
    const player5Page = await context.newPage();
    await player5Page.goto('/');
    await player5Page.locator('button:has-text("Join Game")').click();
    await player5Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player5Page.locator('[data-testid="nickname-input"]').fill('Player 5');
    await player5Page.locator('button:has-text("Join")').click();

    // Verify error message
    const errorMessage = player5Page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('Room is full');
  });

  test('should reject duplicate nicknames in same room', async ({ page, context }) => {
    // Host creates room with nickname "Host"
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();

    // Fill in nickname for host
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Second player tries to join with same nickname
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join Game")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Host'); // Same nickname as host
    await player2Page.locator('button:has-text("Join")').click();

    // Verify error message
    const errorMessage = player2Page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('Nickname already taken');
  });

  test('should show real-time player list updates', async ({ page, context }) => {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();

    // Fill in nickname for host
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Verify initial player count
    await expect(page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(1);

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join Game")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player 2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Verify host sees player 2 in real-time
    await expect(page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(2, { timeout: 5000 });

    // Player 3 joins
    const player3Page = await context.newPage();
    await player3Page.goto('/');
    await player3Page.locator('button:has-text("Join Game")').click();
    await player3Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player3Page.locator('[data-testid="nickname-input"]').fill('Player 3');
    await player3Page.locator('button:has-text("Join")').click();
    await expect(player3Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Verify all players see updated player count
    await expect(page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(3, { timeout: 5000 });
    await expect(player2Page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(3, { timeout: 5000 });
    await expect(player3Page.locator('[data-testid="player-list"] [data-testid="player-item"]')).toHaveCount(3, { timeout: 5000 });
  });
});
