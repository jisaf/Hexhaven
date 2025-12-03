# Multiple Game Creation Fix - Implementation Plan

## Problem Summary

When a user creates a second game after playing/creating a first game:
1. User selects a character in the lobby
2. Character selection **does not appear** in their player card
3. Cannot start the game because backend doesn't recognize character selection

## Root Cause Analysis

### Critical Issue: Socket.IO Room Contamination

**Location**: Backend `game.gateway.ts` lines 105-126, Frontend `room-session.service.ts`

**The Bug:**
1. User creates Game 1 (Room: ABC123)
   - Socket joins Socket.IO room "ABC123"
2. User navigates to lobby, creates Game 2 (Room: XYZ789)
   - Frontend calls `switchRoom()` which only clears frontend state
   - **Socket is still in room "ABC123"** on the backend
   - Socket joins Socket.IO room "XYZ789"
   - **Socket is now in BOTH rooms simultaneously**
3. User selects character in Game 2
   - `handleSelectCharacter` in backend calls `getRoomFromSocket(client)`
   - `getRoomFromSocket` returns `roomCodes[0]` - **the FIRST room (ABC123)**
   - Character selection updates Game 1 instead of Game 2!
   - Character selection broadcast goes to room ABC123
   - Frontend listening on room XYZ789 never receives the broadcast

**Evidence:**
```typescript
// game.gateway.ts line 118
const roomCode = roomCodes[0];  // Gets FIRST room, not current/active room!
```

### Secondary Issue: Component State Persistence

**Location**: `Lobby.tsx` line 47

**The Bug:**
- `selectedCharacter` local component state persists across game sessions
- When user creates second game, CharacterSelect shows previous game's selection
- Confuses the user about which character is actually selected

### Tertiary Issue: isReady Flag Derivation

**Location**: `room-session.service.ts` line 285

**The Bug:**
- `onRoomJoined` hardcodes `isReady: false` for all players
- Should derive from `characterClass` presence: `isReady: !!p.characterClass`
- This causes player cards to not show "Ready" badge correctly after reconnection

## Implementation Strategy

### Phase 1: Fix Socket.IO Room Management (CRITICAL)

**Goal:** Ensure socket is only in ONE game room at a time

**Changes:**

1. **Add `leave_room` WebSocket event** (Backend)
   - File: `backend/src/websocket/game.gateway.ts`
   - Add new handler: `@SubscribeMessage('leave_room')`
   - Logic:
     ```typescript
     @SubscribeMessage('leave_room')
     handleLeaveRoom(
       @ConnectedSocket() client: Socket,
       @MessageBody() payload: { roomCode: string },
     ): void {
       client.leave(payload.roomCode);
       this.logger.log(`Client ${client.id} left room ${payload.roomCode}`);
     }
     ```

2. **Add `leaveRoom()` method** (Frontend WebSocket Service)
   - File: `frontend/src/services/websocket.service.ts`
   - Add method:
     ```typescript
     leaveRoom(roomCode: string): void {
       this.emit('leave_room', { roomCode });
     }
     ```

3. **Call `leaveRoom` before joining new room** (Frontend Room Session Manager)
   - File: `frontend/src/services/room-session.service.ts`
   - Modify `switchRoom()` to:
     ```typescript
     public switchRoom(): void {
       // Leave previous room on backend if exists
       if (this.state.roomCode) {
         websocketService.leaveRoom(this.state.roomCode);
       }

       // Clear state
       this.state = { /* ... */ };
       this.hasJoinedInSession = false;
       this.emitStateUpdate();
     }
     ```

4. **Improve `getRoomFromSocket` logic** (Backend - Optional but recommended)
   - File: `backend/src/websocket/game.gateway.ts`
   - Instead of getting first room, accept roomCode as parameter
   - Or verify client is ONLY in one room and throw error if in multiple

### Phase 2: Fix Component State Cleanup

**Goal:** Reset `selectedCharacter` when switching games

**Changes:**

1. **Reset `selectedCharacter` when entering lobby**
   - File: `frontend/src/pages/Lobby.tsx`
   - Modify the cleanup useEffect (lines 90-94):
     ```typescript
     useEffect(() => {
       console.log('[Lobby] Component mounted - resetting room session for clean state');
       roomSessionManager.switchRoom();
       setSelectedCharacter(undefined); // ADD THIS LINE
     }, []);
     ```

2. **Alternative: Sync `selectedCharacter` with session state**
   - Listen to room session changes and update `selectedCharacter`:
     ```typescript
     useEffect(() => {
       const currentPlayer = findPlayerById(players, currentPlayerId || '');
       setSelectedCharacter(currentPlayer?.characterClass as CharacterClass | undefined);
     }, [players, currentPlayerId]);
     ```

### Phase 3: Fix isReady Derivation

**Goal:** Correctly derive `isReady` from `characterClass` presence

**Changes:**

1. **Use `transformPlayer` utility in `onRoomJoined`**
   - File: `frontend/src/services/room-session.service.ts`
   - Import: `import { transformPlayer } from '../utils/playerTransformers';`
   - Modify line 282:
     ```typescript
     this.state.players = data.players.map(p => ({
       ...p,
       connectionStatus: 'connected',
       isReady: !!p.characterClass, // Derive from characterClass
     }));
     ```

