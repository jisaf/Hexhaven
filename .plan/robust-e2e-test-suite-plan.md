# Robust E2E Test Suite - Implementation Plan

**Branch:** `robust-e2e-test-suite`
**Created:** 2025-12-06
**Status:** Planning
**Complexity:** High
**Estimated Effort:** 3-5 days

## Executive Summary

This plan outlines a comprehensive refactoring and enhancement of the existing E2E test suite to address reliability issues and ensure complete coverage of all interactions specified in the PRD and spec documents. The current test suite has 31 E2E specs but suffers from fragile locators, missing test infrastructure patterns, and incomplete coverage of critical user flows.

## Problem Statement

### Current Issues

1. **Test Reliability (Critical)**
   - Tests use fragile text-based selectors (`button:has-text("Create Game")`)
   - Hard-coded `waitForTimeout()` calls cause flakiness
   - Missing test IDs on 9+ critical UI components
   - Session persistence test failing (P0 bug)
   - No retry logic for transient failures

2. **Test Architecture (High)**
   - No Page Object Model (POM) pattern - selectors hardcoded in tests
   - No shared test helpers or utilities
   - Duplicate setup code across test files
   - No consistent error handling or bug reporting

3. **Coverage Gaps (Medium)**
   - Multiplayer synchronization tests limited by infrastructure
   - Canvas/Pixi.js testing strategy incomplete
   - Edge cases from spec not fully tested
   - Performance and accessibility testing absent

4. **Maintainability (High)**
   - Changes to UI text break tests
   - i18n updates require test rewrites
   - Component refactoring requires updating multiple test files
   - No centralized test configuration

## Goals

### Primary Goals

1. **Achieve 95%+ test reliability** - Tests pass consistently on every run
2. **Complete coverage of PRD interactions** - All user stories and edge cases tested
3. **Implement maintainable architecture** - Page Object Model, helpers, and utilities
4. **Fix critical bugs** - Session persistence, missing test IDs, canvas visibility

### Secondary Goals

5. **Enable parallel test execution** - Reduce test suite runtime
6. **Add visual regression testing** - Catch UI regressions automatically
7. **Improve CI/CD integration** - Fast feedback on PRs
8. **Document testing patterns** - Enable team to write reliable tests

## Proposed Solution

### Architecture Overview

```
frontend/tests/
├── e2e/                           # E2E test specs (existing)
│   ├── us1-create-room.spec.ts
│   ├── us2-card-selection.spec.ts
│   └── ... (31 existing specs)
├── pages/                         # NEW: Page Object Model
│   ├── BasePage.ts               # Shared page methods
│   ├── LandingPage.ts            # Home/landing page
│   ├── LobbyPage.ts              # Game lobby
│   ├── GameBoardPage.ts          # Game board canvas
│   ├── CardSelectionPage.ts      # Ability card selection
│   └── CharacterSelectionPage.ts # Character selection
├── helpers/                       # NEW: Shared test utilities
│   ├── game-actions.ts           # Game-specific actions
│   ├── multiplayer.ts            # Multi-player test helpers
│   ├── waitStrategies.ts         # Smart wait functions
│   ├── assertions.ts             # Custom assertions
│   └── bugReporter.ts            # Standardized bug reporting
├── fixtures/                      # NEW: Test fixtures
│   ├── users.ts                  # Test user data
│   ├── scenarios.ts              # Test scenario data
│   └── characters.ts             # Character test data
├── visual/                        # Existing visual tests
│   └── player1-comprehensive-test.cjs
├── configs/                       # Test configurations
│   └── playwright-firefox.config.ts
└── TESTING.md                     # Updated testing guide
```

### Implementation Phases

## Phase 1: Foundation & Critical Fixes (Days 1-2)

### 1.1 Add Missing Test IDs (Priority: P0)

**Target Components:**
1. Create game button → `data-testid="create-game-button"`
2. Join game button → `data-testid="join-game-button"`
3. Start game button → `data-testid="start-game-button"`
4. Character selection cards → `data-testid="character-card-{name}"`
5. Game board canvas container → `data-testid="game-board-container"`
6. Game board canvas → `data-testid="game-board-canvas"`
7. Ability card selection panel → `data-testid="card-selection-panel"`
8. Individual ability cards → `data-testid="ability-card-{index}"`
9. Turn indicator → `data-testid="turn-indicator"`
10. End turn button → `data-testid="end-turn-button"`
11. Game completion screen → `data-testid="game-end-screen"`

**Files to Modify:**
- `frontend/src/pages/LandingPage.tsx` - Create/Join buttons
- `frontend/src/pages/Lobby.tsx` - Start game button
- `frontend/src/components/UserCharacterSelect.tsx` - Character cards
- `frontend/src/game/PixiApp.tsx` - Canvas container
- `frontend/src/components/CardSelection.tsx` - Card selection (if exists)
- Components for turn indicator and end turn button (TBD - need to locate)

**Test ID Naming Convention:**
```tsx
// Pattern: {component}-{element}-{variant?}
data-testid="component-element"
data-testid="component-element-variant"

// Lists: use index or ID
data-testid="player-item-0"
data-testid="character-card-Brute"
```

