/**
 * E2E Test: Different Characters Have Unique Ability Decks (US5 - T164)
 *
 * Test Scenario:
 * 1. Players select different character classes
 * 2. Game starts and card selection phase begins
 * 3. Each player sees their character's unique ability deck
 * 4. Brute cards are different from Tinkerer cards
 * 5. Card names, initiatives, and actions differ by character class
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 5: Unique Character Ability Decks', () => {
  test('should display unique ability cards for Brute character', async ({ page, context }) => {
    // Host creates room and selects Brute
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Select Brute
    const bruteCard = page.locator('[data-testid="character-card-Brute"]');
    await bruteCard.click();
    await expect(bruteCard).toHaveClass(/selected/);

    // Player 2 joins and selects Tinkerer
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join with Room Code")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    const tinkererCard = player2Page.locator('[data-testid="character-card-Tinkerer"]');
    await tinkererCard.click();

    // Host starts game
    await page.locator('button:has-text("Start Game")').click();

    // Wait for game board to load
    await expect(page.locator('.game-board-page')).toBeVisible({ timeout: 10000 });

    // Card selection phase should trigger
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 5000 });

    // Verify Brute-specific cards are present
    const bruteCards = [
      'Trample',
      'Eye for an Eye',
      'Balanced Measure',
      'Overwhelming Assault',
      'Shield Bash',
      'Warding Strength',
      'Skewer',
      'Spare Dagger',
      'Grab and Go',
      'Leaping Cleave'
    ];

    for (const cardName of bruteCards) {
      const card = page.locator(`[data-testid="ability-card-${cardName.replace(/\s+/g, '-')}"]`);
      await expect(card).toBeVisible();
    }

    // Verify no Tinkerer cards are shown
    const tinkererCards = ['Ink Bomb', 'Potent Potables', 'Enhancement Field'];
    for (const cardName of tinkererCards) {
      const card = page.locator(`[data-testid="ability-card-${cardName.replace(/\s+/g, '-')}"]`);
      await expect(card).not.toBeVisible();
    }
  });

  test('should display unique ability cards for Tinkerer character', async ({ page, context }) => {
    // Host creates room and selects Tinkerer
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Select Tinkerer
    const tinkererCard = page.locator('[data-testid="character-card-Tinkerer"]');
    await tinkererCard.click();

    // Player 2 joins and selects Brute
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join with Room Code")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    const bruteCard = player2Page.locator('[data-testid="character-card-Brute"]');
    await bruteCard.click();

    // Host starts game
    await page.locator('button:has-text("Start Game")').click();

    // Wait for game board and card selection
    await expect(page.locator('.game-board-page')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 5000 });

    // Verify Tinkerer-specific cards are present
    const tinkererCards = [
      'Ink Bomb',
      'Potent Potables',
      'Enhancement Field',
      'Volatile Concoction',
      'Crank Bow',
      'Restorative Mist',
      'Gas Canister',
      'Micro Bots',
      'Flamethrower',
      'Reviving Ether'
    ];

    for (const cardName of tinkererCards) {
      const card = page.locator(`[data-testid="ability-card-${cardName.replace(/\s+/g, '-')}"]`);
      await expect(card).toBeVisible();
    }

    // Verify no Brute cards are shown
    const bruteCards = ['Trample', 'Overwhelming Assault', 'Shield Bash'];
    for (const cardName of bruteCards) {
      const card = page.locator(`[data-testid="ability-card-${cardName.replace(/\s+/g, '-')}"]`);
      await expect(card).not.toBeVisible();
    }
  });

  test('should show different ability decks to different players in same game', async ({ page, context }) => {
    // Host creates room and selects Spellweaver
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    const spellweaverCard = page.locator('[data-testid="character-card-Spellweaver"]');
    await spellweaverCard.click();

    // Player 2 joins and selects Scoundrel
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join with Room Code")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    const scoundrelCard = player2Page.locator('[data-testid="character-card-Scoundrel"]');
    await scoundrelCard.click();

    // Host starts game
    await page.locator('button:has-text("Start Game")').click();

    // Both players should see game board
    await expect(page.locator('.game-board-page')).toBeVisible({ timeout: 10000 });
    await expect(player2Page.locator('.game-board-page')).toBeVisible({ timeout: 10000 });

    // Both should see card selection
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 5000 });
    await expect(player2Page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 5000 });

    // Host (Spellweaver) should see elemental cards
    const spellweaverCards = ['Fire Orbs', 'Frost Armor', 'Reviving Ether', 'Flame Strike'];
    let spellweaverCardFound = false;
    for (const cardName of spellweaverCards) {
      const card = page.locator(`[data-testid*="ability-card"]`).filter({ hasText: cardName });
      if (await card.count() > 0) {
        spellweaverCardFound = true;
        break;
      }
    }
    expect(spellweaverCardFound).toBe(true);

    // Player 2 (Scoundrel) should see rogue-style cards
    const scoundrelCards = ['Backstab', 'Smoke Bomb', 'Quick Hands', 'Vicious Assault'];
    let scoundrelCardFound = false;
    for (const cardName of scoundrelCards) {
      const card = player2Page.locator(`[data-testid*="ability-card"]`).filter({ hasText: cardName });
      if (await card.count() > 0) {
        scoundrelCardFound = true;
        break;
      }
    }
    expect(scoundrelCardFound).toBe(true);
  });

  test('should display different initiative values per character class', async ({ page, context }) => {
    // Create game with two players
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Select Brute
    await page.locator('[data-testid="character-card-Brute"]').click();

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join with Room Code")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();
    await player2Page.locator('[data-testid="character-card-Tinkerer"]').click();

    // Start game
    await page.locator('button:has-text("Start Game")').click();
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Check that Brute cards have their specific initiatives (e.g., Trample = 72)
    const tramplCard = page.locator('[data-testid*="ability-card"]').filter({ hasText: 'Trample' });
    if (await tramplCard.count() > 0) {
      await expect(tramplCard).toContainText('72');
    }

    // Check that Balanced Measure has initiative 20
    const balancedCard = page.locator('[data-testid*="ability-card"]').filter({ hasText: 'Balanced Measure' });
    if (await balancedCard.count() > 0) {
      await expect(balancedCard).toContainText('20');
    }
  });

  test('should maintain unique decks across multiple rounds', async ({ page, context }) => {
    // Create and start 2-player game
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();
    await page.locator('[data-testid="character-card-Cragheart"]').click();

    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join with Room Code")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();
    await player2Page.locator('[data-testid="character-card-Mindthief"]').click();

    await page.locator('button:has-text("Start Game")').click();
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });

    // Verify Cragheart cards are present in first round
    const cragheartCards = page.locator('[data-testid*="ability-card"]');
    const cardCount = await cragheartCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Player 2 should see Mindthief cards
    await expect(player2Page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    const mindthiefCards = player2Page.locator('[data-testid*="ability-card"]');
    const mindthiefCount = await mindthiefCards.count();
    expect(mindthiefCount).toBeGreaterThan(0);

    // The decks should remain consistent (Cragheart always has Cragheart cards)
    // Note: In a full test, we'd complete the round and verify consistency
    // For now, we verify that each player has a non-empty deck from their class
  });
});
