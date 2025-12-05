# Fix Character Selection Database Error

## Problem Analysis

The character selection feature is failing with a Prisma database error: `SELECT_CHARACTER_ERROR - Invalid 'this.prisma.character.fin...'`

### Root Cause

The frontend is sending character class names (e.g., "Brute") as `characterId` instead of `characterClass` in the WebSocket payload. The backend then tries to query the database for a character with ID="Brute", which fails because:

1. "Brute" is not a valid database UUID
2. The Prisma query expects a character database ID, not a character class name

### Code Flow

1. **Frontend**: `CharacterSelect.tsx:64` calls `onSelect(characterClass)` with value "Brute"
2. **Frontend**: `Lobby.tsx:182` calls `websocketService.selectCharacter("Brute")`
3. **Frontend**: `websocket.service.ts:360` emits `{characterId: "Brute"}` ❌ **BUG HERE**
4. **Backend**: `game.gateway.ts:644` tries `prisma.character.findUnique({ where: { id: "Brute" }})` ❌ **FAILS**

### Expected Behavior

The payload should be `{characterClass: "Brute"}` to use the legacy character class selection path (lines 665-670 in game.gateway.ts).

## Solution

Fix the frontend WebSocket service to send `characterClass` instead of `characterId` when the value is a character class name.

## Implementation Plan

### File to Modify

**Frontend**: `/home/opc/hexhaven/frontend/src/services/websocket.service.ts`

### Changes Required

**Line 360**: Change from:
```typescript
this.emit('select_character', { characterId });
```

To:
```typescript
this.emit('select_character', { characterClass: characterId as CharacterClass });
```

**Justification:**
- The `selectCharacter` method receives character class names (e.g., "Brute") from the UI
- The backend supports both `characterId` (persistent characters, feature 002) and `characterClass` (legacy, current implementation)
- Since we're not using persistent characters yet, we should send `characterClass`
- The type system already supports this: `SelectCharacterPayload` has optional fields for both

### Alternative Considered

We could rename the parameter from `characterId` to `characterClass` in the frontend methods, but that would require changing:
- `websocket.service.ts:358` - function parameter
- `game-state.service.ts:542` - function parameter
- `Lobby.tsx:178` - function call and variable name
- Multiple other references

The simpler fix is to just change the emit payload, as the parameter name is internal.

## Testing Strategy

After implementing the fix:

1. Run `/visual smoke` test
2. Verify Step 5 now passes:
   - Character selection should work
   - Start Game button should become enabled
   - Game should start successfully
3. Check that no regression occurred in steps 1-4
4. Verify the backend no longer throws `SELECT_CHARACTER_ERROR`

## Risks & Considerations

- **Low Risk**: This is a simple payload field rename
- **No Breaking Changes**: The backend already supports `characterClass` (it's the legacy path that currently works)
- **Type Safety**: The CharacterClass type is already imported and available in the file

## Success Criteria

- ✅ Character selection completes without database error
- ✅ Start Game button becomes enabled after character selection
- ✅ Backend logs show successful character selection
- ✅ Visual smoke test Step 5 passes
