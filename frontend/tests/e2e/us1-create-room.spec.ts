/**
 * E2E Test: Create Game Room and Receive Room Code (US1 - T035)
 *
 * Test Scenario:
 * 1. User navigates to the app landing page
 * 2. User clicks "Create Game" button
 * 3. System generates a unique 6-character alphanumeric room code
 * 4. User sees room code displayed
 * 5. User is placed in lobby as host
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 1: Create Game Room', () => {
  test('should create a game room and display room code', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Verify landing page elements
    await expect(page.locator('h1')).toContainText('Hexhaven');

    // Handle nickname prompt dialog
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('TestPlayer');
    });

    // Click "Create Game" button
    const createButton = page.locator('button:has-text("Create Game")');
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for room code to be displayed
    const roomCodeDisplay = page.locator('[data-testid="room-code"]');
    await expect(roomCodeDisplay).toBeVisible({ timeout: 5000 });

    // Verify room code format (6 alphanumeric characters)
    const roomCode = await roomCodeDisplay.textContent();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // Verify user is in lobby
    await expect(page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Verify user is marked as host
    const hostIndicator = page.locator('[data-testid="host-indicator"]');
    await expect(hostIndicator).toBeVisible();

    // Verify player list contains the host
    const playerList = page.locator('[data-testid="player-list"]');
    await expect(playerList).toBeVisible();
    await expect(playerList.locator('[data-testid="player-item"]')).toHaveCount(1);
  });

  test('should generate unique room codes for multiple games', async ({ page, context }) => {
    // Create first game
    await page.goto('/');

    // Handle nickname prompt dialog for first game
    page.once('dialog', async dialog => {
      await dialog.accept('TestPlayer1');
    });

    await page.locator('button:has-text("Create Game")').click();
    const roomCode1 = await page.locator('[data-testid="room-code"]').textContent();

    // Open second tab and create another game
    const page2 = await context.newPage();
    await page2.goto('/');

    // Handle nickname prompt dialog for second game
    page2.once('dialog', async dialog => {
      await dialog.accept('TestPlayer2');
    });

    await page2.locator('button:has-text("Create Game")').click();
    const roomCode2 = await page2.locator('[data-testid="room-code"]').textContent();

    // Verify codes are different
    expect(roomCode1).not.toBe(roomCode2);
  });

  test('should show error message if room creation fails', async ({ page }) => {
    // Intercept API call to simulate failure
    await page.route('**/api/rooms', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to create room' }),
      });
    });

    await page.goto('/');

    // Handle nickname prompt dialog
    page.once('dialog', async dialog => {
      await dialog.accept('TestPlayer');
    });

    await page.locator('button:has-text("Create Game")').click();

    // Verify error message is displayed
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('Failed to create room');
  });

  test('should allow copying room code to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');

    // Handle nickname prompt dialog
    page.once('dialog', async dialog => {
      await dialog.accept('TestPlayer');
    });

    await page.locator('button:has-text("Create Game")').click();

    // Wait for room code
    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

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
