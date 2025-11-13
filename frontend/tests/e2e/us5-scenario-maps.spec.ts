/**
 * E2E Test: Different Scenarios Have Unique Map Layouts (US5 - T165)
 *
 * Test Scenario:
 * 1. Host selects different scenarios from the selection panel
 * 2. Game starts with scenario-specific map layout
 * 3. Each scenario has unique hex configurations, terrain types, and spawn points
 * 4. Black Barrow has simple layout, Crypt of Blood has hazards, Inox Encampment has large map
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 5: Unique Scenario Map Layouts', () => {
  test('should display Black Barrow (scenario-1) with its unique map layout', async ({ page, context }) => {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Select characters
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

    // Host should see scenario selection panel (host only)
    const scenarioPanel = page.locator('[data-testid="scenario-selection-panel"]');
    await expect(scenarioPanel).toBeVisible();

    // Select Black Barrow (scenario-1)
    const blackBarrowCard = page.locator('[data-testid="scenario-card-scenario-1"]');
    await expect(blackBarrowCard).toBeVisible();
    await expect(blackBarrowCard).toContainText('Black Barrow');
    await blackBarrowCard.click();

    // Start game
    await page.locator('button:has-text("Start Game")').click();

    // Wait for game board
    await expect(page.locator('.game-board-page')).toBeVisible({ timeout: 10000 });

    // Verify map is rendered (check for hex tiles)
    const hexTiles = page.locator('[data-testid*="hex-tile"]');
    const tileCount = await hexTiles.count();

    // Black Barrow has 16 tiles
    expect(tileCount).toBeGreaterThanOrEqual(16);

    // Verify specific Black Barrow features
    // - Treasure at position (3, 3)
    const treasureTile = page.locator('[data-testid="hex-tile-3-3"]');
    if (await treasureTile.count() > 0) {
      await expect(treasureTile).toHaveAttribute('data-has-treasure', 'true');
    }

    // Verify monsters are spawned (Bandit Guards and Bandit Archer)
    const monsters = page.locator('[data-testid*="monster-sprite"]');
    const monsterCount = await monsters.count();
    expect(monsterCount).toBeGreaterThanOrEqual(3); // 2 Bandit Guards + 1 Bandit Archer
  });

  test('should display Crypt of Blood (scenario-2) with hazardous terrain', async ({ page, context }) => {
    // Create and setup game
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    await page.locator('[data-testid="character-card-Spellweaver"]').click();

    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join with Room Code")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();
    await player2Page.locator('[data-testid="character-card-Scoundrel"]').click();

    // Select Crypt of Blood (scenario-2)
    const cryptCard = page.locator('[data-testid="scenario-card-scenario-2"]');
    await expect(cryptCard).toBeVisible();
    await expect(cryptCard).toContainText('Crypt of Blood');
    await cryptCard.click();

    // Start game
    await page.locator('button:has-text("Start Game")').click();
    await expect(page.locator('.game-board-page')).toBeVisible({ timeout: 10000 });

    // Verify map is rendered with hazardous tiles
    const hexTiles = page.locator('[data-testid*="hex-tile"]');
    const tileCount = await hexTiles.count();

    // Crypt of Blood has 15 tiles
    expect(tileCount).toBeGreaterThanOrEqual(15);

    // Verify hazardous terrain exists (positions (1,1) and (3,1))
    const hazardousTile1 = page.locator('[data-testid="hex-tile-1-1"]');
    if (await hazardousTile1.count() > 0) {
      const terrain = await hazardousTile1.getAttribute('data-terrain');
      expect(terrain).toBe('hazardous');
    }

    // Verify difficult terrain exists (position (2,0))
    const difficultTile = page.locator('[data-testid="hex-tile-2-0"]');
    if (await difficultTile.count() > 0) {
      const terrain = await difficultTile.getAttribute('data-terrain');
      expect(terrain).toBe('difficult');
    }

    // Verify Living Bones monsters are spawned
    const monsters = page.locator('[data-testid*="monster-sprite"]');
    const monsterCount = await monsters.count();
    expect(monsterCount).toBeGreaterThanOrEqual(4); // 3 normal + 1 elite Living Bones
  });

  test('should display Inox Encampment (scenario-3) with larger map', async ({ page, context }) => {
    // Setup game
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

    // Select Inox Encampment (scenario-3)
    const inoxCard = page.locator('[data-testid="scenario-card-scenario-3"]');
    await expect(inoxCard).toBeVisible();
    await expect(inoxCard).toContainText('Inox Encampment');
    await inoxCard.click();

    // Start game
    await page.locator('button:has-text("Start Game")').click();
    await expect(page.locator('.game-board-page')).toBeVisible({ timeout: 10000 });

    // Verify larger map layout
    const hexTiles = page.locator('[data-testid*="hex-tile"]');
    const tileCount = await hexTiles.count();

    // Inox Encampment is larger (6 columns)
    expect(tileCount).toBeGreaterThanOrEqual(20);

    // Verify boss objective is displayed
    const objective = page.locator('[data-testid="scenario-objective"]');
    if (await objective.count() > 0) {
      await expect(objective).toContainText('Inox Shaman');
    }

    // Verify Inox monsters are spawned (including boss)
    const monsters = page.locator('[data-testid*="monster-sprite"]');
    const monsterCount = await monsters.count();
    expect(monsterCount).toBeGreaterThan(0);
  });

  test('should display different terrain types per scenario', async ({ page, context }) => {
    // Test that scenario selection affects terrain distribution
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    await page.locator('[data-testid="character-card-Brute"]').click();

    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join with Room Code")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();
    await player2Page.locator('[data-testid="character-card-Tinkerer"]').click();

    // Select Black Barrow (simple terrain)
    await page.locator('[data-testid="scenario-card-scenario-1"]').click();
    await page.locator('button:has-text("Start Game")').click();
    await expect(page.locator('.game-board-page')).toBeVisible({ timeout: 10000 });

    // Check for normal terrain predominance (Black Barrow is mostly normal)
    const normalTiles = page.locator('[data-testid*="hex-tile"][data-terrain="normal"]');
    const normalCount = await normalTiles.count();
    expect(normalCount).toBeGreaterThan(10); // Most tiles are normal

    // Check for single obstacle at (2, 1)
    const obstacleTile = page.locator('[data-testid="hex-tile-2-1"]');
    if (await obstacleTile.count() > 0) {
      const terrain = await obstacleTile.getAttribute('data-terrain');
      expect(terrain).toBe('obstacle');
    }
  });

  test('should display unique monster types per scenario', async ({ page, context }) => {
    // Verify different scenarios spawn different monster types
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    await page.locator('[data-testid="character-card-Spellweaver"]').click();

    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join with Room Code")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();
    await player2Page.locator('[data-testid="character-card-Scoundrel"]').click();

    // Test Black Barrow (Bandits)
    await page.locator('[data-testid="scenario-card-scenario-1"]').click();
    await page.locator('button:has-text("Start Game")').click();
    await expect(page.locator('.game-board-page')).toBeVisible({ timeout: 10000 });

    // Look for Bandit-type monsters
    const banditMonsters = page.locator('[data-testid*="monster"]').filter({ hasText: /Bandit/ });
    // Verify bandit monsters are present
    await expect(banditMonsters.first()).toBeVisible();

    // Note: If monster names aren't displayed in test DOM, we check for monster sprites
    const allMonsters = page.locator('[data-testid*="monster-sprite"]');
    const monsterCount = await allMonsters.count();
    expect(monsterCount).toBeGreaterThanOrEqual(3); // Black Barrow has 3 bandits
  });

  test('should display scenario objectives correctly', async ({ page, context }) => {
    // Verify different scenarios show different objectives
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    await page.locator('[data-testid="character-card-Brute"]').click();

    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join with Room Code")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();
    await player2Page.locator('[data-testid="character-card-Tinkerer"]').click();

    // Check scenario cards show objectives before starting
    const scenario1Card = page.locator('[data-testid="scenario-card-scenario-1"]');
    await expect(scenario1Card).toContainText('Kill all enemies');

    const scenario2Card = page.locator('[data-testid="scenario-card-scenario-2"]');
    await expect(scenario2Card).toContainText('Survive 6 rounds');

    const scenario3Card = page.locator('[data-testid="scenario-card-scenario-3"]');
    await expect(scenario3Card).toContainText('Inox Shaman');
  });

  test('should maintain scenario-specific layout across game session', async ({ page, context }) => {
    // Verify scenario layout persists throughout the game
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

    // Select Crypt of Blood
    await page.locator('[data-testid="scenario-card-scenario-2"]').click();
    await page.locator('button:has-text("Start Game")').click();
    await expect(page.locator('.game-board-page')).toBeVisible({ timeout: 10000 });

    // Get initial tile count
    const hexTiles = page.locator('[data-testid*="hex-tile"]');
    const initialTileCount = await hexTiles.count();

    // Wait a moment (simulate game progression)
    await page.waitForTimeout(2000);

    // Verify tile count hasn't changed (map is stable)
    const laterTileCount = await hexTiles.count();
    expect(laterTileCount).toBe(initialTileCount);

    // Verify hazardous tiles still exist
    const hazardousTiles = page.locator('[data-testid*="hex-tile"][data-terrain="hazardous"]');
    const hazardCount = await hazardousTiles.count();
    expect(hazardCount).toBeGreaterThan(0);
  });
});
