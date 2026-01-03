# WebSocket System Analysis & Recommendations

This document provides a deep-dive analysis of the current WebSocket implementation in the Hexhaven application. It outlines critical architectural flaws, assesses the system's fragility, and provides concrete recommendations for a more robust, centralized, and maintainable real-time communication system.

## 1. Current State Analysis

The current WebSocket implementation is highly fragile and prone to inconsistent behavior. The root cause is a **decentralized and component-coupled connection management strategy**.

### 1.1. Core Architectural Flaw: Lifecycle Coupling

The primary issue lies in how the WebSocket connection is initiated and terminated. Instead of being a persistent, application-level service, the connection's lifecycle is tied directly to the mounting and unmounting of React components.

This is evident in two key hooks:

-   **`useWebSocket.ts`**: This hook contains the most critical flaw. It calls `websocketService.connect()` in a `useEffect` on mount and, crucially, calls `websocketService.disconnect()` in the `useEffect`'s cleanup function. **This means any component using this hook will tear down the entire application's WebSocket connection when it unmounts.**
-   **`useLobbyWebSocket.ts`**: This hook, used in the `Lobby`, also calls `websocketService.connect()` directly. It does not call `disconnect` on unmount, but its independent connection management contributes to the fragmented nature of the system.

This design pattern leads directly to the observed issues:

-   **Connection Depends on Mounted Components**: A WebSocket connection only exists if a component that initiates it is currently mounted. If a user navigates to a page without such a component, they will be disconnected.
-   **Fragile Page Transitions**: The transition between the `Lobby` and the `GameBoard` is a prime example of this fragility. When the user navigates from the Lobby, the `Lobby` component unmounts, triggering the `disconnect()` call from its WebSocket hook. The `GameBoard` then has to immediately re-establish a new connection, creating a race condition that can easily fail, leaving the user in a broken state.
-   **Inconsistent Behavior on Refresh/Direct Navigation**: A user refreshing or navigating directly to `/game` may experience a different connection outcome than a user who navigates from `/lobby`, because the component mounting order and lifecycle events are different.

### 1.2. Fractured and Duplicated Logic

The "fractured functions" you mentioned are a direct symptom of this architectural flaw. Because there is no single, reliable source for the WebSocket connection, different parts of the application have evolved to manage their own connection state and event listeners.

-   **Multiple Hooks**: The existence of `useWebSocket`, `useGameWebSocket`, and `useLobbyWebSocket` shows that each feature area (Lobby, Game) has implemented its own specialized logic for handling WebSocket events.
-   **Redundant Connection Calls**: Both `useWebSocket` and `useLobbyWebSocket` call `websocketService.connect()`, leading to redundant and potentially conflicting connection attempts.
-   **Context as a Follower, Not a Leader**: The `WebSocketConnectionContext` is used to *observe* the connection status, but it does not *manage* it. It's a passive listener, not an active owner of the connection. This is a missed opportunity to centralize control.

This fractured approach makes the system difficult to reason about, debug, and maintain. A change to WebSocket handling in one part of the application can have unintended and severe consequences in another.

## 2. Backend Implementation Analysis

The backend's `game.gateway.ts` is a standard NestJS WebSocket gateway and is significantly more robust than the frontend. It successfully handles core logic for room management, game state, and reconnections.

### 2.1. Strengths

-   **Centralized Event Handling**: All WebSocket events are handled within a single, well-structured class, making the logic easy to follow.
-   **Session Management**: The use of a `playerUUID` and mappings like `socketToPlayer` and `playerToSocket` allows for effective session management, enabling players to reconnect to games after a disconnect.
-   **Stateful Recovery**: Upon reconnection, the gateway correctly sends the current game state to the reconnecting client, which is crucial for a good user experience.

### 2.2. Potential Risks & Areas for Improvement

While generally solid, the backend has one significant area of risk: **in-memory state management**.

