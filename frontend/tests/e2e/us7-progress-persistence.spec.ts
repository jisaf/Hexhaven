import { test, expect } from '@playwright/test';

/**
 * T196 [US7] E2E test: Progress persists after account creation
 *
 * Test Scenario:
 * 1. Create account with initial progress
 * 2. Complete multiple scenarios
 * 3. Gain experience and unlock perks
 * 4. Reload page/restart session
 * 5. Verify all progress persists correctly
 */

test.describe('US7: Progress Persistence After Account Creation', () => {
  const mockUuid = '12345678-1234-1234-1234-123456789012';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((uuid) => {
      localStorage.clear();
      localStorage.setItem('playerUuid', uuid);
      localStorage.setItem('accountUuid', uuid);
    }, mockUuid);
  });

  test('should persist scenario completion history', async ({ page }) => {
    // Mock initial progression state
    const initialProgress = {
      uuid: mockUuid,
      scenariosCompleted: 3,
      completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3'],
      totalExperience: 90,
      charactersPlayed: ['Brute', 'Tinkerer'],
      perksUnlocked: [],
      createdAt: new Date().toISOString()
    };

    await page.route('**/api/accounts/*/progression', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(initialProgress)
      });
    });

    // Navigate to profile
    await page.goto('/profile');

    // Verify initial state
    await expect(page.locator('[data-testid="scenarios-completed"]')).toContainText('3');
    await expect(page.locator('[data-testid="total-experience"]')).toContainText('90');

    // Verify scenario list shows completed scenarios
    await expect(page.locator('[data-testid="completed-scenario-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-scenario-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-scenario-3"]')).toBeVisible();

    // Reload page
    await page.reload();

    // Verify data persists after reload
    await expect(page.locator('[data-testid="scenarios-completed"]')).toContainText('3');
    await expect(page.locator('[data-testid="total-experience"]')).toContainText('90');
  });

  test('should persist character experience across sessions', async ({ page }) => {
    const progressWithCharacterXP = {
      uuid: mockUuid,
      scenariosCompleted: 5,
      totalExperience: 150,
      charactersPlayed: ['Brute', 'Tinkerer', 'Spellweaver'],
      characterExperience: {
        'Brute': { level: 2, xp: 60, perksUnlocked: ['Remove two -1 cards'] },
        'Tinkerer': { level: 1, xp: 45, perksUnlocked: [] },
        'Spellweaver': { level: 2, xp: 55, perksUnlocked: ['Add one +1 card'] }
      },
      perksUnlocked: ['Remove two -1 cards', 'Add one +1 card'],
      createdAt: new Date().toISOString()
    };

    await page.route('**/api/accounts/*/progression', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(progressWithCharacterXP)
      });
    });

    await page.goto('/profile');

    // Verify character progression display
    await expect(page.locator('[data-testid="character-Brute-level"]')).toContainText('2');
    await expect(page.locator('[data-testid="character-Brute-xp"]')).toContainText('60');
    await expect(page.locator('[data-testid="character-Tinkerer-level"]')).toContainText('1');
    await expect(page.locator('[data-testid="character-Spellweaver-level"]')).toContainText('2');

    // Verify perks are shown
    await expect(page.locator('[data-testid="perk-remove-two-minus-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="perk-add-one-plus-1"]')).toBeVisible();

    // Simulate session end and new session
    await page.evaluate(() => {
      sessionStorage.clear();
    });
    await page.reload();

    // Verify all character data persists
    await expect(page.locator('[data-testid="character-Brute-level"]')).toContainText('2');
    await expect(page.locator('[data-testid="character-Spellweaver-level"]')).toContainText('2');
  });

  test('should handle offline-then-online scenario completion sync', async ({ page }) => {
    const serverProgress = {
      uuid: mockUuid,
      scenariosCompleted: 5,
      totalExperience: 150,
      completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5'],
      charactersPlayed: ['Brute'],
      perksUnlocked: [],
      createdAt: new Date().toISOString()
    };

    // Setup route interception
    await page.route('**/api/accounts/*/progression', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(serverProgress)
        });
      } else if (route.request().method() === 'POST') {
        // Simulate server updating progress
        const update = route.request().postDataJSON();
        if (update.scenarioCompleted) {
          serverProgress.scenariosCompleted += 1;
          serverProgress.completedScenarioIds.push(update.scenarioCompleted);
          serverProgress.totalExperience += update.experienceGained || 30;
        }
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(serverProgress)
        });
      }
    });

    await page.goto('/profile');

    // Verify initial state
    await expect(page.locator('[data-testid="scenarios-completed"]')).toContainText('5');

    // Simulate offline scenario completion (stored locally)
    await page.evaluate(() => {
      const offlineProgress = {
        scenarioCompleted: 'scenario-6',
        experienceGained: 35
      };
      localStorage.setItem('offlineProgress', JSON.stringify([offlineProgress]));
    });

    // Trigger sync when coming back online
    await page.click('[data-testid="sync-progress-button"]');

    // Wait for sync to complete
    await page.waitForResponse(response =>
      response.url().includes('/api/accounts') &&
      response.request().method() === 'POST' &&
      response.status() === 200
    );

    // Verify progress updated
    await page.reload();
    await expect(page.locator('[data-testid="scenarios-completed"]')).toContainText('6');
    await expect(page.locator('[data-testid="total-experience"]')).toContainText('185');

    // Verify offline queue is cleared
    const offlineQueue = await page.evaluate(() => localStorage.getItem('offlineProgress'));
    expect(offlineQueue).toBeNull();
  });

  test('should maintain progress across device restarts (localStorage)', async ({ page }) => {
    const fullProgress = {
      uuid: mockUuid,
      scenariosCompleted: 10,
      totalExperience: 300,
      completedScenarioIds: Array.from({ length: 10 }, (_, i) => `scenario-${i + 1}`),
      charactersPlayed: ['Brute', 'Tinkerer', 'Spellweaver', 'Scoundrel'],
      characterExperience: {
        'Brute': { level: 3, xp: 95, perksUnlocked: ['Remove two -1 cards', 'Replace one -1 with +1'] },
        'Tinkerer': { level: 2, xp: 65, perksUnlocked: ['Add two +1 cards'] },
        'Spellweaver': { level: 2, xp: 70, perksUnlocked: ['Add one +1 card'] },
        'Scoundrel': { level: 2, xp: 70, perksUnlocked: ['Remove two -1 cards'] }
      },
      perksUnlocked: [
        'Remove two -1 cards',
        'Replace one -1 with +1',
        'Add two +1 cards',
        'Add one +1 card'
      ],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
    };

    await page.route('**/api/accounts/*/progression', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fullProgress)
      });
    });

    await page.goto('/profile');

    // Verify full progression state
    await expect(page.locator('[data-testid="scenarios-completed"]')).toContainText('10');
    await expect(page.locator('[data-testid="total-experience"]')).toContainText('300');
    await expect(page.locator('[data-testid="characters-played"]')).toContainText('4');

    // Verify all perks
    await expect(page.locator('[data-testid="perks-unlocked-count"]')).toContainText('4');

    // Simulate device restart by creating new page context
    await page.context().close();
    const newContext = await page.context().browser()!.newContext();
    const newPage = await newContext.newPage();

    // Restore session
    await newPage.evaluate((uuid) => {
      localStorage.setItem('accountUuid', uuid);
    }, mockUuid);

    await newPage.route('**/api/accounts/*/progression', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fullProgress)
      });
    });

    await newPage.goto('/profile');

    // Verify all progress restored
    await expect(newPage.locator('[data-testid="scenarios-completed"]')).toContainText('10');
    await expect(newPage.locator('[data-testid="total-experience"]')).toContainText('300');
    await expect(newPage.locator('[data-testid="perks-unlocked-count"]')).toContainText('4');

    await newContext.close();
  });

  test('should handle concurrent progress updates correctly', async ({ page }) => {
    let scenarioCount = 5;
    let totalXP = 150;

    await page.route('**/api/accounts/*/progression', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            uuid: mockUuid,
            scenariosCompleted: scenarioCount,
            totalExperience: totalXP,
            completedScenarioIds: Array.from({ length: scenarioCount }, (_, i) => `scenario-${i + 1}`),
            charactersPlayed: ['Brute'],
            perksUnlocked: [],
            createdAt: new Date().toISOString()
          })
        });
      } else if (route.request().method() === 'POST') {
        const update = route.request().postDataJSON();
        scenarioCount += 1;
        totalXP += update.experienceGained || 30;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            uuid: mockUuid,
            scenariosCompleted: scenarioCount,
            totalExperience: totalXP,
            completedScenarioIds: Array.from({ length: scenarioCount }, (_, i) => `scenario-${i + 1}`),
            charactersPlayed: ['Brute'],
            perksUnlocked: [],
            createdAt: new Date().toISOString()
          })
        });
      }
    });

    await page.goto('/profile');

    // Initial state
    await expect(page.locator('[data-testid="scenarios-completed"]')).toContainText('5');

    // Trigger multiple simultaneous updates
    await Promise.all([
      page.evaluate(() => {
        fetch('/api/accounts/12345678-1234-1234-1234-123456789012/progression', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioCompleted: 'scenario-6', experienceGained: 30 })
        });
      }),
      page.evaluate(() => {
        fetch('/api/accounts/12345678-1234-1234-1234-123456789012/progression', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioCompleted: 'scenario-7', experienceGained: 35 })
        });
      })
    ]);

    // Wait for updates
    await page.waitForTimeout(1000);

    // Reload and verify final state
    await page.reload();
    await expect(page.locator('[data-testid="scenarios-completed"]')).toContainText('7');
  });
});