**Acceptance Criteria:**
- [ ] All 11 critical components have test IDs
- [ ] Test IDs follow naming convention
- [ ] No duplicate test IDs exist
- [ ] Test IDs are stable (not generated dynamically)

### 1.2 Fix Session Persistence Bug (Priority: P0)

**Investigation Steps:**
1. Review `backend/src/services/game-session-coordinator.service.ts`
2. Review `backend/src/services/room-session.service.ts`
3. Check localStorage/sessionStorage usage in frontend
4. Verify WebSocket reconnection logic
5. Test game state serialization/deserialization

**Expected Behavior:**
- Player refreshes page → automatically reconnects to game
- Game state fully restored (turn order, card selection, positions)
- WebSocket reconnection within 5 seconds
- Session persists for 24 hours

**Acceptance Criteria:**
- [ ] Page refresh preserves game state
- [ ] Player UUID persists in localStorage
- [ ] Room code persists in localStorage
- [ ] WebSocket reconnects automatically
- [ ] Game state matches pre-refresh state
- [ ] Test `us4-reconnect.spec.ts` passes

### 1.3 Create Page Object Model Base Classes (Priority: P1)

**File:** `frontend/tests/pages/BasePage.ts`
```typescript
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to a URL
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(
    selector: string,
    options?: { timeout?: number }
  ): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', ...options });
    return element;
  }

  /**
   * Click with retry logic
   */
  async clickWithRetry(
    selector: string,
    maxAttempts: number = 3
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.page.click(selector, { timeout: 5000 });
        return;
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Fill input with validation
   */
  async fillInput(
    selector: string,
    value: string
  ): Promise<void> {
    const input = await this.waitForElement(selector);
    await input.fill(value);

    // Verify value was set
    const filledValue = await input.inputValue();
    if (filledValue !== value) {
      throw new Error(`Failed to fill input. Expected: ${value}, Got: ${filledValue}`);
    }
  }

  /**
   * Take screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `public/test-videos/${name}.png`,
      fullPage: true
    });
  }

  /**
   * Wait for network idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get text content safely
   */
  async getTextContent(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return await element.textContent() || '';
  }
}
```

**Acceptance Criteria:**
- [ ] BasePage class created with core methods
- [ ] All methods have JSDoc comments
- [ ] Error handling included
- [ ] Screenshot helper works
- [ ] Retry logic tested

---

## Phase 2: Page Object Model Implementation (Day 2-3)

### 2.1 Implement LandingPage POM

**File:** `frontend/tests/pages/LandingPage.ts`
```typescript
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LandingPage extends BasePage {
  // Locators
  private readonly createGameButton = '[data-testid="create-game-button"]';
  private readonly joinGameButton = '[data-testid="join-game-button"]';
  private readonly appTitle = 'h1';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to landing page
   */
  async navigate(): Promise<void> {
    await this.goto('/');
    await this.waitForElement(this.appTitle);
  }

  /**
   * Click Create Game button
   */
  async clickCreateGame(): Promise<void> {
    await this.clickWithRetry(this.createGameButton);
  }

  /**
   * Click Join Game button
   */
  async clickJoinGame(): Promise<void> {
    await this.clickWithRetry(this.joinGameButton);
  }

  /**
   * Verify landing page loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await this.waitForElement(this.appTitle);
    await this.waitForElement(this.createGameButton);
    await this.waitForElement(this.joinGameButton);
  }

  /**
   * Get app title text
   */
  async getTitle(): Promise<string> {
    return await this.getTextContent(this.appTitle);
  }
}
```

### 2.2 Implement LobbyPage POM

**File:** `frontend/tests/pages/LobbyPage.ts`
```typescript
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LobbyPage extends BasePage {
  // Locators
  private readonly lobbyContainer = '[data-testid="lobby-page"]';
  private readonly roomCodeDisplay = '[data-testid="room-code"]';
  private readonly nicknameInput = '[data-testid="nickname-input"]';
  private readonly nicknameSubmit = '[data-testid="nickname-submit"]';
  private readonly roomCodeInput = '[data-testid="room-code-input"]';
  private readonly joinButton = '[data-testid="join-room-button"]';
  private readonly playerList = '[data-testid="player-list"]';
  private readonly playerItem = '[data-testid="player-item"]';
  private readonly startGameButton = '[data-testid="start-game-button"]';
  private readonly hostIndicator = '[data-testid="host-indicator"]';
  private readonly copyRoomCodeButton = '[data-testid="copy-room-code"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Enter nickname and submit
   */
  async enterNickname(nickname: string): Promise<void> {
    await this.fillInput(this.nicknameInput, nickname);
    await this.clickWithRetry(this.nicknameSubmit);
  }

  /**
   * Enter room code and join
   */
  async joinRoom(roomCode: string, nickname: string): Promise<void> {
    await this.fillInput(this.roomCodeInput, roomCode);
    await this.fillInput(this.nicknameInput, nickname);
    await this.clickWithRetry(this.joinButton);
  }

  /**
   * Get room code
   */
  async getRoomCode(): Promise<string> {
    await this.waitForElement(this.roomCodeDisplay);
    return await this.getTextContent(this.roomCodeDisplay);
  }

  /**
   * Copy room code to clipboard
   */
  async copyRoomCode(): Promise<void> {
    await this.clickWithRetry(this.copyRoomCodeButton);

    // Verify copy feedback
    await this.waitForElement('text=Copied!');
  }

  /**
   * Wait for player count
   */
  async waitForPlayerCount(count: number): Promise<void> {
    await this.page.waitForFunction(
      (expectedCount) => {
        const players = document.querySelectorAll('[data-testid="player-item"]');
        return players.length === expectedCount;
      },
      count,
      { timeout: 10000 }
    );
  }

  /**
   * Get current player count
   */
  async getPlayerCount(): Promise<number> {
    await this.waitForElement(this.playerList);
    return await this.page.locator(this.playerItem).count();
  }

  /**
   * Start game (host only)
   */
  async startGame(): Promise<void> {
    await this.clickWithRetry(this.startGameButton);
    await this.waitForNetworkIdle();
  }

  /**
   * Verify user is host
   */
  async verifyIsHost(): Promise<void> {
    const indicator = await this.waitForElement(this.hostIndicator);
    await expect(indicator).toBeVisible();
  }

  /**
   * Verify lobby loaded
   */
  async verifyLobbyLoaded(): Promise<void> {
    await this.waitForElement(this.lobbyContainer);
    await this.waitForElement(this.playerList);
  }

  /**
   * Get all player names
   */
  async getPlayerNames(): Promise<string[]> {
    await this.waitForElement(this.playerList);
    const items = await this.page.locator(this.playerItem).all();
    const names: string[] = [];

    for (const item of items) {
      const name = await item.textContent();
      if (name) names.push(name.trim());
    }

    return names;
  }
}
```

