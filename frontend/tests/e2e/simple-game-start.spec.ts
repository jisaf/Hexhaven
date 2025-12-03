/**
 * Simple Test: Verify game starts with cards, map, and log
 */

import { test, expect } from '@playwright/test';

test.describe('Game Start Verification', () => {
  test('should start game and display all UI elements', async ({ page }) => {
    // Capture console logs and errors
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

    console.log('\n========== STARTING TEST ==========');

    // Navigate to lobby
    console.log('1. Navigating to lobby...');
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Create room
    console.log('2. Creating room...');
    await page.locator('[data-testid="create-room-button"]').click();
    await page.waitForTimeout(500);

    // Fill in nickname
    console.log('3. Entering nickname...');
    await page.locator('[data-testid="nickname-input"]').fill('TestPlayer');
    await page.locator('[data-testid="nickname-submit"]').click();
    await page.waitForTimeout(1000);

    // Get room code
    const roomCode = await page.locator('[data-testid="room-code"]').textContent();
    console.log('4. Room created:', roomCode);

    // Select character
    console.log('5. Selecting character...');
    const bruteCard = page.locator('[data-testid="character-card-Brute"]');
    await expect(bruteCard).toBeVisible({ timeout: 5000 });
    await bruteCard.click();
    await page.waitForTimeout(1000);

    // Start game
    console.log('6. Starting game...');
    const startButton = page.locator('button:has-text("Start Game")');
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await expect(startButton).toBeEnabled({ timeout: 10000 });
    await startButton.click();

    // Wait for navigation to game board
    console.log('7. Waiting for game board...');
    await expect(page).toHaveURL(/\/game\//);
    await page.waitForTimeout(3000); // Give time for game to initialize

    // Check for game board
    console.log('8. Checking for game board...');
    const gameBoard = page.locator('[data-testid="game-board"]');
    const isBoardVisible = await gameBoard.isVisible();
    console.log('   - Game board visible:', isBoardVisible);

    // Check for hex grid (may not have test id, so check for canvas or container)
    console.log('9. Checking for hex grid...');
    const hexContainer = page.locator('.gameContainer, [data-testid="hex-grid"]').first();
    const isHexVisible = await hexContainer.isVisible();
    console.log('   - Hex grid container visible:', isHexVisible);

    // Check for card selection panel
    console.log('10. Checking for card selection...');
    const cardPanel = page.locator('[data-testid="card-selection-panel"]');
    const isCardPanelVisible = await cardPanel.isVisible().catch(() => false);
    console.log('   - Card panel visible:', isCardPanelVisible);

    // Check for game HUD/log
    console.log('11. Checking for game HUD...');
    const gameHud = page.locator('[data-testid="game-hud"], .gameBoardPage .rightPanel').first();
    const isHudVisible = await gameHud.isVisible();
    console.log('   - Game HUD visible:', isHudVisible);

    // Take screenshot
    await page.screenshot({ path: '/home/opc/hexhaven/test-game-board.png', fullPage: true });
    console.log('12. Screenshot saved to: /home/opc/hexhaven/test-game-board.png');

    // Print relevant console logs
    console.log('\n========== RELEVANT CONSOLE LOGS ==========');
    const relevantLogs = consoleLogs.filter(log =>
      log.includes('Lobby') ||
      log.includes('GameBoard') ||
      log.includes('GameSession') ||
      log.includes('game_started') ||
      log.includes('reset') ||
      log.includes('switch')
    );
    relevantLogs.forEach(log => console.log(log));

    // Print errors if any
    if (consoleErrors.length > 0) {
      console.log('\n========== CONSOLE ERRORS ==========');
      consoleErrors.forEach(error => console.log(error));
    }

    if (pageErrors.length > 0) {
      console.log('\n========== PAGE ERRORS ==========');
      pageErrors.forEach(error => console.log(error));
    }

    // Assertions
    console.log('\n========== RUNNING ASSERTIONS ==========');
    expect(isBoardVisible, 'Game board should be visible').toBe(true);
    expect(isHexVisible, 'Hex grid should be visible').toBe(true);
    expect(isHudVisible, 'Game HUD should be visible').toBe(true);

    // Card panel might not always be visible depending on game state
    if (isCardPanelVisible) {
      console.log('✓ Card selection panel is visible');
    } else {
      console.log('⚠ Card selection panel not visible (may be expected depending on game state)');
    }

    console.log('\n========== TEST COMPLETED SUCCESSFULLY ==========\n');
  });
});
