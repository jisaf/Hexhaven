# Room Join Flow Analysis
**Date**: 2025-11-19
**Status**: OUTDATED - Superseded by Issue #419 and RoomSessionManager centralization
**Issue**: Inconsistent room joining behavior across different paths

> **NOTE**: This analysis is historical. As of Issue #419 (commits through d384b43, January 2026), the room join flow has been centralized in `RoomSessionManager` with immediate reconnection (no debounce) and `select_scenario` WebSocket event. The `start_game` event no longer requires `scenarioId` parameter - it uses `room.scenarioId` from room state. See `/docs/ARCHITECTURE.md` and `/docs/websocket_analysis.md` for current documentation.

---

## Executive Summary

The application has **5 different code paths** for joining/rejoining rooms, each with different behaviors, event sequences, and race conditions. This creates:
- Duplicate `join_room` WebSocket events
- Missed `game_started` events due to navigation timing
- Race conditions between HexGrid initialization and game state rendering
- No single source of truth for join logic

---

## Detailed Path Analysis

### Path 1: Create Room → Start Game → Navigate to /game

**User Actions**:
1. Click "Create Game" in Lobby
2. Select character
3. Click "Start Game"

**Event Sequence**:
```
T+0ms    | Lobby: User clicks "Start Game"
         | └─> websocketService.startGame(scenarioId)
         |     └─> socket.emit('start_game', {scenarioId})
         |
T+50ms   | Backend: handleStartGame() receives event
         | ├─> Loads scenario data
         | ├─> Creates characters at starting positions
         | ├─> Spawns monsters
         | ├─> Sets room.status = ACTIVE
         | └─> Broadcasts to room:
         |     server.to(roomCode).emit('game_started', {...mapLayout, monsters, characters...})
         |
T+60ms   | Lobby: game_started listener fires
         | └─> handleGameStarted(data)
         |     └─> navigate('/game')  ⚠️ NAVIGATION STARTS
         |
T+65ms   | React Router: Unmounts Lobby, Mounts GameBoard
         | ├─> Lobby cleanup: websocketService.off('game_started')  ⚠️ LISTENER REMOVED
         | └─> GameBoard useEffect[] starts running
         |
T+70ms   | GameBoard: Registers event listeners
         | ├─> websocketService.on('game_started', handleGameStarted)  ⚠️ NEW LISTENER
         | └─> websocketService.on('ws_connected', ...)
         |
T+75ms   | GameBoard: Checks if WebSocket is connected
         | └─> if (websocketService.isConnected()) {
         |       websocketService.joinRoom(roomCode, nickname, playerUUID)  ⚠️ REJOIN
         |     }
         |
T+80ms   | Backend: handleJoinRoom() receives join_room
         | ├─> isAlreadyInRoom = true (player created the room)
         | ├─> isReconnecting = false (connectionStatus = CONNECTED)
         | └─> Checks: room.status === ACTIVE && isAlreadyInRoom = TRUE
         |     └─> Sends SECOND game_started event:
         |         client.emit('game_started', {...}, ackCallback)  ⚠️ WITH ACK
         |
T+85ms   | GameBoard: game_started listener fires (SECOND TIME)
         | └─> handleGameStarted(data, ackCallback)
         |     ├─> setPendingGameData(data)
         |     └─> Stores ackCallback in ref
         |
T+85ms   | GameBoard: Render cycle #1
         | └─> useEffect[hexGridReady, pendingGameData]
         |     └─> hexGridReady = false, returns early  ⚠️ NO RENDER YET
         |
T+150ms  | HexGrid: Async init() completes
         | └─> setHexGridReady(true)
         |
T+155ms  | GameBoard: Render cycle #2
         | └─> useEffect[hexGridReady, pendingGameData]
         |     ├─> hexGridReady = true, pendingGameData exists
         |     ├─> hexGridRef.current.initializeBoard(boardData)  ✅ RENDERS
         |     └─> ackCallback(true)  ✅ ACK SENT
```

**Issues**:
- ✅ Works eventually (with ack retry safety net)
- ⚠️ **Two** `game_started` events sent (broadcast + individual)
- ⚠️ Window where Lobby listener is removed but GameBoard listener not yet registered
- ⚠️ Depends on ack retry if HexGrid takes > 500ms

---

### Path 2: Join Room → Start Game → Navigate to /game

**User Actions**:
1. Enter room code in "Join Game" form
2. Select character
3. Host clicks "Start Game"

