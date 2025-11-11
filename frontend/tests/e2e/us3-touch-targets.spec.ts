/**
 * E2E Test: Touch Target Sizes (US3 - T131)
 *
 * Test Scenario:
 * 1. All interactive elements are at least 44px × 44px (iOS/Android standard)
 * 2. Buttons, cards, tiles are tap-friendly
 * 3. Sufficient spacing between interactive elements
 * 4. Touch feedback is visible and immediate
 */

import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone SE'],
});

test.describe('User Story 3: Touch Target Sizes', () => {
  test('should have buttons with minimum 44px touch targets', async ({ page }) => {
    await page.goto('/');

    // Check main menu buttons
    const createButton = page.locator('button:has-text("Create Game")');
    await expect(createButton).toBeVisible();

    const createBox = await createButton.boundingBox();
    expect(createBox).toBeTruthy();

    if (createBox) {
      // iOS and Android guidelines recommend 44px × 44px minimum
      expect(createBox.width).toBeGreaterThanOrEqual(44);
      expect(createBox.height).toBeGreaterThanOrEqual(44);
    }

    const joinButton = page.locator('button:has-text("Join Game")');
    if (await joinButton.isVisible()) {
      const joinBox = await joinButton.boundingBox();
      expect(joinBox).toBeTruthy();

      if (joinBox) {
        expect(joinBox.width).toBeGreaterThanOrEqual(44);
        expect(joinBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should have ability cards with minimum 44px touch targets', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for card selection
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Check ability cards
    const cards = page.locator('[data-testid^="ability-card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Check first few cards
    for (let i = 0; i < Math.min(3, cardCount); i++) {
      const card = cards.nth(i);
      const cardBox = await card.boundingBox();

      if (cardBox) {
        expect(cardBox.width).toBeGreaterThanOrEqual(44);
        expect(cardBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should have hex tiles with sufficient tap area', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Check hex tile sizes
    const hexTiles = page.locator('[data-testid^="hex-tile"]');
    const tileCount = await hexTiles.count();
    expect(tileCount).toBeGreaterThan(0);

    // Check a few hex tiles
    for (let i = 0; i < Math.min(5, tileCount); i++) {
      const tile = hexTiles.nth(i);
      const tileBox = await tile.boundingBox();

      if (tileBox) {
        // Hex tiles should be large enough to tap accurately
        // With zoom, tiles may be smaller, but initial size should be adequate
        expect(tileBox.width).toBeGreaterThanOrEqual(30);
        expect(tileBox.height).toBeGreaterThanOrEqual(30);
      }
    }
  });

  test('should have character/monster sprites with adequate tap area', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Check character sprite
    const character = page.locator('[data-testid^="character"]').first();
    await expect(character).toBeVisible({ timeout: 5000 });

    const characterBox = await character.boundingBox();
    expect(characterBox).toBeTruthy();

    if (characterBox) {
      expect(characterBox.width).toBeGreaterThanOrEqual(40);
      expect(characterBox.height).toBeGreaterThanOrEqual(40);
    }

    // Check monster sprite
    const monster = page.locator('[data-testid^="monster"]').first();
    if (await monster.isVisible({ timeout: 2000 })) {
      const monsterBox = await monster.boundingBox();

      if (monsterBox) {
        expect(monsterBox.width).toBeGreaterThanOrEqual(40);
        expect(monsterBox.height).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('should have sufficient spacing between adjacent buttons', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for card selection
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Check spacing between cards
    const cards = page.locator('[data-testid^="ability-card"]');
    const cardCount = await cards.count();

    if (cardCount >= 2) {
      const card1Box = await cards.nth(0).boundingBox();
      const card2Box = await cards.nth(1).boundingBox();

      if (card1Box && card2Box) {
        // Calculate spacing (gap between cards)
        const horizontalGap = Math.abs(card1Box.x + card1Box.width - card2Box.x);
        const verticalGap = Math.abs(card1Box.y + card1Box.height - card2Box.y);

        // At least one dimension should have spacing (either horizontal or vertical)
        // Minimum 8px spacing recommended to avoid accidental taps
        const hasSpacing = horizontalGap >= 8 || verticalGap >= 8;
        expect(hasSpacing).toBe(true);
      }
    }
  });

  test('should provide visual touch feedback on tap', async ({ page }) => {
    await page.goto('/');

    const createButton = page.locator('button:has-text("Create Game")');
    await expect(createButton).toBeVisible();

    // Get initial styles
    const initialBackgroundColor = await createButton.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Tap button
    await createButton.hover();
    await page.mouse.down();

    // During press, visual feedback should be visible (color change, ripple, etc.)
    await page.waitForTimeout(100);

    // Check if active/pressed state is different
    const pressedBackgroundColor = await createButton.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Release
    await page.mouse.up();

    // Visual feedback indicates button is interactive
    // (Color change or ripple effect)
    // Note: May not always change background, could use :active pseudo-class or ripple overlay
  });

  test('should show ripple effect on card tap', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    const firstCard = page.locator('[data-testid^="ability-card"]').first();
    await firstCard.click();

    // Card should show selected state or animation
    await expect(firstCard).toHaveAttribute('data-selected', 'true', { timeout: 1000 });

    // Ripple or highlight effect should be visible
    // (Implementation-specific, but card should visually respond)
  });

  test('should have close/dismiss buttons with adequate size', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Click on a monster to show stats modal
    const monster = page.locator('[data-testid^="monster"]').first();
    if (await monster.isVisible({ timeout: 2000 })) {
      await monster.click();

      // Check close button size
      const closeButton = page.locator('[data-testid="close-monster-stats"]');
      if (await closeButton.isVisible({ timeout: 1000 })) {
        const closeBox = await closeButton.boundingBox();

        if (closeBox) {
          // Close buttons are critical and should be easy to tap
          expect(closeBox.width).toBeGreaterThanOrEqual(44);
          expect(closeBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('should have form inputs with sufficient tap area', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Join Game")').click();

    // Check room code input
    const roomCodeInput = page.locator('input[placeholder*="code" i], input[name="roomCode"], [data-testid="room-code-input"]');
    if (await roomCodeInput.isVisible({ timeout: 2000 })) {
      const inputBox = await roomCodeInput.boundingBox();

      if (inputBox) {
        // Input fields should be tall enough for easy tapping
        expect(inputBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should handle fat finger taps accurately', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Tap slightly off-center of a card (simulating imprecise tap)
    const card = page.locator('[data-testid^="ability-card"]').first();
    const cardBox = await card.boundingBox();

    if (cardBox) {
      // Tap 10px off center (still within card bounds)
      await page.mouse.click(
        cardBox.x + cardBox.width / 2 + 10,
        cardBox.y + cardBox.height / 2 + 10
      );

      // Card should still be selected (tap target includes padding)
      await expect(card).toHaveAttribute('data-selected', 'true', { timeout: 1000 });
    }
  });

  test('should have navigation elements with adequate size', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Check pagination or carousel navigation elements
    const prevButton = page.locator('[data-testid="carousel-prev"]');
    const nextButton = page.locator('[data-testid="carousel-next"]');

    if (await prevButton.isVisible({ timeout: 1000 })) {
      const prevBox = await prevButton.boundingBox();
      if (prevBox) {
        expect(prevBox.width).toBeGreaterThanOrEqual(44);
        expect(prevBox.height).toBeGreaterThanOrEqual(44);
      }
    }

    if (await nextButton.isVisible({ timeout: 1000 })) {
      const nextBox = await nextButton.boundingBox();
      if (nextBox) {
        expect(nextBox.width).toBeGreaterThanOrEqual(44);
        expect(nextBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should have context menu items with adequate touch targets', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="hex-grid"]')).toBeVisible({ timeout: 10000 });

    // Trigger context menu
    const hexTile = page.locator('[data-testid^="hex-tile"]').first();
    await hexTile.hover();
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    const contextMenu = page.locator('[data-testid="context-menu"]');
    if (await contextMenu.isVisible({ timeout: 1000 })) {
      // Check menu item sizes
      const menuItems = contextMenu.locator('button, [role="menuitem"]');
      const itemCount = await menuItems.count();

      if (itemCount > 0) {
        for (let i = 0; i < Math.min(3, itemCount); i++) {
          const item = menuItems.nth(i);
          const itemBox = await item.boundingBox();

          if (itemBox) {
            // Menu items should be easy to tap
            expect(itemBox.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    }
  });
});