-   **Fragile State Storage**: All game state (monster positions, turn order, modifier decks, etc.) is stored in-memory within the `GameGateway` instance (e.g., `this.roomMonsters`, `this.roomTurnOrder`).
    -   **Scalability Issues**: This approach does not scale beyond a single server instance. If the application were to be deployed in a load-balanced environment, there would be no shared state between the different server processes.
    -   **Lack of Persistence**: If the single server instance crashes or restarts, all active game state is lost permanently. There is no database persistence for in-progress games.
-   **Potential for Memory Leaks**: The gateway manually manages cleanup for empty rooms. If a bug exists in the `leave_room` or `handleDisconnect` logic that prevents a room from being correctly identified as empty, all of its associated in-memory state (maps, monsters, etc.) will be leaked for the lifetime of the server process.

While these backend risks do not directly cause the client-side connection fragility, they represent a significant threat to the application's overall stability and scalability. Any refactor of the WebSocket system should consider a more robust state management solution, such as Redis or a database, to mitigate these risks.

## 3. Recommendations for Refactoring

To fix the frontend's fragility, the WebSocket connection lifecycle must be decoupled from React components and managed at the application level.

### 3.1. Centralize Connection Management in `App.tsx`

The `websocketService.connect()` method should be called **once** when the application first loads. The ideal location for this is in a `useEffect` hook within the main `App.tsx` component.

```typescript
// Example for App.tsx
useEffect(() => {
  // Connect on initial application load
  websocketService.connect(getWebSocketUrl());

  // Optional: Disconnect when the user closes the tab/browser
  return () => {
    websocketService.disconnect();
  };
}, []); // Empty dependency array ensures this runs only once
```

This ensures a single, persistent WebSocket connection for the entire user session, regardless of navigation or which components are mounted.

### 3.2. Elevate the `WebSocketConnectionProvider`

The `WebSocketConnectionProvider` should be responsible for managing and providing the connection state to the entire application. It should be wrapped around the main router in `App.tsx` to ensure it's always available.

Crucially, all component-specific WebSocket hooks (`useWebSocket`, `useLobbyWebSocket`, `useGameWebSocket`) must be refactored or removed. They should **no longer** call `connect` or `disconnect`. Instead, they should simply subscribe to events from the singleton `websocketService`.

### 3.3. Refactored Logic Flow

1.  **App Mounts**: `App.tsx` calls `websocketService.connect()`.
2.  **Provider Listens**: `WebSocketConnectionProvider` listens for connection events (`ws_connected`, `ws_disconnected`) from the service and updates its state.
3.  **Components Consume**: Components throughout the app use the `useWebSocketConnection` hook to get the global connection status.
4.  **Event Subscription**: Feature-specific hooks (like a refactored `useLobbyEvents`) will now only be responsible for subscribing to and unsubscribing from business-logic events (e.g., `player_joined`, `game_started`) within their `useEffect` hooks. They will never manage the connection itself.

This centralized model eliminates race conditions, ensures a stable connection across all pages, and makes the system's behavior predictable and easy to debug.

## 4. Analysis of Alternatives: WebSockets vs. Long Polling

While the recommended refactor will stabilize the existing WebSocket system, it's worth considering alternatives like Long Polling.

| Feature               | WebSockets                                                              | Long Polling                                                              | Recommendation for Hexhaven                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Performance**       | **High**. Full-duplex, low-latency connection. Minimal overhead per message. | **Medium**. Higher latency due to connection setup for each message. More HTTP overhead. | **WebSockets are superior**. For a real-time game like Hexhaven, the low latency of WebSockets is critical for a responsive user experience during gameplay. |
| **User Experience**   | **Excellent**. Real-time updates feel instantaneous.                     | **Good**. Can feel slightly delayed. Can cause network "stuttering" on slow connections. | **WebSockets provide a better feel**. The immediate feedback of actions is a core part of the game's UX.                                                 |
| **Reliability**       | **Good**. Modern libraries handle reconnections well. Can be blocked by some firewalls. | **Very High**. It's just standard HTTP(S), which is rarely blocked. Simpler to reason about. | **WebSockets are sufficient**. The current `socket.io` library already has good reconnection logic. Firewall issues are less common today.                 |
| **Complexity & Maintainability** | **Medium**. State management for the persistent connection can be complex.     | **Low**. Follows a simple request/response pattern. Stateless nature is easier to manage. | **WebSockets add complexity, but it's manageable**. The proposed refactor centralizes this complexity, making it maintainable.                         |

