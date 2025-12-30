# Unified Room Join Architecture Proposal
**Date**: 2025-11-19
**Status**: DRAFT PROPOSAL

---

## Design Principles

1. **Single Responsibility**: ONE component owns room joining logic
2. **Explicit Intent**: Backend knows WHY a join is happening
3. **Guaranteed Delivery**: Game state always reaches the right component
4. **No Race Conditions**: Deterministic event ordering
5. **Centralized State**: Room connection status in ONE place

---

## Proposed Architecture

### 1. Centralized Room Session Manager

Create a **RoomSessionManager** service that is the ONLY place that calls `joinRoom()`:

```typescript
// frontend/src/services/room-session.service.ts

type RoomSessionState = {
  roomCode: string | null;
  status: 'disconnected' | 'joining' | 'lobby' | 'active';
  playerRole: 'host' | 'player' | null;
  gameState: GameState | null;
};

class RoomSessionManager {
  private state: RoomSessionState = {
    roomCode: null,
    status: 'disconnected',
    playerRole: null,
    gameState: null,
  };

  private eventEmitter = new EventEmitter();
  private hasJoinedInSession = false;

  /**
   * ONLY method that calls websocketService.joinRoom()
   * All components call this instead of joining directly
   */
  public async ensureJoined(intent: 'create' | 'join' | 'rejoin' | 'refresh'): Promise<void> {
    // Prevent duplicate joins in same session
    if (this.hasJoinedInSession && this.state.status !== 'disconnected') {
      console.log('Already joined in this session, skipping duplicate join');
      return;
    }

    const roomCode = this.state.roomCode || localStorage.getItem('currentRoomCode');
    const nickname = localStorage.getItem('playerNickname');
    const uuid = localStorage.getItem('playerUUID');

    if (!roomCode || !nickname || !uuid) {
      throw new Error('Missing room session data');
    }

    // Wait for WebSocket connection if needed
    await this.waitForConnection();

    // Send join with explicit intent
    websocketService.joinRoom(roomCode, nickname, uuid, { intent });
    this.hasJoinedInSession = true;
    this.state.status = 'joining';
  }

  /**
   * Reset session (on disconnect or intentional leave)
   */
  public reset(): void {
    this.hasJoinedInSession = false;
    this.state = {
      roomCode: null,
      status: 'disconnected',
      playerRole: null,
      gameState: null,
    };
  }

  /**
   * Update state when room_joined received
   */
  public onRoomJoined(data: RoomJoinedPayload): void {
    this.state.roomCode = data.roomCode;
    this.state.status = data.roomStatus === 'active' ? 'active' : 'lobby';

    const player = data.players.find(p => p.id === localStorage.getItem('playerUUID'));
    this.state.playerRole = player?.isHost ? 'host' : 'player';

    this.eventEmitter.emit('session_updated', this.state);
  }

  /**
   * Update state when game_started received
   */
  public onGameStarted(data: GameStartedPayload): void {
    this.state.status = 'active';
    this.state.gameState = data;
    this.eventEmitter.emit('session_updated', this.state);
  }

  /**
   * Components subscribe to state changes
   */
  public subscribe(callback: (state: RoomSessionState) => void): () => void {
    this.eventEmitter.on('session_updated', callback);

    // Return unsubscribe function
    return () => this.eventEmitter.off('session_updated', callback);
  }

  public getState(): RoomSessionState {
    return { ...this.state };
  }
}

export const roomSessionManager = new RoomSessionManager();
```

---

### 2. Remove Auto-Rejoin from WebSocket Service

**Remove** the auto-rejoin logic from `websocket.service.ts` lines 150-154:

```typescript
// DELETE THIS:
this.socket.on('connect', () => {
  const lastRoom = getLastRoomCode();
  if (lastRoom && this.currentNickname) {
    this.joinRoom(lastRoom, this.currentNickname, this.playerUUID!);  // ❌ DELETE
  }
});
```

**Reasoning**: WebSocket service should only manage the connection, not room membership. Let RoomSessionManager decide when to rejoin.

---

### 3. Update Backend to Accept Join Intent

Modify `backend/src/websocket/game.gateway.ts` to accept and log intent:

```typescript
interface JoinRoomPayload {
  roomCode: string;
  nickname: string;
  playerUUID: string;
  intent?: 'create' | 'join' | 'rejoin' | 'refresh';  // NEW
}

@SubscribeMessage('join_room')
async handleJoinRoom(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: JoinRoomPayload,
): Promise<void> {
  this.logger.log(`Join room request: ${JSON.stringify(payload)}`);
  this.logger.log(`Join intent: ${payload.intent || 'unknown'}`);  // NEW

  // Rest of logic unchanged, but now you can debug which path is being used
}
```

