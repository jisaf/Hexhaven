# PR 214 Review: Background Image Implementation

**Branch**: `191-enable-map-backgrounds`
**PR**: #214
**Issue**: #191 - Enable map backgrounds
**Reviewed**: 2025-12-11

---

## Executive Summary

This PR adds substantial infrastructure for background images but has **critical data flow gaps** that prevent backgrounds from actually rendering in gameplay. The implementation is ~70% complete but disconnected at key integration points.

---

## Critical Issues

### 1. **Broken Data Flow: GameBoard → HexGrid** (Severity: Critical)

The backend correctly sends background fields in `GameStartedPayload` but **GameBoard.tsx never passes them to HexGrid**:

```typescript
// GameBoard.tsx:262-279 - Background fields are NEVER used
useEffect(() => {
  if (hexGridReady && gameState.gameData) {
    const boardData: GameBoardData = {
      tiles: typedTiles,
      characters: gameState.gameData.characters,
      monsters: gameState.gameData.monsters || [],
      // MISSING: backgroundImageUrl, backgroundScale, backgroundOffset, etc.
    };
    initializeBoard(boardData);
  }
}, [hexGridReady, gameState.gameData, initializeBoard]);
```

**Fix**: Extend `GameBoardData` interface and pass background config through `initializeBoard()`.

### 2. **setBackgroundImage() Renders Outside Viewport** (Severity: Critical)

`HexGrid.ts:813-818`:
```typescript
public setBackgroundImage(imageUrl: string): void {
  const sprite = PIXI.Sprite.from(imageUrl);
  sprite.width = this.app.screen.width;
  sprite.height = this.app.screen.height;
  this.app.stage.addChildAt(sprite, 0); // WRONG: Added to stage, not viewport
}
```

**Problems**:
- Background is added to `app.stage` (fixed) not `viewport` (pannable/zoomable)
- Uses screen dimensions instead of world coordinates
- No support for scale/offset/opacity transform parameters stored in DB
- Background won't move when user pans or zooms

**Fix**: Add background to a dedicated layer inside `viewport`, similar to `tilesLayer`.

### 3. **ScenarioDesigner Uses Ephemeral Blob URLs** (Severity: High)

`ScenarioDesigner.tsx:297-302`:
```typescript
const handleBackgroundImageUpload = (event) => {
  const imageUrl = URL.createObjectURL(event.target.files[0]); // Blob URL - session-only
  gridRef.current.setBackgroundImage(imageUrl);
};
```

The blob URL is only valid for the current browser session and is **never uploaded to the server**. The server-side upload endpoint (`POST /api/scenarios/:id/background`) exists but is **not called**.

---

## Data Flow Analysis

### Current (Broken) Flow
```
ScenarioDesigner                     Backend                      GameBoard
      |                                |                              |
      |--blob URL-------------------->|                              |
      |  (never uploaded)              |                              |
      |                                |                              |
      |                                |----game_started------------>|
      |                                |  (has background fields)     |
      |                                |                              |
      |                                |                              | Fields ignored
      |                                |                              |
```

### Required Flow
```
ScenarioDesigner                     Backend                      GameBoard
      |                                |                              |
      |--POST /scenarios/:id/background>|                             |
      |  (FormData with file)          |                              |
      |<------------------------------|  (returns URL)               |
      |                                |                              |
      |--PUT /scenarios/:id---------->|                              |
      |  (save transforms)             |                              |
      |                                |                              |
      |                                |----game_started------------>|
      |                                |  (background fields)         |
      |                                |                              |
      |                                |                              |--initializeBoard()-->HexGrid
      |                                |                              |  (with background)
```

---

## Single Responsibility Violations

### 1. **scenarios.controller.ts is overloaded** (385 lines -> 103 lines originally)

The controller now handles:
- REST API routing
- File upload configuration (multer setup)
- File system operations (unlink, existsSync)
- Business logic validation

**Recommendation**: Extract:
- `BackgroundUploadService` - handles multer config, file validation, cleanup
- `ScenarioValidator` - validates DTO fields, business rules

### 2. **HexGrid.ts mixes rendering concerns**

`HexGrid` manages:
- Tile rendering
- Character sprites
- Monster sprites
- Loot tokens
- Background images (new)
- Camera/viewport
- User input events