**Conclusion**: Sticking with **WebSockets is the correct choice** for this application. The performance and user experience benefits for a real-time game far outweigh the added complexity. The current issues stem from a poor implementation, not a flaw in the underlying technology.

## 5. Impact on Other Systems

The proposed refactoring of the WebSocket system will have a positive impact on the overall application architecture.

-   **State Management**: A stable, persistent connection makes client-side state management simpler. There will be fewer edge cases related to synchronizing state after a reconnect, as the connection will rarely be dropped during normal navigation.
-   **Backend State**: The changes are primarily on the frontend and will not require significant modifications to the backend gateway. However, a more stable client will reduce the frequency of disconnect/reconnect cycles, which may slightly reduce the load on the backend's session management logic.
-   **User Experience**: The most significant impact will be a vastly improved user experience. The application will feel more responsive and reliable, with fewer confusing disconnects or failures to load.

## 6. Implementation Plan

The recommendations in this document were implemented by completing the migration to a centralized `RoomSessionManager` service. This service acts as the single source of truth for all room-joining logic and session-related state.

The implementation followed these steps:

1.  **Refactor `Lobby.tsx`**: The `Lobby` component was refactored to be fully driven by the `RoomSessionManager`. This involved:
    *   Removing the `useRoomManagement` custom hook, which previously handled room creation and joining via REST API calls.
    *   Eliminating local component state for room and player data, instead subscribing to the state provided by the `useRoomSession` hook.
    *   Integrating the REST API calls for room creation directly into the component, which then calls `roomSessionManager.ensureJoined()` to handle the WebSocket connection.

2.  **Refactor `GameBoard.tsx`**: The `GameBoard` component was refactored to rely entirely on the `RoomSessionManager` for its state. This involved:
    *   Removing the local `gameData` state.
    *   Using `sessionState.gameState` from the `useRoomSession` hook as the single source of truth.
    *   Simplifying the `useGameWebSocket` hook's `onGameStarted` handler to only call `roomSessionManager.onGameStarted()`, delegating all state management to the service.

3.  **Confirm Application-Level Connection**: Verified that the WebSocket connection is established at the application level and is not tied to any specific component's lifecycle, as recommended. The `websocket.service.ts` had already been correctly modified to prevent component-level disconnects.

## 7. Cleanup Tasks

As part of the refactoring, several redundant pieces of code were identified and removed, simplifying the codebase and completing the centralization of the WebSocket logic.

-   **Deleted `useRoomManagement.ts` hook**: This custom hook became entirely redundant after its responsibilities were moved into the `Lobby.tsx` component and the `RoomSessionManager`. The file `frontend/src/hooks/useRoomManagement.ts` was deleted.
-   **Removed Local State from `Lobby.tsx`**: The `useState` variables for `room` and `players` were removed from the `Lobby` component, as this state is now managed by the `RoomSessionManager`.
-   **Removed Local State from `GameBoard.tsx`**: The `useState` variable for `gameData` was removed from the `GameBoard` component. The component now correctly sources this data from the `RoomSessionManager`.

## 8. Game State Centralization (November 2025)

Following the successful centralization of room session management, the game state was further centralized with the implementation of `GameStateManager`.

## 9. Connection Resilience Improvements (December 2025 - Issue #419)

Building on the centralized architecture, connection resilience was significantly improved to handle slow networks and reconnection scenarios.

### 9.1. Centralized WebSocket Configuration

All WebSocket timeout and reconnection values were centralized in `/frontend/src/config/websocket.ts`:

