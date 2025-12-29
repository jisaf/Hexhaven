# Objectives System Refactor

## Summary

Refactored the objectives delivery mechanism to eliminate race conditions and improve reliability.

## Problem

**Race Condition**: The `objectives_loaded` event was emitted as a separate WebSocket event BEFORE the GameBoard component mounted and registered its listener, causing objectives to not display on initial game start.

**Timeline of the Bug**:
1. Backend emits `game_started` event
2. Frontend receives event and navigates to GameBoard
3. Backend emits `objectives_loaded` event ❌ (too early!)
4. GameBoard component mounts
5. GameBoard registers `objectives_loaded` listener ❌ (too late!)
6. Objectives event was missed - no objectives displayed

## Solution

Include objectives directly in the `game_started` payload instead of sending them as a separate event.

**New Flow**:
1. Backend emits `game_started` event WITH objectives included
2. Frontend receives event and navigates to GameBoard
3. GameBoard component mounts
4. GameBoard extracts objectives from `gameState.gameData.objectives` ✅
5. Objectives displayed immediately

## Changes Made

### Backend Changes

#### `/home/opc/hexhaven/shared/types/events.ts`
- Added optional `objectives` field to `GameStartedPayload` interface

```typescript
export interface GameStartedPayload {
  scenarioId: string;
  scenarioName: string;
  mapLayout: [...];
  monsters: [...];
  characters: [...];
  objectives?: {  // <-- New field
    primary: {
      id: string;
      description: string;
      trackProgress: boolean;
    };
    secondary: Array<{
      id: string;
      description: string;
      trackProgress: boolean;
      optional: boolean;
    }>;
    failureConditions?: Array<{
      id: string;
      description: string;
    }>;
  };
}
```

#### `/home/opc/hexhaven/backend/src/websocket/game.gateway.ts`

**Two locations updated**:

1. **`handleStartGame` method** (lines 988-1023): Include objectives when emitting `game_started`
2. **`buildGameStatePayload` method** (lines 251-289): Include objectives for player rejoins

**Removed**:
- Old `objectives_loaded` event emissions (lines 538, 2732)
- Unused `objectivesLoadedPayload` variable declarations

### Frontend Changes

#### `/home/opc/hexhaven/frontend/src/pages/GameBoard.tsx`

**Added**:
```typescript
// Extract objectives from game state when it loads (Primary method)
useEffect(() => {
  if (gameState.gameData?.objectives) {
    console.log('[GameBoard] Objectives loaded from game state:', gameState.gameData.objectives);
    setObjectives(gameState.gameData.objectives);
  }
}, [gameState.gameData]);
```

**Removed**:
- Deprecated `objectives_loaded` event listener
- `unsubObjectivesLoaded()` cleanup call

### Build Configuration

#### `/home/opc/hexhaven/backend/tsconfig.build.json`
- Added `**/*test.ts` to exclude patterns (was missing, causing test files to be compiled)

## Verification

✅ Build successful
✅ Backend restarted with changes
✅ Created new game - objectives display immediately
✅ Console confirms: `[GameBoard] Objectives loaded from game state`
✅ UI shows both primary and secondary objectives correctly

## Benefits

1. **No Race Conditions**: Objectives are guaranteed to be available when component mounts
2. **Simpler Architecture**: Related data (scenario + objectives) sent together
3. **Better Performance**: One fewer WebSocket event emission
4. **Easier Debugging**: All scenario data arrives in one payload

## Backwards Compatibility

The `ObjectivesLoadedPayload` type is still used for the `objectives` state variable, maintaining type safety. The structure remains identical - only the delivery mechanism changed.

## Migration Notes

- Frontend still uses `ObjectivesLoadedPayload` type for state
- The optional `objectives` field ensures backwards compatibility if needed
- No database schema changes required
- No client code changes required outside of GameBoard component

## Date

2025-12-07
