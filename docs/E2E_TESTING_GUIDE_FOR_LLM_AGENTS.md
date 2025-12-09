# E2E Testing Guide for LLM Agents

**Version**: 1.0
**Last Updated**: 2025-12-07
**Audience**: LLM agents working on Hexhaven E2E tests

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup and Execution](#setup-and-execution)
4. [Page Object Model](#page-object-model)
5. [Helper Functions](#helper-functions)
6. [Common Patterns](#common-patterns)
7. [Debugging](#debugging)
8. [Best Practices](#best-practices)
9. [Known Issues](#known-issues)

---

## Overview

### Test Suite Statistics
- **Total Tests**: 225 unique tests
- **Device Profiles**: 5 (Firefox, Pixel 6, iPhone SE, iPad, Desktop Chrome)
- **Total Test Executions**: 1,125 (225 × 5 devices)
- **Framework**: Playwright
- **Language**: TypeScript
- **Parallel Workers**: 4 (configurable)

### Test Categories
- **Accessibility**: 14 tests - WCAG compliance, ARIA labels, keyboard navigation
- **Core Rooms**: 4 tests - Room creation, joining, validation
- **Movement**: 8 tests - Character movement, range validation
- **Attack**: 8 tests - Attack resolution, modifier deck
- **Card Selection**: 5 tests - Initiative, card limits
- **Elements**: 6 tests - Elemental infusion system
- **Loot**: 5 tests - Token spawning, collection
- **Edge Cases**: 9 tests - Disconnection, host migration, limits
- **Performance**: 8 tests - FPS, load times, memory
- **Internationalization**: 6 tests - Language support
- **Touch/Mobile**: 6 tests - Touch gestures, mobile UI

---

## Architecture

### Directory Structure
```
frontend/tests/
├── e2e/                    # E2E test files
│   ├── accessibility.spec.ts
│   ├── us1-create-room.spec.ts
│   ├── us1-join-room.spec.ts
│   ├── us1-movement.spec.ts
│   ├── us2-attack.spec.ts
│   ├── us2-card-selection.spec.ts
│   ├── us2-elements.spec.ts
│   ├── us2-loot.spec.ts
│   └── ...
├── pages/                  # Page Object Model
│   ├── BasePage.ts
│   ├── LandingPage.ts
│   ├── LobbyPage.ts
│   ├── CharacterSelectionPage.ts
│   └── GameBoardPage.ts
├── helpers/                # Utility functions
│   ├── multiplayer.ts      # Multiplayer game helpers
│   ├── assertions.ts       # Custom assertions
│   └── waiters.ts          # Wait utilities
├── cleanup-old-videos.ts   # Global setup
├── bugs.md                 # Known bug tracker
└── *.md                    # Documentation
```

### Configuration
**File**: `frontend/playwright.config.ts`

```typescript
{
  workers: 4,                    // Parallel execution
  timeout: 30000,                // Test timeout (30s)
  expect: { timeout: 5000 },     // Assertion timeout (5s)
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'Pixel 6', use: devices['Pixel 5'] },
    { name: 'iPhone SE', use: devices['iPhone SE'] },
    { name: 'iPad', use: devices['iPad (gen 7)'] },
    { name: 'Desktop Chrome', use: devices['Desktop Chrome'] }
  ]
}
```

---

## Setup and Execution

### Prerequisites
```bash
# Backend must be running on port 3001
cd /home/ubuntu/hexhaven/backend
NODE_ENV=development npm run start:prod

# Frontend must be running on port 5173
cd /home/ubuntu/hexhaven/frontend
npm run dev
```

### Running Tests

#### All Tests (All Devices)
```bash
npx playwright test --workers=4
```

#### Single Device
```bash
npx playwright test --project=firefox --workers=4
```

#### Specific Test File
```bash
npx playwright test us1-create-room.spec.ts --project=firefox
```

#### Specific Test by Name
```bash
npx playwright test --grep "should create a game room"
```

#### With Timeout
```bash
npx playwright test --timeout=60000
```

### Important: CORS Configuration

**CRITICAL**: Backend MUST run with `NODE_ENV=development` for tests:

```bash
# ✅ CORRECT
NODE_ENV=development npm run start:prod

# ❌ WRONG (will cause CORS errors)
npm run start:prod  # Defaults to production
```

**Why**: Production mode restricts CORS to specific origins, blocking test connections.

---

## Page Object Model

### BasePage Class
**File**: `frontend/tests/pages/BasePage.ts`

Base class for all page objects with common utilities.

#### Key Methods

```typescript
class BasePage {
  // Navigation
  async goto(path: string): Promise<void>
  async waitForNetworkIdle(): Promise<void>

  // Element interaction
  async waitForElement(selector: string, options?: WaitOptions): Promise<Locator>
  async clickWithRetry(selector: string, maxRetries: number = 3): Promise<void>
  async fillInput(selector: string, value: string): Promise<void>

  // Data retrieval
  async getTextContent(selector: string): Promise<string>
  async isVisible(selector: string): Promise<boolean>

  // Waiting
  async waitFor(ms: number): Promise<void>
  async waitUntil(condition: () => Promise<boolean>, options?): Promise<void>
}
```

#### Usage Pattern
```typescript
const landingPage = new LandingPage(page);
await landingPage.navigate();  // Uses BasePage.goto()
```

### LandingPage
**File**: `frontend/tests/pages/LandingPage.ts`

Represents the landing page where users create/join games.

#### Key Methods
```typescript
class LandingPage extends BasePage {
  async navigate(): Promise<void>
  async clickCreateGame(): Promise<void>
  async clickJoinGame(): Promise<void>
  async verifyPageLoaded(): Promise<void>
  async getTitle(): Promise<string>
}
```

#### Example
```typescript
const landingPage = new LandingPage(page);
await landingPage.navigate();
await landingPage.verifyPageLoaded();
await landingPage.clickCreateGame();
```

### LobbyPage
**File**: `frontend/tests/pages/LobbyPage.ts`

Represents the lobby where players wait and select characters.

#### Key Methods
```typescript
class LobbyPage extends BasePage {
  // Room actions
  async enterNickname(nickname: string): Promise<void>
  async joinRoom(roomCode: string, nickname: string): Promise<void>
  async getRoomCode(): Promise<string>
  async copyRoomCode(): Promise<void>

  // Player management
  async waitForPlayerCount(count: number, timeout?: number): Promise<void>
  async getPlayerCount(): Promise<number>
  async getPlayerNames(): Promise<string[]>

  // Game start
  async startGame(): Promise<void>
  async isStartGameEnabled(): Promise<boolean>
  async waitForStartGameEnabled(timeout?: number): Promise<void>

  // Verification
  async verifyIsHost(): Promise<void>
  async verifyLobbyLoaded(): Promise<void>
  async verifyInRoom(roomCode: string): Promise<void>
  async verifyPlayerInLobby(playerName: string): Promise<void>
}
```

#### Example
```typescript
const lobbyPage = new LobbyPage(page);
await lobbyPage.enterNickname('Player1');
const roomCode = await lobbyPage.getRoomCode();
await lobbyPage.verifyIsHost();
await lobbyPage.waitForStartGameEnabled();
await lobbyPage.startGame();
```

### CharacterSelectionPage
**File**: `frontend/tests/pages/CharacterSelectionPage.ts`

Represents character selection screen.

#### Key Methods
```typescript
class CharacterSelectionPage extends BasePage {
  async selectCharacter(characterName: string): Promise<void>
  async waitForCharacterSelection(): Promise<void>
  async getAvailableCharacters(): Promise<string[]>
  async isCharacterSelected(characterName: string): Promise<boolean>
}
```

### GameBoardPage
**File**: `frontend/tests/pages/GameBoardPage.ts`

Represents the main game board (PixiJS canvas).

#### Key Methods
```typescript
class GameBoardPage extends BasePage {
  async waitForGameBoard(timeout?: number): Promise<void>
  async clickHex(q: number, r: number): Promise<void>
  async waitForCharacterAt(q: number, r: number): Promise<void>
  // ... additional game board methods
}
```

---

## Helper Functions

### Multiplayer Helpers
**File**: `frontend/tests/helpers/multiplayer.ts`

Functions for creating multi-player test scenarios.

#### createTwoPlayerGame()
Creates a 2-player game with both players in lobby.

```typescript
async function createTwoPlayerGame(
  context: BrowserContext,
  options?: {
    player1Name?: string;
    player2Name?: string;
  }
): Promise<MultiplayerSession>

// Usage
const session = await createTwoPlayerGame(context, {
  player1Name: 'Host',
  player2Name: 'Player2'
});

// Returns
{
  hostPage: Page,
  roomCode: string,
  players: [
    { page: Page, nickname: string },
    { page: Page, nickname: string }
  ]
}
```

#### createMultiplayerGame()
Creates an N-player game.

```typescript
async function createMultiplayerGame(
  context: BrowserContext,
  playerCount: number,
  options?: {
    hostNickname?: string;
    playerNicknamePrefix?: string;
  }
): Promise<MultiplayerSession>

// Usage
const session = await createMultiplayerGame(context, 4, {
  hostNickname: 'Host',
  playerNicknamePrefix: 'Player'
});
// Creates: Host, Player2, Player3, Player4
```

#### Verification Helpers

```typescript
// Verify all players see the same room code
await verifyAllPlayersInSameRoom(session);

// Verify all players see each other in lobby
await verifyAllPlayersSeeEachOther(session);

// Start game for all players
await startGameForAllPlayers(session);
```

### Assertion Helpers
**File**: `frontend/tests/helpers/assertions.ts`

Custom assertions for common validations.

```typescript
// Verify room code format (6 alphanumeric chars)
await assertValidRoomCode(roomCode);

// Verify player count in lobby
await assertPlayerCount(page, expectedCount);

// Verify element text
await assertElementText(page, selector, expectedText);
```

### Wait Utilities
**File**: `frontend/tests/helpers/waiters.ts`

Smart waiting utilities.

```typescript
// Wait for network to be idle
await waitForNetworkIdle(page);

// Wait for condition with polling
await waitUntil(
  async () => await page.locator('.ready').isVisible(),
  { timeout: 10000, interval: 500 }
);
```

---

## Common Patterns

### Pattern 1: Create Room and Verify
```typescript
test('should create a game room', async ({ page }) => {
  const landingPage = new LandingPage(page);
  const lobbyPage = new LobbyPage(page);

  // Navigate and create
  await landingPage.navigate();
  await landingPage.clickCreateGame();
  await lobbyPage.enterNickname('TestPlayer');

  // Verify
  const roomCode = await lobbyPage.getRoomCode();
  await assertValidRoomCode(roomCode);
  await lobbyPage.verifyIsHost();
  await assertPlayerCount(page, 1);
});
```

### Pattern 2: Multiplayer Test
```typescript
test('should join an existing room', async ({ context }) => {
  // Create 2-player game
  const session = await createTwoPlayerGame(context, {
    player1Name: 'Host',
    player2Name: 'Joiner'
  });

  // Verify both players in same room
  await verifyAllPlayersInSameRoom(session);
  await verifyAllPlayersSeeEachOther(session);

  // Host-specific action
  const hostLobby = new LobbyPage(session.hostPage);
  await hostLobby.verifyIsHost();
});
```

### Pattern 3: Game Start Flow
```typescript
test('should start game', async ({ context }) => {
  const session = await createTwoPlayerGame(context);

  // Select characters
  const charPage1 = new CharacterSelectionPage(session.hostPage);
  const charPage2 = new CharacterSelectionPage(session.players[1].page);

  await charPage1.selectCharacter('Brute');
  await charPage2.selectCharacter('Tinkerer');

  // Start game
  await startGameForAllPlayers(session);

  // Wait for game board
  const boardPage = new GameBoardPage(session.hostPage);
  await boardPage.waitForGameBoard();
});
```

### Pattern 4: Browser-Specific Tests
```typescript
test('clipboard test', async ({ page, browserName }) => {
  // Skip on Firefox (doesn't support clipboard permissions)
  test.skip(browserName === 'firefox', 'Firefox limitation');

  // ... test code
});
```

### Pattern 5: Error Validation
```typescript
test('should show error for invalid room', async ({ page }) => {
  const landingPage = new LandingPage(page);
  const lobbyPage = new LobbyPage(page);

  await landingPage.navigate();
  await landingPage.clickJoinGame();

  // Use 6-char invalid code (maxlength=6)
  await lobbyPage.joinRoom('INVALD', 'TestPlayer');

  // Verify error message
  const errorMessage = page.locator('[data-testid="error-message"]');
  await expect(errorMessage).toBeVisible({ timeout: 5000 });
  await expect(errorMessage).toContainText('Room not found');
});
```

---

## Debugging

### Running Tests in Debug Mode
```bash
# UI mode (interactive)
npx playwright test --ui

# Debug specific test
npx playwright test --debug --grep "should create a game room"

# Headed mode (see browser)
npx playwright test --headed

# Note: Headless requires X server on Linux
# Use xvfb-run for headless environments:
xvfb-run npx playwright test --headed
```

### Debugging Failures

#### 1. Check Screenshots and Videos
```bash
# Screenshots saved to:
frontend/public/test-videos/<test-name>/test-failed-*.png

# Videos saved to:
frontend/public/test-videos/<test-name>/video.webm
```

#### 2. Check Error Context
```bash
# Error context files:
frontend/public/test-videos/<test-name>/error-context.md
```

#### 3. Check Backend Logs
```bash
tail -100 /tmp/backend.log
# Look for:
# - CORS errors
# - WebSocket connection issues
# - Room creation failures
```

#### 4. Check Frontend Logs
```bash
tail -100 /tmp/frontend.log
# Look for:
# - Build errors
# - Vite HMR issues
```

#### 5. Common Issues and Solutions

**Issue**: `Test timeout exceeded`
- **Cause**: Element not appearing, network slow
- **Solution**: Increase timeout, check element selector

**Issue**: `CORS request did not succeed`
- **Cause**: Backend running in production mode
- **Solution**: Restart with `NODE_ENV=development`

**Issue**: `locator.waitFor: Timeout exceeded`
- **Cause**: Element selector wrong or element not rendering
- **Solution**: Check `data-testid`, verify page loaded

**Issue**: `Failed to fill input. Expected: "INVALID", Got: "INVALI"`
- **Cause**: Input has `maxlength=6`
- **Solution**: Use 6-character strings

**Issue**: `Unknown permission: clipboard-read`
- **Cause**: Firefox doesn't support clipboard permissions
- **Solution**: Skip test on Firefox with `test.skip(browserName === 'firefox')`

---

## Best Practices

### 1. Use Page Object Model
```typescript
// ✅ GOOD: Use page objects
const landingPage = new LandingPage(page);
await landingPage.clickCreateGame();

// ❌ BAD: Direct selectors in tests
await page.locator('[data-testid="create-room-button"]').click();
```

### 2. Use Smart Waits
```typescript
// ✅ GOOD: Wait for element
await lobbyPage.waitForElement('[data-testid="room-code"]');

// ❌ BAD: Arbitrary wait
await page.waitForTimeout(5000);
```

### 3. Use Helpers for Common Scenarios
```typescript
// ✅ GOOD: Use helper
const session = await createTwoPlayerGame(context);

// ❌ BAD: Duplicate code
const page1 = await context.newPage();
await page1.goto('/');
// ... 20 lines of setup
```

### 4. Verify Expected State
```typescript
// ✅ GOOD: Verify room code format
await assertValidRoomCode(roomCode);
expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

// ❌ BAD: No validation
const roomCode = await lobbyPage.getRoomCode();
// Assume it's valid
```

### 5. Clean Up Resources
```typescript
// ✅ GOOD: Pages cleaned up automatically by Playwright context

// If creating manual resources:
test.afterEach(async () => {
  // Clean up
});
```

### 6. Use Descriptive Test Names
```typescript
// ✅ GOOD
test('should create a game room and display valid 6-character room code', ...)

// ❌ BAD
test('room test', ...)
```

### 7. Handle Browser Differences
```typescript
// ✅ GOOD
test('feature test', async ({ browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox limitation');
  // ...
});

// ❌ BAD: Assume all browsers same
```

### 8. Use Proper Timeouts
```typescript
// ✅ GOOD: Specify timeouts
await expect(element).toBeVisible({ timeout: 5000 });

// ❌ BAD: Rely on default (may be too short)
await expect(element).toBeVisible();
```

---

## Known Issues

### Critical Issues

#### 1. Game Board Not Loading
**Status**: ❌ Blocking ~40 tests
**Issue**: PixiJS canvas `[data-testid="pixi-app-container"]` not rendering
**Tests Affected**: Movement, Attack, Elements, Loot
**Workaround**: None - feature implementation needed

#### 2. Edge Cases Not Implemented
**Status**: ❌ Blocking ~9 tests
**Features Missing**:
- Player disconnection handling
- Host migration
- Max player limit enforcement (4 players)
- Simultaneous character selection
- Network interruption recovery
- Empty nickname validation

#### 3. Performance Monitoring Not Implemented
**Status**: ❌ Blocking 8 tests
**Missing APIs**:
- FPS measurement
- Load time tracking
- Memory leak detection
- WebSocket latency measurement

### Minor Issues

#### 4. Firefox Clipboard API
**Status**: ⚠️ Known limitation
**Issue**: Firefox doesn't support `clipboard-read` permission
**Workaround**: Skip tests with `test.skip(browserName === 'firefox')`

#### 5. Character Selection Flow Slow
**Status**: ⚠️ Causes timeouts
**Issue**: Character selection to game start transition slow
**Workaround**: Increase timeout to 60s

### Fixed Issues

#### ✅ CORS Errors
**Fixed**: 2025-12-07
**Solution**: Run backend with `NODE_ENV=development`

#### ✅ Room Code Input Length
**Fixed**: 2025-12-07
**Solution**: Use 6-character codes (maxlength=6)

#### ✅ App Title Mismatch
**Fixed**: 2025-12-07
**Solution**: Updated to expect 'Hexhaven Multiplayer'

---

## Test Data Reference

### Valid Test Data
```typescript
// Room codes (6 alphanumeric uppercase)
'ABC123', 'XYZ789', 'TEST01'

// Nicknames (alphanumeric, 1-20 chars)
'Player1', 'Host', 'TestUser'

// Character names
'Brute', 'Tinkerer', 'Spellweaver', 'Scoundrel', 'Cragheart', 'Mindthief'
```

### Invalid Test Data
```typescript
// Invalid room codes (for error testing)
'INVALD'  // Valid format but doesn't exist
'12345'   // Too short
''        // Empty

// Invalid nicknames
''        // Empty
'a'.repeat(21)  // Too long
```

### Common Test IDs
```typescript
// Landing page
'[data-testid="create-room-button"]'
'[data-testid="join-game-button"]'

// Lobby
'[data-testid="nickname-input"]'
'[data-testid="room-code"]'
'[data-testid="room-code-input"]'
'[data-testid="player-list"]'
'[data-testid="start-game-button"]'
'[data-testid="host-indicator"]'
'[data-testid="copy-room-code"]'
'[data-testid="error-message"]'

// Game board
'[data-testid="pixi-app-container"]'
'[data-testid="game-hud"]'
'[data-testid="turn-indicator"]'
```

---

## Quick Reference

### Most Common Commands
```bash
# Run all tests (Firefox only)
npx playwright test --project=firefox --workers=4

# Run specific test file
npx playwright test us1-create-room.spec.ts --project=firefox

# Debug a test
npx playwright test --debug --grep "should create a game room"

# Run with longer timeout
npx playwright test --timeout=60000

# Check test status
npx playwright show-report
```

### Most Used Page Objects
```typescript
// Landing page
const landing = new LandingPage(page);
await landing.navigate();
await landing.clickCreateGame();

// Lobby
const lobby = new LobbyPage(page);
await lobby.enterNickname('Player');
const code = await lobby.getRoomCode();
await lobby.startGame();

// Multiplayer
const session = await createTwoPlayerGame(context);
```

### Most Common Assertions
```typescript
await assertValidRoomCode(roomCode);
await assertPlayerCount(page, 2);
await expect(element).toBeVisible();
await expect(element).toContainText('text');
```

---

## Appendix: File Reference

### Test Files Location
- **Path**: `frontend/tests/e2e/*.spec.ts`
- **Count**: 34 spec files
- **Naming**: `us[N]-[feature].spec.ts` or `[category].spec.ts`

### Page Objects Location
- **Path**: `frontend/tests/pages/*.ts`
- **Count**: 5 page objects
- **Files**: BasePage, LandingPage, LobbyPage, CharacterSelectionPage, GameBoardPage

### Helpers Location
- **Path**: `frontend/tests/helpers/*.ts`
- **Count**: 3 helper modules
- **Files**: multiplayer.ts, assertions.ts, waiters.ts

### Configuration
- **Playwright Config**: `frontend/playwright.config.ts`
- **TypeScript Config**: `frontend/tsconfig.json`

### Documentation
- **Test Docs**: `frontend/tests/*.md`
- **Bug Tracker**: `frontend/tests/bugs.md`
- **This Guide**: `docs/E2E_TESTING_GUIDE_FOR_LLM_AGENTS.md`

---

**End of Guide**

For questions or issues, check:
1. `TEST_FAILURE_ANALYSIS.md` - Current test status
2. `TEST_RUN_SUMMARY.md` - Latest test run results
3. `bugs.md` - Known bugs and issues