### 2.3 Implement GameBoardPage POM

**File:** `frontend/tests/pages/GameBoardPage.ts`
```typescript
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class GameBoardPage extends BasePage {
  // Locators
  private readonly gameBoardContainer = '[data-testid="game-board-container"]';
  private readonly gameBoardCanvas = '[data-testid="game-board-canvas"]';
  private readonly turnIndicator = '[data-testid="turn-indicator"]';
  private readonly endTurnButton = '[data-testid="end-turn-button"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Wait for game board to load and render
   */
  async waitForGameBoard(): Promise<void> {
    await this.waitForElement(this.gameBoardContainer);
    await this.waitForElement(this.gameBoardCanvas);

    // Wait for canvas to have non-zero dimensions
    await this.page.waitForFunction(() => {
      const canvas = document.querySelector('[data-testid="game-board-canvas"]') as HTMLCanvasElement;
      return canvas && canvas.width > 0 && canvas.height > 0;
    }, { timeout: 10000 });
  }

  /**
   * Verify game board is visible
   */
  async verifyBoardVisible(): Promise<void> {
    const container = await this.waitForElement(this.gameBoardContainer);
    await expect(container).toBeVisible();

    const canvas = await this.waitForElement(this.gameBoardCanvas);
    await expect(canvas).toBeVisible();
  }

  /**
   * Click hex tile at coordinates (using canvas coordinates)
   */
  async clickHexTile(x: number, y: number): Promise<void> {
    const canvas = await this.waitForElement(this.gameBoardCanvas);
    await canvas.click({ position: { x, y } });
  }

  /**
   * Get current turn player
   */
  async getCurrentTurnPlayer(): Promise<string> {
    await this.waitForElement(this.turnIndicator);
    return await this.getTextContent(this.turnIndicator);
  }

  /**
   * End turn
   */
  async endTurn(): Promise<void> {
    await this.clickWithRetry(this.endTurnButton);
    await this.waitForNetworkIdle();
  }

  /**
   * Capture game board screenshot
   */
  async captureBoard(filename: string): Promise<void> {
    const canvas = await this.waitForElement(this.gameBoardCanvas);
    await canvas.screenshot({
      path: `public/test-videos/${filename}.png`
    });
  }

  /**
   * Get game state via window object (for testing)
   */
  async getGameState(): Promise<any> {
    return await this.page.evaluate(() => {
      return (window as any).gameStateManager?.getState();
    });
  }

  /**
   * Verify hex tiles exist in game state
   */
  async verifyHexTilesExist(): Promise<void> {
    const gameState = await this.getGameState();
    expect(gameState).toBeDefined();
    expect(gameState.hexTiles).toBeDefined();
    expect(gameState.hexTiles.length).toBeGreaterThan(0);
  }

  /**
   * Wait for monster turn to complete
   */
  async waitForMonsterTurn(): Promise<void> {
    // Wait for turn indicator to update
    await this.page.waitForTimeout(2000);
    await this.waitForNetworkIdle();
  }
}
```

### 2.4 Implement CardSelectionPage POM