2. **OR: Use transformPlayer function**
   - Replace the mapping with:
     ```typescript
     import { transformPlayer } from '../utils/playerTransformers';

     this.state.players = data.players.map(p =>
       transformPlayer({ ...p, id: p.id })
     );
     ```

### Phase 4: Add Defensive Backend Checks

**Goal:** Prevent character selection in wrong room

**Changes:**

1. **Validate socket is in correct room before processing**
   - File: `backend/src/websocket/game.gateway.ts`
   - In `handleSelectCharacter` (line 558):
     ```typescript
     // Verify socket is actually in this room
     const roomData = this.getRoomFromSocket(client);
     if (!roomData) {
       throw new Error('Player not in any room');
     }

     // Add logging to detect multi-room issues
     const clientRooms = Array.from(client.rooms).filter(r => r !== client.id);
     if (clientRooms.length > 1) {
       this.logger.warn(
         `⚠️ Client ${client.id} is in multiple rooms: ${clientRooms.join(', ')}`
       );
     }
     ```

## Testing Strategy

### Test Case 1: Multiple Game Creation
1. Create Game 1, select "Brute"
2. Navigate to lobby
3. Create Game 2
4. Verify: CharacterSelect shows no selection
5. Select "Tinkerer"
6. Verify: Player card shows "Tinkerer" with "Ready" badge
7. Start Game 2
8. Verify: Game starts successfully with "Tinkerer"

### Test Case 2: Socket Room Isolation
1. Create Game 1 (ABC123), select character
2. Create Game 2 (XYZ789)
3. Check backend logs: Verify socket left room ABC123 before joining XYZ789
4. Select character in Game 2
5. Verify: Backend logs show character selection for room XYZ789 (not ABC123)

### Test Case 3: Three Games Sequence
1. Create Game 1, select "Brute", start game
2. Return to lobby, create Game 2, select "Tinkerer"
3. Return to lobby, create Game 3, select "Spellweaver"
4. Verify: Each game has correct character selection

### Test Case 4: Edge Cases
1. Create game, don't select character, create another game → should work
2. Create game, select character, refresh page, create another game → should work
3. Create game as host, leave, join as player → should work

## Implementation Order

1. **Phase 1** (Critical) - Socket.IO room management
   - Implement leave_room backend handler
   - Implement leaveRoom frontend method
   - Call leaveRoom in switchRoom
2. **Phase 2** - Component state cleanup
   - Reset selectedCharacter on mount
3. **Phase 3** - isReady derivation fix
   - Update onRoomJoined to derive isReady
4. **Phase 4** - Defensive checks
   - Add multi-room detection logging

## Files to Modify

### Backend
1. `backend/src/websocket/game.gateway.ts`
   - Add `@SubscribeMessage('leave_room')` handler
   - Add multi-room detection logging in `handleSelectCharacter`

### Frontend
1. `frontend/src/services/websocket.service.ts`
   - Add `leaveRoom(roomCode: string)` method

2. `frontend/src/services/room-session.service.ts`
   - Modify `switchRoom()` to call `websocketService.leaveRoom()`
   - Update `onRoomJoined` to derive `isReady` from `characterClass`

3. `frontend/src/pages/Lobby.tsx`
   - Reset `selectedCharacter` state in cleanup useEffect

### Shared Types (if needed)
4. `shared/types/events.ts`
   - Add `LeaveRoomPayload` type if not exists

## Risk Assessment

**Low Risk:**
- Adding leave_room handler - backward compatible
- Resetting selectedCharacter - only affects UI
- isReady derivation - matches existing behavior

**Medium Risk:**
- Calling leaveRoom in switchRoom - could affect reconnection flow
- Mitigation: Only leave if roomCode exists, don't leave on disconnect

**High Risk:**
- None identified

## Rollback Plan

If issues arise:
1. Remove `websocketService.leaveRoom()` call from `switchRoom()`
2. Revert to original `onRoomJoined` mapping
3. Keep component state reset (harmless)

## Success Criteria

- ✅ User can create multiple games sequentially
- ✅ Character selection shows up in player card in second game
- ✅ Can start second game successfully
- ✅ Backend logs show socket leaving old room before joining new room
- ✅ No "already selected" errors when selecting characters in new games
- ✅ CharacterSelect UI shows correct selection state
- ✅ Player cards show "Ready" badge when character selected

## Additional Improvements (Optional)

1. **Add visual feedback when switching games**
   - Show loading state while leaving old room and joining new room

2. **Prevent accidental multi-room joins**
   - Backend: Automatically leave previous room when joining new room
   - Frontend: Disable "Create Room" button while in a room

3. **Better state debugging**
   - Add console logs showing which room socket is currently in
   - Add debug panel showing socket rooms in development mode

4. **Graceful degradation**
   - If backend detects multi-room situation, automatically leave all rooms except newest
   - Emit warning to frontend to refresh page
