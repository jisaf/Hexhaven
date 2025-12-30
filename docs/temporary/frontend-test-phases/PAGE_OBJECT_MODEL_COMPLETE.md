# Page Object Model Implementation - Phase 2 Complete

**Date:** 2025-12-06
**Status:** ✅ Complete
**Duration:** Day 2-3

## Summary

Implemented complete Page Object Model (POM) pattern with 5 page classes covering all major UI interactions. This eliminates hardcoded selectors from tests and provides a maintainable, type-safe abstraction layer.

## Page Objects Created

### 1. BasePage.ts (Foundation)
**Lines:** 390
**Methods:** 30+

Base class providing shared functionality:
- Smart wait strategies
- Retry logic for flaky elements
- Screenshot helpers
- Network idle waits
- WebSocket connection waiting
- Element interaction utilities
- Validation and error handling

### 2. LandingPage.ts
**Lines:** 67
**Methods:** 6

Represents home page interactions:
- `navigate()` - Go to landing page
- `clickCreateGame()` - Start game creation flow
- `clickJoinGame()` - Start join flow
- `verifyPageLoaded()` - Verify page loaded
- `getTitle()` - Get app title
- `verifyButtonsVisible()` - Check buttons exist

**Key Locators:**
- `h1` - App title
- `[data-testid="create-room-button"]` - Create button
- `[data-testid="join-game-button"]` - Join button

### 3. LobbyPage.ts
**Lines:** 165
**Methods:** 18

Represents lobby interactions:
- `enterNickname(nickname)` - Enter and submit nickname
- `joinRoom(roomCode, nickname)` - Complete join flow
- `getRoomCode()` - Get room code with validation
- `copyRoomCode()` - Copy code to clipboard
- `waitForPlayerCount(count)` - Wait for N players
- `getPlayerCount()` - Get current player count
- `getPlayerNames()` - Get all player names
- `startGame()` - Start game (host only)
- `verifyIsHost()` - Check host status
- `verifyLobbyLoaded()` - Verify lobby loaded
- `isStartGameEnabled()` - Check if can start
- `waitForStartGameEnabled()` - Wait until ready
- `verifyInRoom(roomCode)` - Verify in specific room
- `verifyPlayerInLobby(name)` - Verify player present
- Plus 4 more helper methods

**Key Locators:**
- `[data-testid="lobby-page"]` - Lobby container
- `[data-testid="room-code"]` - Room code display
- `[data-testid="nickname-input"]` - Nickname input
- `[data-testid="start-game-button"]` - Start button
- `[data-testid="player-list"]` - Player list
- `[data-testid="player-item"]` - Individual player

### 4. GameBoardPage.ts
**Lines:** 270
**Methods:** 24

Represents game board interactions:
- `waitForGameBoard()` - Wait for canvas ready
- `verifyBoardVisible()` - Verify board rendered
- `clickHexTile(x, y)` - Click hex at coordinates
- `getCurrentTurnPlayer()` - Get turn indicator text
- `verifyIsMyTurn()` - Check if my turn
- `verifyIsOpponentTurn()` - Check if opponent turn
- `endTurn()` - Click end turn button
- `isEndTurnEnabled()` - Check if can end turn
- `captureBoard(filename)` - Screenshot board
- `getGameState()` - Access window.gameStateManager
- `verifyHexTilesExist()` - Verify map loaded
- `verifyCharactersExist()` - Verify characters loaded
- `verifyMonstersExist()` - Verify monsters loaded
- `waitForMonsterTurn()` - Wait for AI turn
- `verifyGameEnded()` - Check end screen
- `getScenarioResult()` - Get victory/defeat
- `clickPlayAgain()` - Restart game
- `clickReturnToLobby()` - Go back to lobby
- `verifyCanvasRendered()` - Check canvas has content
- `waitForGameLoaded()` - Comprehensive load check
- Plus 4 more methods

**Key Locators:**
- `[data-testid="pixi-app-container"]` - Canvas container
- `[data-testid="turn-indicator"]` - Turn display
- `[data-testid="end-turn-button"]` - End turn button
- `[data-testid="game-end-screen"]` - Victory/defeat screen

### 5. CardSelectionPage.ts
**Lines:** 215
**Methods:** 18