**File:** `frontend/tests/pages/CardSelectionPage.ts`
```typescript
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CardSelectionPage extends BasePage {
  // Locators
  private readonly cardPanel = '[data-testid="card-selection-panel"]';
  private readonly abilityCard = '[data-testid^="ability-card-"]';
  private readonly confirmButton = '[data-testid="confirm-cards-button"]';
  private readonly selectedCardIndicator = '.card-selected';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Wait for card selection panel
   */
  async waitForCardSelection(): Promise<void> {
    await this.waitForElement(this.cardPanel);
  }

  /**
   * Select card by index
   */
  async selectCard(index: number): Promise<void> {
    const cardSelector = `[data-testid="ability-card-${index}"]`;
    await this.clickWithRetry(cardSelector);
  }

  /**
   * Select cards by indices
   */
  async selectCards(indices: number[]): Promise<void> {
    for (const index of indices) {
      await this.selectCard(index);
    }
  }

  /**
   * Get number of selected cards
   */
  async getSelectedCardCount(): Promise<number> {
    return await this.page.locator(this.selectedCardIndicator).count();
  }

  /**
   * Confirm card selection
   */
  async confirmSelection(): Promise<void> {
    await this.clickWithRetry(this.confirmButton);
    await this.waitForNetworkIdle();
  }

  /**
   * Select two cards and confirm (standard flow)
   */
  async selectTwoCardsAndConfirm(
    topCardIndex: number,
    bottomCardIndex: number
  ): Promise<void> {
    await this.waitForCardSelection();
    await this.selectCard(topCardIndex);
    await this.selectCard(bottomCardIndex);

    // Verify exactly 2 cards selected
    const count = await this.getSelectedCardCount();
    expect(count).toBe(2);

    await this.confirmSelection();
  }

  /**
   * Get all available cards
   */
  async getAvailableCards(): Promise<number> {
    await this.waitForElement(this.cardPanel);
    return await this.page.locator(this.abilityCard).count();
  }
}
```

### 2.5 Implement CharacterSelectionPage POM

**File:** `frontend/tests/pages/CharacterSelectionPage.ts`
```typescript
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CharacterSelectionPage extends BasePage {
  // Locators
  private readonly characterPanel = '[data-testid="character-selection-panel"]';
  private readonly characterCard = '[data-testid^="character-card-"]';
  private readonly confirmButton = '[data-testid="confirm-character-button"]';

  // Character names
  public readonly CHARACTERS = {
    BRUTE: 'Brute',
    TINKERER: 'Tinkerer',
    SPELLWEAVER: 'Spellweaver',
    SCOUNDREL: 'Scoundrel',
    CRAGHEART: 'Cragheart',
    MINDTHIEF: 'Mindthief'
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Wait for character selection
   */
  async waitForCharacterSelection(): Promise<void> {
    await this.waitForElement(this.characterPanel);
  }

  /**
   * Select character by name
   */
  async selectCharacter(characterName: string): Promise<void> {
    const cardSelector = `[data-testid="character-card-${characterName}"]`;
    await this.clickWithRetry(cardSelector);
  }

  /**
   * Confirm character selection
   */
  async confirmSelection(): Promise<void> {
    await this.clickWithRetry(this.confirmButton);
    await this.waitForNetworkIdle();
  }

  /**
   * Select and confirm character (full flow)
   */
  async selectAndConfirmCharacter(characterName: string): Promise<void> {
    await this.waitForCharacterSelection();
    await this.selectCharacter(characterName);
    await this.confirmSelection();
  }

  /**
   * Get available characters
   */
  async getAvailableCharacters(): Promise<string[]> {
    await this.waitForElement(this.characterPanel);
    const cards = await this.page.locator(this.characterCard).all();
    const characters: string[] = [];

    for (const card of cards) {
      const testId = await card.getAttribute('data-testid');
      if (testId) {
        const name = testId.replace('character-card-', '');
        characters.push(name);
      }
    }

    return characters;
  }
}
```

**Acceptance Criteria:**
- [ ] All 5 page objects implemented
- [ ] All methods have JSDoc comments
- [ ] Smart waits used (no `waitForTimeout`)
- [ ] Error handling included
- [ ] Type-safe locators

---

## Phase 3: Test Helpers & Utilities (Day 3)

### 3.1 Smart Wait Strategies

**File:** `frontend/tests/helpers/waitStrategies.ts`
```typescript
import { Page, Locator } from '@playwright/test';

/**
 * Wait for element to be visible with retry
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  options: { timeout?: number; retries?: number } = {}
): Promise<Locator> {
  const { timeout = 10000, retries = 3 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout });
      return element;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }

  throw new Error(`Element not found: ${selector}`);
}

/**
 * Wait for WebSocket connection
 */
export async function waitForWebSocketConnection(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    () => {
      const ws = (window as any).socket;
      return ws && ws.connected === true;
    },
    { timeout }
  );
}

/**
 * Wait for game state to update
 */
export async function waitForGameStateUpdate(
  page: Page,
  predicate: (state: any) => boolean,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    (pred) => {
      const state = (window as any).gameStateManager?.getState();
      return state && pred(state);
    },
    predicate.toString(),
    { timeout }
  );
}

/**
 * Wait for network idle with timeout
 */
export async function waitForNetworkQuiet(
  page: Page,
  options: { timeout?: number; idleTime?: number } = {}
): Promise<void> {
  const { timeout = 30000, idleTime = 500 } = options;

  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForTimeout(idleTime);
}

/**
 * Wait for element count to match
 */
export async function waitForElementCount(
  page: Page,
  selector: string,
  expectedCount: number,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    ({ sel, count }) => {
      const elements = document.querySelectorAll(sel);
      return elements.length === count;
    },
    { selector, expectedCount },
    { timeout }
  );
}

/**
 * Wait for canvas to render
 */
export async function waitForCanvasReady(
  page: Page,
  canvasSelector: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const canvas = document.querySelector(sel) as HTMLCanvasElement;
      if (!canvas) return false;

      // Check dimensions
      if (canvas.width === 0 || canvas.height === 0) return false;

      // Check if anything is drawn (context exists)
      const ctx = canvas.getContext('2d');
      return ctx !== null;
    },
    canvasSelector,
    { timeout }
  );
}
```

