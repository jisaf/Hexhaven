/**
 * E2E Test: Character Movement Visible to Both Players (US1 - T038)
 *
 * Test Scenario:
 * 1. Two players in active game
 * 2. Player taps their character
 * 3. Movement range is highlighted
 * 4. Player taps a valid hex within range
 * 5. Character moves to new position
 * 6. Both players see the movement in real-time
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 1: Character Movement', () => {
  // Helper function to setup game with 2 players
  async function setupGame(page, context) {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join Game")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player 2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Both players select characters
    await page.locator('[data-testid="character-card-Brute"]').click();
    await player2Page.locator('[data-testid="character-card-Tinkerer"]').click();

    // Host starts game
    await page.locator('[data-testid="start-game-button"]').click();
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 5000 });
    await expect(player2Page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 5000 });

    return { player2Page };
  }

  test('should show movement range when character is selected', async ({ page, context }) => {
    await setupGame(page, context);

    // Tap Brute character
    const bruteSprite = page.locator('[data-testid="character-sprite-Brute"]');
    await bruteSprite.click();

    // Verify character is selected (highlighted)
    await expect(bruteSprite).toHaveClass(/selected/);

    // Verify movement range hexes are highlighted
    const highlightedHexes = page.locator('[data-testid^="hex-highlight-"]');
    await expect(highlightedHexes.first()).toBeVisible({ timeout: 3000 });

    // Verify at least some hexes are highlighted (movement range > 0)
    const highlightCount = await highlightedHexes.count();
    expect(highlightCount).toBeGreaterThan(0);
  });

  test('should move character to valid hex and sync to other players', async ({ page, context }) => {
    const { player2Page } = await setupGame(page, context);

    // Get Brute's initial position
    const bruteSprite = page.locator('[data-testid="character-sprite-Brute"]');
    const initialBounds = await bruteSprite.boundingBox();

    // Tap Brute to select
    await bruteSprite.click();

    // Wait for movement range to appear
    await expect(page.locator('[data-testid^="hex-highlight-"]').first()).toBeVisible({ timeout: 3000 });

    // Tap a highlighted hex to move
    const targetHex = page.locator('[data-testid^="hex-highlight-"]').first();
    await targetHex.click();

    // Wait for character to move
    await page.waitForTimeout(500); // Allow time for animation

    // Verify character position changed
    const newBounds = await bruteSprite.boundingBox();
    expect(newBounds?.x).not.toBe(initialBounds?.x);

    // Verify player 2 sees the movement
    const player2BruteSprite = player2Page.locator('[data-testid="character-sprite-Brute"]');
    await player2Page.waitForTimeout(500); // Allow WebSocket sync

    const player2BruteBounds = await player2BruteSprite.boundingBox();

    // Positions should match between both players (within tolerance for rendering)
    expect(Math.abs(player2BruteBounds!.x - newBounds!.x)).toBeLessThan(5);
    expect(Math.abs(player2BruteBounds!.y - newBounds!.y)).toBeLessThan(5);
  });

  test('should prevent movement to invalid hexes (obstacles)', async ({ page, context }) => {
    await setupGame(page, context);

    // Tap Brute to select
    const bruteSprite = page.locator('[data-testid="character-sprite-Brute"]');
    const initialBounds = await bruteSprite.boundingBox();
    await bruteSprite.click();

    // Wait for movement range
    await expect(page.locator('[data-testid^="hex-highlight-"]').first()).toBeVisible();

    // Try to click a hex that's not highlighted (out of range or obstacle)
    // First, find the game board area
    const gameBoard = page.locator('[data-testid="game-board"]');
    const boardBounds = await gameBoard.boundingBox();

    // Click far away from character (likely out of range)
    await gameBoard.click({
      position: {
        x: boardBounds!.width - 50,
        y: boardBounds!.height - 50,
      },
    });

    // Wait a moment to ensure no movement occurs
    await page.waitForTimeout(500);

    // Verify character hasn't moved
    const finalBounds = await bruteSprite.boundingBox();
    expect(finalBounds?.x).toBe(initialBounds?.x);
    expect(finalBounds?.y).toBe(initialBounds?.y);
  });

  test('should prevent movement to occupied hexes', async ({ page, context }) => {
    await setupGame(page, context);

    // Get both character positions
    const bruteSprite = page.locator('[data-testid="character-sprite-Brute"]');
    const tinkererSprite = page.locator('[data-testid="character-sprite-Tinkerer"]');

    const bruteBounds = await bruteSprite.boundingBox();

    // Tap Brute to select
    await bruteSprite.click();

    // Try to move to Tinkerer's position
    await tinkererSprite.click();

    // Wait to ensure no movement
    await page.waitForTimeout(500);

    // Verify Brute hasn't moved
    const finalBruteBounds = await bruteSprite.boundingBox();
    expect(finalBruteBounds?.x).toBe(bruteBounds?.x);
    expect(finalBruteBounds?.y).toBe(bruteBounds?.y);
  });

  test('should deselect character when clicking empty hex', async ({ page, context }) => {
    await setupGame(page, context);

    // Tap Brute to select
    const bruteSprite = page.locator('[data-testid="character-sprite-Brute"]');
    await bruteSprite.click();

    // Verify character is selected
    await expect(bruteSprite).toHaveClass(/selected/);

    // Click empty area outside movement range
    const gameBoard = page.locator('[data-testid="game-board"]');
    const boardBounds = await gameBoard.boundingBox();
    await gameBoard.click({
      position: {
        x: boardBounds!.width - 50,
        y: 50,
      },
    });

    // Verify character is deselected
    await expect(bruteSprite).not.toHaveClass(/selected/);

    // Verify movement range highlights are removed
    await expect(page.locator('[data-testid^="hex-highlight-"]')).not.toBeVisible();
  });

  test('should show movement animations', async ({ page, context }) => {
    await setupGame(page, context);

    // Tap Brute to select
    const bruteSprite = page.locator('[data-testid="character-sprite-Brute"]');
    await bruteSprite.click();

    // Wait for movement range
    await expect(page.locator('[data-testid^="hex-highlight-"]').first()).toBeVisible();

    // Tap target hex
    const targetHex = page.locator('[data-testid^="hex-highlight-"]').first();
    await targetHex.click();

    // Verify animation class is applied (implementation may vary)
    // This test might need adjustment based on actual animation implementation
    await expect(bruteSprite).toHaveClass(/moving|animating/, { timeout: 1000 });

    // Wait for animation to complete
    await page.waitForTimeout(500);

    // Verify animation class is removed
    await expect(bruteSprite).not.toHaveClass(/moving|animating/);
  });

  test('should update turn indicator after movement', async ({ page, context }) => {
    await setupGame(page, context);

    // Verify turn indicator shows current player
    const turnIndicator = page.locator('[data-testid="turn-indicator"]');
    await expect(turnIndicator).toBeVisible();

    const currentTurn = await turnIndicator.textContent();

    // Perform movement
    const bruteSprite = page.locator('[data-testid="character-sprite-Brute"]');
    await bruteSprite.click();
    await expect(page.locator('[data-testid^="hex-highlight-"]').first()).toBeVisible();
    const targetHex = page.locator('[data-testid^="hex-highlight-"]').first();
    await targetHex.click();

    // Wait for turn to change
    await page.waitForTimeout(1000);

    // Verify turn indicator updated
    const newTurn = await turnIndicator.textContent();
    expect(newTurn).not.toBe(currentTurn);
  });

  test('should sync multiple movements in sequence', async ({ page, context }) => {
    const { player2Page } = await setupGame(page, context);

    // Player 1 moves Brute
    const bruteSprite = page.locator('[data-testid="character-sprite-Brute"]');
    await bruteSprite.click();
    await expect(page.locator('[data-testid^="hex-highlight-"]').first()).toBeVisible();
    await page.locator('[data-testid^="hex-highlight-"]').first().click();
    await page.waitForTimeout(500);

    // Verify player 2 sees the movement
    const player2BruteSprite = player2Page.locator('[data-testid="character-sprite-Brute"]');
    const bruteBounds = await bruteSprite.boundingBox();
    const player2BruteBounds = await player2BruteSprite.boundingBox();
    expect(Math.abs(player2BruteBounds!.x - bruteBounds!.x)).toBeLessThan(5);

    // Player 2 moves Tinkerer
    const player2TinkererSprite = player2Page.locator('[data-testid="character-sprite-Tinkerer"]');
    await player2TinkererSprite.click();
    await expect(player2Page.locator('[data-testid^="hex-highlight-"]').first()).toBeVisible();
    await player2Page.locator('[data-testid^="hex-highlight-"]').first().click();
    await player2Page.waitForTimeout(500);

    // Verify player 1 sees Tinkerer's movement
    const tinkererSprite = page.locator('[data-testid="character-sprite-Tinkerer"]');
    const tinkererBounds = await tinkererSprite.boundingBox();
    const player2TinkererBounds = await player2TinkererSprite.boundingBox();
    expect(Math.abs(tinkererBounds!.x - player2TinkererBounds!.x)).toBeLessThan(5);
  });
});