```typescript
export const WS_CONNECTION_TIMEOUT_MS = 15000;           // Increased from 5s
export const WS_CONNECTION_WAIT_TIMEOUT_MS = 15000;      // Room join wait timeout
export const WS_RECONNECT_DEBOUNCE_MS = 500;             // DEPRECATED (commit d384b43)
export const WS_RECONNECTION_DELAY_MS = 1000;            // Initial reconnection delay
export const WS_RECONNECTION_DELAY_MAX_MS = 10000;       // Max delay (exponential backoff)
export const WS_MAX_RECONNECT_ATTEMPTS = 5;              // Max reconnection attempts
```

**Benefits**:
- ✅ Single source of truth for all timeout/reconnection values
- ✅ No magic numbers scattered across codebase
- ✅ Easy to adjust connection parameters for different network conditions
- ✅ Self-documenting with inline comments

**Note**: `WS_RECONNECT_DEBOUNCE_MS` is deprecated as of commit d384b43. The debounce was removed because it caused race conditions (see section 9.3).

### 9.2. Immediate Socket-to-Player Mapping

The backend gateway now populates socket-to-player mappings immediately on connection:

```typescript
// game.gateway.ts - handleConnection()
handleConnection(client: Socket): void {
  const userId = client.data.userId;  // From JWT auth

  // Clean up stale mappings (reconnection scenario)
  const oldSocketId = this.playerToSocket.get(userId);
  if (oldSocketId && oldSocketId !== client.id) {
    this.socketToPlayer.delete(oldSocketId);
  }

  // Populate mapping immediately (don't wait for join_room)
  this.socketToPlayer.set(client.id, userId);
  this.playerToSocket.set(userId, client.id);
}
```

**Benefits**:
- ✅ Game events can identify users immediately after connection
- ✅ Prevents race conditions where events arrive before `join_room` completes
- ✅ Automatic stale socket cleanup for reconnection scenarios
- ✅ No duplicate socket IDs lingering in memory

### 9.3. Automatic Room Rejoin (Immediate, No Debounce)

The frontend `RoomSessionManager` automatically rejoins rooms after reconnection. Originally implemented with a 500ms debounce, this was **removed in commit d384b43** because it caused "Player not in any room" errors when users tried to perform actions immediately after reconnection.

```typescript
// room-session.service.ts (commit d384b43)
public onReconnected(): void {
  this.state.error = null;  // Clear error state

  // Clear any pending debounce timer (no longer used)
  if (this.reconnectDebounceTimer) {
    clearTimeout(this.reconnectDebounceTimer);
    this.reconnectDebounceTimer = null;
  }

  // Reset join flag to allow rejoin
  this.hasJoinedInSession = false;

  // IMMEDIATE rejoin - no debounce
  // The `joinInProgress` flag prevents duplicate join requests
  if (this.state.roomCode) {
    this.ensureJoined('rejoin');
  }
}
```

**CRITICAL FIX (Commit d384b43)**:
The 500ms debounce delay was causing race conditions where users reconnected and immediately tried to perform actions (like selecting a scenario). The debounce meant the room rejoin hadn't completed yet, resulting in "Player not in any room or room not found" errors. The existing `joinInProgress` flag in `ensureJoined()` already prevents duplicate join requests, making the debounce unnecessary.

**Benefits**:
- ✅ Seamless recovery from temporary disconnects
- ✅ Immediate rejoin prevents user actions from failing
- ✅ Error state automatically cleared on successful reconnection
- ✅ Duplicate join requests prevented by `joinInProgress` flag
- ✅ No manual user intervention required

### 9.4. Connection Timeout Increase

The connection timeout was increased from the Socket.IO default of 5 seconds to 15 seconds:

```typescript
// websocket.service.ts
const socket = io(serverUrl, {
  timeout: WS_CONNECTION_TIMEOUT_MS,  // 15000ms (was 5000ms)
  // ... other config
});
```

**Rationale**:
- Mobile networks and high-latency connections can take longer to establish WebSocket connections
- 5-second timeout was too aggressive, causing unnecessary connection failures
- 15 seconds provides reasonable buffer while still failing fast enough for genuinely unreachable servers

### 9.5. Impact on System Stability

