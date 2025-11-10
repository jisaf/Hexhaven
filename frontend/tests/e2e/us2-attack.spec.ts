/**
 * E2E Test: Attack Resolution with Modifier Deck (US2 - T074)
 *
 * Test Scenario:
 * 1. Player initiates an attack action
 * 2. Player selects target enemy
 * 3. Attack modifier deck card is drawn
 * 4. Damage is calculated (base + modifier + effects)
 * 5. Damage number animation is displayed
 * 6. Target health is updated
 * 7. Deck reshuffles on null/x2 cards
 */

import { test, expect } from '@playwright/test';

test.describe('User Story 2: Attack Resolution with Modifier Deck', () => {
  test('should execute attack with modifier deck draw', async ({ page }) => {
    // Setup game
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    // Select cards with attack action
    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click(); // Card with attack
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Wait for player turn
    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });

    // Get initial monster health
    const monster = page.locator('[data-testid="monster-0"]');
    await expect(monster).toBeVisible();
    await monster.click();

    const monsterHealthDisplay = page.locator('[data-testid="monster-health"]');
    const initialHealth = parseInt((await monsterHealthDisplay.textContent()) || '5');

    // Close monster stats
    await page.locator('[data-testid="close-monster-stats"]').click();

    // Select attack action from selected cards
    await page.locator('[data-testid="use-top-action"]').click();

    // Verify attack targeting mode is active
    await expect(page.locator('[data-testid="attack-targeting-mode"]')).toBeVisible();
    await expect(page.locator('text=Select target')).toBeVisible();

    // Click on monster to target
    await monster.click();

    // Verify attack resolution sequence:
    // 1. Modifier deck draw animation
    await expect(page.locator('[data-testid="modifier-card-draw"]')).toBeVisible({ timeout: 2000 });

    // 2. Modifier card is revealed
    const modifierCard = page.locator('[data-testid="modifier-card-revealed"]');
    await expect(modifierCard).toBeVisible({ timeout: 1000 });

    // 3. Damage calculation and animation
    await expect(page.locator('[data-testid="damage-number"]')).toBeVisible({ timeout: 1000 });

    // 4. Monster health decreases
    await page.waitForTimeout(500);
    monster.click();
    const newHealth = parseInt((await monsterHealthDisplay.textContent()) || '5');
    expect(newHealth).toBeLessThan(initialHealth);
  });

  test('should show different damage values based on modifier card', async ({ page }) => {
    // This test would need to manipulate the modifier deck state
    // or run multiple attacks to verify different modifiers produce different results

    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Execute attack
    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });
    await page.locator('[data-testid="use-top-action"]').click();
    await page.locator('[data-testid="monster-0"]').click();

    // Verify modifier card value is shown
    const modifierCard = page.locator('[data-testid="modifier-card-revealed"]');
    await expect(modifierCard).toBeVisible({ timeout: 2000 });

    // Modifier values: -2, -1, 0, +1, +2, x2, MISS, etc.
    const modifierValue = await modifierCard.textContent();
    expect(modifierValue).toMatch(/^([-+]?\d+|x2|MISS|NULL)$/);
  });

  test('should reshuffle modifier deck on x2 or MISS card', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // Execute multiple attacks to eventually draw x2 or MISS
    // (In practice, we'd manipulate deck state for deterministic testing)

    for (let i = 0; i < 5; i++) {
      const currentTurn = await page.locator('[data-testid="current-turn-indicator"]').textContent();

      if (currentTurn?.includes('Player')) {
        // Check if attack action is available
        const useTopAction = page.locator('[data-testid="use-top-action"]');
        if (await useTopAction.isVisible()) {
          await useTopAction.click();

          const monster = page.locator('[data-testid="monster-0"]');
          if (await monster.isVisible()) {
            await monster.click();

            // Wait for modifier reveal
            const modifierCard = page.locator('[data-testid="modifier-card-revealed"]');
            if (await modifierCard.isVisible({ timeout: 2000 })) {
              const modifierValue = await modifierCard.textContent();

              // Check for reshuffle cards
              if (modifierValue === 'x2' || modifierValue === 'MISS' || modifierValue === 'NULL') {
                // Verify reshuffle animation/notification
                await expect(page.locator('[data-testid="deck-reshuffle-notification"]')).toBeVisible({ timeout: 1000 });
                break;
              }
            }
          }
        }
      }

      // End turn and wait for next round
      const endTurnButton = page.locator('[data-testid="end-turn-button"]');
      if (await endTurnButton.isVisible()) {
        await endTurnButton.click();
      }

      await page.waitForTimeout(1000);
    }
  });

  test('should display attack animation', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });
    await page.locator('[data-testid="use-top-action"]').click();
    await page.locator('[data-testid="monster-0"]').click();

    // Verify attack animation plays
    const attackAnimation = page.locator('[data-testid="attack-animation"]');
    await expect(attackAnimation).toBeVisible({ timeout: 2000 });

    // Animation should include:
    // - Character attack motion
    // - Projectile/effect (for ranged attacks)
    // - Impact effect on target
    // - Damage number floating up

    await expect(page.locator('[data-testid="damage-number"]')).toBeVisible({ timeout: 1000 });
  });

  test('should show miss animation on MISS modifier', async ({ page }) => {
    // This test would need to force MISS modifier for deterministic testing
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    // In practice, we'd manipulate modifier deck to force MISS
    // Then verify:
    // await expect(page.locator('[data-testid="miss-animation"]')).toBeVisible();
    // await expect(page.locator('text=MISS')).toBeVisible();
  });

  test('should prevent attack on invalid target', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });
    await page.locator('[data-testid="use-top-action"]').click();

    // Try to click on empty hex (not a valid target)
    const emptyHex = page.locator('[data-testid="hex-tile-5-5"]'); // Assuming this is empty
    await emptyHex.click();

    // Verify error message or no action taken
    const errorMessage = page.locator('[data-testid="invalid-target-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 1000 });
    await expect(errorMessage).toContainText('Invalid target');

    // Attack targeting mode should still be active
    await expect(page.locator('[data-testid="attack-targeting-mode"]')).toBeVisible();
  });

  test('should apply range restrictions to attacks', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    // Select melee attack (range 0, adjacent only)
    await page.locator('[data-testid="ability-card-melee"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    await expect(page.locator('[data-testid="current-turn-indicator"]')).toContainText('Player', { timeout: 5000 });
    await page.locator('[data-testid="use-top-action"]').click();

    // Verify only monsters within range are targetable (highlighted)
    // Distant monsters should not be highlighted/clickable
    const distantMonster = page.locator('[data-testid="monster-distant"]'); // Assuming this is out of range

    // Try to click distant monster
    if (await distantMonster.isVisible()) {
      await distantMonster.click();

      // Should show "out of range" error
      await expect(page.locator('[data-testid="out-of-range-error"]')).toBeVisible({ timeout: 1000 });
    }
  });

  test('should kill monster when health reaches zero', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Create Game")').click();
    await page.locator('[data-testid="character-select"]').click();
    await page.locator('[data-testid="character-brute"]').click();
    await page.locator('[data-testid="scenario-select"]').click();
    await page.locator('[data-testid="scenario-1"]').click();
    await page.locator('[data-testid="start-game-button"]').click();

    await expect(page.locator('[data-testid="card-selection-panel"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="ability-card-attack"]').click();
    await page.locator('[data-testid="ability-card-1"]').click();
    await page.locator('[data-testid="confirm-cards-button"]').click();

    const monster = page.locator('[data-testid="monster-0"]');

    // Keep attacking until monster dies
    // (In practice, we'd set monster health low for deterministic testing)
    let monstersAlive = true;
    let attacksAttempted = 0;

    while (monstersAlive && attacksAttempted < 10) {
      const currentTurn = await page.locator('[data-testid="current-turn-indicator"]').textContent();

      if (currentTurn?.includes('Player')) {
        const useTopAction = page.locator('[data-testid="use-top-action"]');
        if (await useTopAction.isVisible()) {
          await useTopAction.click();

          if (await monster.isVisible()) {
            await monster.click();
            await page.waitForTimeout(2000);

            // Check if monster is dead
            if (!(await monster.isVisible())) {
              // Verify death animation
              await expect(page.locator('[data-testid="monster-death-animation"]')).toBeVisible({ timeout: 1000 });

              // Verify loot token spawns
              await expect(page.locator('[data-testid="loot-token"]')).toBeVisible({ timeout: 1000 });

              monstersAlive = false;
              break;
            }
          } else {
            monstersAlive = false;
            break;
          }
        }
      }

      // End turn
      const endTurnButton = page.locator('[data-testid="end-turn-button"]');
      if (await endTurnButton.isVisible()) {
        await endTurnButton.click();
      }

      await page.waitForTimeout(1000);
      attacksAttempted++;
    }

    // Verify monster is removed from board
    expect(await monster.isVisible()).toBe(false);
  });
});
