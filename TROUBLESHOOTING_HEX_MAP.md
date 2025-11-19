# Hex Map Rendering Troubleshooting

**Issue**: Hex map does not render when starting a game
**Date**: 2025-11-19
**Status**: IN PROGRESS

## Problem Description

When a player creates a room, selects a character, and clicks "Start Game", the application navigates to the GameBoard page (`/game`), but the hex map does not render. The page appears blank or shows only the game UI without the hexagonal grid.

## Root Cause Analysis

### Initial Investigation

1. **Backend Game Start Flow** ✅ WORKING
   - Backend successfully starts the game and sets room status to ACTIVE
   - Scenario data loads correctly (16 tiles for scenario-1 "Black Barrow")
   - Monsters are spawned and initialized
   - `game_started` event is broadcast to the room

2. **Frontend Navigation Flow** ⚠️ PARTIAL
   - Lobby component receives `game_started` event
   - Lobby navigates to `/game` using React Router
   - **ISSUE**: Navigation consumes the event, GameBoard never receives it

3. **WebSocket Connection Status During Navigation** ⚠️ KEY ISSUE
   - WebSocket connection stays alive during navigation (no disconnect/reconnect)
   - Player's `connectionStatus` remains `CONNECTED`
   - Backend's `isReconnecting` check evaluates to `false` because player was never disconnected
   - Original code only sent game state to "reconnecting" players (those with `DISCONNECTED` status)

## Attempted Fixes

### Fix #1: Set Room Status to ACTIVE (FAILED)
**Attempt**: Directly set `room.status = RoomStatus.ACTIVE` in handleStartGame
```typescript
room.status = RoomStatus.ACTIVE; // ❌ TypeScript error
```
**Result**: Compilation error - `status` is a read-only property

**File**: `/home/opc/hexhaven/backend/src/websocket/game.gateway.ts:533`

---

### Fix #2: Call room.startGame() Directly (FAILED - Created Duplicate Call)
**Attempt**: Call `room.startGame()` method to properly set status
```typescript
room.startGame(payload.scenarioId); // ❌ Duplicate call
```
**Result**: "Game already started" error because `roomService.startGame()` already calls it internally

**File**: `/home/opc/hexhaven/backend/src/websocket/game.gateway.ts:583`
**Error**: User reported getting "game has already started" error when clicking Start Game button

---

### Fix #3: Remove Duplicate Call (PARTIAL SUCCESS)
**Change**: Removed duplicate `room.startGame()` call, kept only `roomService.startGame()`
**Result**: Game starts successfully, but hex map still doesn't render

**File**: `/home/opc/hexhaven/backend/src/websocket/game.gateway.ts:583` (removed)

---

### Fix #4: Add Auto-Rejoin Logic to GameBoard (FAILED)
**Attempt**: Make GameBoard automatically rejoin room on mount to trigger game state resend
```typescript
useEffect(() => {
  const roomCode = localStorage.getItem('currentRoomCode');
  const playerUUID = localStorage.getItem('playerUUID');
  const nickname = localStorage.getItem('playerNickname');

  if (roomCode && playerUUID && nickname) {
    websocketService.joinRoom(roomCode, nickname, playerUUID);
  }
}, []);
```
**Result**: Backend logs show player is "already in room" but NOT "reconnecting", so game state logic doesn't run

**Files**:
- `/home/opc/hexhaven/frontend/src/pages/GameBoard.tsx:241-264`
- `/home/opc/hexhaven/frontend/src/pages/Lobby.tsx:71-72` (added localStorage save)

**Backend Logs**:
```
✅ Room SVTSGS game started, status set to ACTIVE
✅ Broadcasting game_started to room SVTSGS with 16 tiles
✅ Player Hjjh is already in room SVTSGS
❌ Player Hjjh connected socket to room SVTSGS (not "reconnected")
❌ No game state sent because isReconnecting = false
```

---