### 3.2 Game Action Helpers

**File:** `frontend/tests/helpers/game-actions.ts`
```typescript
import { Page } from '@playwright/test';
import { GameBoardPage } from '../pages/GameBoardPage';
import { CardSelectionPage } from '../pages/CardSelectionPage';

/**
 * Complete a full turn: select cards, move, attack, end turn
 */
export async function completeTurn(
  page: Page,
  options: {
    topCardIndex: number;
    bottomCardIndex: number;
    movePosition?: { x: number; y: number };
    attackPosition?: { x: number; y: number };
  }
): Promise<void> {
  const cardPage = new CardSelectionPage(page);
  const boardPage = new GameBoardPage(page);

  // Select cards
  await cardPage.selectTwoCardsAndConfirm(
    options.topCardIndex,
    options.bottomCardIndex
  );

  // Wait for board to load
  await boardPage.waitForGameBoard();

  // Move if position specified
  if (options.movePosition) {
    await boardPage.clickHexTile(
      options.movePosition.x,
      options.movePosition.y
    );
  }

  // Attack if position specified
  if (options.attackPosition) {
    await boardPage.clickHexTile(
      options.attackPosition.x,
      options.attackPosition.y
    );
  }

  // End turn
  await boardPage.endTurn();
}

/**
 * Wait for all players to select cards
 */
export async function waitForAllPlayersReady(
  page: Page,
  playerCount: number
): Promise<void> {
  await page.waitForFunction(
    (count) => {
      const state = (window as any).gameStateManager?.getState();
      if (!state || !state.players) return false;

      const readyPlayers = state.players.filter((p: any) => p.cardsSelected);
      return readyPlayers.length === count;
    },
    playerCount,
    { timeout: 30000 }
  );
}

/**
 * Get initiative order from game state
 */
export async function getInitiativeOrder(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    if (!state || !state.turnOrder) return [];

    return state.turnOrder.map((entry: any) => entry.playerId);
  });
}
```

### 3.3 Multiplayer Test Helpers

**File:** `frontend/tests/helpers/multiplayer.ts`
```typescript
import { Page, BrowserContext } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { LobbyPage } from '../pages/LobbyPage';

/**
 * Create a multiplayer game with N players
 */
export async function createMultiplayerGame(
  context: BrowserContext,
  playerCount: number,
  hostNickname: string = 'Host'
): Promise<{
  pages: Page[];
  roomCode: string;
  hostPage: Page;
}> {
  const pages: Page[] = [];

  // Host creates game
  const hostPage = await context.newPage();
  pages.push(hostPage);

  const landingPage = new LandingPage(hostPage);
  const lobbyPage = new LobbyPage(hostPage);

  await landingPage.navigate();
  await landingPage.clickCreateGame();
  await lobbyPage.enterNickname(hostNickname);

  const roomCode = await lobbyPage.getRoomCode();

  // Add additional players
  for (let i = 1; i < playerCount; i++) {
    const playerPage = await context.newPage();
    pages.push(playerPage);

    // Clear localStorage for independent session
    await playerPage.evaluate(() => {
      localStorage.clear();
    });

    const playerLanding = new LandingPage(playerPage);
    const playerLobby = new LobbyPage(playerPage);

    await playerLanding.navigate();
    await playerLanding.clickJoinGame();
    await playerLobby.joinRoom(roomCode, `Player${i + 1}`);
  }

  // Wait for all players to be in lobby
  await lobbyPage.waitForPlayerCount(playerCount);

  return { pages, roomCode, hostPage };
}

/**
 * Synchronize action across multiple players
 */
export async function synchronizedAction(
  pages: Page[],
  action: (page: Page, index: number) => Promise<void>
): Promise<void> {
  await Promise.all(
    pages.map((page, index) => action(page, index))
  );
}

/**
 * Clear all player sessions
 */
export async function clearAllSessions(pages: Page[]): Promise<void> {
  await Promise.all(
    pages.map(page => page.evaluate(() => localStorage.clear()))
  );
}
```

### 3.4 Custom Assertions

**File:** `frontend/tests/helpers/assertions.ts`
```typescript
import { expect, Page } from '@playwright/test';

/**
 * Assert element exists with custom message
 */
export async function assertElementExists(
  page: Page,
  selector: string,
  message?: string
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeVisible({
    timeout: 5000
  });

  if (message) {
    console.log(`✓ ${message}`);
  }
}

/**
 * Assert game state matches condition
 */
export async function assertGameState(
  page: Page,
  predicate: (state: any) => boolean,
  message: string
): Promise<void> {
  const state = await page.evaluate(() => {
    return (window as any).gameStateManager?.getState();
  });

  expect(predicate(state)).toBe(true);
  console.log(`✓ ${message}`);
}

/**
 * Assert WebSocket connected
 */
export async function assertWebSocketConnected(
  page: Page
): Promise<void> {
  const connected = await page.evaluate(() => {
    const ws = (window as any).socket;
    return ws && ws.connected === true;
  });

  expect(connected).toBe(true);
  console.log('✓ WebSocket connected');
}

/**
 * Assert player count
 */
export async function assertPlayerCount(
  page: Page,
  expectedCount: number
): Promise<void> {
  const count = await page.locator('[data-testid="player-item"]').count();
  expect(count).toBe(expectedCount);
  console.log(`✓ Player count: ${expectedCount}`);
}
```