Represents card selection interactions:
- `waitForCardSelection()` - Wait for panel
- `selectCard(index)` - Select by index
- `selectCardById(id)` - Select by ID
- `selectCards(indices)` - Select multiple
- `getSelectedCardCount()` - Count selected
- `confirmSelection()` - Confirm cards
- `clearSelection()` - Clear selection
- `selectTwoCardsAndConfirm(top, bottom)` - Full flow
- `getAvailableCardCount()` - Count total cards
- `isConfirmButtonEnabled()` - Check if can confirm
- `waitForConfirmEnabled()` - Wait until ready
- `isWaitingForOthers()` - Check waiting state
- `waitForSelectionComplete()` - Wait until done
- `getCardNames()` - Get card names (debug)
- `verifyCardCount(n)` - Verify N cards
- `selectFirstNCards(n)` - Select first N
- `quickSelectCards()` - Fast path (cards 0, 1)
- Plus 1 more method

**Key Locators:**
- `[data-testid="card-selection-panel"]` - Panel container
- `[data-testid^="ability-card-"]` - Card wrappers
- `[data-testid="confirm-cards-button"]` - Confirm button
- `.selected` - Selected card class

### 6. CharacterSelectionPage.ts
**Lines:** 265
**Methods:** 20

Represents character selection interactions:
- `waitForCharacterSelection()` - Wait for panel
- `selectCharacter(class)` - Select by class name
- `selectCharacterByIndex(index)` - Select by position
- `getSelectedCharacter()` - Get current selection
- `getAvailableCharacters()` - List available
- `getDisabledCharacters()` - List disabled
- `verifyCharacterAvailable(class)` - Check available
- `verifyCharacterDisabled(class)` - Check disabled
- `getCharacterCount()` - Count total
- `verifyCharacterCount(n)` - Verify N characters
- `selectFirstAvailable()` - Quick select
- `selectRandomAvailable()` - Random selection
- `verifyPanelVisible()` - Check panel shown
- `getCharacterDescription(class)` - Get description
- `getCharacterStats(class)` - Get health/hand size
- `verifyAllBaseCharactersPresent()` - Verify 6 classes
- Plus 4 more methods

**Key Locators:**
- `[data-testid="character-select"]` - Panel container
- `[data-testid^="character-card-"]` - Character cards
- `.selected` - Selected character class
- `.disabled` - Disabled character class

## Architecture Benefits

### Before POM (Fragile)
```typescript
test('should select character', async ({ page }) => {
  await page.goto('/');
  await page.locator('button:has-text("Create Game")').click();
  await page.locator('[data-testid="nickname-input"]').fill('Player1');
  await page.locator('[data-testid="nickname-submit"]').click();
  await page.locator('[data-testid="character-card-Brute"]').click();
});
```

**Problems:**
- Selectors hardcoded in test
- No reusability
- Difficult to maintain
- No type safety
- Unclear intent

### After POM (Robust)
```typescript
test('should select character', async ({ page }) => {
  const landing = new LandingPage(page);
  const lobby = new LobbyPage(page);
  const characterSelect = new CharacterSelectionPage(page);

  await landing.navigate();
  await landing.clickCreateGame();
  await lobby.enterNickname('Player1');
  await characterSelect.selectCharacter('Brute');
});
```

**Benefits:**
- ✅ Selectors encapsulated
- ✅ Highly reusable
- ✅ Easy to maintain
- ✅ Type-safe
- ✅ Clear intent

## Code Organization

```
frontend/tests/pages/
├── BasePage.ts                    # Foundation (390 lines)
├── LandingPage.ts                 # Home page (67 lines)
├── LobbyPage.ts                   # Lobby (165 lines)
├── GameBoardPage.ts               # Game board (270 lines)
├── CardSelectionPage.ts           # Card selection (215 lines)
└── CharacterSelectionPage.ts      # Character selection (265 lines)

Total: 6 files, 1,372 lines
```

## Key Design Patterns

### 1. Inheritance
All page objects extend `BasePage` for shared functionality.

### 2. Encapsulation
UI details hidden behind semantic method names.