**Benefit**: Clear logging of WHY each join is happening. No behavior change initially, just visibility.

---

### 4. Unified Component Integration

#### Lobby.tsx Changes:

```typescript
export function Lobby() {
  const [sessionState, setSessionState] = useState(roomSessionManager.getState());

  useEffect(() => {
    // Subscribe to session updates
    const unsubscribe = roomSessionManager.subscribe(setSessionState);

    // Register WebSocket listeners
    websocketService.on('room_joined', (data) => {
      roomSessionManager.onRoomJoined(data);
      // Don't navigate here anymore, let session state drive it
    });

    websocketService.on('game_started', (data) => {
      roomSessionManager.onGameStarted(data);
    });

    return () => {
      unsubscribe();
      websocketService.off('room_joined');
      websocketService.off('game_started');
    };
  }, []);

  // Navigate based on session state (not events directly)
  useEffect(() => {
    if (sessionState.status === 'active') {
      navigate('/game');
    }
  }, [sessionState.status]);

  const handleCreateRoom = async () => {
    // Create room via REST API (unchanged)
    const response = await fetch('/api/rooms', { method: 'POST', ... });
    const { room } = await response.json();

    // Join via session manager
    await roomSessionManager.ensureJoined('create');
  };

  const handleJoinRoom = async (roomCode: string) => {
    localStorage.setItem('currentRoomCode', roomCode);
    await roomSessionManager.ensureJoined('join');
  };

  const handleRejoinMyRoom = async () => {
    await roomSessionManager.ensureJoined('rejoin');
  };
}
```

#### GameBoard.tsx Changes:

```typescript
export function GameBoard() {
  const [sessionState, setSessionState] = useState(roomSessionManager.getState());
  const [hexGridReady, setHexGridReady] = useState(false);

  useEffect(() => {
    // Subscribe to session updates
    const unsubscribe = roomSessionManager.subscribe(setSessionState);

    // Register WebSocket listener (still needed for ack)
    websocketService.on('game_started', (data, ackCallback) => {
      roomSessionManager.onGameStarted(data);

      // Store ack callback
      if (ackCallback) {
        ackCallbackRef.current = ackCallback;
      }
    });

    return () => {
      unsubscribe();
      websocketService.off('game_started');
    };
  }, []);

  // Join on mount if needed
  useEffect(() => {
    const roomCode = localStorage.getItem('currentRoomCode');
    if (roomCode) {
      // Session manager will prevent duplicates
      roomSessionManager.ensureJoined('refresh').catch(err => {
        console.error('Failed to rejoin:', err);
        navigate('/');
      });
    } else {
      // No room code, redirect to lobby
      navigate('/');
    }
  }, []);

  // Render game when BOTH HexGrid ready AND game state available
  useEffect(() => {
    if (!hexGridReady || !sessionState.gameState) {
      return;
    }

    // Render the game
    hexGridRef.current.initializeBoard({
      tiles: sessionState.gameState.mapLayout,
      characters: sessionState.gameState.characters,
      monsters: sessionState.gameState.monsters,
    });

    // Send ack
    if (ackCallbackRef.current) {
      ackCallbackRef.current(true);
      ackCallbackRef.current = null;
    }
  }, [hexGridReady, sessionState.gameState]);

  // ... rest of component
}
```

---

### 5. Eliminate Duplicate game_started Broadcast

**Change** `backend/src/websocket/game.gateway.ts` line 640:

```typescript
// BEFORE:
this.server.to(room.roomCode).emit('game_started', gameStartedPayload);

// AFTER:
// Don't broadcast here - each client will get it when they rejoin or are already connected
// This eliminates the duplicate event issue
this.logger.log(`Game started, clients will receive state on next join/rejoin`);
```

**Instead**: Backend should:
1. Set room status to ACTIVE
2. Store game state in room
3. Send `game_started` ONLY when a client joins an active room (existing behavior in handleJoinRoom)

**Benefit**: ONE source of `game_started` events, no duplicates.

---

## Event Flow After Changes

### Scenario: Initial Game Start