### 3.5 Bug Reporter

**File:** `frontend/tests/helpers/bugReporter.ts`
```typescript
import * as fs from 'fs';
import * as path from 'path';

export interface Bug {
  title: string;
  explanation: string;
  stepsToRecreate: string[];
  expectedBehavior: string;
  actualBehavior?: string;
  screenshot?: string;
  branch?: string;
  testFile?: string;
}

/**
 * Report bug to bugs.md
 */
export async function reportBug(bug: Bug): Promise<void> {
  const bugsFilePath = path.join(__dirname, '../../bugs.md');

  let existingContent = '';
  try {
    existingContent = fs.readFileSync(bugsFilePath, 'utf-8');
  } catch {
    existingContent = '# Known Bugs\n\nThis file tracks bugs found during testing.\n\n';
  }

  // Check for duplicate
  if (existingContent.includes(bug.title)) {
    console.log(`Bug already reported: ${bug.title}`);
    return;
  }

  // Format bug entry
  const bugEntry = `
## - [ ] ${bug.title}

**Explanation:** ${bug.explanation}

**Steps to Recreate:**
${bug.stepsToRecreate.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Expected Behavior:** ${bug.expectedBehavior}

${bug.actualBehavior ? `**Actual Behavior:** ${bug.actualBehavior}` : ''}

${bug.screenshot ? `**Screenshot:** ${bug.screenshot}` : ''}

${bug.branch ? `**Branch:** ${bug.branch}` : ''}

${bug.testFile ? `**Test File:** ${bug.testFile}` : ''}

**Reported:** ${new Date().toISOString()}

---
`;

  fs.appendFileSync(bugsFilePath, bugEntry);
  console.log(`✗ Bug reported: ${bug.title}`);
}
```

**Acceptance Criteria:**
- [ ] All helper modules created
- [ ] Smart wait functions work
- [ ] Game action helpers tested
- [ ] Multiplayer helpers support 2-4 players
- [ ] Custom assertions provide clear output
- [ ] Bug reporter writes to bugs.md

---

## Phase 4: Refactor Existing Tests (Day 4)

### 4.1 Refactor Critical Test Files

**Priority Test Files:**
1. `us1-create-room.spec.ts` - Use LandingPage + LobbyPage
2. `us1-join-room.spec.ts` - Use LandingPage + LobbyPage
3. `us1-start-game.spec.ts` - Use LobbyPage + GameBoardPage
4. `us2-card-selection.spec.ts` - Use CardSelectionPage
5. `us4-reconnect.spec.ts` - Use helpers + POM
6. `comprehensive-game-flow.spec.ts` - Use all POMs

**Refactoring Pattern:**

Before:
```typescript
test('should create game', async ({ page }) => {
  await page.goto('/');
  await page.locator('button:has-text("Create Game")').click();
  await page.locator('[data-testid="nickname-input"]').fill('TestPlayer');
  await page.locator('[data-testid="nickname-submit"]').click();

  const roomCode = await page.locator('[data-testid="room-code"]').textContent();
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
});
```

After:
```typescript
test('should create game', async ({ page }) => {
  const landing = new LandingPage(page);
  const lobby = new LobbyPage(page);

  await landing.navigate();
  await landing.clickCreateGame();
  await lobby.enterNickname('TestPlayer');

  const roomCode = await lobby.getRoomCode();
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
});
```

### 4.2 Replace Fragile Locators

**Find and Replace:**
- `button:has-text("Create Game")` → `[data-testid="create-game-button"]`
- `button:has-text("Join Game")` → `[data-testid="join-game-button"]`
- `button:has-text("Start Game")` → `[data-testid="start-game-button"]`
- `button:has-text("Join")` → `[data-testid="join-room-button"]`

**Tools:**
- Use regex search across all spec files
- Ensure all replacements use test IDs added in Phase 1

### 4.3 Replace Hard-Coded Waits

**Find and Replace:**
- `await page.waitForTimeout(5000)` → `await waitForNetworkQuiet(page)`
- `await page.waitForTimeout(2000)` → Smart wait for element visibility
- `await page.waitForTimeout(3000)` → `await waitForWebSocketConnection(page)`

**Acceptance Criteria:**
- [ ] 6 critical test files refactored
- [ ] All tests use POM pattern
- [ ] No fragile text-based selectors remain
- [ ] No hard-coded timeouts (except for delays needed for animation)
- [ ] All refactored tests pass

---

## Phase 5: New Test Coverage (Day 4-5)

### 5.1 Add Missing Edge Case Tests

Based on spec edge cases:

**File:** `frontend/tests/e2e/edge-cases.spec.ts`
```typescript
import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { LobbyPage } from '../pages/LobbyPage';
import { createMultiplayerGame } from '../helpers/multiplayer';

test.describe('Edge Cases from Spec', () => {
  test('should handle player disconnecting mid-turn during critical action', async ({ page, context }) => {
    // Setup 2-player game
    const { pages, hostPage } = await createMultiplayerGame(context, 2);
    const player2Page = pages[1];

    // Start game and get to attack phase
    // ... setup code ...

    // Player 2 disconnects during attack
    await player2Page.context().setOffline(true);

    // Verify action does not resolve
    // Verify turn is skipped after timeout
  });

  test('should migrate host when host leaves game', async ({ page, context }) => {
    // Setup 3-player game
    // Host leaves
    // Verify host migration to player 2
    // Verify new host can start game
  });

  test('should resolve simultaneous move conflicts server-side', async ({ page, context }) => {
    // Two players try to move to same hex simultaneously
    // Verify server resolves conflict
    // Verify first action wins, second is rejected
  });

  test('should allow continuation after scenario objective completion', async ({ page }) => {
    // Complete scenario objective
    // Verify continue option appears
    // Verify players can keep playing
  });

  test('should handle orientation change without disrupting game state', async ({ page }) => {
    // Start game in portrait
    // Change to landscape
    // Verify layout adapts
    // Verify game state intact
  });

  test('should correct out-of-order actions due to network latency', async ({ page }) => {
    // Simulate latency
    // Verify server maintains authoritative turn order
    // Verify clients receive corrections
  });

  test('should reject joining full game room', async ({ page, context }) => {
    // Create 4-player game (max capacity)
    // 5th player tries to join
    // Verify clear error message
  });

  test('should handle room code expiration', async ({ page }) => {
    // Create game
    // Wait for session timeout (mock)
    // Verify expiration notification
    // Verify return to main menu
  });
});
```

### 5.2 Add Performance Tests

**File:** `frontend/tests/e2e/performance.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Performance Requirements', () => {
  test('should maintain 60 FPS during gameplay', async ({ page }) => {
    // Start game
    // Monitor FPS
    // Verify 60 FPS maintained
  });

  test('should complete player actions within 3 taps on mobile', async ({ page }) => {
    // Count taps for movement
    // Count taps for attack
    // Verify <= 3 taps each
  });

  test('should have real-time updates < 200ms latency', async ({ page, context }) => {
    // Setup multiplayer
    // Measure action → update latency
    // Verify < 200ms
  });

  test('should reconnect within 10 seconds after disconnection', async ({ page }) => {
    // Disconnect
    // Measure reconnection time
    // Verify < 10 seconds
  });

  test('should consume < 150MB memory during active gameplay', async ({ page }) => {
    // Start game
    // Play for 5 minutes
    // Measure memory usage
    // Verify < 150MB
  });
});
```

### 5.3 Add Accessibility Tests

**File:** `frontend/tests/e2e/accessibility.spec.ts`
```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Requirements', () => {
  test('should meet WCAG 2.1 Level AA standards', async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    await checkA11y(page);
  });

  test('should have touch targets >= 44px', async ({ page }) => {
    // Check all interactive elements
    // Verify minimum 44px touch target
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Navigate with Tab key
    // Verify focus indicators
    // Verify all actions keyboard-accessible
  });

  test('should have alt text for all images', async ({ page }) => {
    // Find all images
    // Verify alt attributes exist
  });
});
```

**Acceptance Criteria:**
- [ ] Edge case tests cover all spec scenarios
- [ ] Performance tests verify success criteria
- [ ] Accessibility tests run on CI
- [ ] All new tests pass

---

## Phase 6: CI/CD Integration & Documentation (Day 5)

### 6.1 Update Playwright Config

**File:** `frontend/playwright.config.ts`
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './public/test-videos',

  // Increase workers for parallel execution
  workers: process.env.CI ? 2 : 4,

  // Add retries for flaky tests (temporary)
  retries: process.env.CI ? 2 : 0,

  // Increase timeouts now that we have smart waits
  timeout: 30 * 1000, // 30 seconds
  expect: {
    timeout: 10 * 1000 // 10 seconds
  },

  // Add more projects for cross-device testing
  projects: [
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'pixel-6',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 412, height: 915 },
        hasTouch: true,
        isMobile: true
      }
    },
    {
      name: 'iphone-se',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 }
      }
    },
    {
      name: 'ipad',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 768, height: 1024 }
      }
    }
  ]
});
```

### 6.2 Update Testing Documentation

**File:** `frontend/tests/TESTING.md`

Add sections:
- How to use Page Object Model
- How to write new tests with POMs
- How to use test helpers
- How to run tests locally
- How to debug failing tests
- Test naming conventions
- Test ID naming conventions

### 6.3 Create GitHub Actions Workflow

**File:** `.github/workflows/e2e-tests.yml`
```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd frontend && npm install
          cd ../backend && npm install

      - name: Install Playwright
        run: cd frontend && npx playwright install --with-deps

      - name: Run E2E tests
        run: cd frontend && npm run test:e2e

      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            frontend/public/test-videos/
            frontend/test-results/

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: coverage
          path: frontend/coverage/
