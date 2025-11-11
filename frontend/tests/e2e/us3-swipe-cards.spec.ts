/**
 * E2E Test: Card Carousel Swipe Gesture (US3 - T129)
 *
 * Test Scenario:
 * 1. Player views ability cards in hand
 * 2. Player swipes left/right to navigate cards
 * 3. Cards scroll smoothly with swipe
 * 4. Swipe snaps to card boundaries
 * 5. Selected cards are highlighted
 */

import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone SE'],
});

test.describe('User Story 3: Card Carousel Swipe Gesture', () => {
  test('should display ability cards in swipeable carousel', async ({ page }) => {
    // Setup game
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for card selection phase
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Verify carousel is present
    const carousel = page.locator('[data-testid="card-carousel"]');
    await expect(carousel).toBeVisible();

    // Verify multiple cards are present
    const cards = page.locator('[data-testid^="ability-card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(1);
  });

  test('should swipe right to view next cards', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    const carousel = page.locator('[data-testid="card-carousel"]');
    const carouselBox = await carousel.boundingBox();
    expect(carouselBox).toBeTruthy();

    if (carouselBox) {
      // Get first visible card ID
      const firstCard = carousel.locator('[data-testid^="ability-card"]').first();
      const firstCardId = await firstCard.getAttribute('data-testid');

      // Swipe left (to show cards on the right)
      const centerX = carouselBox.x + carouselBox.width / 2;
      const centerY = carouselBox.y + carouselBox.height / 2;

      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX - 150, centerY, { steps: 10 });
      await page.mouse.up();

      await page.waitForTimeout(500);

      // Verify a different card is now first visible
      const newFirstCard = carousel.locator('[data-testid^="ability-card"]').first();
      const newFirstCardId = await newFirstCard.getAttribute('data-testid');

      expect(newFirstCardId).not.toBe(firstCardId);
    }
  });

  test('should swipe left to view previous cards', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    const carousel = page.locator('[data-testid="card-carousel"]');
    const carouselBox = await carousel.boundingBox();
    expect(carouselBox).toBeTruthy();

    if (carouselBox) {
      const centerX = carouselBox.x + carouselBox.width / 2;
      const centerY = carouselBox.y + carouselBox.height / 2;

      // First swipe left to move carousel right
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX - 150, centerY, { steps: 10 });
      await page.mouse.up();

      await page.waitForTimeout(500);

      const middleCardId = await carousel.locator('[data-testid^="ability-card"]').first().getAttribute('data-testid');

      // Now swipe right (back to the left)
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 150, centerY, { steps: 10 });
      await page.mouse.up();

      await page.waitForTimeout(500);

      const backCardId = await carousel.locator('[data-testid^="ability-card"]').first().getAttribute('data-testid');

      // Should be back to earlier cards
      expect(backCardId).not.toBe(middleCardId);
    }
  });

  test('should snap carousel to card boundaries', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    const carousel = page.locator('[data-testid="card-carousel"]');
    const carouselBox = await carousel.boundingBox();
    expect(carouselBox).toBeTruthy();

    if (carouselBox) {
      const centerX = carouselBox.x + carouselBox.width / 2;
      const centerY = carouselBox.y + carouselBox.height / 2;

      // Perform partial swipe (not enough to move to next card)
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX - 50, centerY, { steps: 5 });
      await page.mouse.up();

      // Wait for snap animation
      await page.waitForTimeout(500);

      // Carousel should snap back to original position (or to next card)
      // Card should be fully visible, not partially cut off
      const firstCard = carousel.locator('[data-testid^="ability-card"]').first();
      const cardBox = await firstCard.boundingBox();

      if (cardBox && carouselBox) {
        // Card should be aligned with carousel (not offset mid-way)
        // Allow small margin for rounding
        const alignmentOffset = Math.abs(cardBox.x - carouselBox.x);
        expect(alignmentOffset).toBeLessThan(5);
      }
    }
  });

  test('should select card on tap', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Tap a card to select it
    const firstCard = page.locator('[data-testid^="ability-card"]').first();
    await firstCard.click();

    // Card should be highlighted/selected
    await expect(firstCard).toHaveAttribute('data-selected', 'true', { timeout: 1000 });
    await expect(firstCard).toHaveClass(/selected|highlighted/);
  });

  test('should not select card on swipe gesture', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    const carousel = page.locator('[data-testid="card-carousel"]');
    const firstCard = carousel.locator('[data-testid^="ability-card"]').first();
    const cardBox = await firstCard.boundingBox();
    expect(cardBox).toBeTruthy();

    if (cardBox) {
      // Perform swipe starting on a card
      const cardCenterX = cardBox.x + cardBox.width / 2;
      const cardCenterY = cardBox.y + cardBox.height / 2;

      await page.mouse.move(cardCenterX, cardCenterY);
      await page.mouse.down();
      await page.mouse.move(cardCenterX - 100, cardCenterY, { steps: 10 });
      await page.mouse.up();

      await page.waitForTimeout(300);

      // Card should NOT be selected (swipe should only scroll)
      const isSelected = await firstCard.getAttribute('data-selected');
      expect(isSelected).not.toBe('true');
    }
  });

  test('should allow selecting multiple cards', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Select first card
    const cards = page.locator('[data-testid^="ability-card"]');
    const firstCard = cards.nth(0);
    await firstCard.click();

    await expect(firstCard).toHaveAttribute('data-selected', 'true', { timeout: 1000 });

    // Select second card
    const secondCard = cards.nth(1);
    await secondCard.click();

    await expect(secondCard).toHaveAttribute('data-selected', 'true', { timeout: 1000 });

    // Both cards should be selected
    const selectedCards = page.locator('[data-testid^="ability-card"][data-selected="true"]');
    const selectedCount = await selectedCards.count();
    expect(selectedCount).toBe(2);
  });

  test('should show visual feedback during swipe', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    const carousel = page.locator('[data-testid="card-carousel"]');
    const carouselBox = await carousel.boundingBox();
    expect(carouselBox).toBeTruthy();

    if (carouselBox) {
      const centerX = carouselBox.x + carouselBox.width / 2;
      const centerY = carouselBox.y + carouselBox.height / 2;

      const initialTransform = await carousel.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      // Start swipe
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();

      // During swipe, carousel should move with finger
      await page.mouse.move(centerX - 50, centerY, { steps: 5 });

      const duringSwipeTransform = await carousel.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      // Transform should update during swipe
      expect(duringSwipeTransform).not.toBe(initialTransform);

      await page.mouse.up();
    }
  });

  test('should show pagination dots or indicators', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Check for carousel pagination indicators
    const paginationDots = page.locator('[data-testid="carousel-pagination"]');
    if (await paginationDots.isVisible({ timeout: 1000 })) {
      // Should have multiple dots for multiple pages
      const dots = paginationDots.locator('[data-testid^="pagination-dot"]');
      const dotCount = await dots.count();
      expect(dotCount).toBeGreaterThanOrEqual(1);

      // First dot should be active/highlighted
      const activeDot = paginationDots.locator('[data-testid^="pagination-dot"][data-active="true"]');
      await expect(activeDot).toBeVisible();
    }
  });

  test('should support momentum scrolling', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    const carousel = page.locator('[data-testid="card-carousel"]');
    const carouselBox = await carousel.boundingBox();
    expect(carouselBox).toBeTruthy();

    if (carouselBox) {
      const centerX = carouselBox.x + carouselBox.width / 2;
      const centerY = carouselBox.y + carouselBox.height / 2;

      // Perform fast swipe
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX - 200, centerY, { steps: 3 }); // Fast movement
      await page.mouse.up();

      // Capture position immediately after release
      await page.waitForTimeout(50);
      const positionAfterRelease = await carousel.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      // Wait for momentum to complete
      await page.waitForTimeout(1000);

      const positionAfterMomentum = await carousel.evaluate((el) =>
        window.getComputedStyle(el).transform
      );

      // Position should have changed due to momentum
      expect(positionAfterMomentum).not.toBe(positionAfterRelease);
    }
  });
});
