# WebSocket & State Centralization Progress Evaluation

**Date**: 2025-11-27
**Branch**: `refactor/centralize-websocket-state-v2`
**Evaluator**: Claude Code Analysis

---

## Executive Summary

The effort to centralize WebSocket connections and state management has made **significant progress** but is **only 40% complete**. The foundational architecture (RoomSessionManager, WebSocketService) is solid and well-designed, but the GameBoard component still maintains extensive local state that should be centralized.

### Progress Score: 🟡 **4/10** (In Progress)

**What's Working Well:**
✅ Excellent RoomSessionManager architecture
✅ Clean WebSocket service with event queuing
✅ Lobby successfully uses centralized state
✅ Proper subscriber pattern implementation

**Critical Gaps:**
❌ GameBoard has 15+ local state variables that duplicate centralized state
❌ Game event handlers scattered across multiple hooks
❌ No centralized game state manager (only room session manager)
❌ Inconsistent patterns between Lobby and GameBoard

---

## Detailed Analysis

### 1. WebSocket Service Centralization ✅ **GOOD**

**Status**: Well-implemented singleton service

**Strengths:**
- Clean event registration with automatic queuing
- Proper cleanup with unsubscribe functions
- Connection status management
- Automatic reconnection with exponential backoff
- Intent logging for debugging

**Code Quality**: `websocket.service.ts:95-450`
```typescript
class WebSocketService {
  private eventHandlers: Map<string, Set<any>> = new Map();
  private registeredEvents: Set<string> = new Set();

  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    // ✅ Returns unsubscribe function
    // ✅ Queues handlers if not connected
    // ✅ Prevents duplicate socket listeners
  }
}
```

**Areas for Improvement:**
- None significant - this service is well-architected

---

### 2. Room Session Management ✅ **GOOD**

**Status**: Well-implemented centralized manager

**Strengths:**
- Single source of truth for room state
- Prevents duplicate joins with `hasJoinedInSession` flag
- Subscriber pattern for reactive updates
- Clear intent tracking (`create`, `join`, `rejoin`, `refresh`)
- Proper separation of concerns

**Code Quality**: `room-session.service.ts:91-408`
```typescript
class RoomSessionManager {
  private state: RoomSessionState;
  private hasJoinedInSession = false;
  private subscribers: Set<StateUpdateCallback> = new Set();

  public async ensureJoined(intent: JoinIntent): Promise<void> {
    // ✅ Idempotent - prevents duplicates
    // ✅ Waits for WebSocket connection
    // ✅ Emits state updates to subscribers
  }
}
```

**What It Manages:**
- ✅ Room code, status, player role
- ✅ Player list
- ✅ Connection status
- ⚠️ Basic game state (GameStartedPayload)

**What It Doesn't Manage (Should It?):**
- ❌ Turn order
- ❌ Current round
- ❌ Current turn entity
- ❌ Movement state
- ❌ Card selection state
- ❌ Attack mode state
- ❌ Game logs

---

### 3. Lobby Component ✅ **EXCELLENT**

**Status**: Fully centralized, minimal local state

**State Analysis**: `Lobby.tsx:56-67`
```typescript
// Local UI state (appropriate for component level)
const [mode, setMode] = useState<LobbyMode>('initial');
const [selectedCharacter, setSelectedCharacter] = useState<CharacterClass>();
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// ✅ Uses centralized state
const sessionState = useRoomSession();
const room = sessionState.roomCode ? { roomCode: sessionState.roomCode } : null;
const players = sessionState.players;
```

**Event Handling**: Delegates to RoomSessionManager
```typescript
const handleCreateRoom = () => {
  await roomSessionManager.createRoom(playerNickname); // ✅ Centralized
};

const handleJoinRoom = (roomCode, nickname) => {
  await roomSessionManager.joinRoom(roomCode, nickname); // ✅ Centralized
};
```

**Assessment**: **This is the pattern that GameBoard should follow.**

---

### 4. GameBoard Component ❌ **NEEDS MAJOR REFACTORING**

**Status**: Heavily component-level, defeats centralization effort