```
1. Host clicks "Start Game"
2. Backend: Sets room.status = ACTIVE, stores game state
3. Backend: Does NOT broadcast game_started
4. Lobby: Receives nothing (no event)
5. Lobby: Room state updated via other mechanism (room_status_changed event? or polling?)
6. Lobby: Detects active game, navigates to /game
7. GameBoard: Mounts, calls roomSessionManager.ensureJoined('refresh')
8. Backend: Sends game_started to this client
9. GameBoard: Renders when HexGrid ready
```

**Alternative** (if you want instant navigation):
Keep the broadcast but make Lobby navigate immediately without waiting for game data. GameBoard will get its own copy.

---

### Scenario: Page Refresh on /game

```
1. Browser: Refreshes page
2. GameBoard: Mounts
3. GameBoard: Calls roomSessionManager.ensureJoined('refresh')
4. RoomSessionManager: Checks hasJoinedInSession = false, proceeds with join
5. Backend: Sends game_started
6. GameBoard: Renders when HexGrid ready
```

**No duplicates**: Only ONE join_room call.

---

### Scenario: Navigate Lobby → GameBoard

```
1. User: Navigates to /game manually
2. GameBoard: Mounts
3. GameBoard: Calls roomSessionManager.ensureJoined('refresh')
4. RoomSessionManager: Checks hasJoinedInSession = true, returns early
5. GameBoard: Uses existing sessionState.gameState
6. GameBoard: Renders immediately (or when HexGrid ready)
```

**No network call**: Session manager knows we're already joined.

---

## Migration Strategy

### Phase 1: Add RoomSessionManager (Non-Breaking)
1. Create `room-session.service.ts`
2. Add session manager initialization
3. Don't remove existing code yet
4. Test in parallel

### Phase 2: Migrate Components
1. Update Lobby to use session manager
2. Update GameBoard to use session manager
3. Keep both old and new code, feature flag it

### Phase 3: Clean Up
1. Remove auto-rejoin from WebSocket service
2. Remove duplicate `game_started` broadcast
3. Remove old event handlers

### Phase 4: Backend Intent Logging
1. Add intent field to JoinRoomPayload
2. Add logging to track intent
3. Analyze logs to verify all paths working

---

## Benefits

✅ **No duplicate joins**: Session manager prevents duplicates via `hasJoinedInSession` flag

✅ **No lost events**: Session state persists across navigation, components subscribe to it

✅ **No race conditions**: Deterministic order: join → receive event → store in session → components react

✅ **Debuggable**: Intent logging shows exactly why each join happened

✅ **Testable**: Session manager is a pure service, easy to unit test

✅ **Maintainable**: ONE place to fix join logic, not scattered across 3 files

---

## Alternative: Simpler Incremental Fix

If full refactor is too much, here's a **minimal fix** for the immediate issue:

### Quick Fix #1: Disable WebSocket Auto-Rejoin
Just comment out lines 150-154 in `websocket.service.ts`:

```typescript
// Disabled - let components manage rejoins
// const lastRoom = getLastRoomCode();
// if (lastRoom && this.currentNickname) {
//   this.joinRoom(lastRoom, this.currentNickname, this.playerUUID!);
// }
```

**Result**: Eliminates duplicate joins between service and GameBoard.

### Quick Fix #2: Make GameBoard Join Idempotent
Add a component-level flag in `GameBoard.tsx`:

```typescript
const hasAttemptedJoin = useRef(false);

useEffect(() => {
  if (hasAttemptedJoin.current) {
    console.log('Already attempted join, skipping');
    return;
  }

  hasAttemptedJoin.current = true;

  // Rest of join logic...
}, []);
```

**Result**: Prevents duplicate joins on React Strict Mode double-mount.

### Quick Fix #3: Deduplicate on Backend
Track recent joins per player:

```typescript
private recentJoins = new Map<string, number>(); // playerUUID -> timestamp

handleJoinRoom(...) {
  const now = Date.now();
  const lastJoin = this.recentJoins.get(playerUUID) || 0;

  if (now - lastJoin < 1000) {
    this.logger.log(`Ignoring duplicate join from ${playerUUID} within 1s`);
    return;
  }

  this.recentJoins.set(playerUUID, now);

  // Rest of logic...
}
```

**Result**: Backend ignores rapid duplicate joins (< 1 second apart).

---

## Recommendation

**For immediate fix**: Apply Quick Fixes #1, #2, and #3.

**For long-term architecture**: Implement RoomSessionManager in phases.

The root issue is **distributed state** (who has joined, what is the room status) across multiple components and services. Centralizing this in a session manager is the proper architectural solution.