### 3. Smart Waits
No arbitrary `waitForTimeout()` - only smart waits:
- `waitForElement()` - Wait for visibility
- `waitForNetworkIdle()` - Wait for requests
- `waitForWebSocketConnection()` - Wait for WS
- `waitForCondition()` - Wait for custom predicate

### 4. Retry Logic
Automatic retries for flaky interactions:
- `clickWithRetry()` - Retry clicks
- Configurable attempts and delays

### 5. Validation
Built-in assertions:
- `fillInput()` - Verifies value was set
- `verifyPageLoaded()` - Checks key elements
- `expectElementCount()` - Asserts count

### 6. Debugging Support
Helpful utilities:
- `screenshot()` - Capture state
- `getGameState()` - Access internal state
- Console logging for key actions

## Usage Examples

### Example 1: Create Game Flow
```typescript
import { LandingPage } from './pages/LandingPage';
import { LobbyPage } from './pages/LobbyPage';

test('create game', async ({ page }) => {
  const landing = new LandingPage(page);
  const lobby = new LobbyPage(page);

  await landing.navigate();
  await landing.clickCreateGame();
  await lobby.enterNickname('Alice');

  const roomCode = await lobby.getRoomCode();
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
});
```

### Example 2: Full Game Flow
```typescript
test('complete game flow', async ({ page }) => {
  const landing = new LandingPage(page);
  const lobby = new LobbyPage(page);
  const charSelect = new CharacterSelectionPage(page);
  const cardSelect = new CardSelectionPage(page);
  const board = new GameBoardPage(page);

  // Setup
  await landing.navigate();
  await landing.clickCreateGame();
  await lobby.enterNickname('Player1');

  // Character selection
  await charSelect.selectCharacter('Brute');
  await lobby.startGame();

  // Card selection
  await cardSelect.selectTwoCardsAndConfirm(0, 1);

  // Gameplay
  await board.waitForGameLoaded();
  await board.verifyIsMyTurn();
  await board.endTurn();
});
```

### Example 3: Multiplayer Test
```typescript
test('two player game', async ({ page, context }) => {
  // Player 1
  const p1Landing = new LandingPage(page);
  const p1Lobby = new LobbyPage(page);

  await p1Landing.navigate();
  await p1Landing.clickCreateGame();
  await p1Lobby.enterNickname('Player1');
  const roomCode = await p1Lobby.getRoomCode();

  // Player 2
  const page2 = await context.newPage();
  const p2Landing = new LandingPage(page2);
  const p2Lobby = new LobbyPage(page2);

  await p2Landing.navigate();
  await p2Landing.clickJoinGame();
  await p2Lobby.joinRoom(roomCode, 'Player2');

  // Verify both players
  await p1Lobby.waitForPlayerCount(2);
  await p2Lobby.waitForPlayerCount(2);
});
```

## Impact on Test Suite

### Maintainability
- **Before:** Selector changes require updating 31 test files
- **After:** Selector changes require updating 1 page object file

### Readability
- **Before:** Tests mix UI details with test logic
- **After:** Tests read like user stories

### Reusability
- **Before:** Common flows duplicated across tests
- **After:** Common flows centralized in page objects

### Type Safety
- **Before:** String selectors, no autocomplete
- **After:** TypeScript methods, full autocomplete

## Next Steps

✅ Phase 2 Complete - Page Object Model implemented
⏭️ Phase 3 - Create 5 test helper modules:
1. `waitStrategies.ts` - Advanced wait functions
2. `game-actions.ts` - Game-specific actions
3. `multiplayer.ts` - Multi-player helpers
4. `assertions.ts` - Custom assertions
5. `bugReporter.ts` - Standardized bug reporting

## Files Created

- `frontend/tests/pages/BasePage.ts`
- `frontend/tests/pages/LandingPage.ts`
- `frontend/tests/pages/LobbyPage.ts`
- `frontend/tests/pages/GameBoardPage.ts`
- `frontend/tests/pages/CardSelectionPage.ts`
- `frontend/tests/pages/CharacterSelectionPage.ts`

**Total:** 6 files, 1,372 lines, 86 methods

## Sign-off

✅ **Phase 2 Complete**
- All 5 page objects implemented
- Comprehensive method coverage
- Type-safe and maintainable
- Ready for test refactoring

**Next:** Phase 3 - Create test helper modules
