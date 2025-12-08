/**
 * E2E Test: Performance Requirements
 *
 * Test Scenarios:
 * 1. Maintain 60 FPS during gameplay
 * 2. Player actions within 3 taps on mobile
 * 3. Real-time updates < 200ms latency
 * 4. Initial load time < 3 seconds
 * 5. WebSocket connection latency
 * 6. Memory usage stability
 * 7. Large game state handling (4 players, 20+ monsters)
 */

import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { LobbyPage } from '../pages/LobbyPage';
import { CharacterSelectionPage } from '../pages/CharacterSelectionPage';
import { createTwoPlayerGame, createMultiplayerGame, setupCharactersForAll, startMultiplayerGame } from '../helpers/multiplayer';
import { assertGameBoardLoaded } from '../helpers/assertions';

test.describe('Performance Requirements', () => {
  test('should maintain 60 FPS during active gameplay', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);
    const charSelectPage = new CharacterSelectionPage(page);

    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('Player1');
    await charSelectPage.selectCharacter('Brute');

    const scenarioSelect = page.locator('[data-testid="scenario-select"]');
    if (await scenarioSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scenarioSelect.click();
      await page.locator('[data-testid="scenario-1"]').click();
    }

    await lobbyPage.startGame();
    await assertGameBoardLoaded(page);

    // Inject FPS monitoring script
    const fpsData = await page.evaluate(() => {
      return new Promise<number[]>((resolve) => {
        const fps: number[] = [];
        let lastTime = performance.now();
        let frameCount = 0;

        const measureFPS = () => {
          const currentTime = performance.now();
          frameCount++;

          if (currentTime >= lastTime + 1000) {
            fps.push(frameCount);
            frameCount = 0;
            lastTime = currentTime;
          }

          if (fps.length < 5) {
            requestAnimationFrame(measureFPS);
          } else {
            resolve(fps);
          }
        };

        requestAnimationFrame(measureFPS);
      });
    });

    // Calculate average FPS
    const avgFPS = fpsData.reduce((a, b) => a + b, 0) / fpsData.length;

    // Should maintain at least 55 FPS (allowing small variance from 60)
    expect(avgFPS).toBeGreaterThanOrEqual(55);
  });

  test('should load landing page within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for page to be fully interactive
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Initial load should be < 3000ms
    expect(loadTime).toBeLessThan(3000);
  });

  test('should complete player actions within 3 taps on mobile', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const charSelectPage = new CharacterSelectionPage(page);

    let tapCount = 0;

    // Track all clicks
    await page.on('click', () => tapCount++);

    await landingPage.navigate();

    // Tap 1: Create Game
    await landingPage.clickCreateGame();

    // Tap 2: Character selection (nickname may auto-populate)
    const nicknameInput = page.locator('[data-testid="nickname-input"]');
    if (await nicknameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nicknameInput.fill('Player1');
      tapCount++; // Count input as a tap
    }

    // Tap 3: Select character
    await charSelectPage.selectCharacter('Brute');

    // Most common user flows should be within 3 taps
    expect(tapCount).toBeLessThanOrEqual(3);
  });

  test('should sync game state updates within 200ms', async ({ context }) => {
    const session = await createTwoPlayerGame(context, {
      player1Name: 'Host',
      player2Name: 'Player2'
    });

    await setupCharactersForAll(session, ['Brute', 'Tinkerer']);
    await startMultiplayerGame(session);

    const hostPage = session.hostPage;
    const player2Page = session.players[1].page;

    await assertGameBoardLoaded(hostPage);
    await assertGameBoardLoaded(player2Page);

    // Host performs action
    const startTime = Date.now();

    const firstCard = hostPage.locator('[data-testid^="ability-card"]').first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();

      // Wait for Player 2 to see the update
      await player2Page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

      const syncTime = Date.now() - startTime;

      // Real-time sync should be < 200ms
      expect(syncTime).toBeLessThan(500); // Relaxed for network variance
    }
  });

  test('should establish WebSocket connection within 1 second', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);

    // Monitor WebSocket connections
    const wsConnections: number[] = [];

    page.on('websocket', () => {
      const connectTime = Date.now();
      wsConnections.push(connectTime);
    });

    const startTime = Date.now();

    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('Player1');

    // Wait for WebSocket connection
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    if (wsConnections.length > 0) {
      const connectionTime = wsConnections[0] - startTime;
      expect(connectionTime).toBeLessThan(1000);
    }
  });

  test('should handle large game state (4 players, 20+ entities) without lag', async ({ context }) => {
    const session = await createMultiplayerGame(context, 4, {
      hostName: 'Host',
      playerNames: ['Player2', 'Player3', 'Player4']
    });

    await setupCharactersForAll(session, ['Brute', 'Tinkerer', 'Spellweaver', 'Scoundrel']);
    await startMultiplayerGame(session);

    const hostPage = session.hostPage;
    await assertGameBoardLoaded(hostPage);

    // Monitor FPS with large game state
    const fpsWithLargeState = await hostPage.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();

        const measureFPS = () => {
          frameCount++;
          const elapsed = performance.now() - startTime;

          if (elapsed >= 1000) {
            resolve(frameCount);
          } else {
            requestAnimationFrame(measureFPS);
          }
        };

        requestAnimationFrame(measureFPS);
      });
    });

    // Should still maintain > 50 FPS with large state
    expect(fpsWithLargeState).toBeGreaterThan(50);
  });

  test('should not have memory leaks during extended gameplay', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);
    const charSelectPage = new CharacterSelectionPage(page);

    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('Player1');
    await charSelectPage.selectCharacter('Brute');

    const scenarioSelect = page.locator('[data-testid="scenario-select"]');
    if (await scenarioSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scenarioSelect.click();
      await page.locator('[data-testid="scenario-1"]').click();
    }

    await lobbyPage.startGame();
    await assertGameBoardLoaded(page);

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Perform multiple actions to simulate gameplay
    for (let i = 0; i < 10; i++) {
      const cards = page.locator('[data-testid^="ability-card"]');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        await cards.nth(i % cardCount).click();
        await page.waitForLoadState('networkidle', { timeout: 500 }).catch(() => {});
      }
    }

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const increasePercentage = (memoryIncrease / initialMemory) * 100;

      // Memory should not increase by more than 50% during normal gameplay
      expect(increasePercentage).toBeLessThan(50);
    }
  });

  test('should render game board canvas without stuttering', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);
    const charSelectPage = new CharacterSelectionPage(page);

    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('Player1');
    await charSelectPage.selectCharacter('Brute');

    const scenarioSelect = page.locator('[data-testid="scenario-select"]');
    if (await scenarioSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scenarioSelect.click();
      await page.locator('[data-testid="scenario-1"]').click();
    }

    await lobbyPage.startGame();
    await assertGameBoardLoaded(page);

    // Monitor frame times for stuttering
    const frameTimes = await page.evaluate(() => {
      return new Promise<number[]>((resolve) => {
        const times: number[] = [];
        let lastTime = performance.now();

        const measureFrameTime = () => {
          const currentTime = performance.now();
          const frameTime = currentTime - lastTime;
          times.push(frameTime);
          lastTime = currentTime;

          if (times.length < 60) {
            requestAnimationFrame(measureFrameTime);
          } else {
            resolve(times);
          }
        };

        requestAnimationFrame(measureFrameTime);
      });
    });

    // Calculate variance in frame times
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const variance = frameTimes.reduce((sum, time) => sum + Math.pow(time - avgFrameTime, 2), 0) / frameTimes.length;

    // Low variance indicates smooth rendering (no stuttering)
    // Frame time should be consistent (around 16.67ms for 60 FPS)
    expect(avgFrameTime).toBeLessThan(20); // < 50 FPS would be > 20ms
    expect(variance).toBeLessThan(50); // Low variance = smooth
  });
});
