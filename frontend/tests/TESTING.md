# E2E Test Suite Documentation

**Version:** 2.0
**Last Updated:** 2025-12-07
**Test Framework:** Playwright
**Test Files:** 34 specs, 150+ tests

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Architecture](#test-architecture)
4. [Page Object Model](#page-object-model)
5. [Helper Modules](#helper-modules)
6. [Writing Tests](#writing-tests)
7. [Running Tests](#running-tests)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

This E2E test suite provides comprehensive coverage of the HexHaven multiplayer game, testing all user stories from the Product Requirements Document (PRD) with a focus on reliability, maintainability, and performance.

### Test Coverage

- **31 User Story Tests** - Complete coverage of all PRD user stories
- **9 Edge Case Tests** - Critical error scenarios and race conditions
- **8 Performance Tests** - FPS monitoring, load times, latency
- **14 Accessibility Tests** - WCAG 2.1 Level AA compliance

### Architecture Highlights

- **Page Object Model (POM)** - Centralized selectors and interactions
- **Smart Wait Strategies** - Network-aware waits, no hard-coded timeouts
- **Helper Modules** - Reusable test utilities for common operations
- **Multi-device Testing** - Firefox, Chrome, Pixel 6, iPhone SE, iPad
- **Parallel Execution** - 4 parallel workers in CI for fast execution

---

## Quick Start

### Prerequisites

```bash
# Install dependencies (from project root)
npm ci

# Install Playwright browsers
cd frontend
npx playwright install
```

### Run All Tests

```bash
# Run all tests headless (CI mode)
npm run test:e2e

# Run tests with UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test edge-cases.spec.ts

# Run tests for specific device
npx playwright test --project="Pixel 6"
```

### View Test Results

```bash
# Open HTML report
npx playwright show-report

# View trace for failed test
npx playwright show-trace trace.zip
```

---

## Test Architecture

### Directory Structure

```
frontend/tests/
├── e2e/                      # E2E test specs
│   ├── us1-*.spec.ts         # User Story 1: Core gameplay
│   ├── us2-*.spec.ts         # User Story 2: Advanced mechanics
│   ├── us3-*.spec.ts         # User Story 3: Mobile interactions
│   ├── us4-*.spec.ts         # User Story 4: Multiplayer
│   ├── us5-*.spec.ts         # User Story 5: Content
│   ├── us6-*.spec.ts         # User Story 6: Internationalization
│   ├── us7-*.spec.ts         # User Story 7: Persistence
│   ├── edge-cases.spec.ts    # Edge case scenarios
│   ├── performance.spec.ts   # Performance benchmarks
│   └── accessibility.spec.ts # WCAG 2.1 compliance
├── pages/                    # Page Object Model classes
│   ├── BasePage.ts           # Base class with smart waits
│   ├── LandingPage.ts        # Home/landing page
│   ├── LobbyPage.ts          # Game lobby
│   ├── CharacterSelectionPage.ts
│   ├── GameBoardPage.ts      # Game board canvas
│   └── CardSelectionPage.ts  # Ability card selection
├── helpers/                  # Test helper modules
│   ├── waitStrategies.ts     # Smart wait functions
│   ├── game-actions.ts       # Game-specific actions
│   ├── multiplayer.ts        # Multi-player test helpers
│   ├── assertions.ts         # Custom assertions
│   └── bugReporter.ts        # Bug reporting utilities
├── cleanup-old-videos.ts     # Global setup script
└── TESTING.md                # This file
```

### Test Naming Convention

Tests follow the pattern: `us{number}-{feature}.spec.ts`

- `us1-movement.spec.ts` - User Story 1: Movement mechanics
- `us2-attack.spec.ts` - User Story 2: Attack mechanics
- `us3-pan.spec.ts` - User Story 3: Pan gesture

Special test files:
- `edge-cases.spec.ts` - Edge cases and error scenarios
- `performance.spec.ts` - Performance benchmarks
- `accessibility.spec.ts` - Accessibility compliance

---

## Page Object Model

The Page Object Model (POM) pattern centralizes selectors and interactions, making tests easier to maintain.

### BasePage Class

All page objects extend `BasePage`, which provides:

```typescript
export class BasePage {
  constructor(protected page: Page) {}

  // Smart waits
  async waitForNetworkIdle(timeout?: number): Promise<void>
  async waitForElement(selector: string, options?: WaitOptions): Promise<void>

  // Safe interactions with retry logic
  async safeClick(selector: string, options?: ClickOptions): Promise<void>
  async safeType(selector: string, text: string, options?: TypeOptions): Promise<void>

  // Screenshot helpers
  async takeScreenshot(name: string): Promise<void>

  // Navigation
  async navigate(path?: string): Promise<void>
}
```

### Example: LandingPage

```typescript
export class LandingPage extends BasePage {
  // Selectors
  private selectors = {
    createGameButton: '[data-testid="create-game-button"]',
    joinGameButton: '[data-testid="join-game-button"]',
  };

  // Actions
  async clickCreateGame(): Promise<void> {
    await this.safeClick(this.selectors.createGameButton);
  }

  async clickJoinGame(): Promise<void> {
    await this.safeClick(this.selectors.joinGameButton);
  }

  // Assertions
  async assertOnLandingPage(): Promise<void> {
    await expect(this.page.locator(this.selectors.createGameButton))
      .toBeVisible({ timeout: 5000 });
  }
}
```

### Using Page Objects in Tests

```typescript
test('should create a new game', async ({ page }) => {
  const landingPage = new LandingPage(page);
  const lobbyPage = new LobbyPage(page);

  await landingPage.navigate();
  await landingPage.clickCreateGame();
  await lobbyPage.enterNickname('Player1');

  await expect(page.locator('[data-testid="lobby-page"]')).toBeVisible();
});
```

---

## Helper Modules

### waitStrategies.ts

Smart wait functions that adapt to network conditions:

```typescript
// Wait for network idle with timeout
export async function waitForNetworkIdle(
  page: Page,
  timeout: number = 3000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
}

// Wait for WebSocket connection
export async function waitForWebSocket(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return (window as any).socket?.connected === true;
  }, { timeout: 5000 }).catch(() => {});
}
```

### multiplayer.ts

Multi-player test setup helpers:

```typescript
// Create a 2-player game session
export async function createTwoPlayerGame(
  context: BrowserContext,
  options: { player1Name: string; player2Name: string }
): Promise<MultiplayerSession> {
  // Creates two browser pages
  // Player 1 creates game, Player 2 joins
  // Returns session with both pages and room code
}

// Setup characters for all players
export async function setupCharactersForAll(
  session: MultiplayerSession,
  characters: string[]
): Promise<void> {
  // Selects characters for each player in parallel
}

// Start multiplayer game
export async function startMultiplayerGame(
  session: MultiplayerSession
): Promise<void> {
  // Host starts the game
  // Waits for all players to load game board
}
```

### game-actions.ts

Common game-specific actions:

```typescript
// Select ability cards
export async function selectCards(
  page: Page,
  cardIndices: number[]
): Promise<void> {
  for (const index of cardIndices) {
    const card = page.locator(`[data-testid="ability-card-${index}"]`);
    await card.click();
  }
}

// Move character to hex
export async function moveToHex(
  page: Page,
  hexCoordinates: { q: number; r: number }
): Promise<void> {
  const hex = page.locator(`[data-testid="hex-${hexCoordinates.q}-${hexCoordinates.r}"]`);
  await hex.click();
}
```

### assertions.ts

Custom test assertions:

```typescript
// Assert game board loaded
export async function assertGameBoardLoaded(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="game-board-container"]'))
    .toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="game-board-canvas"]'))
    .toBeVisible({ timeout: 5000 });
}

// Assert player is in lobby
export async function assertInLobby(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="lobby-page"]'))
    .toBeVisible({ timeout: 5000 });
}
```

---

## Writing Tests

### Test Structure

Follow this standard structure for all tests:

```typescript
import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { LobbyPage } from '../pages/LobbyPage';
import { assertGameBoardLoaded } from '../helpers/assertions';

test.describe('User Story X: Feature Name', () => {
  test('should do something specific', async ({ page }) => {
    // ARRANGE: Setup page objects and state
    const landingPage = new LandingPage(page);
    const lobbyPage = new LobbyPage(page);

    // ACT: Perform user actions
    await landingPage.navigate();
    await landingPage.clickCreateGame();
    await lobbyPage.enterNickname('TestPlayer');

    // ASSERT: Verify expected outcomes
    await expect(page.locator('[data-testid="lobby-page"]')).toBeVisible();
  });
});
```

### Smart Wait Strategy

**❌ NEVER use hard-coded waits:**

```typescript
// BAD - Fragile and slow
await page.waitForTimeout(2000);
```

**✅ ALWAYS use smart waits:**

```typescript
// GOOD - Adaptive and fast
await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

// GOOD - Wait for specific element
await expect(page.locator('[data-testid="element"]')).toBeVisible({ timeout: 5000 });

// GOOD - Wait for network condition
await waitForWebSocket(page);
```

### Selector Strategy

**❌ AVOID text-based selectors:**

```typescript
// BAD - Breaks with internationalization
await page.locator('button:has-text("Create Game")').click();
```

**✅ USE data-testid selectors:**

```typescript
// GOOD - Stable and explicit
await page.locator('[data-testid="create-game-button"]').click();
```

### Multiplayer Tests

Use the multiplayer helpers for multi-player scenarios:

```typescript
test('should sync game state between players', async ({ context }) => {
  // Create 2-player session
  const session = await createTwoPlayerGame(context, {
    player1Name: 'Host',
    player2Name: 'Player2'
  });

  // Setup characters
  await setupCharactersForAll(session, ['Brute', 'Tinkerer']);

  // Start game
  await startMultiplayerGame(session);

  // Access individual pages
  const hostPage = session.hostPage;
  const player2Page = session.players[1].page;

  // Perform actions and verify sync
  await hostPage.locator('[data-testid="ability-card-0"]').click();
  await player2Page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

  // Assert state synchronized
  await expect(player2Page.locator('[data-testid="player-1-action"]'))
    .toBeVisible({ timeout: 5000 });
});
```

---

## Running Tests

### Local Development

```bash
# Run all tests headless
npm run test:e2e

# Run with headed browser (see tests run)
npx playwright test --headed

# Run in UI mode (interactive debugging)
npx playwright test --ui

# Run specific test file
npx playwright test us1-movement.spec.ts

# Run tests matching pattern
npx playwright test --grep "should move character"

# Run on specific device
npx playwright test --project="Pixel 6"
npx playwright test --project="iPhone SE"

# Run in debug mode
npx playwright test --debug
```

### Debug Failed Tests

```bash
# Run only failed tests from last run
npx playwright test --last-failed

# Show trace for failed test
npx playwright show-trace trace.zip

# Generate detailed trace
npx playwright test --trace on
```

### Test Reports

```bash
# Open HTML report
npx playwright show-report

# Generate report without opening
npx playwright test --reporter=html

# View JSON results
cat test-results/results.json
```

---

## CI/CD Integration

### GitHub Actions Workflow

E2E tests run automatically in CI on:
- Pull requests to `main` or `master`
- Direct pushes to `main` or `master`

Workflow configuration: `.github/workflows/ci.yml`

```yaml
e2e-tests:
  name: E2E Tests
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright browsers
      working-directory: ./frontend
      run: npx playwright install --with-deps

    - name: Run E2E tests
      working-directory: ./frontend
      run: npx playwright test

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: frontend/playwright-report/
        retention-days: 30
```

### CI Configuration

The `playwright.config.ts` automatically adjusts for CI:

- **Workers:** 4 parallel workers (vs. 50% of cores locally)
- **Retries:** 1 retry for flaky tests (vs. 0 locally)
- **Reporters:** GitHub Actions reporter + HTML + JUnit + JSON
- **Max Failures:** Stop after 5 failures to save time

### Environment Variables

Set these in CI for proper test execution:

```bash
CI=true                    # Enable CI mode
VITE_URL=http://localhost:5173  # Frontend URL
DATABASE_URL=postgresql://...   # Test database
```

---

## Troubleshooting

### Common Issues

#### Tests Timing Out

**Symptom:** Tests fail with "Timeout 10000ms exceeded"

**Solution:**
1. Check if backend server is running
2. Verify frontend dev server started correctly
3. Use smart waits instead of hard-coded timeouts
4. Increase timeout for specific test if needed:

```typescript
test('slow operation', async ({ page }) => {
  test.setTimeout(30000); // Increase to 30 seconds
  // ... test code
});
```

#### Flaky Tests

**Symptom:** Tests pass sometimes, fail other times

**Solution:**
1. Remove all `waitForTimeout()` calls
2. Use `waitForLoadState('networkidle')` after actions
3. Add proper wait conditions:

```typescript
// Wait for element to be visible AND stable
await expect(element).toBeVisible({ timeout: 5000 });
await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
```

#### WebSocket Connection Failures

**Symptom:** "WebSocket not connected" errors

**Solution:**
1. Use `waitForWebSocket()` helper after page loads
2. Verify backend WebSocket endpoint is running
3. Check for CORS configuration in backend

```typescript
import { waitForWebSocket } from '../helpers/waitStrategies';

await landingPage.navigate();
await waitForWebSocket(page);
```

#### Selectors Not Found

**Symptom:** "Element not found" errors

**Solution:**
1. Verify `data-testid` exists in component
2. Check if element is hidden or behind modal
3. Wait for parent container to load first

```typescript
// Wait for container first
await expect(page.locator('[data-testid="game-board-container"]'))
  .toBeVisible({ timeout: 10000 });

// Then find child element
const card = page.locator('[data-testid="ability-card-0"]');
await card.click();
```

---

## Best Practices

### 1. Use Page Object Model

✅ **DO:**
```typescript
const landingPage = new LandingPage(page);
await landingPage.clickCreateGame();
```

❌ **DON'T:**
```typescript
await page.locator('[data-testid="create-game-button"]').click();
```

### 2. Smart Waits Only

✅ **DO:**
```typescript
await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
await expect(element).toBeVisible({ timeout: 5000 });
```

❌ **DON'T:**
```typescript
await page.waitForTimeout(2000);
```

### 3. Use Helper Functions

✅ **DO:**
```typescript
const session = await createTwoPlayerGame(context, { ... });
await setupCharactersForAll(session, ['Brute', 'Tinkerer']);
```

❌ **DON'T:**
```typescript
// 70+ lines of inline setup code
```

### 4. Descriptive Test Names

✅ **DO:**
```typescript
test('should display error when joining non-existent room', async ({ page }) => {
```

❌ **DON'T:**
```typescript
test('error test', async ({ page }) => {
```

### 5. Arrange-Act-Assert

✅ **DO:**
```typescript
// ARRANGE
const landingPage = new LandingPage(page);
const lobbyPage = new LobbyPage(page);

// ACT
await landingPage.navigate();
await landingPage.clickCreateGame();

// ASSERT
await expect(page.locator('[data-testid="lobby-page"]')).toBeVisible();
```

### 6. Independent Tests

Each test should be completely independent:

✅ **DO:**
```typescript
test('test 1', async ({ page }) => {
  await landingPage.navigate(); // Fresh start
  // ... test code
});

test('test 2', async ({ page }) => {
  await landingPage.navigate(); // Fresh start
  // ... test code
});
```

❌ **DON'T:**
```typescript
let sharedState;

test('test 1', async ({ page }) => {
  sharedState = await setup(); // BAD - shared state
});

test('test 2', async ({ page }) => {
  await useSharedState(sharedState); // BAD - depends on test 1
});
```

### 7. Clean Up After Tests

Use `test.afterEach()` for cleanup:

```typescript
test.afterEach(async ({ page }) => {
  // Clear localStorage
  await page.evaluate(() => localStorage.clear());

  // Close WebSocket connections
  await page.evaluate(() => {
    if ((window as any).socket) {
      (window as any).socket.disconnect();
    }
  });
});
```

---

## Performance Tips

### 1. Parallel Execution

Run tests in parallel for faster execution:

```bash
# Run with 4 workers
npx playwright test --workers=4

# Run with maximum parallelization
npx playwright test --workers=100%
```

### 2. Selective Test Runs

Run only affected tests during development:

```bash
# Run tests for specific user story
npx playwright test us1-*.spec.ts

# Run tests matching pattern
npx playwright test --grep "movement"

# Skip slow tests during development
npx playwright test --grep-invert "slow|performance"
```

### 3. Optimize Waits

Use the shortest safe timeout:

```typescript
// Fast operations
await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {});

// Slow operations (game loading)
await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
```

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model Guide](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [CI/CD Setup](https://playwright.dev/docs/ci)

---

**Maintained by:** Development Team
**Questions?** Open an issue or contact the team on Slack
