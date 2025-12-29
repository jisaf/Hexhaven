# Lifecycle Coordinator Architecture Proposal

**Date**: 2025-11-28
**Status**: PROPOSED
**Branch**: `docs/lifecycle-coordinator-architecture`
**Related Issue**: State Centralization - Session Lifecycle Management

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Problem](#the-problem)
3. [Current Architecture](#current-architecture)
4. [Proposed Solutions Analysis](#proposed-solutions-analysis)
5. [Recommendation](#recommendation)
6. [Implementation Plan](#implementation-plan)
7. [Benefits](#benefits)
8. [Related System Improvements](#related-system-improvements)

---

## Executive Summary

This document proposes a **Lifecycle Coordinator Pattern** to resolve fragility in the game session lifecycle management. The current architecture requires developers to manually coordinate two separate state managers (`RoomSessionManager` and `GameStateManager`) when switching games, leading to bugs when one reset is forgotten.

**Recommendation**: Implement a `GameSessionCoordinator` service that provides a single entry point for all session lifecycle operations, maintaining the existing three-layer architecture while eliminating coordination bugs.

---

## The Problem

### Current Fragility

When switching games, developers must remember to call **both**:
1. `roomSessionManager.switchRoom()` - resets room/lobby state
2. `gameStateManager.reset()` - resets game state

**What happens when developers forget:**

```typescript
// GameBoard.tsx:54-55 - ✅ Correct (both calls)
roomSessionManager.switchRoom();
gameStateManager.reset();

// Lobby.tsx:93 - ❌ Bug! Missing game state reset
roomSessionManager.switchRoom();
```

**Real-world impact**: This bug occurred in the state centralization PR, where the game state reset was forgotten, causing stale data to persist when switching between games.

### Root Cause

This fragility exists because the codebase has **two separate singleton services** managing different aspects of state:
- **RoomSessionManager** - room code, players, lobby status, connection
- **GameStateManager** - turn order, cards, movement, combat, logs

They were built separately without considering their **coupled lifecycle dependencies**.

### Why This Architecture Exists

The separation is intentional and follows good design principles:
- **Single Responsibility** - Each manager has a focused concern
- **Separation of Concerns** - Lobby logic ≠ game logic
- **Modularity** - Room can exist without active game
- **Visual Callback Pattern** - GameStateManager needs rendering callbacks, RoomSessionManager doesn't

However, **lifecycle coupling is implicit rather than explicit**, creating coordination fragility.

---

## Current Architecture

Your codebase implements a **three-layer centralized state management architecture** (documented in `docs/ARCHITECTURE.md`):

```
┌─────────────────────────────────────────────┐
│         React Components (View Layer)       │
│  - Lobby.tsx                                │
│  - GameBoard.tsx                            │
│  - Subscribe to state via hooks             │
│  - Register visual callbacks for rendering  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│    Centralized State Managers (Logic Layer) │
│  ┌─────────────────────────────────────┐   │
│  │  RoomSessionManager                  │   │
│  │  - Room metadata (code, status)     │   │
│  │  - Player list                       │   │
│  │  - Connection status                 │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  GameStateManager                    │   │
│  │  - Game data (characters, monsters)  │   │
│  │  - Turn order and round              │   │
│  │  - Player hand and selected cards    │   │
│  │  - Movement and attack state         │   │
│  │  - Event handlers                    │   │
│  │  - Visual callback triggers          │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌────────────────────┐
│ WebSocket Layer  │   │  Rendering Layer   │
│ - Connection mgmt│   │  - HexGrid (PixiJS)│
│ - Event handling │   │  - Character/      │
│                  │   │    Monster sprites │
└──────────────────┘   └────────────────────┘
```

### Key Architectural Principles

1. **Single Responsibility** - Each manager has one concern
2. **Separation of Concerns** - Networking, business logic, and rendering are decoupled
3. **Visual Callback Pattern** - State management decoupled from rendering
4. **Subscriber Pattern** - Reactive state updates to components
5. **Single Source of Truth** - No duplicate state

---

## Proposed Solutions Analysis

### Option 1: Single Cleanup Method

```typescript
// In RoomSessionManager
public switchRoom(): void {
    this.resetRoomState();
    gameStateManager.reset(); // Automatically reset game state
}
```

#### Pros
- ✅ Simplest fix (minimal code changes)
- ✅ Eliminates fragility immediately
- ✅ Maintains existing architecture

#### Cons
- ❌ **Violates Dependency Inversion Principle** - RoomSessionManager now depends on GameStateManager (creates tight coupling)
- ❌ **Breaks Single Responsibility** - RoomSessionManager shouldn't know about game state
- ❌ **Creates circular dependency risk** - What if GameStateManager needs to access RoomSessionManager?
- ❌ **Makes testing harder** - Must mock GameStateManager when testing RoomSessionManager
- ❌ **Reduces reusability** - Can't use RoomSessionManager independently

#### Verdict
❌ **Not Recommended** - Creates tight coupling and violates SOLID principles

---

### Option 2: Unified Session Manager

```typescript
class SessionManager {
    reset() {
        this.resetRoomState();
        this.resetGameState();
    }
}
```

#### Pros
- ✅ Single source of truth
- ✅ Eliminates coordination bugs

#### Cons
- ❌ **Violates Single Responsibility Principle** - One manager handling lobby AND game concerns
- ❌ **Breaks your existing architecture** - Your ARCHITECTURE.md explicitly documents separation
- ❌ **Massive refactoring required** - Need to merge two well-designed services
- ❌ **Loses modularity** - Room session logic ≠ game logic (room can exist without active game)
- ❌ **Reduces testability** - Harder to test lobby logic in isolation from game logic
- ❌ **Contradicts visual callback pattern** - GameStateManager needs visual callbacks, RoomSessionManager doesn't
- ❌ **Creates a God Object** - Single manager would have 600+ lines of mixed concerns

#### Verdict
❌ **Not Recommended** - Destroys good existing architecture

---

### Option 3: Lifecycle Coordinator (RECOMMENDED)

```typescript
class GameSessionCoordinator {
    // Centralized lifecycle operations
    switchGame() {
        roomSessionManager.switchRoom();
        gameStateManager.reset();
    }

    leaveGame() {
        gameStateManager.reset();
    }

    // Future: can add more coordinated operations
    pauseGame() {
        gameStateManager.pause();
        roomSessionManager.updateStatus('paused');
    }
}
```

#### Pros
- ✅ **Preserves Single Responsibility** - Each manager keeps its focus
- ✅ **Follows your existing architecture** - Maintains three-layer separation
- ✅ **Explicit coordination** - Lifecycle dependencies are visible and documented
- ✅ **Prevents bugs** - Impossible to forget one reset
- ✅ **Testable** - Can mock both managers to test coordination logic
- ✅ **Extensible** - Easy to add more coordinated operations
- ✅ **Follows Facade Pattern** - Simplifies complex subsystem interactions
- ✅ **Maintains modularity** - Managers remain independent and reusable
- ✅ **Low coupling** - Coordinator depends on managers, but managers don't depend on coordinator
- ✅ **Easy to implement** - ~50 lines of code, no refactoring of existing services

#### Cons
- ⚠️ Adds one more service (but this is actually a PRO - explicit is better than implicit)

#### Verdict
✅ **RECOMMENDED** - Best balance of simplicity, maintainability, and architectural integrity

---

## Recommendation

**Implement Option 3: Lifecycle Coordinator with Enhanced Lifecycle Management**

### Proposed Implementation

```typescript
// frontend/src/services/game-session-coordinator.service.ts

/**
 * GameSessionCoordinator
 *
 * Centralized lifecycle coordinator for game sessions.
 * Orchestrates state transitions between RoomSessionManager and GameStateManager.
 *
 * Architecture Pattern: Facade Pattern
 * - Provides simplified interface to complex subsystem (two state managers)
 * - Coordinates lifecycle operations atomically
 * - Single entry point for session lifecycle
 *
 * Responsibilities:
 * - Coordinate lifecycle operations (switch, leave, reset)
 * - Ensure atomic state transitions
 * - Prevent partial state updates
 * - Provide debugging visibility
 *
 * Usage:
 *   gameSessionCoordinator.switchGame();  // When switching to different game
 *   gameSessionCoordinator.leaveGame();   // When leaving game but staying in room
 *   gameSessionCoordinator.resetAll();    // When logging out or hard reset
 */
import { roomSessionManager } from './room-session.service';
import { gameStateManager } from './game-state.service';

interface SessionStatus {
    room: ReturnType<typeof roomSessionManager.getState>;
    game: ReturnType<typeof gameStateManager.getState>;
    timestamp: number;
}

type LifecycleEventType =
    | 'switching_game'
    | 'game_switched'
    | 'leaving_game'
    | 'game_left'
    | 'resetting_all'
    | 'all_reset';

interface LifecycleEvent {
    type: LifecycleEventType;
    timestamp: number;
    status?: SessionStatus;
}

class GameSessionCoordinator {
    private lifecycleHooks: Set<(event: LifecycleEvent) => void> = new Set();

    /**
     * Switch to a new game session
     * Resets both room and game state atomically
     *
     * Use when:
     * - Navigating to lobby to join/create different room
     * - Switching between different game sessions
     * - Initial page load that needs clean slate
     *
     * Order matters:
     * 1. Room first (disconnects from old session)
     * 2. Game second (clears gameplay data)
     */
    public switchGame(): void {
        console.log('[GameSessionCoordinator] Switching game - resetting all state');

        this.emitLifecycleEvent({
            type: 'switching_game',
            timestamp: Date.now(),
            status: this.getSessionStatus()
        });

        try {
            // Order matters: room first (disconnects), then game (clears data)
            roomSessionManager.switchRoom();
            gameStateManager.reset();

            this.emitLifecycleEvent({
                type: 'game_switched',
                timestamp: Date.now(),
                status: this.getSessionStatus()
            });

            console.log('[GameSessionCoordinator] ✅ Switch complete');
        } catch (error) {
            console.error('[GameSessionCoordinator] ❌ Switch failed:', error);
            throw error;
        }
    }

    /**
     * Leave current game but stay in room/lobby
     * Resets game state only, keeps room connection
     *
     * Use when:
     * - Game ends and returning to lobby
     * - Player wants to spectate instead of play
     * - Scenario completion
     */
    public leaveGame(): void {
        console.log('[GameSessionCoordinator] Leaving game - resetting game state');

        this.emitLifecycleEvent({
            type: 'leaving_game',
            timestamp: Date.now()
        });

        try {
            gameStateManager.reset();
            roomSessionManager.clearGameState();

            this.emitLifecycleEvent({
                type: 'game_left',
                timestamp: Date.now()
            });

            console.log('[GameSessionCoordinator] ✅ Left game');
        } catch (error) {
            console.error('[GameSessionCoordinator] ❌ Leave failed:', error);
            throw error;
        }
    }

    /**
     * Complete reset of all session state
     * Resets both room and game state to initial values
     *
     * Use when:
     * - User logs out
     * - Hard reset needed for debugging
     * - Clearing all data for new anonymous session
     */
    public resetAll(): void {
        console.log('[GameSessionCoordinator] Full reset - clearing all state');

        this.emitLifecycleEvent({
            type: 'resetting_all',
            timestamp: Date.now()
        });

        try {
            roomSessionManager.reset();
            gameStateManager.reset();

            this.emitLifecycleEvent({
                type: 'all_reset',
                timestamp: Date.now()
            });

            console.log('[GameSessionCoordinator] ✅ Full reset complete');
        } catch (error) {
            console.error('[GameSessionCoordinator] ❌ Reset failed:', error);
            throw error;
        }
    }

    /**
     * Get combined session status
     * Useful for debugging, logging, and diagnostics
     *
     * @returns Current state of both managers with timestamp
     */
    public getSessionStatus(): SessionStatus {
        return {
            room: roomSessionManager.getState(),
            game: gameStateManager.getState(),
            timestamp: Date.now()
        };
    }

    /**
     * Subscribe to lifecycle events
     * Allows components to react to lifecycle transitions
     *
     * @param handler - Callback function to handle lifecycle events
     * @returns Unsubscribe function
     */
    public onLifecycleEvent(handler: (event: LifecycleEvent) => void): () => void {
        this.lifecycleHooks.add(handler);
        return () => this.lifecycleHooks.delete(handler);
    }

    /**
     * Emit lifecycle event to all subscribers
     * @private
     */
    private emitLifecycleEvent(event: LifecycleEvent): void {
        this.lifecycleHooks.forEach(handler => {
            try {
                handler(event);
            } catch (error) {
                console.error('[GameSessionCoordinator] Error in lifecycle hook:', error);
            }
        });
    }
}

// Export singleton instance
export const gameSessionCoordinator = new GameSessionCoordinator();
```

---

## Implementation Plan

### Phase 1: Create the Coordinator Service

**File**: `frontend/src/services/game-session-coordinator.service.ts`

1. Create the service file with implementation shown above
2. Add comprehensive JSDoc comments
3. Export singleton instance
4. Add TypeScript type exports

**Estimated Effort**: 1 hour

---

### Phase 2: Update Components to Use Coordinator

#### Lobby.tsx

**Before**:
```typescript
// Lobby.tsx:91-94 - CENTRALIZED CLEANUP: Reset room session when arriving at lobby
useEffect(() => {
    console.log('[Lobby] Component mounted - resetting room session for clean state');
    roomSessionManager.switchRoom(); // ❌ Incomplete - missing game state reset
}, []);
```

**After**:
```typescript
// Lobby.tsx - CENTRALIZED CLEANUP: Reset all session state when arriving at lobby
useEffect(() => {
    console.log('[Lobby] Component mounted - resetting session for clean state');
    gameSessionCoordinator.switchGame(); // ✅ Complete atomic operation
}, []);
```

#### GameBoard.tsx

**Before**:
```typescript
// GameBoard.tsx:49-61 - CENTRALIZED CLEANUP: Reset when switching between games
useEffect(() => {
    if (roomCode && !isInitialMount && previousRoomCodeRef.current && previousRoomCodeRef.current !== roomCode) {
        console.log('[GameBoard] Room code changed from', previousRoomCodeRef.current, 'to', roomCode, '- resetting state');
        roomSessionManager.switchRoom(); // ❌ Manual coordination required
        gameStateManager.reset();
    }
    previousRoomCodeRef.current = roomCode;
    if (isInitialMount) {
        setIsInitialMount(false);
    }
}, [roomCode, isInitialMount]);

// GameBoard.tsx:63-69 - CLEANUP: Reset game state when component unmounts
useEffect(() => {
    return () => {
        console.log('[GameBoard] Component unmounting, resetting game state');
        gameStateManager.reset(); // ❌ Only resets game, not room
    };
}, []);
```

**After**:
```typescript
// GameBoard.tsx - CENTRALIZED CLEANUP: Reset when switching between games
useEffect(() => {
    if (roomCode && !isInitialMount && previousRoomCodeRef.current && previousRoomCodeRef.current !== roomCode) {
        console.log('[GameBoard] Room code changed - switching game');
        gameSessionCoordinator.switchGame(); // ✅ Single atomic call
    }
    previousRoomCodeRef.current = roomCode;
    if (isInitialMount) {
        setIsInitialMount(false);
    }
}, [roomCode, isInitialMount]);

// GameBoard.tsx - CLEANUP: Reset game state when component unmounts
useEffect(() => {
    return () => {
        console.log('[GameBoard] Component unmounting');
        gameSessionCoordinator.leaveGame(); // ✅ Appropriate for unmount
    };
}, []);
```

**Estimated Effort**: 30 minutes

---

### Phase 3: Add Import Statements

Update imports in affected components:

```typescript
// Add to imports
import { gameSessionCoordinator } from '../services/game-session-coordinator.service';

// Remove if no longer needed directly:
// import { roomSessionManager } from '../services/room-session.service';
// import { gameStateManager } from '../services/game-state.service';
```

**Note**: Components may still need direct access to managers for state subscription, which is fine. The coordinator is only for **lifecycle operations**, not state access.

**Estimated Effort**: 15 minutes

---

### Phase 4: Update Documentation

1. **Update `docs/ARCHITECTURE.md`**:
   - Add section on GameSessionCoordinator
   - Document coordinator pattern
   - Update component architecture diagram

2. **Create migration guide**:
   - Document when to use coordinator vs. direct manager access
   - Provide examples of common patterns

3. **Add JSDoc examples**:
   - Inline code examples in coordinator service

**Estimated Effort**: 1 hour

---

### Phase 5: Testing (Optional but Recommended)

Create unit tests for the coordinator:

```typescript
// frontend/src/services/__tests__/game-session-coordinator.test.ts

describe('GameSessionCoordinator', () => {
    it('should reset both managers when switching game', () => {
        const roomSpy = jest.spyOn(roomSessionManager, 'switchRoom');
        const gameSpy = jest.spyOn(gameStateManager, 'reset');

        gameSessionCoordinator.switchGame();

        expect(roomSpy).toHaveBeenCalledTimes(1);
        expect(gameSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit lifecycle events', () => {
        const handler = jest.fn();
        const unsubscribe = gameSessionCoordinator.onLifecycleEvent(handler);

        gameSessionCoordinator.switchGame();

        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'switching_game' })
        );
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'game_switched' })
        );

        unsubscribe();
    });
});
```

**Estimated Effort**: 1 hour

---

### Total Implementation Effort

- **Phase 1**: 1 hour (create service)
- **Phase 2**: 30 minutes (update components)
- **Phase 3**: 15 minutes (update imports)
- **Phase 4**: 1 hour (documentation)
- **Phase 5**: 1 hour (testing - optional)

**Total**: 3.75 hours (or 2.75 hours without testing)

---

## Benefits

### 1. Eliminates Coordination Bugs
```typescript
// Before: Easy to forget one
roomSessionManager.switchRoom();
// Oops, forgot gameStateManager.reset()!

// After: Impossible to forget
gameSessionCoordinator.switchGame();
```

### 2. Preserves Existing Architecture

The coordinator adds a thin orchestration layer **without** changing your well-designed managers:

```
Components
    ↓
GameSessionCoordinator (NEW - orchestration only)
    ↓
RoomSessionManager + GameStateManager (UNCHANGED)
    ↓
WebSocket + Rendering
```

### 3. Explicit > Implicit

Lifecycle dependencies are now **visible and documented**:

```typescript
// Clear documentation of what gets reset
public switchGame(): void {
    roomSessionManager.switchRoom(); // 1. Disconnect from room
    gameStateManager.reset();         // 2. Clear game data
}
```

### 4. Single Entry Point

All components use the coordinator for lifecycle operations:

```typescript
// Lobby
gameSessionCoordinator.switchGame();

// GameBoard
gameSessionCoordinator.switchGame();

// Profile (future)
gameSessionCoordinator.resetAll();
```

### 5. Future-Proof

Easy to add new coordinated operations:

```typescript
// Future enhancements
public pauseGame(): void {
    gameStateManager.pause();
    roomSessionManager.updateStatus('paused');
    websocketService.emit('game_paused');
}

public saveGameState(): void {
    const state = this.getSessionStatus();
    localStorage.setItem('savedGame', JSON.stringify(state));
}
```

### 6. Testable

Can test coordination logic independently:

```typescript
it('calls both managers in correct order', () => {
    const calls: string[] = [];

    jest.spyOn(roomSessionManager, 'switchRoom').mockImplementation(() => {
        calls.push('room');
    });
    jest.spyOn(gameStateManager, 'reset').mockImplementation(() => {
        calls.push('game');
    });

    gameSessionCoordinator.switchGame();

    expect(calls).toEqual(['room', 'game']);
});
```

### 7. Debugging Visibility

Centralized logging and status reporting:

```typescript
const status = gameSessionCoordinator.getSessionStatus();
console.log('Current session:', status);
// {
//   room: { roomCode: 'ABC123', status: 'active', ... },
//   game: { currentRound: 3, isMyTurn: true, ... },
//   timestamp: 1234567890
// }
```

---

## Related System Improvements

While implementing the coordinator, consider these related improvements:

### 1. Enhanced Error Handling

```typescript
public async switchGame(): Promise<void> {
    try {
        await roomSessionManager.switchRoom();
        gameStateManager.reset();
    } catch (error) {
        console.error('[Coordinator] Switch failed, attempting rollback', error);
        // Rollback logic if needed
        throw error;
    }
}
```

### 2. State Validation

```typescript
public switchGame(): void {
    // Validate current state before switching
    const currentStatus = this.getSessionStatus();

    if (currentStatus.game.isMyTurn) {
        console.warn('[Coordinator] Switching game during player turn - may lose turn');
    }

    if (currentStatus.room.status === 'active') {
        console.warn('[Coordinator] Leaving active game');
    }

    // Proceed with switch
    roomSessionManager.switchRoom();
    gameStateManager.reset();
}
```

### 3. Unified Cleanup Patterns

Ensure both managers have consistent cleanup methods:

```typescript
// RoomSessionManager
reset()        // Full reset (logout)
switchRoom()   // Switch to different room
clearGameState() // Clear game data only

// GameStateManager
reset()        // Full reset
pause()        // Pause game (future)
resume()       // Resume game (future)
```

### 4. Lifecycle Event Logging

Add structured logging for lifecycle transitions:

```typescript
private logLifecycleTransition(event: LifecycleEvent): void {
    const logEntry = {
        timestamp: event.timestamp,
        type: event.type,
        roomCode: event.status?.room.roomCode,
        roomStatus: event.status?.room.status,
        gameRound: event.status?.game.currentRound,
    };

    console.log('[Lifecycle]', JSON.stringify(logEntry));

    // Could send to analytics service
    // analytics.track('session_lifecycle', logEntry);
}
```

### 5. Transaction-like Guarantees

Ensure atomic state transitions:

```typescript
public switchGame(): void {
    const previousRoomState = roomSessionManager.getState();
    const previousGameState = gameStateManager.getState();

    try {
        roomSessionManager.switchRoom();
        gameStateManager.reset();
    } catch (error) {
        // Rollback on error
        console.error('[Coordinator] Error during switch, rolling back');
        roomSessionManager.setState(previousRoomState);
        gameStateManager.setState(previousGameState);
        throw error;
    }
}
```

---

## Comparison Matrix

| Aspect | Option 1: Single Method | Option 2: Unified Manager | Option 3: Coordinator |
|--------|------------------------|---------------------------|----------------------|
| **Maintains SRP** | ❌ No | ❌ No | ✅ Yes |
| **Preserves Architecture** | ⚠️ Partial | ❌ No | ✅ Yes |
| **Prevents Bugs** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Testability** | ⚠️ Harder | ⚠️ Harder | ✅ Easy |
| **Extensibility** | ❌ Limited | ⚠️ Bloated | ✅ High |
| **Coupling** | ❌ Tight | ❌ High | ✅ Low |
| **Implementation Cost** | ✅ Low | ❌ High | ✅ Low |
| **Refactoring Required** | ✅ Minimal | ❌ Major | ✅ Minimal |
| **Follows SOLID** | ❌ No | ❌ No | ✅ Yes |
| **Future-Proof** | ❌ No | ⚠️ Risky | ✅ Yes |

**Winner**: Option 3 - Lifecycle Coordinator

---

## Conclusion

The **Lifecycle Coordinator Pattern** is the best solution for the session lifecycle fragility problem. It:

1. ✅ Solves the immediate bug (forgotten resets)
2. ✅ Respects your existing architecture
3. ✅ Follows SOLID principles
4. ✅ Provides extensibility for future features
5. ✅ Improves maintainability and testability
6. ✅ Requires minimal implementation effort (3-4 hours)

This approach transforms **implicit lifecycle coupling** into an **explicit, testable, and maintainable pattern** without disrupting your well-designed state management architecture.

---

## Next Steps

1. Review this proposal with the team
2. Create implementation branch
3. Implement GameSessionCoordinator service
4. Update components to use coordinator
5. Add tests
6. Update documentation
7. Create PR for review

---

**Document Status**: ✅ PROPOSAL COMPLETE
**Author**: Claude Code Architecture Analysis
**Review Date**: TBD
**Implementation ETA**: 3-4 hours