**Event Sequence**:
```
Same as Path 1 from "Start Game" onwards.
Only difference: initial join was via join form, not create room.
```

**Issues**:
- Same as Path 1
- No functional difference in flow

---

### Path 3: Rejoin Active Game from Lobby

**User Actions**:
1. Refresh Lobby page while in an active game
2. Lobby auto-detects active game and auto-rejoins

**Event Sequence**:
```
T+0ms    | Lobby: Component mounts
         | └─> useEffect[] runs fetchMyRoom()
         |
T+50ms   | REST API: GET /rooms/my-room/:uuid
         | └─> Returns: {room: {status: 'active', roomCode, ...}}
         |
T+55ms   | Lobby: Sets myRoom state
         | └─> setMyRoom({roomCode, status: 'active', ...})
         |
T+60ms   | Lobby: useEffect[myRoom] runs
         | └─> if (myRoom.status === 'active' && mode === 'initial') {
         |       handleRejoinMyRoom()  ⚠️ AUTO-REJOIN
         |     }
         |
T+65ms   | Lobby: handleRejoinMyRoom()
         | └─> websocketService.joinRoom(roomCode, nickname, uuid)
         |
T+70ms   | Backend: handleJoinRoom()
         | ├─> isAlreadyInRoom = true
         | ├─> isReconnecting = false (was never DISCONNECTED)
         | ├─> Emits: room_joined with roomStatus='active'
         | └─> Checks: room.status === ACTIVE && isAlreadyInRoom = TRUE
         |     └─> client.emit('game_started', {...}, ackCallback)
         |
T+75ms   | Lobby: room_joined listener fires
         | └─> handleRoomJoined(data)
         |     └─> if (data.roomStatus === 'active') {
         |           navigate('/game')  ⚠️ NAVIGATION
         |         }
         |
T+80ms   | React Router: Unmounts Lobby, Mounts GameBoard
         | └─> Lobby cleanup: websocketService.off('game_started')  ⚠️ EVENT LOST?
         |
T+85ms   | GameBoard: Registers listeners and rejoins
         | └─> (Same as Path 1 from here)
         |
T+90ms   | Backend: handleJoinRoom() AGAIN (GameBoard rejoin)
         | └─> Sends ANOTHER game_started event
```

**Issues**:
- ⚠️ **Three** join_room calls total (auto-rejoin, navigate to /game, GameBoard rejoin)
- ⚠️ The `game_started` sent at T+70ms might be LOST if Lobby navigates before receiving it
- ⚠️ Depends on GameBoard's rejoin to get game state

---

### Path 4: Page Refresh on /game

**User Actions**:
1. User is on `/game` page
2. Presses F5 (refresh)

**Event Sequence**:
```
T+0ms    | Browser: Full page reload
         | ├─> All state cleared
         | └─> localStorage persists: playerUUID, playerNickname, currentRoomCode
         |
T+10ms   | App: React loads, GameBoard mounts
         |
T+15ms   | GameBoard: useEffect[] runs
         | ├─> Registers event listeners
         | │   └─> websocketService.on('game_started', handleGameStarted)
         | ├─> Gets room info from localStorage
         | └─> hasJoinedRoom.current = false (fresh mount)
         |
T+20ms   | WebSocket Service: Auto-connect on mount
         | └─> websocketService.connect(wsUrl)
         |
T+30ms   | WebSocket: Connection established
         | └─> socket.on('connect') fires
         |     ├─> Registers queued event listeners with Socket.IO
         |     ├─> Emits 'ws_connected'
         |     └─> Auto-rejoin logic:
         |         const lastRoom = getLastRoomCode()
         |         if (lastRoom) {
         |           this.joinRoom(lastRoom, nickname, uuid)  ⚠️ SERVICE AUTO-REJOIN
         |         }
         |
T+35ms   | GameBoard: ws_connected listener fires (if registered)
         | └─> handleConnected()
         |     └─> websocketService.joinRoom(roomCode, nickname, uuid)  ⚠️ DUPLICATE JOIN?
         |
T+40ms   | Backend: handleJoinRoom() (possibly TWICE if duplicate)
         | └─> Sends game_started with ack
         |
T+45ms   | GameBoard: Receives game_started
         | └─> (Same rendering flow as Path 1)
```

**Issues**:
- ⚠️ **Potential duplicate join_room**: Service auto-rejoins AND GameBoard rejoins
- ⚠️ Race condition: If service auto-rejoin fires before GameBoard listener registered
- ✅ Works if either join succeeds and sends game_started