**State Explosion**: `GameBoard.tsx:92-122`
```typescript
// ❌ ALL of this should be centralized in a GameStateManager

const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
const [selectedHex, setSelectedHex] = useState<Axial | null>(null);
const [myCharacterId, setMyCharacterId] = useState<string | null>(null);
const [isMyTurn, setIsMyTurn] = useState(false);
const [connectionStatus, setConnectionStatus] = useState(...);
const [logs, setLogs] = useState<LogMessage[]>([]);
const [gameData, setGameData] = useState<GameStartedPayload | null>(null); // ❌ DUPLICATE
const [turnOrder, setTurnOrder] = useState<TurnEntity[]>([]);
const [currentRound, setCurrentRound] = useState(0);
const [currentTurnEntityId, setCurrentTurnEntityId] = useState<string | null>(null);
const [currentMovementPoints, setCurrentMovementPoints] = useState(0);
const [validMovementHexes, setValidMovementHexes] = useState<Axial[]>([]);
const [playerHand, setPlayerHand] = useState<AbilityCard[]>([]);
const [showCardSelection, setShowCardSelection] = useState(false);
const [selectedTopAction, setSelectedTopAction] = useState<AbilityCard | null>(null);
const [selectedBottomAction, setSelectedBottomAction] = useState<AbilityCard | null>(null);
const [attackMode, setAttackMode] = useState(false);
const [attackableTargets, setAttackableTargets] = useState<string[]>([]);
```

**Problems:**
1. **State Duplication**: `gameData` is stored BOTH in RoomSessionManager AND GameBoard
2. **Lost on Navigation**: All this state is lost if user navigates away and back
3. **No Persistence**: Page refresh loses all game state
4. **Testing Difficulty**: Can't test game logic without mounting full component
5. **Race Conditions**: State updates from WebSocket events can conflict with local updates

**Event Handler Sprawl**: `GameBoard.tsx:263-493`
```typescript
// ❌ 11 separate event handlers defined in component
const handleGameStarted = useCallback(...);
const handleCharacterMoved = useCallback(...);
const handleRoundStarted = useCallback(...);
const handleRoundEnded = useCallback(...);
const handleTurnStarted = useCallback(...);
const handleGameStateUpdate = useCallback(...);
const handleConnectionStatusChange = useCallback(...);
const handleMonsterActivated = useCallback(...);
const handleAttackResolved = useCallback(...);
// ... etc
```

**What Should Happen:**
These handlers should be in a **GameStateManager** service that:
- Receives WebSocket events
- Updates centralized game state
- Emits state changes to subscribers
- GameBoard subscribes and renders based on state

---

## Architecture Comparison

### Current Architecture (Partial Centralization)

```
┌─────────────────────────────────────────────────────┐
│                    LOBBY COMPONENT                  │
│  ✅ Minimal local state (UI only)                   │
│  ✅ Uses useRoomSession()                           │
│  ✅ Delegates actions to RoomSessionManager         │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              ROOM SESSION MANAGER ✅                 │
│  - Room code, status, players                       │
│  - Basic game state (GameStartedPayload)            │
│  - Subscriber pattern                               │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              WEBSOCKET SERVICE ✅                    │
│  - Connection management                            │
│  - Event registration/cleanup                       │
│  - Reconnection logic                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                 GAMEBOARD COMPONENT                 │
│  ❌ 15+ local state variables                       │
│  ❌ 11 event handlers defined inline                │
│  ❌ Duplicates RoomSessionManager.gameState         │
│  ❌ No persistence across navigation                │
└─────────────────────────────────────────────────────┘
```

### Recommended Architecture (Full Centralization)

```
┌─────────────────────────────────────────────────────┐
│                    LOBBY COMPONENT                  │
│  ✅ Minimal local state (UI only)                   │
│  ✅ Uses useRoomSession()                           │
└─────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────┐
│                 GAMEBOARD COMPONENT                 │
│  ✅ Minimal local state (UI only)                   │
│  ✅ Uses useGameState()                             │
│  ✅ No event handlers                               │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              ROOM SESSION MANAGER ✅                 │
│  - Room metadata                                    │
│  - Player list                                      │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              GAME STATE MANAGER 🆕                   │
│  - Game data (characters, monsters, map)            │
│  - Turn state (round, turn order, current entity)   │
│  - Player state (hand, selected cards, my turn)     │
│  - UI state (logs, movement range, attack mode)     │
│  - Event handlers (all 11 handlers moved here)      │
│  - Subscriber pattern (components subscribe)        │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              WEBSOCKET SERVICE ✅                    │
│  - Connection management                            │
│  - Event registration                               │
└─────────────────────────────────────────────────────┘
```

---

## Specific Recommendations

### 1. Create GameStateManager Service ⚠️ **HIGH PRIORITY**