### Fix #5: Move Game State Logic Outside Reconnection Block (CURRENT)
**Root Cause**: The `isReconnecting` check was too restrictive
```typescript
// OLD CODE (lines 234-240)
if (isReconnecting) {
  // Send reconnection broadcast
  if (room.status === RoomStatus.ACTIVE) {
    // Send game state
  }
}
```

The problem:
```typescript
const isReconnecting =
  player.connectionStatus === ConnectionStatus.DISCONNECTED &&
  isAlreadyInRoom;
```
When navigating Lobby → GameBoard, the WebSocket stays connected, so `player.connectionStatus === CONNECTED`, making `isReconnecting = false`.

**Solution**: Send game state to ANY player joining an ACTIVE game, not just reconnecting players
```typescript
// NEW CODE (lines 234-245)
if (isReconnecting) {
  // Send reconnection broadcast
}

// Check ACTIVE game for ALL players already in room
if (room.status === RoomStatus.ACTIVE && isAlreadyInRoom) {
  try {
    // Get game state and send to player
    const monsters = this.roomMonsters.get(roomCode) || [];
    const characters = room.players.map(...);
    const hexMap = this.roomMaps.get(roomCode);

    client.emit('game_started', gameStartedPayload);
  } catch (error) {
    this.logger.error('Error sending game state:', error);
  }
}
```

**Files Modified**:
- `/home/opc/hexhaven/backend/src/websocket/game.gateway.ts:234-319`

**Backend Logs After Fix**:
```
✅ Checking room status for MMKMYN: active (ACTIVE=active)
✅ Entered ACTIVE block for Hjjg
✅ Found 3 monsters for MMKMYN
✅ Found 1 characters for MMKMYN
✅ Built mapLayout with 16 tiles
✅ Sending game_started to Hjjg with 16 tiles
✅ Sent game state to reconnecting player Hjjg
```

**Status**: Backend is now successfully sending game state, but frontend still not receiving/processing it

---

## Current Investigation

### Backend Status: ✅ WORKING
- Game starts successfully
- Room status set to ACTIVE
- Monsters spawned (3 monsters for scenario-1)
- Map data prepared (16 tiles)
- `game_started` event emitted to client socket
- All debug logs showing successful execution

### Frontend Status: ❌ NOT RECEIVING EVENT
**Evidence**: Frontend console logs stop at character selection, no logs from GameBoard page

**Expected Frontend Logs** (from GameBoard.tsx:48-78):
```
✅ "GameBoard mounted - rejoining room {roomCode} to get game state"
✅ "Registering game_started event listener"
✅ "game_started listener registered"
✅ "handleGameStarted called with data: {…}"
✅ "handleGameStarted: hexGridRef.current is [initialized/NULL]"
✅ "Received mapLayout with X tiles"
```

**Actual Frontend Logs**:
- Stop at character selection (8:41:41 PM)
- No navigation logs
- No GameBoard mount logs
- No event listener registration logs
- No handleGameStarted logs

### Possible Causes

1. **Navigation Failed**
   - Lobby's handleGameStarted might not be calling navigate('/game')
   - React Router might be blocking navigation
   - URL might change but component doesn't mount

2. **Event Listener Not Registered**
   - useEffect might not be running
   - Event handler might be getting cleaned up too early
   - WebSocket event emitter might have a bug

3. **Event Received But Handler Not Called**
   - Event name mismatch
   - Handler function not in scope
   - React stale closure issue

4. **Logs Being Cleared**
   - Page refresh clearing console
   - DebugConsole component not persisting logs across navigation

## Files Involved

### Backend
- `/home/opc/hexhaven/backend/src/websocket/game.gateway.ts` - Main WebSocket gateway
  - Lines 165-347: handleJoinRoom method
  - Lines 483-593: handleStartGame method
- `/home/opc/hexhaven/backend/src/models/game-room.model.ts` - Room domain model
  - Lines 140-155: startGame() method