These improvements have eliminated several classes of bugs:

**Before Issue #419**:
- ❌ Connection timeouts on slow networks
- ❌ Race conditions where game events arrived before socket mapping completed
- ❌ Stale socket IDs lingering after reconnection
- ❌ Users manually refreshing after temporary network issues
- ❌ "Player not in any room" errors after reconnection (pre-commit d384b43)

**After Issue #419** (including commit d384b43):
- ✅ Reliable connections on slow/mobile networks (15s timeout)
- ✅ Immediate socket-to-player mapping prevents race conditions
- ✅ Automatic cleanup of stale socket mappings
- ✅ Immediate room rejoin prevents user action failures
- ✅ `joinInProgress` flag prevents duplicate join requests
- ✅ Automatic room rejoin provides seamless recovery

**Evolution Timeline**:
1. **Initial centralization**: WebSocket connection decoupled from component lifecycle
2. **Issue #419 initial**: Added 15s timeout, automatic rejoin with 500ms debounce
3. **Commit d384b43**: Removed debounce to fix "Player not in any room" race condition

This completes the evolution of the WebSocket system from fragile component-coupled connections to a robust, centralized, self-healing architecture with immediate reconnection.

### 8.1. GameStateManager Architecture

The `GameStateManager` is a singleton service that manages all in-game state and WebSocket event handling:

**Responsibilities**:
- Centralized game state (characters, monsters, turn order, player hand, etc.)
- WebSocket event handling (all game events)
- State subscription pattern for React components
- **Visual callback system** for PixiJS rendering updates

**Key Innovation - Visual Callback System**:
The GameStateManager implements a visual callback pattern to bridge the gap between centralized state management and the PixiJS rendering layer:

```typescript
interface VisualUpdateCallbacks {
  moveCharacter?: (characterId: string, toHex: Axial, movementPath?: Axial[]) => void;
  updateMonsterPosition?: (monsterId: string, newHex: Axial) => void;
  updateCharacterHealth?: (characterId: string, health: number) => void;
  updateMonsterHealth?: (monsterId: string, health: number) => void;
}

class GameStateManager {
  private visualCallbacks: VisualUpdateCallbacks = {};

  public registerVisualCallbacks(callbacks: VisualUpdateCallbacks): void {
    this.visualCallbacks = { ...this.visualCallbacks, ...callbacks };
  }

  private handleCharacterMoved(data: CharacterMovedPayload): void {
    // Trigger visual update
    this.visualCallbacks.moveCharacter?.(data.characterId, data.toHex, data.movementPath);

    // Update state
    // ... state updates ...

    // Emit to subscribers
    this.emitStateUpdate();
  }
}
```

### 8.2. Integration with GameBoard

The `GameBoard` component registers visual update callbacks from `useHexGrid` with the `GameStateManager`:

```typescript
export function GameBoard() {
  const gameState = useGameState(); // Subscribe to centralized state

  const {
    hexGridReady,
    moveCharacter,
    updateMonsterPosition,
    updateCharacterHealth,
    updateMonsterHealth,
  } = useHexGrid(containerRef, {
    onHexClick: (hex) => gameStateManager.selectHex(hex),
    onCharacterSelect: (id) => gameStateManager.selectCharacter(id),
  });

  // Register visual callbacks when HexGrid is ready
  useEffect(() => {
    if (hexGridReady) {
      gameStateManager.registerVisualCallbacks({
        moveCharacter,
        updateMonsterPosition,
        updateCharacterHealth,
        updateMonsterHealth,
      });
    }
  }, [hexGridReady, moveCharacter, updateMonsterPosition, updateCharacterHealth, updateMonsterHealth]);
}
```

### 8.3. Benefits of Visual Callback System

**1. Clean Separation of Concerns**:
- State management logic resides in `GameStateManager` (business logic layer)
- Rendering logic resides in `HexGrid` (presentation layer)
- Callbacks provide a clean, unidirectional communication channel

**2. Centralized State with Decentralized Rendering**:
- State is centralized in one place (single source of truth)
- Visual updates are delegated to the appropriate rendering components
- No coupling between state management and PixiJS

