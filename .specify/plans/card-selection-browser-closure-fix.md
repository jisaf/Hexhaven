# Card Selection Browser Closure Bug Fix Plan

## Problem Analysis

### Root Cause
The bug "Card selection failed - Target page, context or browser has been closed" occurs in the E2E test during card selection. Based on my exploration:

1. **Test Flow**: The `comprehensive-game-flow.spec.ts` test creates multiple pages/tabs and performs card selection
2. **Error Context**: The error message "Target page, context or browser has been closed" suggests:
   - Either a page was closed prematurely, OR
   - A navigation occurred that closed the context, OR
   - An asynchronous operation is trying to access a closed page

### Code Flow Analysis

**Frontend (CardSelectionPanel.tsx)**:
- Component renders cards with click handlers
- User clicks 2 cards (selectedTopAction, selectedBottomAction)
- User clicks "Confirm" button → calls `onConfirmSelection()`

**Frontend (GameBoard.tsx:193)**:
- `onConfirmSelection={() => gameStateManager.confirmCardSelection()}`

**Frontend (game-state.service.ts:522-533)**:
```typescript
public confirmCardSelection(): void {
  if (this.state.selectedTopAction && this.state.selectedBottomAction) {
    websocketService.selectCards(this.state.selectedTopAction.id, this.state.selectedBottomAction.id);
    this.addLog([...]);
    this.state.showCardSelection = false;  // ← HIDES PANEL IMMEDIATELY
    this.emitStateUpdate();
  }
}
```

**Backend (game.gateway.ts:1106-1268)**:
- Receives `select_cards` event
- Validates cards
- Calculates initiative
- Stores selected cards on character
- Emits `cards_selected` to all players
- **If all players selected**: calls `startNewRound(roomCode)` (line 1256)

**Backend (game.gateway.ts:1273-1360)**:
- `startNewRound()` builds turn order
- Emits `round_started` event with full game state

### Hypothesis

The issue is likely related to **timing and state transitions**:

1. When `confirmCardSelection()` is called, it immediately sets `showCardSelection = false`
2. This causes React to unmount the CardSelectionPanel
3. The WebSocket `select_cards` is sent asynchronously
4. Backend processes and when all players ready, sends `round_started`
5. Frontend receives `round_started` and transitions game state

**The test is likely failing because**:
- After clicking confirm, the test tries to verify something on the card selection panel
- But the panel is already hidden/unmounted
- Test assertions fail with "Target page, context or browser has been closed"

OR

- The `page.waitForTimeout(2000)` at line 270 is insufficient
- The test moves to the next phase while async operations are still pending
- This causes race conditions with page state

OR

- The test's multi-page setup (player2Page) has issues with concurrent operations
- One page's navigation/state change affects the other page's context

## Proposed Fix Strategy

### Option 1: Add Waiting State to Card Selection (Recommended)
**Impact**: Low
**Complexity**: Low
**User Experience**: Better

Add a "waiting" state after confirmation:
1. After user clicks confirm, show "Waiting for other players..."
2. Keep panel visible but disabled
3. Only hide panel when `round_started` event received
4. This provides better UX and prevents premature unmounting

**Changes**:
- `game-state.service.ts`: Add `waitingForRound` state, don't immediately hide panel
- `CardSelectionPanel.tsx`: Accept `waiting` prop, show loading UI
- `GameBoard.tsx`: Pass waiting state to panel
- Handle `round_started` event to hide panel

### Option 2: Fix Test Synchronization
**Impact**: None (test-only)
**Complexity**: Low
**Risk**: May not fix root cause

Improve test waiting strategy:
1. Wait for specific game state changes instead of fixed timeouts
2. Wait for `round_started` event or turn order display
3. Add better error handling in test

**Changes**:
- `comprehensive-game-flow.spec.ts`: Replace `waitForTimeout` with proper state checks
- Wait for `[data-testid="turn-order-display"]` to appear after card selection

### Option 3: Backend Response Acknowledgment
**Impact**: Medium
**Complexity**: Medium
**Completeness**: High

Add explicit acknowledgment flow:
1. Backend sends `cards_selection_acknowledged` to individual player
2. Frontend waits for this before hiding panel
3. More robust but requires protocol changes

## Recommended Approach

**Use Option 1** with elements of Option 2:

### Implementation Steps

1. **Frontend State Changes (game-state.service.ts)**:
   - Add `waitingForRoundStart: boolean` to GameState
   - In `confirmCardSelection()`: set `waitingForRoundStart = true`, keep `showCardSelection = true`
   - In `handleRoundStarted()`: set `waitingForRoundStart = false`, set `showCardSelection = false`

2. **UI Changes (CardSelectionPanel.tsx)**:
   - Add `waiting?: boolean` prop
   - When `waiting = true`: Disable all controls, show "Waiting for other players..." message
   - Add loading spinner/indicator

3. **GameBoard Changes (GameBoard.tsx)**:
   - Pass `waitingForRoundStart` state to CardSelectionPanel as `disabled` prop
   - May need separate `waiting` prop for better UX

4. **Test Improvements (comprehensive-game-flow.spec.ts)**:
   - After clicking confirm, wait for turn order display: `await expect(page.locator('[data-testid="turn-order-display"]')).toBeVisible({ timeout: 10000 });`
   - Remove arbitrary `waitForTimeout(2000)`
   - Add explicit cleanup in finally block

## Success Criteria

1. Card selection completes without browser/context closure errors
2. Both players can successfully confirm card selection
3. Game transitions to round start smoothly
4. Test passes consistently
5. User sees clear feedback when waiting for other players

## Files to Modify

1. `/home/opc/hexhaven/frontend/src/services/game-state.service.ts` - Add waiting state
2. `/home/opc/hexhaven/frontend/src/components/CardSelectionPanel.tsx` - Add waiting UI
3. `/home/opc/hexhaven/frontend/src/pages/GameBoard.tsx` - Pass waiting state
4. `/home/opc/hexhaven/frontend/tests/e2e/comprehensive-game-flow.spec.ts` - Fix test sync

## Risk Assessment

**Low Risk**: Changes are isolated to card selection flow, no backend protocol changes needed

**Rollback Plan**: Easy - revert the commits

## Alternative Considerations

If Option 1 doesn't work, the issue might be:
- Test-specific browser context management issue
- Need to investigate Playwright page lifecycle
- May need to use `page.waitForResponse()` or `page.waitForEvent()`