**Recommendation**: Extract `BackgroundLayer` class that handles:
- Loading/caching background sprite
- Applying transform (scale, offset, opacity)
- Resize handling

---

## Constructive Improvements

### 1. Add Background Layer to HexGrid

```typescript
// In HexGrid.init()
this.backgroundLayer = new PIXI.Container();
this.viewport.addChildAt(this.backgroundLayer, 0); // First layer

// New method
public setBackground(config: BackgroundConfig): void {
  this.backgroundLayer.removeChildren();
  if (!config?.imageUrl) return;

  const sprite = PIXI.Sprite.from(config.imageUrl);
  sprite.alpha = config.opacity ?? 1.0;
  sprite.scale.set(config.scale ?? 1.0);
  sprite.position.set(config.offsetX ?? 0, config.offsetY ?? 0);
  this.backgroundLayer.addChild(sprite);
}
```

### 2. Extend GameBoardData Interface

```typescript
// shared/types/entities.ts or HexGrid.ts
export interface GameBoardData {
  tiles: HexTile[];
  characters: CharacterData[];
  monsters?: Monster[];
  background?: {
    imageUrl: string;
    opacity?: number;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
  };
}
```

### 3. Wire Up ScenarioDesigner Upload

```typescript
const handleBackgroundImageUpload = async (event) => {
  const file = event.target.files[0];
  if (!file || !scenarioId) return;

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`/api/scenarios/${scenarioId}/background`, {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    const { url } = await response.json();
    gridRef.current.setBackground({ imageUrl: url });
  }
};
```

---

## Alternative Approaches

### Alternative 1: Canvas-Based Registration with Anchor Points

If pixel-perfect alignment is required across different canvas sizes:

**Approach**: Use colored anchor pixels in background images (e.g., red pixel at top-left hex center, blue at bottom-right).

```typescript
interface AnchorBasedBackground {
  imageUrl: string;
  anchors: {
    topLeft: { imageX: number; imageY: number; hexQ: number; hexR: number };
    bottomRight: { imageX: number; imageY: number; hexQ: number; hexR: number };
  };
}

// During render, calculate transform to map anchor pixels to hex screen positions
const transform = calculateAffineTransform(anchors, hexToScreen);
backgroundSprite.setTransform(transform);
```

**Pros**: Self-aligning regardless of canvas size, robust to resize
**Cons**: Requires image preprocessing, more complex user workflow

### Alternative 2: Normalized Coordinate System

Store background transforms relative to the map bounds rather than absolute pixels:

```typescript
interface NormalizedBackground {
  imageUrl: string;
  // Position as percentage of map bounds (0-1)
  normalizedX: number; // 0 = left edge, 1 = right edge
  normalizedY: number;
  // Scale relative to map width
  scaleToMapWidth: number; // 1.0 = background width equals map width
}

// During render
const mapBounds = tilesLayer.getBounds();
sprite.x = mapBounds.x + (normalizedX * mapBounds.width);
sprite.y = mapBounds.y + (normalizedY * mapBounds.height);
sprite.width = mapBounds.width * scaleToMapWidth;
```

**Pros**: Resolution-independent, consistent across devices
**Cons**: Requires recalculating on map layout changes

---

## Summary Checklist

| Issue | Severity | Status |
|-------|----------|--------|
| GameBoard doesn't pass background to HexGrid | Critical | Not implemented |
| setBackgroundImage renders outside viewport | Critical | Broken |
| ScenarioDesigner doesn't upload to server | High | Not implemented |
| No dedicated background layer in viewport | Medium | Missing |
| scenarios.controller.ts too large | Low | Technical debt |
| Transform parameters (scale/offset/opacity) unused | Medium | Not wired |
| boardInitializedRef fix (PR title) | Low | Correct |

**Recommendation**: Do not merge until the data flow from `GameStartedPayload` through `GameBoard` to `HexGrid` is complete. The current implementation stores data but never renders it.

---

## Files Changed Summary

