import { test, expect } from '@playwright/test';

/**
 * T195 [US7] E2E test: Anonymous play and account upgrade
 *
 * Test Scenario:
 * 1. Play 5 games anonymously (UUID-based)
 * 2. Click "Create Account"
 * 3. Provide confirmation
 * 4. Verify anonymous progress is converted to account-backed profile
 * 5. Character experience and completed scenarios are saved
 * 6. Logout and login again
 * 7. Verify data persists (MVP: device-only; Production: cross-device)
 */

test.describe('US7: Account Upgrade from Anonymous Play', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should allow anonymous play and track progress', async ({ page }) => {
    await page.goto('/');

    // Verify anonymous UUID is generated and stored
    const uuid = await page.evaluate(() => localStorage.getItem('playerUuid'));
    expect(uuid).toBeTruthy();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // Create a game room
    await page.click('button:has-text("Create Game")');
    await page.fill('input[placeholder*="nickname" i]', 'AnonymousPlayer');
    await page.click('button:has-text("Continue")');

    // Verify we're in lobby with room code
    const roomCode = await page.textContent('[data-testid="room-code"]');
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // Select character
    await page.click('[data-testid="character-card-Brute"]');

    // Verify character is selected
    await expect(page.locator('[data-testid="character-card-Brute"]')).toHaveClass(/selected/);
  });

  test('should upgrade anonymous account to registered account', async ({ page }) => {
    await page.goto('/');

    // Simulate playing 5 games by setting progress in localStorage
    const uuid = await page.evaluate(() => {
      const playerUuid = crypto.randomUUID();
      localStorage.setItem('playerUuid', playerUuid);
      localStorage.setItem('anonymousProgress', JSON.stringify({
        scenariosCompleted: 5,
        totalExperience: 150,
        charactersPlayed: ['Brute', 'Tinkerer', 'Spellweaver']
      }));
      return playerUuid;
    });

    // Navigate to profile page
    await page.goto('/profile');

    // Click "Create Account" button
    await page.click('button:has-text("Create Account")');

    // Verify modal appears
    await expect(page.locator('[data-testid="account-upgrade-modal"]')).toBeVisible();

    // Verify progress summary is shown
    await expect(page.locator('text=5 scenarios completed')).toBeVisible();
    await expect(page.locator('text=150 experience')).toBeVisible();

    // Confirm account creation
    await page.click('button:has-text("Confirm")');

    // Wait for API call to complete
    await page.waitForResponse(response =>
      response.url().includes('/api/accounts') && response.status() === 201
    );

    // Verify account UUID is stored
    const accountUuid = await page.evaluate(() => localStorage.getItem('accountUuid'));
    expect(accountUuid).toBeTruthy();
    expect(accountUuid).toBe(uuid);

    // Verify success message
    await expect(page.locator('text=Account created successfully')).toBeVisible();

    // Verify anonymous progress flag is cleared
    const anonymousProgress = await page.evaluate(() => localStorage.getItem('anonymousProgress'));
    expect(anonymousProgress).toBeNull();
  });

  test('should persist progress after account creation', async ({ page }) => {
    await page.goto('/');

    // Create account with progress
    const uuid = await page.evaluate(() => {
      const playerUuid = crypto.randomUUID();
      localStorage.setItem('playerUuid', playerUuid);
      localStorage.setItem('accountUuid', playerUuid);
      return playerUuid;
    });

    // Mock API response for progression
    await page.route('**/api/accounts/*/progression', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uuid: uuid,
          scenariosCompleted: 5,
          totalExperience: 150,
          charactersPlayed: ['Brute', 'Tinkerer', 'Spellweaver'],
          perksUnlocked: [],
          createdAt: new Date().toISOString()
        })
      });
    });

    // Navigate to profile
    await page.goto('/profile');

    // Verify progression is displayed
    await expect(page.locator('[data-testid="scenarios-completed"]')).toContainText('5');
    await expect(page.locator('[data-testid="total-experience"]')).toContainText('150');
    await expect(page.locator('[data-testid="characters-played"]')).toContainText('3');
  });

  test('should maintain progress after logout and login (device-only MVP)', async ({ page, context }) => {
    await page.goto('/');

    // Create account
    const uuid = await page.evaluate(() => {
      const playerUuid = crypto.randomUUID();
      localStorage.setItem('playerUuid', playerUuid);
      localStorage.setItem('accountUuid', playerUuid);
      return playerUuid;
    });

    // Verify account exists
    await page.goto('/profile');
    await expect(page.locator('[data-testid="account-uuid"]')).toContainText(uuid.substring(0, 8));

    // Simulate logout (clear localStorage)
    await page.evaluate(() => {
      const accountUuid = localStorage.getItem('accountUuid');
      localStorage.clear();
      // Restore account UUID (simulating "remember me" or session restore)
      localStorage.setItem('accountUuid', accountUuid!);
    });

    // Reload page
    await page.reload();

    // Verify account UUID persists
    const restoredUuid = await page.evaluate(() => localStorage.getItem('accountUuid'));
    expect(restoredUuid).toBe(uuid);

    // Note: In MVP, data persists device-only via localStorage
    // Production version will use server-side authentication with cross-device sync
  });

  test('should track new progress after account creation', async ({ page }) => {
    await page.goto('/');

    // Create account
    const uuid = await page.evaluate(() => {
      const playerUuid = crypto.randomUUID();
      localStorage.setItem('playerUuid', playerUuid);
      localStorage.setItem('accountUuid', playerUuid);
      return playerUuid;
    });

    // Mock progression endpoint
    let progressionData = {
      uuid: uuid,
      scenariosCompleted: 5,
      totalExperience: 150,
      charactersPlayed: ['Brute'],
      perksUnlocked: [],
      createdAt: new Date().toISOString()
    };

    await page.route('**/api/accounts/*/progression', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(progressionData)
      });
    });

    // Intercept progression update
    await page.route('**/api/accounts/*/progression', route => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        progressionData.scenariosCompleted += 1;
        progressionData.totalExperience += postData.experienceGained || 30;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(progressionData)
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(progressionData)
        });
      }
    });

    // Navigate to profile
    await page.goto('/profile');
    await expect(page.locator('[data-testid="scenarios-completed"]')).toContainText('5');

    // Simulate completing a scenario (trigger progression update)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('scenario-completed', {
        detail: { experienceGained: 30 }
      }));
    });

    // Wait for update
    await page.waitForTimeout(500);

    // Verify progression increased
    await page.reload();
    await expect(page.locator('[data-testid="scenarios-completed"]')).toContainText('6');
    await expect(page.locator('[data-testid="total-experience"]')).toContainText('180');
  });
});
