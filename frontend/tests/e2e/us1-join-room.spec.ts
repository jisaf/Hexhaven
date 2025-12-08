/**
 * E2E Test: Join Game Room with Valid Code (US1 - T036)
 * REFACTORED: Uses Page Object Model and multiplayer helpers
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
import { LandingPage } from '../pages/LandingPage';
import { LobbyPage } from '../pages/LobbyPage';
import { createTwoPlayerGame, createMultiplayerGame, verifyAllPlayersInSameRoom, verifyAllPlayersSeeEachOther } from '../helpers/multiplayer';
import { assertPlayerCount } from '../helpers/assertions';

test.describe('User Story 1: Join Game Room', () => {
  test('should join an existing room with valid code', async ({ page, context }) => {
    // Create 2-player game using helper
    const session = await createTwoPlayerGame(context, {
      player1Name: 'Host',
      player2Name: 'Player2'
    });

    const hostPage = session.hostPage;
    const player2Page = session.players[1].page;
    const lobbyPage2 = new LobbyPage(player2Page);

    // Verify room codes match
    await verifyAllPlayersInSameRoom(session);

    // Verify both players see each other
    await verifyAllPlayersSeeEachOther(session);

    // Verify player 2 is not host
    await expect(player2Page.locator('[data-testid="host-indicator"]')).not.toBeVisible();
  });

  test('should show error for invalid room code', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);

    await landingPage.navigate();
    await landingPage.clickJoinGame();

    // Enter invalid room code and nickname (6 chars for maxlength)
    await lobbyPage.joinRoom('INVALD', 'Test Player');

    // Verify error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('Room not found');
  });

  test('should show error when room is full (4 players max)', async ({ context }) => {
    // Create 4-player game (maximum capacity)
    const session = await createMultiplayerGame(context, 4);

    // Try to add 5th player
    const player5Page = await context.newPage();
    const landingPage = new LandingPage(player5Page);
    const lobbyPage = new LobbyPage(player5Page);

    await landingPage.navigate();
    await landingPage.clickJoinGame();
    await lobbyPage.joinRoom(session.roomCode, 'Player 5');

    // Verify error message
    const errorMessage = player5Page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('Room is full');
  });

  test('should reject duplicate nicknames in same room', async ({ page, context }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);

    // Host creates room with nickname "Host"
    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('Host');

    const roomCode = await lobbyPage.getRoomCode();

    // Second player tries to join with same nickname
    const player2Page = await context.newPage();
    const landingPage2 = new LandingPage(player2Page);
    const lobbyPage2 = new LobbyPage(player2Page);

    await landingPage2.navigate();
    await landingPage2.clickJoinGame();
    await lobbyPage2.joinRoom(roomCode, 'Host'); // Same nickname as host

    // Verify error message
    const errorMessage = player2Page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('Nickname already taken');
  });

  test('should show real-time player list updates', async ({ context }) => {
    // Create 3-player game
    const session = await createMultiplayerGame(context, 3, {
      hostNickname: 'Host',
      playerNicknamePrefix: 'Player'
    });

    // Verify all players see updated player count
    await verifyAllPlayersSeeEachOther(session);

    // Verify each player sees exactly 3 players
    for (const player of session.players) {
      await assertPlayerCount(player.page, 3);
    }
  });
});
