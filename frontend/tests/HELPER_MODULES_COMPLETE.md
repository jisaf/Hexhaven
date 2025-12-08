# Test Helper Modules - Phase 3 Complete

**Date:** 2025-12-06
**Status:** ✅ Complete
**Duration:** Day 3

## Summary

Created 5 specialized helper modules providing advanced testing utilities, game-specific actions, multiplayer support, custom assertions, and standardized bug reporting. These modules complement the Page Object Model and significantly reduce code duplication across tests.

## Helper Modules Created

### 1. waitStrategies.ts
**Lines:** 425
**Functions:** 26

Advanced waiting functions for complex conditions:
- `waitForVisible()` - Element visibility with retry
- `waitForWebSocketConnection()` - Wait for WS connected
- `waitForWebSocketDisconnect()` - Wait for WS disconnected
- `waitForGameStateUpdate()` - Wait for state predicate
- `waitForNetworkQuiet()` - Network idle with buffer
- `waitForElementCount()` - Wait for exact count
- `waitForMinimumElementCount()` - Wait for minimum count
- `waitForCanvasReady()` - Canvas dimensions + context
- `waitForCanvasContent()` - Canvas has rendered pixels
- `waitForText()` - Text appears on page
- `waitForTextToDisappear()` - Text disappears
- `waitForUrlMatch()` - URL matches pattern
- `waitForLocalStorageKey()` - Key exists
- `waitForLocalStorageValue()` - Key has value
- `waitForCondition()` - Custom condition with polling
- `waitForAll()` - All promises settle
- `waitExponentialBackoff()` - Retry with backoff
- `smartWait()` - Combined strategies
- Plus 8 more functions

**Key Features:**
- No hard-coded timeouts
- Intelligent retry logic
- WebSocket-aware
- Canvas testing support
- LocalStorage monitoring

### 2. game-actions.ts
**Lines:** 385
**Functions:** 24

High-level game flow helpers:
- `completeTurn()` - Full turn (cards + actions + end)
- `waitForAllPlayersReady()` - Monitor player readiness
- `getInitiativeOrder()` - Get turn order
- `getCurrentPlayer()` - Get active player ID
- `isPlayerTurn()` - Check if player's turn
- `waitForPlayerTurn()` - Wait for specific turn
- `setupCharacter()` - Select character in lobby
- `quickSetupCharacter()` - Select first available
- `getCharacterPosition()` - Get hex coordinates
- `getMonsterPosition()` - Get monster coordinates
- `getCharacterHealth()` - Get HP
- `getMonsterHealth()` - Get monster HP
- `getAllCharacters()` - List all characters
- `getAllMonsters()` - List all monsters
- `countAliveMonsters()` - Count alive monsters
- `countAliveCharacters()` - Count alive characters
- `isScenarioComplete()` - Check end condition
- `waitForScenarioComplete()` - Wait for end
- `playNTurns()` - Fast-forward N turns
- `getAvailableMovementHexes()` - Get valid moves
- `getAvailableAttackHexes()` - Get valid attacks
- `isInAttackMode()` - Check attack state
- `getSelectedHex()` - Get selected hex
- `waitForMonsterAIComplete()` - Wait for AI turn

**Key Features:**
- One-stop turn execution
- Game state introspection
- Coordinate with multiplayer
- Fast-forward gameplay
- AI turn handling

### 3. multiplayer.ts
**Lines:** 410
**Functions:** 20

Multiplayer game testing utilities:
- `createMultiplayerGame()` - Create N-player game
- `setupCharactersForAll()` - All players select
- `startMultiplayerGame()` - Host starts game
- `synchronizedAction()` - Parallel execution
- `sequentialAction()` - Sequential execution
- `clearAllSessions()` - Reset localStorage
- `getPlayerByNickname()` - Find player
- `getPlayerByIndex()` - Get by index
- `getNonHostPlayers()` - Filter non-hosts
- `closeNonHostPlayers()` - Close extra pages
- `waitForAllPlayersOnPage()` - Sync navigation
- `screenshotAllPlayers()` - Capture all states
- `verifyAllPlayersInSameRoom()` - Check room codes match
- `verifyAllPlayersSeeEachOther()` - Check player lists
- `simulateDisconnect()` - Test reconnection
- `createTwoPlayerGame()` - Quick 2-player setup
- `createFourPlayerGame()` - Max capacity test
- Plus 3 more utilities