- `/home/opc/hexhaven/backend/src/data/scenarios.json` - Scenario definitions

### Frontend
- `/home/opc/hexhaven/frontend/src/pages/Lobby.tsx` - Lobby page
  - Lines 71-72: localStorage save for roomCode
  - Lines 139-141: handleGameStarted navigation
- `/home/opc/hexhaven/frontend/src/pages/GameBoard.tsx` - Game board page
  - Lines 48-130: handleGameStarted event handler
  - Lines 241-264: Auto-rejoin useEffect
  - Lines 266-290: Event listener registration useEffect
- `/home/opc/hexhaven/frontend/src/components/DebugConsole.tsx` - Debug logging
  - Lines 69-74: Auto-scroll disabled (per user request)
- `/home/opc/hexhaven/frontend/src/hooks/useWebSocket.ts` - WebSocket service

## Debug Logging Added

### Backend (game.gateway.ts)
```typescript
// Line 243: Room status check
this.logger.log(`Checking room status for ${roomCode}: ${room.status} (ACTIVE=${RoomStatus.ACTIVE})`);

// Line 247: Entered active game block
this.logger.log(`Entered ACTIVE block for ${nickname}`);

// Line 250: Monster data
this.logger.log(`Found ${monsters.length} monsters for ${roomCode}`);

// Line 255: Character data
this.logger.log(`Found ${characters.length} characters for ${roomCode}`);

// Line 265: Map data
this.logger.log(`Built mapLayout with ${mapLayout.length} tiles`);

// Line 296: Event emission
this.logger.log(`Sending game_started to ${nickname} with ${mapLayout.length} tiles`);

// Line 298: Success confirmation
this.logger.log(`Sent game state to reconnecting player ${nickname}`);

// Line 317: Error handling
this.logger.error(`Error sending game state to reconnecting player ${nickname}:`, activeGameError);
```

### Frontend (GameBoard.tsx)
- Line 55: "handleGameStarted called with data:"
- Line 57: hexGridRef.current status
- Line 62: mapLayout tile count
- Line 247: "GameBoard mounted - rejoining room"
- Line 274: "Registering game_started event listener"

## Next Steps

1. **Verify Frontend Navigation**
   - Check if Lobby.handleGameStarted is actually calling navigate('/game')
   - Add console.log in Lobby right before navigation
   - Check if URL changes in browser

2. **Verify GameBoard Mount**
   - Check if GameBoard component mounts when navigating to /game
   - Verify useEffect hooks are running
   - Check React DevTools component tree

3. **Verify WebSocket Event Flow**
   - Add debug logging in websocketService.on('game_started', ...)
   - Check if Socket.IO is receiving the event from backend
   - Verify event name matches exactly (case-sensitive)

4. **Check for React Strict Mode Issues**
   - Strict mode causes double-mount which might affect event listeners
   - Check if cleanup function is removing listeners before registration

5. **Verify DebugConsole Behavior**
   - Check if logs are actually being captured during navigation
   - Verify DebugConsole persists across page changes
   - Try using browser's native console.log as backup

## Commands to Rebuild

```bash
# Backend
cd /home/opc/hexhaven/backend
npm run build
lsof -ti:3000 | xargs -r kill -9
npm run start:dev > /tmp/backend.log 2>&1 &

# Frontend (if needed)
cd /home/opc/hexhaven/frontend
npm run build
```

## Related Issues

- Player reconnection after disconnect (US4-T153)
- Session persistence across page navigation
- WebSocket connection lifecycle management

## Questions to Answer

1. ❓ Does the URL change to /game when Start Game is clicked?
2. ❓ Does GameBoard component mount (check React DevTools)?
3. ❓ Are the GameBoard useEffect hooks running?
4. ❓ Is the game_started event being received by the WebSocket client?
5. ❓ Is handleGameStarted being called with the event data?
6. ❓ What is the value of hexGridRef.current when handleGameStarted runs?