**File**: `frontend/src/services/game-state.service.ts`

```typescript
interface GameState {
  // Core game data
  gameData: GameStartedPayload | null;

  // Turn management
  currentRound: number;
  turnOrder: TurnEntity[];
  currentTurnEntityId: string | null;
  isMyTurn: boolean;

  // Player state
  myCharacterId: string | null;
  playerHand: AbilityCard[];
  selectedTopAction: AbilityCard | null;
  selectedBottomAction: AbilityCard | null;

  // Movement state
  selectedCharacterId: string | null;
  selectedHex: Axial | null;
  currentMovementPoints: number;
  validMovementHexes: Axial[];

  // Combat state
  attackMode: boolean;
  attackableTargets: string[];

  // UI state
  logs: LogMessage[];
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  showCardSelection: boolean;
}

class GameStateManager {
  private state: GameState = { /* defaults */ };
  private subscribers: Set<(state: GameState) => void> = new Set();

  constructor() {
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners(): void {
    websocketService.on('game_started', this.handleGameStarted.bind(this));
    websocketService.on('character_moved', this.handleCharacterMoved.bind(this));
    websocketService.on('round_started', this.handleRoundStarted.bind(this));
    websocketService.on('turn_started', this.handleTurnStarted.bind(this));
    websocketService.on('monster_activated', this.handleMonsterActivated.bind(this));
    websocketService.on('attack_resolved', this.handleAttackResolved.bind(this));
    // ... all other events
  }

  private handleGameStarted(data: GameStartedPayload): void {
    // Update state
    this.state.gameData = data;
    this.state.currentRound = 1;

    // Find my character
    const playerUUID = websocketService.getPlayerUUID();
    const myChar = data.characters.find(c => c.playerId === playerUUID);
    if (myChar) {
      this.state.myCharacterId = myChar.id;
      this.state.playerHand = myChar.abilityDeck || [];
    }

    // Emit to subscribers
    this.emitStateUpdate();
  }

  // ... all other event handlers

  public subscribe(callback: (state: GameState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public reset(): void {
    this.state = { /* defaults */ };
    this.emitStateUpdate();
  }
}

export const gameStateManager = new GameStateManager();
```

### 2. Create useGameState Hook

**File**: `frontend/src/hooks/useGameState.ts`

```typescript
import { useState, useEffect } from 'react';
import { gameStateManager } from '../services/game-state.service';

export function useGameState() {
  const [gameState, setGameState] = useState(gameStateManager.getState());

  useEffect(() => {
    const unsubscribe = gameStateManager.subscribe(setGameState);
    return unsubscribe;
  }, []);

  return gameState;
}
```

### 3. Refactor GameBoard Component

**Before** (current):
```typescript
export function GameBoard() {
  const [gameData, setGameData] = useState<GameStartedPayload | null>(null);
  const [turnOrder, setTurnOrder] = useState<TurnEntity[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  // ... 12 more useState calls

  const handleGameStarted = useCallback((data) => { /* logic */ }, []);
  const handleCharacterMoved = useCallback((data) => { /* logic */ }, []);
  // ... 9 more handlers

  useGameWebSocket({
    onGameStarted: handleGameStarted,
    onCharacterMoved: handleCharacterMoved,
    // ... 9 more handlers
  });
}
```

**After** (recommended):
```typescript
export function GameBoard() {
  // ✅ Only UI-specific state
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ Use centralized state
  const gameState = useGameState();

  // ✅ Use centralized hex grid management
  const { hexGridReady, initializeBoard, /* ... */ } = useHexGrid(containerRef, {
    onHexClick: (hex) => gameStateManager.selectHex(hex),
    onCharacterSelect: (id) => gameStateManager.selectCharacter(id),
  });

  // ✅ No event handlers - all in GameStateManager

  // ✅ Initialize board when ready
  useEffect(() => {
    if (hexGridReady && gameState.gameData) {
      initializeBoard({
        tiles: gameState.gameData.mapLayout,
        characters: gameState.gameData.characters,
        monsters: gameState.gameData.monsters,
      });
    }
  }, [hexGridReady, gameState.gameData, initializeBoard]);

  // ✅ Render based on state
  return (
    <div className={styles.gameBoardPage}>
      <div ref={containerRef} className={styles.gameContainer} />

      <GameHUD
        logs={gameState.logs}
        isMyTurn={gameState.isMyTurn}
        connectionStatus={gameState.connectionStatus}
      />

      {gameState.showCardSelection && (
        <CardSelectionPanel
          cards={gameState.playerHand}
          selectedTopAction={gameState.selectedTopAction}
          selectedBottomAction={gameState.selectedBottomAction}
          onCardSelect={(card) => gameStateManager.selectCard(card)}
          onConfirmSelection={() => gameStateManager.confirmCardSelection()}
        />
      )}
    </div>
  );
}
```