**Interfaces:**
```typescript
interface PlayerSession {
  page: Page;
  nickname: string;
  index: number;
  isHost: boolean;
}

interface MultiplayerGameSession {
  players: PlayerSession[];
  roomCode: string;
  hostPage: Page;
}
```

**Key Features:**
- Automatic player management
- Synchronized/sequential actions
- Session isolation
- Disconnect/reconnect testing
- Screenshot coordination

### 4. assertions.ts
**Lines:** 520
**Functions:** 41

Domain-specific assertion functions:
- `assertElementExists()` - Element visible
- `assertElementNotExists()` - Element absent
- `assertGameState()` - State predicate
- `assertWebSocketConnected()` - WS connected
- `assertWebSocketDisconnected()` - WS disconnected
- `assertPlayerCount()` - N players
- `assertPlayerInLobby()` - Specific player
- `assertValidRoomCode()` - 6-char format
- `assertCharacterSelected()` - Character chosen
- `assertCharacterDisabled()` - Character unavailable
- `assertCardsSelected()` - N cards selected
- `assertIsMyTurn()` - My turn indicator
- `assertIsOpponentTurn()` - Opponent turn
- `assertGameBoardLoaded()` - Board + canvas
- `assertHexTilesExist()` - Map loaded
- `assertCharactersExist()` - Characters loaded
- `assertMonstersExist()` - Monsters loaded
- `assertScenarioComplete()` - Game ended
- `assertScenarioResult()` - Victory/defeat
- `assertLocalStorageKey()` - Key exists
- `assertLocalStorageValue()` - Key = value
- `assertUrlMatches()` - URL pattern
- `assertTextVisible()` - Text on page
- `assertTextNotVisible()` - Text absent
- `assertHasClass()` - CSS class present
- `assertNotHasClass()` - CSS class absent
- `assertButtonEnabled()` - Button clickable
- `assertButtonDisabled()` - Button disabled
- `assertElementCount()` - Exact count
- `assertMinimumElementCount()` - At least N
- `assertErrorMessage()` - Error shown
- `assertNoError()` - No errors
- Plus 9 more assertions

**Key Features:**
- Clear, descriptive names
- Console logging
- Game-specific checks
- WebSocket monitoring
- State validation

### 5. bugReporter.ts
**Lines:** 385
**Functions:** 15

Standardized bug reporting:
- `reportBug()` - Write to bugs.md
- `reportBugWithScreenshot()` - Auto-capture screenshot
- `reportBugWithGameState()` - Include game context
- `reportTestFailure()` - Convert test error
- `createAssertionBug()` - From assertion failure
- `reportMultipleBugs()` - Batch reporting
- `clearBugsFile()` - Reset bugs.md
- `getBugCount()` - Count reported bugs
- `getBugTitles()` - List bug titles
- `wasBugReported()` - Check duplicate
- `createP0Bug()` - Critical bug helper
- `createP1Bug()` - High priority helper
- Plus 3 more utilities

**Bug Interface:**
```typescript
interface Bug {
  title: string;
  explanation: string;
  stepsToRecreate: string[];
  expectedBehavior: string;
  actualBehavior?: string;
  screenshot?: string;
  severity?: 'P0' | 'P1' | 'P2' | 'P3';
  branch?: string;
  testFile?: string;
  relatedFiles?: string[];
  additionalContext?: Record<string, any>;
}
```

**Key Features:**
- Duplicate detection
- Markdown formatting
- Screenshot attachment
- Game state capture
- Severity classification

## Code Organization

```
frontend/tests/helpers/
├── waitStrategies.ts      # 26 functions, 425 lines
├── game-actions.ts        # 24 functions, 385 lines
├── multiplayer.ts         # 20 functions, 410 lines
├── assertions.ts          # 41 functions, 520 lines
└── bugReporter.ts         # 15 functions, 385 lines

Total: 5 files, 126 functions, 2,125 lines
```

## Usage Examples

### Example 1: Complete Turn with Helpers
```typescript
import { completeTurn } from './helpers/game-actions';
import { assertIsMyTurn, assertGameBoardLoaded } from './helpers/assertions';
import { waitForGameBoard } from './helpers/waitStrategies';

test('complete turn', async ({ page }) => {
  // Wait for board
  await waitForGameBoard(page, '[data-testid="pixi-app-container"]');

  // Verify ready
  await assertGameBoardLoaded(page);
  await assertIsMyTurn(page);

  // Execute turn
  await completeTurn(page, {
    topCardIndex: 0,
    bottomCardIndex: 1,
    movePosition: { x: 100, y: 100 },
  });
});
```

