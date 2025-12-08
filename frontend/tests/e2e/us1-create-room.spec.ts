/**
 * E2E Test: Create Game Room and Receive Room Code (US1 - T035)
 * REFACTORED: Uses Page Object Model and smart waits
 *
 * Test Scenario:
 * 1. User navigates to the app landing page
 * 2. User clicks "Create Game" button
 * 3. System generates a unique 6-character alphanumeric room code
 * 4. User sees room code displayed
 * 5. User is placed in lobby as host
 */

import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { LobbyPage } from '../pages/LobbyPage';
import { assertValidRoomCode, assertPlayerCount } from '../helpers/assertions';

test.describe('User Story 1: Create Game Room', () => {
  test('should create a game room and display room code', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);

    // Navigate to the app
    await landingPage.navigate();
    await landingPage.verifyPageLoaded();

    // Click "Create Game" button
    await landingPage.clickCreateGame();

    // Fill in nickname
    await lobbyPage.enterNickname('TestPlayer');

    // Verify room code format (6 alphanumeric characters)
    const roomCode = await lobbyPage.getRoomCode();
    await assertValidRoomCode(roomCode);

    // Verify user is in lobby
    await lobbyPage.verifyLobbyLoaded();

    // Verify user is marked as host
    await lobbyPage.verifyIsHost();

    // Verify player list contains the host
    await assertPlayerCount(page, 1);
  });

  test('should generate unique room codes for multiple games', async ({ page, context }) => {
    const landingPage1 = new LandingPage(page);
    const lobbyPage1 = new LobbyPage(page);

    // Create first game
    await landingPage1.navigate();
    await landingPage1.clickCreateGame();
    await lobbyPage1.enterNickname('TestPlayer1');
    const roomCode1 = await lobbyPage1.getRoomCode();

    // Open second tab and create another game
    const page2 = await context.newPage();
    const landingPage2 = new LandingPage(page2);
    const lobbyPage2 = new LobbyPage(page2);

    await landingPage2.navigate();
    await landingPage2.clickCreateGame();
    await lobbyPage2.enterNickname('TestPlayer2');
    const roomCode2 = await lobbyPage2.getRoomCode();

    // Verify codes are different
    expect(roomCode1).not.toBe(roomCode2);
  });

  test('should show error message if room creation fails', async ({ page }) => {
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);

    // Intercept API call to simulate failure
    await page.route('**/api/rooms', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to create room' }),
      });
    });

    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('TestPlayer');

    // Verify error message is displayed
    const errorMessage = page.locator('.error-banner[role="alert"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('Failed to create room');
  });

  test('should allow copying room code to clipboard', async ({ page, context, browserName }) => {
    // Firefox doesn't support clipboard-read permission
    test.skip(browserName === 'firefox', 'Firefox does not support clipboard-read permission');

    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('TestPlayer');

    // Get room code
    const roomCode = await lobbyPage.getRoomCode();

    // Click copy button
    const copyButton = page.locator('[data-testid="copy-room-code"]');
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    // Verify clipboard contains room code
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(roomCode);

    // Verify copy feedback is shown
    await expect(page.locator('text=Copied!')).toBeVisible();
  });
});