---

### Path 5: Direct URL Navigation to /game

**Event Sequence**:
```
Same as Path 4 (page refresh), but triggered by typing URL instead of F5.
No difference in behavior.
```

---

## Race Condition Matrix

| Scenario | game_started sent before listener ready? | HexGrid ready before game_started? | Result |
|----------|------------------------------------------|-----------------------------------|--------|
| Path 1: Initial start | No (listener registered in Lobby first) | No (sent immediately on join) | ✅ Works (ack retry) |
| Path 2: Join & start | No (listener registered in Lobby first) | No (sent immediately on join) | ✅ Works (ack retry) |
| Path 3: Auto-rejoin | **YES (Lobby navigates away)** | No | ⚠️ Relies on GameBoard rejoin |
| Path 4: Page refresh | **Possible (service vs component)** | No | ⚠️ Timing dependent |
| Path 5: Direct URL | **Possible (service vs component)** | No | ⚠️ Timing dependent |

---

## Auto-Rejoin Logic Conflicts

### Three Places That Call joinRoom():

#### 1. WebSocket Service (websocket.service.ts:150-154)
```typescript
this.socket.on('connect', () => {
  const lastRoom = getLastRoomCode();
  if (lastRoom && this.currentNickname) {
    this.joinRoom(lastRoom, this.currentNickname, this.playerUUID!);
  }
});
```
**Triggers**: On every WebSocket reconnection
**State**: Uses service's `this.currentNickname` (set during last join)

#### 2. Lobby Auto-Rejoin (Lobby.tsx:217-223)
```typescript
useEffect(() => {
  if (myRoom && myRoom.status === 'active' && mode === 'initial') {
    handleRejoinMyRoom();
  }
}, [myRoom]);
```
**Triggers**: When Lobby fetches player's active room via REST API
**State**: Uses localStorage

#### 3. GameBoard Auto-Rejoin (GameBoard.tsx:371-393)
```typescript
useEffect(() => {
  const roomCode = localStorage.getItem('currentRoomCode');
  if (roomCode && playerUUID && nickname) {
    if (websocketService.isConnected()) {
      websocketService.joinRoom(roomCode, nickname, playerUUID);
    } else {
      websocketService.on('ws_connected', handleConnected);
    }
  }
}, [/* dependencies */]);
```
**Triggers**: When GameBoard mounts
**State**: Uses localStorage

### Conflict Scenarios:

**Scenario A: Refresh /game page**
```
1. WebSocket service auto-rejoins on connect
2. GameBoard also tries to rejoin on mount
3. If both fire → two join_room events → two game_started responses
```

**Scenario B: Lobby detects active game**
```
1. Lobby auto-rejoins
2. Backend sends game_started
3. Lobby navigates to /game before receiving it
4. Event is lost (Lobby listener cleaned up)
5. GameBoard rejoins to get state (workaround)
```

---

## Backend Ambiguity

The backend's `handleJoinRoom()` tries to detect the join type with boolean flags:

```typescript
const isAlreadyInRoom = room && room.roomCode === roomCode;
const isReconnecting = player.connectionStatus === ConnectionStatus.DISCONNECTED && isAlreadyInRoom;
```

But these 2 flags cannot distinguish between 5 different frontend scenarios:
1. First join (create room)
2. First join (join existing room)
3. Navigate from Lobby → GameBoard (already in room, never disconnected)
4. Page refresh (already in room, never disconnected)
5. Reconnect after disconnect (already in room, WAS disconnected)

The backend treats cases 3 and 4 the same as case 5, even though they have different semantics.

---

## Summary of Issues

### Critical Issues:
1. **No single source of truth** for when/how to join a room
2. **Duplicate join_room events** from multiple auto-rejoin sources
3. **Lost events during navigation** (Lobby → GameBoard)
4. **Race conditions** between:
   - Event listener registration and join_room call
   - HexGrid initialization and game state rendering
   - WebSocket connection and component mounting

### Symptoms:
- Map doesn't render on page refresh (timing dependent)
- Inconsistent behavior across different navigation paths
- Over-reliance on acknowledgment retry as a bandaid

### Root Cause:
**Lack of architectural clarity** on:
- Who is responsible for joining rooms (service vs component)?
- When should game state be requested?
- How to handle the async nature of HexGrid init?

---

## Recommendations

See `ROOM_JOIN_UNIFIED_ARCHITECTURE.md` for proposed solution.