### Example 2: Multiplayer Test with Helpers
```typescript
import { createMultiplayerGame, setupCharactersForAll, startMultiplayerGame } from './helpers/multiplayer';
import { verifyAllPlayersInSameRoom } from './helpers/multiplayer';

test('two player game', async ({ context }) => {
  // Create game
  const session = await createMultiplayerGame(context, 2);

  // Verify all players joined
  await verifyAllPlayersInSameRoom(session);

  // Setup characters
  await setupCharactersForAll(session, ['Brute', 'Tinkerer']);

  // Start game
  await startMultiplayerGame(session);
});
```

### Example 3: Bug Reporting with Helpers
```typescript
import { reportBugWithGameState } from './helpers/bugReporter';

test('test with bug reporting', async ({ page }) => {
  try {
    // Test logic...
  } catch (error) {
    await reportBugWithGameState(page, {
      title: 'Game state not loading',
      explanation: 'Game board fails to load after starting game',
      stepsToRecreate: [
        'Create game',
        'Select character',
        'Start game',
        'Observe empty board',
      ],
      expectedBehavior: 'Game board should load with hex tiles',
      severity: 'P0',
    }, { includeScreenshot: true });

    throw error;
  }
});
```

### Example 4: Smart Waits
```typescript
import { waitForWebSocketConnection, waitForCanvasReady, waitForGameStateUpdate } from './helpers/waitStrategies';

test('game loads correctly', async ({ page }) => {
  // Wait for WebSocket
  await waitForWebSocketConnection(page);

  // Wait for canvas
  await waitForCanvasReady(page, '[data-testid="pixi-app-container"] canvas');

  // Wait for game state
  await waitForGameStateUpdate(
    page,
    (state) => state.gameData && state.gameData.mapLayout.length > 0
  );
});
```

## Benefits

### Code Reusability
- **Before:** Duplicate game flow logic in every test
- **After:** Single `completeTurn()` function used everywhere

### Readability
- **Before:** Low-level Playwright calls mixed with test logic
- **After:** High-level semantic functions

### Maintainability
- **Before:** Changes to game flow require updating all tests
- **After:** Update one helper function

### Debugging
- **Before:** Manual screenshot capture, no structured bug reports
- **After:** Automatic bug reporting with context

### Multiplayer Testing
- **Before:** Complex manual browser context management
- **After:** One-line `createMultiplayerGame(context, 2)`

## Impact on Test Suite

### Lines of Code Reduction
- **Estimated:** 60% reduction in test file size
- **Example:** 100-line test → 40 lines with helpers

### Test Reliability
- **Smart waits:** Eliminate arbitrary timeouts
- **Retry logic:** Handle transient failures
- **State validation:** Catch issues early

### Developer Experience
- **Autocomplete:** Full TypeScript support
- **Discoverability:** Named functions vs inline code
- **Documentation:** JSDoc comments on every function

## Next Steps

✅ Phase 3 Complete - Test helper modules created
⏭️ Phase 4 - Refactor all 31 existing E2E tests:
- Apply Page Object Model
- Replace fragile selectors
- Use helper functions
- Remove hard-coded waits
- Add proper error handling

## Files Created

- `frontend/tests/helpers/waitStrategies.ts`
- `frontend/tests/helpers/game-actions.ts`
- `frontend/tests/helpers/multiplayer.ts`
- `frontend/tests/helpers/assertions.ts`
- `frontend/tests/helpers/bugReporter.ts`

**Total:** 5 files, 126 functions, 2,125 lines

## Sign-off

✅ **Phase 3 Complete**
- All 5 helper modules implemented
- 126 utility functions created
- Comprehensive test support infrastructure
- Ready to refactor existing tests

**Next:** Phase 4 - Refactor all 31 existing E2E tests

---

## Progress Summary (Phases 1-3)

**Completed:**
- ✅ Phase 1.1: Test IDs added (8 components)
- ✅ Phase 1.2: Session persistence fixed (P0 bug)
- ✅ Phase 1.3: BasePage created (390 lines)
- ✅ Phase 2: Page Objects created (6 files, 1,372 lines, 86 methods)
- ✅ Phase 3: Helper modules created (5 files, 2,125 lines, 126 functions)

**Total Progress:**
- **Files Created:** 19
- **Lines of Code:** ~4,500
- **Functions/Methods:** 212+
- **Test Infrastructure:** Complete foundation

**Remaining:**
- ⏭️ Phase 4: Refactor 31 tests
- ⏭️ Phase 5: New test coverage
- ⏭️ Phase 6: CI/CD & documentation