**3. Testability**:
- GameStateManager can be tested independently of rendering
- Visual callbacks can be mocked for state manager tests
- Rendering can be tested independently of WebSocket events

**4. Maintainability**:
- All WebSocket event handling in one place
- Visual update logic co-located with rendering code
- Clear data flow: WebSocket → State Manager → Visual Callbacks → Rendering

### 8.4. Complete Architecture

The final centralized architecture consists of three layers:

```
┌──────────────────────────────────────┐
│     React Components (UI Layer)     │
│   - Lobby.tsx                        │
│   - GameBoard.tsx                    │
│   - Subscribe to state changes       │
│   - Register visual callbacks        │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│  State Management Layer              │
│   - RoomSessionManager               │
│   - GameStateManager                 │
│   - Handle WebSocket events          │
│   - Manage state                     │
│   - Trigger visual callbacks         │
└──────────────────────────────────────┘
                │                  │
                ▼                  ▼
┌─────────────────┐    ┌──────────────────┐
│ WebSocket Layer │    │ Rendering Layer  │
│ - websocket     │    │ - HexGrid (Pixi) │
│   .service.ts   │    │ - Sprites        │
└─────────────────┘    └──────────────────┘
```

This architecture successfully achieves:
- ✅ Centralized WebSocket connection management
- ✅ Centralized room session state
- ✅ Centralized game state
- ✅ Clean separation between state and rendering
- ✅ Testable, maintainable codebase
- ✅ No duplicate state or event handlers

## 10. Forced Movement Events (January 2026)

Interactive push/pull targeting was added to allow players to choose where to push/pull enemies after attacks.

### 10.1. Event Flow

```
Attack with Push/Pull lands
       │
       ├─ Target survives?
       │     │
       │    Yes
       │     │
       │     ├─ Attacker is player character?
       │     │      │
       │     │     Yes → Calculate valid destinations
       │     │      │          │
       │     │      │          ├─ Has valid hexes?
       │     │      │          │      │
       │     │      │          │     Yes → Emit forced_movement_required
       │     │      │          │            (player selects yellow hex)
       │     │      │          │            Player confirms → emit entity_forced_moved
       │     │      │          │            Player skips → emit forced_movement_skipped
       │     │      │          │
       │     │      │          │     No → Emit forced_movement_skipped (no_valid_destinations)
       │     │      │
       │     │     No (monster) → Auto-calculate most direct line
       │     │                    Apply movement
       │     │                    Emit entity_forced_moved
       │
       └─ Target dies? → No push/pull applied
```

### 10.2. WebSocket Events

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `forced_movement_required` | `{ attackerId, targetId, targetName, movementType, distance, validDestinations[], currentPosition }` | Signals player must choose a destination hex |
| `entity_forced_moved` | `{ entityId, entityType, fromHex, toHex, movementType }` | Entity was moved via push/pull |
| `forced_movement_skipped` | `{ attackerId, targetId, movementType, reason }` | Push/pull was skipped |

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm_forced_movement` | `{ attackerId, targetId, destinationHex, movementType }` | Player selected a destination |
| `skip_forced_movement` | `{ attackerId, targetId }` | Player chose to skip |

### 10.3. Frontend State

The `GameStateManager` tracks forced movement state:

```typescript
interface GameStateManagerState {
  // ... existing fields ...
  cardActionTargetingMode: 'move' | 'attack' | 'heal' | 'summon' | 'push' | 'pull' | null;
  validForcedMovementHexes: Axial[];
  pendingForcedMovement: {
    attackerId: string;
    targetId: string;
    targetName: string;
    movementType: 'push' | 'pull';
    distance: number;
  } | null;
}
```

### 10.4. Visual Feedback

- **Yellow highlights**: Valid destination hexes are highlighted in yellow (0xffff00)
- **Skip button**: Displayed in TurnActionPanel when push/pull targeting is active
- **Hint text**: "Tap a yellow hex to push/pull [target name]"
