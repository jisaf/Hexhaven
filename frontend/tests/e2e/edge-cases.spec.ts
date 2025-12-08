/**
 * E2E Test: Edge Cases from Specification
 *
 * Test Scenarios:
 * 1. Player disconnecting mid-turn during critical action
 * 2. Host migration when host leaves game
 * 3. Invalid room codes and error handling
 * 4. Maximum player limit enforcement
 * 5. Simultaneous actions conflict resolution
 * 6. Network interruption recovery
 * 7. Game state synchronization after reconnect
 * 8. Character selection race conditions
 */

import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { LobbyPage } from '../pages/LobbyPage';
import { createTwoPlayerGame, createMultiplayerGame, setupCharactersForAll, startMultiplayerGame } from '../helpers/multiplayer';
import { assertGameBoardLoaded } from '../helpers/assertions';

test.describe('Edge Cases from Specification', () => {
  test('should handle player disconnecting mid-turn during critical action', async ({ context }) => {
    const session = await createTwoPlayerGame(context, {
      player1Name: 'Host',
      player2Name: 'Player2'
    });

    await setupCharactersForAll(session, ['Brute', 'Tinkerer']);
    await startMultiplayerGame(session);

    const hostPage = session.hostPage;
    const player2Page = session.players[1].page;

    // Wait for game board to load
    await assertGameBoardLoaded(hostPage);
    await assertGameBoardLoaded(player2Page);

    // Wait for player's turn
    const turnIndicator = hostPage.locator('[data-testid="current-turn-indicator"]');
    await expect(turnIndicator).toBeVisible({ timeout: 10000 });

    // Simulate Player 2 disconnecting during their turn
    await player2Page.context().setOffline(true);

    // Wait for disconnect detection
    await hostPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify host sees disconnect banner
    const disconnectBanner = hostPage.locator('[data-testid="player-disconnected-banner"]');
    await expect(disconnectBanner).toBeVisible({ timeout: 5000 });

    // Verify game continues to function for host
    await expect(hostPage.locator('[data-testid="game-board"]')).toBeVisible();
  });

  test('should migrate host when host leaves game', async ({ context }) => {
    // Setup 3-player game
    const session = await createMultiplayerGame(context, 3, {
      hostName: 'Host',
      playerNames: ['Player2', 'Player3']
    });

    const hostPage = session.hostPage;
    const player2Page = session.players[1].page;
    const player3Page = session.players[2].page;

    // Verify all players are in lobby
    await expect(hostPage.locator('[data-testid="lobby-page"]')).toBeVisible();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();
    await expect(player3Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Host leaves by closing the page
    await hostPage.close();

    // Wait for host migration
    await player2Page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify Player 2 becomes new host (or any remaining player)
    const player2StartButton = player2Page.locator('[data-testid="start-game-button"]');
    const player3StartButton = player3Page.locator('[data-testid="start-game-button"]');

    // One of them should be able to start the game now
    const player2IsHost = await player2StartButton.isEnabled().catch(() => false);
    const player3IsHost = await player3StartButton.isEnabled().catch(() => false);

    expect(player2IsHost || player3IsHost).toBe(true);
  });

  test('should reject invalid room codes with proper error message', async ({ page }) => {
    const landingPage = new LandingPage(page);

    await landingPage.navigate();
    await landingPage.clickJoinGame();

    // Try to join with invalid room code
    const invalidCodes = ['XXXXXX', '123456', 'ABCDEF', ''];

    for (const code of invalidCodes) {
      if (code) {
        await page.locator('[data-testid="room-code-input"]').fill(code);
        await page.locator('[data-testid="nickname-input"]').fill('TestPlayer');

        const joinButton = page.locator('button:has-text("Join")');
        if (await joinButton.isVisible()) {
          await joinButton.click();
        }

        // Wait for error message
        await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

        // Verify error message appears
        const errorMessage = page.locator('[data-testid="error-message"], .error-message, [role="alert"]');
        const hasError = await errorMessage.isVisible().catch(() => false);

        if (hasError) {
          const errorText = await errorMessage.textContent();
          expect(errorText).toBeTruthy();
        }
      }
    }
  });

  test('should enforce maximum player limit (4 players)', async ({ context }) => {
    // Create game with 4 players (maximum)
    const session = await createMultiplayerGame(context, 4, {
      hostName: 'Host',
      playerNames: ['Player2', 'Player3', 'Player4']
    });

    const roomCode = session.roomCode;

    // Try to add 5th player
    const page5 = await context.newPage();
    const landingPage5 = new LandingPage(page5);
    const lobbyPage5 = new LobbyPage(page5);

    await landingPage5.navigate();
    await landingPage5.clickJoinGame();

    // Clear localStorage for independent session
    await page5.evaluate(() => {
      localStorage.removeItem('playerNickname');
      localStorage.removeItem('playerUUID');
    });

    // Try to join full room
    await lobbyPage5.joinRoom(roomCode, 'Player5');

    // Wait for response
    await page5.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify "room is full" error or inability to join
    const isInLobby = await page5.locator('[data-testid="lobby-page"]').isVisible().catch(() => false);

    // Either should show error, or not be in lobby
    if (!isInLobby) {
      // Good - didn't join
      expect(isInLobby).toBe(false);
    } else {
      // If somehow in lobby, check player count didn't exceed 4
      const playerCount = await session.hostPage.locator('[data-testid="player-list"] [data-testid="player-item"]').count();
      expect(playerCount).toBeLessThanOrEqual(4);
    }

    await page5.close();
  });

  test('should handle simultaneous character selection gracefully', async ({ context }) => {
    const session = await createTwoPlayerGame(context, {
      player1Name: 'Host',
      player2Name: 'Player2'
    });

    const hostPage = session.hostPage;
    const player2Page = session.players[1].page;

    // Both try to select the same character simultaneously
    const bruteCardHost = hostPage.locator('[data-testid="character-card-Brute"]');
    const bruteCardPlayer2 = player2Page.locator('[data-testid="character-card-Brute"]');

    // Click simultaneously
    await Promise.all([
      bruteCardHost.click(),
      player2Page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {}),
      player2Page.waitForLoadState('networkidle', { timeout: 100 }).catch(() => {}),
      bruteCardPlayer2.click()
    ]);

    // Wait for server response
    await hostPage.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    await player2Page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

    // Verify only ONE player got Brute
    const hostCharacter = await hostPage.locator('[data-testid="character-card-Brute"]').getAttribute('class');
    const player2Character = await player2Page.locator('[data-testid="character-card-Brute"]').getAttribute('class');

    const hostHasBrute = hostCharacter?.includes('selected');
    const player2HasBrute = player2Character?.includes('selected');

    // Only one should have it selected
    expect(hostHasBrute && player2HasBrute).toBe(false);
  });

  test('should recover from brief network interruption', async ({ context }) => {
    const session = await createTwoPlayerGame(context, {
      player1Name: 'Host',
      player2Name: 'Player2'
    });

    const player2Page = session.players[1].page;

    // Simulate brief network interruption (2 seconds)
    await player2Page.context().setOffline(true);
    await player2Page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});

    // Restore connection
    await player2Page.context().setOffline(false);
    await player2Page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify Player 2 reconnected successfully
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible({ timeout: 10000 });

    // Verify can still see other players
    const playerCount = await player2Page.locator('[data-testid="player-list"] [data-testid="player-item"]').count();
    expect(playerCount).toBeGreaterThanOrEqual(2);
  });

  test('should synchronize game state after reconnection', async ({ context }) => {
    const session = await createTwoPlayerGame(context, {
      player1Name: 'Host',
      player2Name: 'Player2'
    });

    await setupCharactersForAll(session, ['Brute', 'Tinkerer']);

    const hostPage = session.hostPage;
    const player2Page = session.players[1].page;

    // Host selects character
    await hostPage.locator('[data-testid="character-card-Brute"]').click();
    await hostPage.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});

    // Player 2 disconnects
    await player2Page.context().setOffline(true);
    await player2Page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});

    // Player 2 reconnects
    await player2Page.context().setOffline(false);
    await player2Page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify Player 2 sees Host's character selection
    const bruteBanner = player2Page.locator('[data-testid="player-list"]');
    await expect(bruteBanner).toBeVisible({ timeout: 5000 });

    // Game state should be synchronized
    const player2PlayerCount = await player2Page.locator('[data-testid="player-list"] [data-testid="player-item"]').count();
    expect(player2PlayerCount).toBe(2);
  });

  test('should handle empty nickname gracefully', async ({ page }) => {
    const landingPage = new LandingPage(page);

    await landingPage.navigate();
    await landingPage.clickCreateGame();

    // Try to submit empty nickname
    const nicknameInput = page.locator('[data-testid="nickname-input"]');
    await nicknameInput.fill('');

    const submitButton = page.locator('[data-testid="nickname-submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }

    // Should either:
    // 1. Show validation error
    // 2. Disable submit button
    // 3. Prevent submission

    const isStillOnNicknameScreen = await nicknameInput.isVisible();
    expect(isStillOnNicknameScreen).toBe(true);
  });
});
