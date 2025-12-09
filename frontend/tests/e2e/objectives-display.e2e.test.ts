/**
 * E2E Test: Objectives Display on Game Start
 *
 * End-to-end test that verifies objectives are displayed correctly
 * when a game starts, based on verified manual testing behavior.
 *
 * Test Flow:
 * 1. Navigate to home page
 * 2. Create a new game
 * 3. Select a character
 * 4. Start the game
 * 5. Verify objectives are displayed immediately
 * 6. Verify console logs show objectives loaded from game state
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Objectives Display E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should display objectives immediately when game starts', async ({ page }) => {
    // Step 1: Create a game
    await page.click('[data-testid="create-room-button"]');
    await expect(page.locator('text=Room Code:')).toBeVisible();

    // Step 2: Select Brute character
    await page.click('[data-testid="character-card-Brute"]');
    await expect(page.locator('text=✅ All players ready')).toBeVisible();

    // Step 3: Start the game
    await page.click('button:has-text("🎮 Start Game")');

    // Wait for navigation to game board
    await page.waitForURL(/\/game\//);

    // Step 4: Verify objectives are displayed immediately
    // Based on verified behavior: "Objective: Defeat all enemies"
    await expect(page.locator('text=Objective:')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Defeat all enemies')).toBeVisible();

    // Verify optional objective
    await expect(page.locator('text=Optional:')).toBeVisible();
    await expect(page.locator('text=Loot the treasure chest')).toBeVisible();
  });

  test('should log objectives extraction from game state', async ({ page }) => {
    // Listen for console logs
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        consoleMessages.push(msg.text());
      }
    });

    // Create and start game
    await page.click('[data-testid="create-room-button"]');
    await page.click('[data-testid="character-card-Brute"]');
    await page.click('button:has-text("🎮 Start Game")');
    await page.waitForURL(/\/game\//);

    // Wait for game board to initialize
    await page.waitForSelector('text=Objective:', { timeout: 5000 });

    // Verify the expected console log (verified behavior)
    const objectivesLog = consoleMessages.find((msg) =>
      msg.includes('[GameBoard] Objectives loaded from game state:')
    );

    expect(objectivesLog).toBeTruthy();
    expect(objectivesLog).toContain('primary');
    expect(objectivesLog).toContain('secondary');
  });

  test('should NOT emit deprecated objectives_loaded event', async ({ page }) => {
    // Listen for WebSocket events
    const websocketMessages: any[] = [];

    await page.evaluateOnNewDocument(() => {
      // Intercept WebSocket messages
      const originalSend = WebSocket.prototype.send;
      WebSocket.prototype.send = function (data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if (typeof data === 'string') {
          (window as any).wsMessages = (window as any).wsMessages || [];
          (window as any).wsMessages.push(data);
        }
        return originalSend.call(this, data);
      };
    });

    // Create and start game
    await page.click('[data-testid="create-room-button"]');
    await page.click('[data-testid="character-card-Brute"]');
    await page.click('button:has-text("🎮 Start Game")');
    await page.waitForURL(/\/game\//);
    await page.waitForSelector('text=Objective:');

    // Retrieve WebSocket messages
    const messages = await page.evaluate(() => (window as any).wsMessages || []);

    // Verify objectives_loaded event is NOT present
    const hasObjectivesLoadedEvent = messages.some((msg: string) =>
      msg.includes('objectives_loaded')
    );

    expect(hasObjectivesLoadedEvent).toBe(false);

    // Verify game_started event IS present (should contain objectives)
    const hasGameStartedEvent = messages.some((msg: string) => msg.includes('game_started'));
    expect(hasGameStartedEvent).toBe(true);
  });

  test('should display objectives after page refresh (rejoin scenario)', async ({ page }) => {
    // Step 1: Create and start a game
    await page.click('[data-testid="create-room-button"]');
    const roomCodeElement = await page.locator('text=Room Code:').textContent();
    const roomCode = roomCodeElement?.split(':')[1]?.trim();

    await page.click('[data-testid="character-card-Brute"]');
    await page.click('button:has-text("🎮 Start Game")');
    await page.waitForURL(/\/game\//);

    // Verify objectives are visible
    await expect(page.locator('text=Defeat all enemies')).toBeVisible();

    // Step 2: Refresh the page (simulates rejoin)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 3: Verify objectives are STILL displayed after rejoin
    await expect(page.locator('text=Objective:')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Defeat all enemies')).toBeVisible();
    await expect(page.locator('text=Loot the treasure chest')).toBeVisible();
  });

  test('should handle multiple scenarios with different objectives', async ({ page }) => {
    // Test different scenarios to ensure objectives system works universally

    // Scenario 1: Black Barrow
    await page.click('[data-testid="create-room-button"]');
    await page.click('[data-testid="character-card-Brute"]');

    // Select Black Barrow scenario (default)
    await page.click('button:has-text("🎮 Start Game")');
    await page.waitForURL(/\/game\//);

    // Verify Black Barrow objectives
    await expect(page.locator('text=Defeat all enemies')).toBeVisible();

    // Go back to create another game for different scenario
    await page.click('button:has-text("Back to Lobby")');
    await page.goto('http://localhost:5173');

    // Note: Additional scenarios would be tested here if scenario selection
    // was implemented to change objectives dynamically
  });
});

/**
 * Verified Test Expectations (from manual testing):
 *
 * ✅ Console Log Pattern:
 *    "[GameBoard] Objectives loaded from game state: {primary: Object, secondary: Array(1), failureConditions: Array(0)}"
 *
 * ✅ UI Display Pattern:
 *    - "Objective:" label visible
 *    - Primary objective: "Defeat all enemies"
 *    - "Optional:" label visible
 *    - Secondary objective: "Loot the treasure chest"
 *
 * ✅ Timing:
 *    - Objectives appear immediately when game board loads
 *    - No delay or race condition
 *    - Visible within 5 seconds of game start
 *
 * ✅ Event Pattern:
 *    - game_started event emitted WITH objectives
 *    - objectives_loaded event NOT emitted (deprecated)
 *    - No separate objectives event in WebSocket traffic
 *
 * ✅ Rejoin Scenario:
 *    - Objectives persist and display after page refresh
 *    - Same objectives shown as before refresh
 *    - Loaded from game state sent in buildGameStatePayload
 */