**Lines of Code Reduction**: ~400 lines → ~100 lines (75% reduction!)

### 4. Consolidate WebSocket Hooks

**Current Problem**:
- `useGameWebSocket.ts` - GameBoard events
- `useLobbyWebSocket.ts` - Lobby events
- Duplication of connection status handling

**Recommendation**:
Single `useWebSocketConnection.ts` hook that only handles connection status UI

```typescript
export function useWebSocketConnection() {
  const [status, setStatus] = useState<ConnectionStatus>('connected');

  useEffect(() => {
    const unsub1 = websocketService.on('ws_connected', () => setStatus('connected'));
    const unsub2 = websocketService.on('ws_disconnected', () => setStatus('disconnected'));
    const unsub3 = websocketService.on('ws_reconnecting', () => setStatus('reconnecting'));

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  return status;
}
```

---

## Implementation Roadmap

### Phase 1: Create GameStateManager (2-3 hours)
- [ ] Create `game-state.service.ts`
- [ ] Move all 11 event handlers from GameBoard
- [ ] Implement subscriber pattern
- [ ] Add state persistence to localStorage (for page refresh)

### Phase 2: Create useGameState Hook (30 minutes)
- [ ] Create `useGameState.ts` hook
- [ ] Test with small component first

### Phase 3: Refactor GameBoard (2-3 hours)
- [ ] Remove all 15 local state variables
- [ ] Remove all 11 event handlers
- [ ] Use `useGameState()` hook
- [ ] Update all state access to use `gameState.x`
- [ ] Pass action callbacks to GameStateManager

### Phase 4: Testing & Validation (1-2 hours)
- [ ] Test navigation Lobby → GameBoard
- [ ] Test page refresh on GameBoard
- [ ] Test WebSocket reconnection
- [ ] Verify no duplicate events
- [ ] Verify state persistence

### Phase 5: Cleanup (1 hour)
- [ ] Remove `useGameWebSocket.ts` hook (no longer needed)
- [ ] Update `useLobbyWebSocket.ts` to use same pattern
- [ ] Remove any unused code
- [ ] Update documentation

**Total Estimated Time**: 8-12 hours

---

## Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**:
- Implement in feature branch
- Maintain parallel implementation initially
- Comprehensive testing before merge

### Risk 2: State Synchronization Issues
**Mitigation**:
- Single source of truth (GameStateManager)
- No local state modifications
- All updates through manager methods

### Risk 3: Performance (Too Many Re-renders)
**Mitigation**:
- Use React.memo for expensive components
- Split state into multiple managers if needed
- Only emit updates when state actually changes

---

## Metrics for Success

### Before Centralization
- **GameBoard.tsx**: ~675 lines, 15 state variables, 11 event handlers
- **State persistence**: ❌ Lost on navigation
- **Testing complexity**: ❌ High (must mount full component)
- **Duplicate state**: ❌ Yes (gameData in 2 places)

### After Centralization (Target)
- **GameBoard.tsx**: ~150 lines, 0 game state, 0 event handlers
- **State persistence**: ✅ Maintained across navigation
- **Testing complexity**: ✅ Low (test manager in isolation)
- **Duplicate state**: ✅ None (single source of truth)

---

## Conclusion

The centralization effort has established **excellent foundations** with RoomSessionManager and WebSocketService, but **GameBoard still needs major refactoring** to match the pattern established by Lobby.

The proposed GameStateManager would:
- ✅ Eliminate 15 component-level state variables
- ✅ Centralize 11 scattered event handlers
- ✅ Enable state persistence across navigation
- ✅ Simplify testing and maintenance
- ✅ Match the architectural vision in `ROOM_JOIN_UNIFIED_ARCHITECTURE.md`

**Recommended Next Steps**:
1. Review this evaluation with the team
2. Approve GameStateManager architecture
3. Implement Phase 1-2 (GameStateManager + hook)
4. Gradually refactor GameBoard (can be incremental)

**Current Progress**: 40% complete
**With GameStateManager**: 90% complete
**Remaining 10%**: Minor optimizations and documentation
