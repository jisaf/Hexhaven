/**
 * E2E Test: Character Selection with Descriptions (US5 - T162)
 *
 * Test Scenario:
 * 1. Player enters lobby
 * 2. Character cards display class name, description, health, and hand size
 * 3. All 6 character classes are visible with full details
 * 4. Character descriptions help players make informed choices
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 5: Character Selection with Descriptions', () => {
  test('should display character descriptions and stats on cards', async ({ page }) => {
    // Create game and enter lobby
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('TestPlayer');
    await page.locator('[data-testid="nickname-submit"]').click();

    // Verify character select grid is visible
    const characterSelect = page.locator('[data-testid="character-select"]');
    await expect(characterSelect).toBeVisible();

    // Test Brute card - tanky melee fighter
    const bruteCard = page.locator('[data-testid="character-card-Brute"]');
    await expect(bruteCard).toBeVisible();

    // Verify Brute has description
    const bruteDescription = bruteCard.locator('[data-testid="character-description"]');
    await expect(bruteDescription).toContainText('tanky melee fighter');

    // Verify Brute stats
    const bruteHealth = bruteCard.locator('[data-testid="character-health"]');
    await expect(bruteHealth).toContainText('10');

    const bruteHandSize = bruteCard.locator('[data-testid="character-hand-size"]');
    await expect(bruteHandSize).toContainText('10');

    // Test Spellweaver card - ranged mage
    const spellweaverCard = page.locator('[data-testid="character-card-Spellweaver"]');
    await expect(spellweaverCard).toBeVisible();

    const spellweaverDescription = spellweaverCard.locator('[data-testid="character-description"]');
    await expect(spellweaverDescription).toContainText('mage');
    await expect(spellweaverDescription).toContainText('elemental');

    // Verify Spellweaver stats (low health, small hand)
    const spellweaverHealth = spellweaverCard.locator('[data-testid="character-health"]');
    await expect(spellweaverHealth).toContainText('6');

    const spellweaverHandSize = spellweaverCard.locator('[data-testid="character-hand-size"]');
    await expect(spellweaverHandSize).toContainText('8');

    // Test Tinkerer card - support specialist
    const tinkererCard = page.locator('[data-testid="character-card-Tinkerer"]');
    await expect(tinkererCard).toBeVisible();

    const tinkererDescription = tinkererCard.locator('[data-testid="character-description"]');
    await expect(tinkererDescription).toContainText('support');
    await expect(tinkererDescription).toContainText('heal');

    // Verify Tinkerer stats (large hand size)
    const tinkererHandSize = tinkererCard.locator('[data-testid="character-hand-size"]');
    await expect(tinkererHandSize).toContainText('12');
  });

  test('should display all 6 characters with unique descriptions', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('TestPlayer');
    await page.locator('[data-testid="nickname-submit"]').click();

    // Expected character classes with their key description terms
    const expectedCharacters = [
      { class: 'Brute', keywords: ['tanky', 'melee'] },
      { class: 'Tinkerer', keywords: ['support', 'heal'] },
      { class: 'Spellweaver', keywords: ['mage', 'elemental'] },
      { class: 'Scoundrel', keywords: ['agile', 'rogue'] },
      { class: 'Cragheart', keywords: ['versatile', 'earth'] },
      { class: 'Mindthief', keywords: ['psionic', 'assassin'] },
    ];

    for (const character of expectedCharacters) {
      const card = page.locator(`[data-testid="character-card-${character.class}"]`);
      await expect(card).toBeVisible();

      // Verify description exists and contains key terms
      const description = card.locator('[data-testid="character-description"]');
      await expect(description).toBeVisible();

      // At least one keyword should be present
      const text = await description.textContent();
      const hasKeyword = character.keywords.some(keyword =>
        text?.toLowerCase().includes(keyword.toLowerCase())
      );
      expect(hasKeyword).toBe(true);

      // Verify stats are present
      await expect(card.locator('[data-testid="character-health"]')).toBeVisible();
      await expect(card.locator('[data-testid="character-hand-size"]')).toBeVisible();
    }
  });

  test('should help players distinguish character roles through descriptions', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('TestPlayer');
    await page.locator('[data-testid="nickname-submit"]').click();

    // Verify role-specific keywords are present

    // Tank role (Brute, Cragheart)
    const bruteCard = page.locator('[data-testid="character-card-Brute"]');
    const bruteDesc = await bruteCard.locator('[data-testid="character-description"]').textContent();
    expect(bruteDesc?.toLowerCase()).toMatch(/tank|damage|heavy|absorb/);

    // Support role (Tinkerer)
    const tinkererCard = page.locator('[data-testid="character-card-Tinkerer"]');
    const tinkererDesc = await tinkererCard.locator('[data-testid="character-description"]').textContent();
    expect(tinkererDesc?.toLowerCase()).toMatch(/support|heal|summon/);

    // DPS/Range role (Spellweaver, Scoundrel)
    const spellweaverCard = page.locator('[data-testid="character-card-Spellweaver"]');
    const spellweaverDesc = await spellweaverCard.locator('[data-testid="character-description"]').textContent();
    expect(spellweaverDesc?.toLowerCase()).toMatch(/mage|elemental|range|devastate/);

    const scoundrelCard = page.locator('[data-testid="character-card-Scoundrel"]');
    const scoundrelDesc = await scoundrelCard.locator('[data-testid="character-description"]').textContent();
    expect(scoundrelDesc?.toLowerCase()).toMatch(/agile|rogue|strike|advantage/);
  });

  test('should display health and hand size stats correctly', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('TestPlayer');
    await page.locator('[data-testid="nickname-submit"]').click();

    // Verify stats match character data
    const characterStats = [
      { class: 'Brute', health: 10, handSize: 10 },
      { class: 'Tinkerer', health: 8, handSize: 12 },
      { class: 'Spellweaver', health: 6, handSize: 8 },
      { class: 'Scoundrel', health: 8, handSize: 9 },
      { class: 'Cragheart', health: 10, handSize: 11 },
      { class: 'Mindthief', health: 6, handSize: 10 },
    ];

    for (const stats of characterStats) {
      const card = page.locator(`[data-testid="character-card-${stats.class}"]`);

      const health = await card.locator('[data-testid="character-health"]').textContent();
      expect(health).toContain(stats.health.toString());

      const handSize = await card.locator('[data-testid="character-hand-size"]').textContent();
      expect(handSize).toContain(stats.handSize.toString());
    }
  });

  test('should maintain descriptions when character is selected', async ({ page, context }) => {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join Game")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player 2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Host selects Brute
    const bruteCard = page.locator('[data-testid="character-card-Brute"]');
    await bruteCard.click();

    // Verify description still visible after selection
    const bruteDescription = bruteCard.locator('[data-testid="character-description"]');
    await expect(bruteDescription).toBeVisible();
    await expect(bruteDescription).toContainText('tanky');

    // Verify Player 2 still sees descriptions for available characters
    const player2TinkererCard = player2Page.locator('[data-testid="character-card-Tinkerer"]');
    const player2TinkererDesc = player2TinkererCard.locator('[data-testid="character-description"]');
    await expect(player2TinkererDesc).toBeVisible();
    await expect(player2TinkererDesc).toContainText('support');
  });
});
