# Fix Monster Location Targeting Issue

## Problem Analysis

When a monster moves, targeting requires clicking the hex where they were originally, not where they currently are. The target calculation appears correct, but highlighting and clicking seem wrong.

### Root Cause

The issue is in the `updateMonsterPosition` function in `frontend/src/hooks/useHexGrid.ts:207-224`:

1. When a monster moves, `updateMonsterPosition` is called
2. It updates the MonsterSprite's internal data via `updateMonster()`
3. It then manually sets the sprite's position via `sprite.position.set(pos.x, pos.y)`
4. However, this doesn't trigger PIXI.js to recalculate the sprite's interactive bounds
5. The sprite's visual position updates, but the clickable area remains at the old location

### Files Involved

- `frontend/src/hooks/useHexGrid.ts` - Contains `updateMonsterPosition` function (lines 207-224)
- `frontend/src/game/HexGrid.ts` - Contains `addMonster`, `updateMonster`, `getMonster` methods
- `frontend/src/game/MonsterSprite.ts` - MonsterSprite class

## Solution Approach

### Option 1: Explicitly Update Hit Area (Recommended)

After setting the sprite position, explicitly update the sprite's interactive bounds by:
- Setting the sprite's hitArea explicitly based on the new position
- OR calling a method to recalculate bounds

### Option 2: Remove and Re-add the Sprite

When a monster moves:
1. Remove the old sprite
2. Create a new sprite at the new location
3. Re-attach event handlers

This is more robust but less efficient.

### Option 3: Use Container-level Hit Detection

Instead of relying on sprite-level hit detection, use hex-level hit detection to determine which monster is clicked.

## Recommended Solution: Option 1

The issue is that in PixiJS, when you manually set a Container's position using `position.set()`, it doesn't automatically recalculate the interactive hit area. The MonsterSprite is a PIXI.Container with `eventMode = 'static'`, which makes it interactive, but when the position changes, the bounds used for hit detection might not update immediately.

**The fix:** Add an `updatePosition` method to `MonsterSprite` (similar to `CharacterSprite`) that properly updates the sprite's position. This ensures the interactive bounds are recalculated.

## Implementation Steps

1. **Add `updatePosition` method to MonsterSprite** (`frontend/src/game/MonsterSprite.ts`)
   - Add a public method that takes an Axial hex coordinate
   - Converts hex to screen coordinates
   - Sets the sprite position
   - Updates the internal monster data with the new hex position

2. **Simplify `updateMonsterPosition` in useHexGrid.ts**
   - Call `updateMonster()` to update internal data
   - Call the new `updatePosition()` method to move the sprite
   - Remove the manual `position.set()` call

3. **Test the fix**
   - Verify monster can be clicked at new location after movement
   - Verify old location is no longer clickable
   - Verify monster highlighting works correctly

## Edge Cases to Consider

1. Monster moving multiple times in quick succession
2. Monster being selected while moving
3. Multiple monsters on the board
4. Monster moving and then being targeted in the same turn

## Testing Plan

### Manual Testing
1. Start a game with monsters
2. Wait for a monster to move (AI-driven)
3. Attempt to click the old location - should NOT select the monster
4. Attempt to click the new location - SHOULD select the monster
5. Verify attack range highlights appear at the correct location
6. Verify selection ring appears at the correct location

### Automated Testing
- Verify existing E2E tests still pass
- Consider adding a specific test for monster targeting after movement

## Code Changes

### File 1: `frontend/src/game/hex-utils.ts`

Add this utility function to handle sprite position updates:

```typescript
/**
 * Update a PIXI sprite's position based on hex coordinates
 * This ensures the sprite's interactive hit area is properly recalculated
 */
export function updateSpritePosition(sprite: PIXI.Container, hex: Axial): void {
  const pos = axialToScreen(hex);
  sprite.position.set(pos.x, pos.y);
}
```

Add PIXI import at the top:
```typescript
import * as PIXI from 'pixi.js';
```

### File 2: `frontend/src/game/MonsterSprite.ts`

Add the import:
```typescript
import { type Axial, updateSpritePosition } from './hex-utils';
```

Add this method after the `getMonster()` method (around line 295):

```typescript
/**
 * Update monster position on the grid
 */
public updatePosition(hex: Axial): void {
  updateSpritePosition(this, hex);
  // Update internal data
  this.monster.currentHex = hex;
}
```

### File 3: `frontend/src/hooks/useHexGrid.ts`

Replace the `updateMonsterPosition` function (lines 207-224) with:

```typescript
// Update monster position
const updateMonsterPosition = useCallback((monsterId: string, newHex: Axial) => {
  if (hexGridRef.current) {
    const sprite = hexGridRef.current.getMonster(monsterId);
    if (sprite) {
      // Update monster data
      const monsterData = sprite.getMonster();
      const updatedMonster = { ...monsterData, currentHex: newHex };
      hexGridRef.current.updateMonster(monsterId, updatedMonster);

      // Update sprite position (this ensures hit detection is refreshed)
      sprite.updatePosition(newHex);
    }
  }
}, []);
```

## Summary

The fix uses a shared utility function approach to eliminate code duplication between CharacterSprite and MonsterSprite. We add `updateSpritePosition()` to hex-utils.ts and use it in MonsterSprite's new `updatePosition()` method. This ensures PIXI.js properly updates the interactive hit area when monsters move.

## Future Enhancement: Base Class Abstraction

**Status:** Documented for future consideration
**Priority:** Low (nice-to-have refactoring)

### Proposal: GameEntitySprite Base Class

As the game expands with more entity types (NPCs, familiars, summons, companions, etc.), consider creating a `GameEntitySprite` base class:

```typescript
// frontend/src/game/GameEntitySprite.ts
export abstract class GameEntitySprite extends PIXI.Container {
  protected currentHex: Axial;

  constructor(initialHex: Axial) {
    super();
    this.currentHex = initialHex;
    this.updatePosition(initialHex);
  }

  public updatePosition(hex: Axial): void {
    const pos = axialToScreen(hex);
    this.position.set(pos.x, pos.y);
    this.currentHex = hex;
    this.onPositionUpdated(hex);
  }

  protected abstract onPositionUpdated(hex: Axial): void;

  public getCurrentHex(): Axial {
    return this.currentHex;
  }
}
```

**Benefits:**
- Shared position management logic
- Consistent behavior across all entity types
- Foundation for shared features (selection, highlighting, animations)
- Easier to add new entity types

**When to implement:**
- When adding 3+ new entity types that share similar behavior
- When entity management logic becomes complex enough to warrant abstraction
- As part of a larger entity system refactor

**Related Files:**
- `frontend/src/game/CharacterSprite.ts`
- `frontend/src/game/MonsterSprite.ts`
- Future: `NpcSprite.ts`, `SummonSprite.ts`, etc.
