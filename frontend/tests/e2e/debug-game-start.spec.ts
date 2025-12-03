/**
 * Debug Test: Game Start Issue
 *
 * Test to debug why cards, map, and log aren't appearing
 */

import { test, expect } from '@playwright/test';

test.describe('Debug: Game Start Issue', () => {
  test('should create game and check console logs', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Host creates room
    console.log('Creating room...');
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();

    // Fill in nickname for host
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();
    console.log('Room code:', roomCode);

    // Host selects Brute character
    console.log('Selecting character...');
    await page.locator('[data-testid="character-card-Brute"]').click();

    // Wait for selection
    await page.waitForTimeout(1000);

    // Host starts game
    console.log('Starting game...');
    const startGameButton = page.locator('[data-testid="start-game-button"]');
    await expect(startGameButton).toBeEnabled({ timeout: 5000 });
    await startGameButton.click();

    // Wait for game board to appear
    console.log('Waiting for game board...');
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });

    // Wait a bit for game to initialize
    await page.waitForTimeout(3000);

    // Check for hex grid
    const hexGridVisible = await page.locator('[data-testid="hex-grid"]').isVisible().catch(() => false);
    console.log('Hex grid visible:', hexGridVisible);

    // Check for card selection panel
    const cardPanelVisible = await page.locator('[data-testid="card-selection-panel"]').isVisible().catch(() => false);
    console.log('Card panel visible:', cardPanelVisible);

    // Check for game logs
    const logsVisible = await page.locator('[data-testid="game-log"]').isVisible().catch(() => false);
    console.log('Logs visible:', logsVisible);

    // Print all console logs
    console.log('\n=== CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    // Print console errors
    if (consoleErrors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach(error => console.log(error));
    }

    // Print page errors
    if (pageErrors.length > 0) {
      console.log('\n=== PAGE ERRORS ===');
      pageErrors.forEach(error => console.log(error));
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: '/home/opc/hexhaven/frontend/debug-game-board.png', fullPage: true });
    console.log('Screenshot saved to: /home/opc/hexhaven/frontend/debug-game-board.png');

    // Get gameState from the page
    const gameStateInfo = await page.evaluate(() => {
      return {
        hasGameData: !!(window as any).__gameStateManager?.getState?.()?.gameData,
        currentRound: (window as any).__gameStateManager?.getState?.()?.currentRound,
        logs: (window as any).__gameStateManager?.getState?.()?.logs?.length || 0,
        showCardSelection: (window as any).__gameStateManager?.getState?.()?.showCardSelection,
      };
    });
    console.log('\n=== GAME STATE INFO ===');
    console.log(JSON.stringify(gameStateInfo, null, 2));
  });
});