```

**Acceptance Criteria:**
- [ ] Playwright config updated for parallelization
- [ ] TESTING.md documentation complete
- [ ] GitHub Actions workflow configured
- [ ] Tests run on every PR
- [ ] Test artifacts uploaded on failure

---

## Testing Strategy

### Test Execution Plan

**Local Development:**
```bash
# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test us1-create-room

# Run with UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Run on specific device
npx playwright test --project=pixel-6
```

**CI/CD:**
- Run on every PR
- Run on push to main
- Parallel execution with 2 workers
- Retry flaky tests 2 times
- Upload artifacts on failure

### Test Data Strategy

**Fixtures:**
- Use consistent test usernames (Player1, Player2, etc.)
- Use predictable room codes for debugging
- Use fixed scenarios for repeatability

**Test Isolation:**
- Clear localStorage between tests
- Use separate browser contexts
- Clean up game rooms after tests

### Canvas Testing Strategy

Since the game board uses Pixi.js (Canvas), we cannot use traditional DOM selectors:

1. **Container-based testing:**
   - Add test IDs to canvas container
   - Test via game state API

2. **Screenshot comparison:**
   - Capture canvas screenshots
   - Compare with baseline images
   - Detect visual regressions

3. **Game state API:**
   - Expose game state on `window` object (dev/test only)
   - Verify state changes instead of visual elements

4. **Accessibility tree:**
   - Use Playwright accessibility snapshot
   - Verify game elements in a11y tree

---

## Risk Mitigation

### Identified Risks

1. **Canvas testing complexity**
   - Mitigation: Use game state API + screenshot comparison

2. **Multiplayer test flakiness**
   - Mitigation: Smart waits, retry logic, isolated contexts

3. **Session persistence bug**
   - Mitigation: Fix in Phase 1, add comprehensive tests

4. **Test execution time**
   - Mitigation: Parallel execution, optimize waits

5. **Test maintenance overhead**
   - Mitigation: Page Object Model, centralized helpers

### Rollback Plan

If refactoring causes test failures:
1. Revert to original test files (keep backups)
2. Apply fixes incrementally
3. Run tests after each change
4. Use feature flags for new test infrastructure

---

## Success Metrics

### Quantitative Metrics

- [ ] **Test Pass Rate:** 95%+ on every run
- [ ] **Test Coverage:** All 7 user stories covered
- [ ] **Test Execution Time:** < 10 minutes for full suite
- [ ] **Bug Detection:** 100% of critical bugs caught by tests
- [ ] **Code Coverage:** 80%+ coverage of game logic
- [ ] **Flaky Test Rate:** < 5% flakiness

### Qualitative Metrics

- [ ] Tests are easy to read and understand
- [ ] Tests are easy to maintain
- [ ] Tests provide clear failure messages
- [ ] New developers can write tests following patterns
- [ ] Tests catch bugs before production

---

## Deliverables

### Code Deliverables

1. **Page Object Model** (5 files)
   - BasePage.ts
   - LandingPage.ts
   - LobbyPage.ts
   - GameBoardPage.ts
   - CardSelectionPage.ts
   - CharacterSelectionPage.ts

2. **Test Helpers** (5 files)
   - waitStrategies.ts
   - game-actions.ts
   - multiplayer.ts
   - assertions.ts
   - bugReporter.ts

3. **Test Fixtures** (3 files)
   - users.ts
   - scenarios.ts
   - characters.ts

4. **Refactored Tests** (6+ files)
   - All critical user story tests refactored

5. **New Tests** (3 files)
   - edge-cases.spec.ts
   - performance.spec.ts
   - accessibility.spec.ts

6. **Component Updates** (11+ files)
   - Add missing test IDs to all critical components

### Documentation Deliverables

1. **Updated TESTING.md**
   - POM usage guide
   - Helper function reference
   - Best practices
   - Debugging guide

2. **Test ID Convention Guide**
   - Naming patterns
   - Examples
   - When to add test IDs

3. **CI/CD Configuration**
   - GitHub Actions workflow
   - Test execution guide

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Foundation | 2 days | Test IDs, Session fix, BasePage |
| Phase 2: Page Objects | 1 day | 5 Page Object classes |
| Phase 3: Helpers | 1 day | 5 helper modules |
| Phase 4: Refactoring | 1 day | 6 refactored tests |
| Phase 5: New Tests | 1 day | Edge cases, performance, a11y |
| Phase 6: CI/CD & Docs | 0.5 day | Config, docs, workflow |
| **Total** | **5.5 days** | **Complete robust test suite** |

---

## Next Steps

1. **Get approval for this plan**
2. **Create branch:** `robust-e2e-test-suite`
3. **Start Phase 1:** Add missing test IDs
4. **Fix session persistence bug**
5. **Implement Page Object Model**
6. **Refactor existing tests**
7. **Add new test coverage**
8. **Update CI/CD and documentation**
9. **Create PR and review**

---

## Questions for Stakeholders

1. **Priority:** Should we focus on fixing existing tests first, or can we proceed with full refactoring?
2. **Canvas Testing:** Are we comfortable with game state API approach for Pixi.js testing?
3. **Performance Tests:** Do we have target FPS/latency metrics confirmed?
4. **Accessibility:** Is WCAG 2.1 Level AA the correct target?
5. **Timeline:** Is 5-6 days acceptable, or do we need to compress?

---

**End of Plan**