| File | Changes | Notes |
|------|---------|-------|
| `backend/src/api/scenarios.controller.ts` | +385/-3 | New CRUD + upload endpoints |
| `backend/src/services/scenario.service.ts` | +21/-8 | Background fields in response |
| `backend/src/websocket/game.gateway.ts` | +28/-1 | Background in game_started |
| `backend/prisma/schema.prisma` | +7 | New background columns |
| `frontend/src/game/HexGrid.ts` | +392/-6 | setBackgroundImage (broken) |
| `frontend/src/pages/ScenarioDesigner.tsx` | +658/-256 | Upload UI (not wired) |
| `frontend/src/pages/GameBoard.tsx` | +67/-16 | boardInitializedRef fix |
| `shared/types/events.ts` | +6 | Background fields in payload |

---

## UX Analysis: Scenario Designer Background Workflow

### Critical UX Problems in Current Implementation

**1. Catastrophic Work Loss Risk**

The blob URL approach means users lose their work on:
- Tab switching (mobile users frequently switch apps)
- Browser refresh (accidental or intentional)
- Connection drop (WiFi hiccups, cellular handoff)
- Device sleep/wake cycles
- System memory pressure (mobile OS kills background tabs)

**UX Impact**: Users invest significant time aligning a background to a hex grid, then lose everything. This creates rage-quit scenarios.

**2. No Alignment Feedback Loop**

The review proposes `offsetX`, `offsetY`, `scale` parameters but doesn't address *how* users achieve correct values. Current approaches require:
- Trial and error with numeric inputs
- Mental math to convert hex positions to pixel offsets
- No visual guides during adjustment

---

### Recommended UX Workflow: "Align Once, Works Everywhere"

#### Phase 1: Upload with Immediate Persistence

```
User Action                          System Response
-----------                          ---------------
1. Selects image file                → Show upload progress bar
                                     → Stream to server immediately
                                     → Return persistent URL
                                     → Show image at default position

2. If upload fails                   → Keep local preview visible
                                     → Show retry button (not modal)
                                     → Auto-retry on connection restore
```

**Key UX Principle**: Never show the user something they can't keep. The moment they see the image, it should be server-persisted.

#### Phase 2: Visual Alignment Tool

Instead of numeric offset/scale inputs, provide a **direct manipulation interface**:

```
┌─────────────────────────────────────────────────────┐
│  [Background Alignment Mode]            [✓ Done]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│     ○ ─ ─ ─ ○ ─ ─ ─ ○       Hex grid overlay       │
│      \   /   \   /   \      (semi-transparent)      │
│       ○ ─ ─ ─ ○ ─ ─ ─ ○                             │
│      /   \   /   \   /                              │
│     ○ ─ ─ ─[●]─ ─ ─ ○      Anchor point (draggable)│
│      \   /   \   /   \                              │
│       ○ ─ ─ ─ ○ ─ ─ ─ ○                             │
│                                                     │
│  [Background image beneath, user drags to align]   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Opacity: [━━━━━●━━━]  Scale: [━━●━━━━━]           │
│                                                     │
│  💡 Tip: Pinch to scale, drag to position          │
└─────────────────────────────────────────────────────┘
```

**Interaction Model**:

| Gesture | Action |
|---------|--------|
| Drag background | Move position (offsetX, offsetY) |
| Pinch (mobile) / scroll wheel | Scale |
| Two-finger rotate (optional) | Rotation |
| Tap hex cell | Snap anchor point to that cell |

**Critical**: During alignment mode, **disable normal pan/zoom** of the viewport. The user is manipulating the background, not navigating the map.

#### Phase 3: Two-Point Anchor System (Pixel-Perfect Alignment)

For maps where exact alignment matters (matching printed scenario books):

```
Step 1: "Tap a reference point on your background image"
        → User taps corner of a room

Step 2: "Now tap the hex cell this should align to"
        → User taps hex Q:3, R:5

Step 3: "Tap a second reference point on the opposite side"
        → User taps another room corner

Step 4: "Tap the hex cell this should align to"
        → User taps hex Q:15, R:12

System: Calculates exact scale/position/rotation to make both points align
```

**Why Two Points?**: Single-point alignment only fixes position. Two points fix position AND scale (and optionally rotation). This makes alignment device-independent.

---

### Resilience Patterns for Mobile Reality

**1. Aggressive Auto-Save**

```typescript
// Debounced save on every transform change
const saveBackgroundTransform = useDebouncedCallback(
  async (transform) => {
    await api.saveScenario(scenarioId, { backgroundTransform: transform });
    showToast("Saved", { duration: 1000, position: 'bottom' });
  },
  500 // Save 500ms after user stops adjusting
);
```

