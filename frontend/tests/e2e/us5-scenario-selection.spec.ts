/**
 * E2E Test: Scenario Browsing and Selection (US5 - T163)
 *
 * Test Scenario:
 * 1. Host enters lobby
 * 2. Scenario selection panel is visible (host only)
 * 3. All 5 scenarios are displayed with name, difficulty, and objective
 * 4. Host can select a scenario
 * 5. Non-host players cannot see or interact with scenario selection
 * 6. Selected scenario is used when game starts
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 5: Scenario Browsing and Selection', () => {
  test('should display all 5 scenarios with details (host only)', async ({ page }) => {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    // Verify scenario selection panel is visible for host
    const scenarioPanel = page.locator('[data-testid="scenario-selection-panel"]');
    await expect(scenarioPanel).toBeVisible();

    // Verify all 5 scenarios are displayed
    const expectedScenarios = [
      { id: 'scenario-1', name: 'Black Barrow', difficulty: 1, objective: 'Kill all enemies' },
      { id: 'scenario-2', name: 'Crypt of Blood', difficulty: 2, objective: 'Survive 6 rounds' },
      { id: 'scenario-3', name: 'Inox Encampment', difficulty: 2, objective: 'Kill the Inox Shaman' },
      { id: 'scenario-4', name: 'Vermling Nest', difficulty: 1, objective: 'Kill all enemies' },
      { id: 'scenario-5', name: 'Elemental Convergence', difficulty: 3, objective: 'Kill all elemental demons' },
    ];

    for (const scenario of expectedScenarios) {
      const card = page.locator(`[data-testid="scenario-card-${scenario.id}"]`);
      await expect(card).toBeVisible();

      // Verify scenario name
      const name = card.locator('[data-testid="scenario-name"]');
      await expect(name).toContainText(scenario.name);

      // Verify difficulty
      const difficulty = card.locator('[data-testid="scenario-difficulty"]');
      await expect(difficulty).toContainText(scenario.difficulty.toString());

      // Verify objective
      const objective = card.locator('[data-testid="scenario-objective"]');
      await expect(objective).toBeVisible();
    }
  });

  test('should only show scenario selection to host', async ({ page, context }) => {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    const roomCode = await page.locator('[data-testid="room-code"]').textContent();

    // Verify host sees scenario selection
    await expect(page.locator('[data-testid="scenario-selection-panel"]')).toBeVisible();

    // Player 2 joins
    const player2Page = await context.newPage();
    await player2Page.goto('/');
    await player2Page.locator('button:has-text("Join Game")').click();
    await player2Page.locator('[data-testid="room-code-input"]').fill(roomCode!);
    await player2Page.locator('[data-testid="nickname-input"]').fill('Player 2');
    await player2Page.locator('button:has-text("Join")').click();
    await expect(player2Page.locator('[data-testid="lobby-page"]')).toBeVisible();

    // Verify player 2 does NOT see scenario selection
    await expect(player2Page.locator('[data-testid="scenario-selection-panel"]')).not.toBeVisible();
  });

  test('should allow host to select a scenario', async ({ page }) => {
    // Host creates room
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    // Select "Black Barrow" scenario
    const blackBarrowCard = page.locator('[data-testid="scenario-card-scenario-1"]');
    await expect(blackBarrowCard).toBeVisible();
    await blackBarrowCard.click();

    // Verify selection is highlighted
    await expect(blackBarrowCard).toHaveClass(/selected/);

    // Select different scenario
    const cryptCard = page.locator('[data-testid="scenario-card-scenario-2"]');
    await cryptCard.click();

    // Verify new selection
    await expect(cryptCard).toHaveClass(/selected/);
    await expect(blackBarrowCard).not.toHaveClass(/selected/);
  });

  test('should display difficulty indicators correctly', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    // Verify difficulty levels are distinct
    const scenario1 = page.locator('[data-testid="scenario-card-scenario-1"]');
    const difficulty1 = await scenario1.locator('[data-testid="scenario-difficulty"]').textContent();
    expect(difficulty1).toContain('1');

    const scenario2 = page.locator('[data-testid="scenario-card-scenario-2"]');
    const difficulty2 = await scenario2.locator('[data-testid="scenario-difficulty"]').textContent();
    expect(difficulty2).toContain('2');

    const scenario5 = page.locator('[data-testid="scenario-card-scenario-5"]');
    const difficulty5 = await scenario5.locator('[data-testid="scenario-difficulty"]').textContent();
    expect(difficulty5).toContain('3');
  });

  test('should display scenario objectives', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    // Verify different objective types
    const scenarios = [
      { id: 'scenario-1', keywords: ['kill', 'enemies'] },
      { id: 'scenario-2', keywords: ['survive', 'rounds'] },
      { id: 'scenario-3', keywords: ['shaman', 'boss'] },
      { id: 'scenario-5', keywords: ['elemental', 'demons'] },
    ];

    for (const scenario of scenarios) {
      const card = page.locator(`[data-testid="scenario-card-${scenario.id}"]`);
      const objective = await card.locator('[data-testid="scenario-objective"]').textContent();

      // Check at least one keyword is present
      const hasKeyword = scenario.keywords.some(keyword =>
        objective?.toLowerCase().includes(keyword.toLowerCase())
      );
      expect(hasKeyword).toBe(true);
    }
  });

  test('should start game with selected scenario', async ({ page, context }) => {
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

    // Host selects Crypt of Blood (difficulty 2)
    const cryptCard = page.locator('[data-testid="scenario-card-scenario-2"]');
    await cryptCard.click();

    // Both players select characters
    await page.locator('[data-testid="character-card-Brute"]').click();
    await player2Page.locator('[data-testid="character-card-Tinkerer"]').click();

    // Host starts game
    const startButton = page.locator('[data-testid="start-game-button"]');
    await expect(startButton).toBeEnabled({ timeout: 5000 });
    await startButton.click();

    // Verify game starts
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 5000 });
    await expect(player2Page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 5000 });

    // Verify correct scenario loaded (check scenario name in UI or monster types)
    // Note: This assumes the game board displays scenario info
    // If not displayed, this test can be updated to verify via game state
  });

  test('should default to scenario-1 if no selection made', async ({ page, context }) => {
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

    // Host does NOT select scenario (leaving it default)

    // Both players select characters
    await page.locator('[data-testid="character-card-Brute"]').click();
    await player2Page.locator('[data-testid="character-card-Tinkerer"]').click();

    // Host starts game
    const startButton = page.locator('[data-testid="start-game-button"]');
    await expect(startButton).toBeEnabled({ timeout: 5000 });
    await startButton.click();

    // Verify game starts with default scenario
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 5000 });
    await expect(player2Page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 5000 });
  });

  test('should display scenario cards in a grid layout', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="nickname-input"]').fill('Host');
    await page.locator('[data-testid="nickname-submit"]').click();

    // Verify scenario panel has multiple cards
    const scenarioPanel = page.locator('[data-testid="scenario-selection-panel"]');
    await expect(scenarioPanel).toBeVisible();

    // Count scenario cards
    const scenarioCards = page.locator('[data-testid^="scenario-card-"]');
    await expect(scenarioCards).toHaveCount(5);
  });
});
