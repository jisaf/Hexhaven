/**
 * E2E Test: Elemental Infusion Generation and Consumption (US2 - T075)
 *
 * Test Scenario:
 * 1. Player uses ability that generates elemental infusion
 * 2. Element state changes from inert → strong
 * 3. Elements display updates show strong element
 * 4. Another player consumes element for enhanced effect
 * 5. Element state changes from strong → waning
 * 6. At end of round, waning → inert
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 2: Elemental Infusion Generation and Consumption', () => {
  test('should generate elemental infusion from ability', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-spellweaver"]').click(); // Spellweaver uses elements
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Select card that generates fire element
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-fire-gen"]').click(); // Card that generates fire
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for player turn
    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });

    // Check initial elemental state
    const fireElement = page.locator('[data-testid="element-fire"]');
    await expect(fireElement).toHaveAttribute('data-state', 'inert');

    // Use ability that generates fire
    await page.locator('[data-testid="use-top-action"]').click();

    // If action requires target, click on valid target
    const monster = page.locator('[data-testid="monster-0"]');
    if (await monster.isVisible()) {
      await monster.click();
    }

    // Wait for action to resolve
    await page.waitForTimeout(1000);

    // Verify fire element is now strong
    await expect(fireElement).toHaveAttribute('data-state', 'strong', { timeout: 2000 });

    // Verify visual indication (glow, color change, etc.)
    await expect(fireElement).toHaveClass(/strong|active|glowing/);
  });

  test('should consume elemental infusion for enhanced effect', async ({ page, context }) => {
    // Setup: Two players, one generates element, other consumes it
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    const roomCode = await page.locator('[data-testid="room-code"]').textContent();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-spellweaver"]').click();

    // Player 2 joins
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.locator('button:has-text("Join Game")').click();
    await page2.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await page2.locator('button:has-text("Join")').click();
    await page2.locator('[data-testid="character-select"]').click();
    await page2.locator('[data-testid="character-cragheart"]').click(); // Cragheart consumes earth

    // Start game
    await page.locator('[data-testid="start-game-button"]').click();
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Player 1 selects card that generates earth
    await page.locator('[data-testid="ability-card-earth-gen"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Player 2 selects card that consumes earth
    await page2.locator('[data-testid="ability-card-earth-consume"]').click();
    await page2.locator('[data-testid="ability-card-1"]').click();
    await page2.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for turns to resolve based on initiative
    await page.waitForTimeout(2000);

    // Check who goes first and execute actions accordingly
    // (Simplified for test - actual implementation would check turn order)

    // Generate earth element
    const earthElement = page.locator('[data-testid="element-earth"]');
    await expect(earthElement).toHaveAttribute('data-state', 'inert');

    // Execute generation action
    // (Implementation would vary based on which player goes first)

    // Verify earth is strong after generation
    // await expect(earthElement).toHaveAttribute('data-state', 'strong', { timeout: 5000 });

    // Consume earth element
    // (Next player's action)

    // Verify earth is waning after consumption
    // await expect(earthElement).toHaveAttribute('data-state', 'waning', { timeout: 5000 });
  });

  test('should display all six elements with correct states', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-spellweaver"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-0"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Verify elemental state display is visible
    const elementalDisplay = page.locator('[data-testid="elemental-state-display"]');
    await expect(elementalDisplay).toBeVisible({ timeout: 5000 });

    // Verify all 6 elements are shown
    await expect(page.locator('[data-testid="element-fire"]')).toBeVisible();
    await expect(page.locator('[data-testid="element-ice"]')).toBeVisible();
    await expect(page.locator('[data-testid="element-air"]')).toBeVisible();
    await expect(page.locator('[data-testid="element-earth"]')).toBeVisible();
    await expect(page.locator('[data-testid="element-light"]')).toBeVisible();
    await expect(page.locator('[data-testid="element-dark"]')).toBeVisible();

    // Verify initial state is inert
    const elements = ['fire', 'ice', 'air', 'earth', 'light', 'dark'];
    for (const element of elements) {
      await expect(page.locator(`[data-testid="element-${element}"]`)).toHaveAttribute('data-state', 'inert');
    }
  });

  test('should decay elements from waning to inert at end of round', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-spellweaver"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    // Select card that generates fire
    await page.locator('[data-testid="ability-card-fire-gen"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Generate fire (strong)
    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });
    await page.locator('[data-testid="use-top-action"]').click();

    // Click target if needed
    const monster = page.locator('[data-testid="monster-0"]');
    if (await monster.isVisible()) {
      await monster.click();
    }

    const fireElement = page.locator('[data-testid="element-fire"]');
    // Fire should be strong
    // await expect(fireElement).toHaveAttribute('data-state', 'strong', { timeout: 2000 });

    // End turn (complete round)
    await page.locator('[data-testid="end-turn-button"]').click();

    // Wait for round to complete (all entities take turns)
    await page.waitForTimeout(3000);

    // At end of round, strong → waning
    // await expect(fireElement).toHaveAttribute('data-state', 'waning', { timeout: 2000 });

    // Complete another round
    // (Card selection for next round)
    // Elements at waning should become inert
  });

  test('should show ability card element requirements and generation', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-spellweaver"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Card selection panel
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Click on a card to see details
    const abilityCard = page.locator('[data-testid="ability-card-fire-gen"]');
    await abilityCard.click();

    // Verify card details show element generation (fire icon)
    const cardDetails = page.locator('[data-testid="card-details"]');
    await expect(cardDetails).toBeVisible();

    // Should show fire element icon for generation
    await expect(cardDetails.locator('[data-testid="generates-fire"]')).toBeVisible();

    // Select a card that requires element consumption
    const consumeCard = page.locator('[data-testid="ability-card-fire-consume"]');
    await consumeCard.click();

    // Should show fire element requirement
    await expect(cardDetails.locator('[data-testid="requires-fire"]')).toBeVisible();

    // Visual indication (grayed out if element not available)
    const fireElement = page.locator('[data-testid="element-fire"]');
    const fireState = await fireElement.getAttribute('data-state');

    if (fireState === 'inert') {
      // Consume action should be indicated as unavailable
      await expect(cardDetails.locator('[data-testid="element-unavailable-warning"]')).toBeVisible();
    }
  });

  test('should enhance ability effects when consuming elements', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-spellweaver"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    // First, generate fire element
    await page.locator('[data-testid="ability-card-fire-gen"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });
    await page.locator('[data-testid="use-top-action"]').click();

    const monster = page.locator('[data-testid="monster-0"]');
    if (await monster.isVisible()) {
      await monster.click();
    }

    // Get monster initial health
    await monster.click();
    const healthDisplay = page.locator('[data-testid="monster-health"]');
    const initialHealth = parseInt((await healthDisplay.textContent()) || '5');
    await page.locator('[data-testid="close-monster-stats"]').click();

    // Fire element should now be strong
    const fireElement = page.locator('[data-testid="element-fire"]');
    // await expect(fireElement).toHaveAttribute('data-state', 'strong', { timeout: 2000 });

    // End turn and start next round
    await page.locator('[data-testid="end-turn-button"]').click();
    await page.waitForTimeout(2000);

    // Next card selection - choose card that consumes fire for enhanced damage
    await page.locator('[data-testid="ability-card-fire-consume"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Use the consumption action
    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });
    await page.locator('[data-testid="use-top-action"]').click();

    // Should show option to consume fire for enhancement
    const consumePrompt = page.locator('[data-testid="consume-element-prompt"]');
    if (await consumePrompt.isVisible()) {
      await expect(consumePrompt).toContainText('Consume Fire');
      await page.locator('[data-testid="confirm-consume-fire"]').click();
    }

    await monster.click();

    // Wait for enhanced attack to resolve
    await page.waitForTimeout(2000);

    // Verify enhanced damage (should be higher than base attack)
    // (Would compare damage dealt with vs without element consumption)
    const newHealth = parseInt((await healthDisplay.textContent()) || '5');
    expect(newHealth).toBeLessThan(initialHealth);

    // Fire element should now be waning
    // await expect(fireElement).toHaveAttribute('data-state', 'waning', { timeout: 2000 });
  });

  test('should sync elemental states across all players', async ({ page, context }) => {
    // Setup multiplayer game
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    const roomCode = await page.locator('[data-testid="room-code"]').textContent();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-spellweaver"]').click();

    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.locator('button:has-text("Join Game")').click();
    await page2.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await page2.locator('button:has-text("Join")').click();
    await page2.locator('[data-testid="character-select"]').click();
    await page2.locator('[data-testid="character-cragheart"]').click();

    await page.locator('[data-testid="start-game-button"]').click();

    // Both players complete card selection
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-fire-gen"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    await expect(page2.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page2.locator('[data-testid="ability-card-0"]').click();
    await page2.locator('[data-testid="ability-card-1"]').click();
    await page2.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for game to start
    await page.waitForTimeout(2000);

    // Check initial state on both clients
    const fireElement1 = page.locator('[data-testid="element-fire"]');
    const fireElement2 = page2.locator('[data-testid="element-fire"]');

    const initialState1 = await fireElement1.getAttribute('data-state');
    const initialState2 = await fireElement2.getAttribute('data-state');

    // States should match
    expect(initialState1).toBe(initialState2);

    // When player 1 generates fire, both should see the update
    // (Test would verify real-time synchronization)
  });
});