**UX Indicator**: Small "Saving..." / "Saved ✓" indicator, not a blocking modal.

**2. Offline-First Queue**

When connection drops during alignment:

```
┌────────────────────────────────────────┐
│  ⚠ Offline - Changes will sync when   │
│    connection restores                  │
│                                [Dismiss]│
└────────────────────────────────────────┘
```

- Queue transform changes locally (IndexedDB)
- Replay queue when connection restores
- Never block the user from continuing work

**3. Session Recovery**

On page load, check for unsaved state:

```typescript
// On ScenarioDesigner mount
const pendingChanges = await localDB.getPendingChanges(scenarioId);
if (pendingChanges) {
  showRecoveryPrompt({
    message: "You have unsaved background changes from a previous session",
    actions: [
      { label: "Restore", action: applyPendingChanges },
      { label: "Discard", action: clearPendingChanges }
    ]
  });
}
```

---

### Multi-Device / Screen Size Strategy

**Problem**: A background aligned on a 1920x1080 desktop will appear wrong on a 375x667 phone.

**Solution**: Store alignment in **hex-relative coordinates**, not pixels.

```typescript
interface BackgroundAlignment {
  // Anchor point 1: Image pixel → Hex coordinate
  anchor1: {
    imageX: number;      // Pixel position in original image
    imageY: number;
    hexQ: number;        // Target hex coordinate
    hexR: number;
  };

  // Anchor point 2 (for scale/rotation)
  anchor2: {
    imageX: number;
    imageY: number;
    hexQ: number;
    hexR: number;
  };

  opacity: number;       // 0-1
}

// At render time, calculate pixel transform from hex positions
function calculateBackgroundTransform(
  alignment: BackgroundAlignment,
  hexToScreen: (q: number, r: number) => { x: number; y: number }
) {
  const screen1 = hexToScreen(alignment.anchor1.hexQ, alignment.anchor1.hexR);
  const screen2 = hexToScreen(alignment.anchor2.hexQ, alignment.anchor2.hexR);

  // Calculate affine transform that maps image anchors to screen positions
  return deriveAffineTransform(
    alignment.anchor1.imageX, alignment.anchor1.imageY,
    alignment.anchor2.imageX, alignment.anchor2.imageY,
    screen1.x, screen1.y,
    screen2.x, screen2.y
  );
}
```

**Benefit**: The same alignment data produces correct rendering on any screen size because it's defined in terms of the hex grid, which scales consistently.

---

### Pan/Zoom Behavior During Gameplay

**Requirement**: Background must be part of the pannable/zoomable viewport.

**Implementation** (from the review):
```typescript
// Correct: Add to viewport, not stage
this.backgroundLayer = new PIXI.Container();
this.viewport.addChildAt(this.backgroundLayer, 0);
```

**UX Consideration**: When user zooms out very far:
- Background should extend beyond visible hex grid (no ugly edges)
- Consider adding fade-to-color at edges if image doesn't cover full area

---

### Error State UX

| Error | User Message | Action |
|-------|--------------|--------|
| Image too large | "Image must be under 10MB. Try compressing it first." | Link to free compressor |
| Upload failed | "Couldn't upload image. Check your connection." | Retry button (keeps preview) |
| Invalid format | "Please use PNG, JPG, or WebP format." | None needed |
| Server error | "Something went wrong. Your image is saved locally and will upload when fixed." | Silent retry |

**Never**: Show technical errors like "413 Payload Too Large" or "500 Internal Server Error".

---

### Summary of UX Recommendations

| Priority | Recommendation | Why |
|----------|----------------|-----|
| **P0** | Upload immediately on file select | Prevents work loss |
| **P0** | Add background to viewport (not stage) | Pan/zoom works |
| **P0** | Auto-save transforms | Prevents work loss |
| **P1** | Two-anchor alignment system | Device-independent |
| **P1** | Visual drag/pinch alignment | No numeric input needed |
| **P1** | Offline change queue | Mobile-friendly |
| **P2** | Hex-relative coordinate storage | Multi-device support |
| **P2** | Session recovery prompt | Handles tab crashes |
| **P3** | Alignment mode (disables normal pan) | Clear interaction model |
