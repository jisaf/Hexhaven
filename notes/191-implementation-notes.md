# Issue #191: Background Image Implementation Notes

## Architecture Decisions

### Backend Service Pattern
- Extracted `BackgroundUploadService` from controller following NestJS `@Injectable()` pattern
- Service handles file upload, validation, and cleanup
- Controller remains thin, delegating to service
- Configuration centralized in `env.config.ts` under `uploads` section

### Two-Anchor Alignment System
The alignment system maps image coordinates to hex coordinates:
1. User clicks a point on the background image (captures 0-1 normalized coordinates)
2. User clicks a hex on the grid (captures q,r axial coordinates)
3. Repeat for second anchor
4. System calculates scale from distance ratio between anchors
5. System calculates offset to align first anchor point

**Key formulas:**
```typescript
// Scale = hex distance / image distance
const scale = hexDistance / imgDistance;

// Offset positions image so anchor1's image point aligns with hex1's screen position
const offsetX = hex1Screen.x - (img1X * scale);
const offsetY = hex1Screen.y - (img1Y * scale);
```

### Dynamic Tile Opacity
- Tiles have two opacity modes: DEFAULT_ALPHA (1.0) and BACKGROUND_ALPHA (0.2)
- `HexTile.setBackgroundMode(hasBackground)` toggles between modes
- `HexGrid.updateTileOpacity()` iterates all tiles on background add/remove

### Offline Queue (IndexedDB)
- Database: `hexhaven-offline`, version 1
- Store: `pending-uploads` with indexes on `scenarioId` and `timestamp`
- Auto-processes queue on `online` event
- Max 5 retries per upload before removal

## File Locations
- Backend service: `backend/src/services/background-upload.service.ts`
- Upload config: `backend/src/config/env.config.ts` (uploads section)
- Alignment types: `shared/types/entities.ts` (BackgroundAnchor, BackgroundAnchors)
- Prisma field: `backgroundAnchors Json?` in Scenario model
- Offline queue: `frontend/src/services/offline-queue.service.ts`

## Key Methods

### HexGrid
- `setAlignmentClickHandler(handler)` - Sets callback for image clicks during alignment
- `applyAlignmentFromAnchors(anchor1, anchor2)` - Calculates and applies transforms
- `setBackgroundInteractive(bool)` - Toggles drag/zoom mode vs click-through
- `setBackgroundTransform(opacity, offsetX, offsetY, scale)` - Updates transforms

### ScenarioDesigner State
- `alignmentMode`: 'off' | 'anchor1-image' | 'anchor1-hex' | 'anchor2-image' | 'anchor2-hex' | 'complete'
- `pendingAnchor`: Partial<BackgroundAnchor> during alignment flow
- `backgroundState.anchors`: Persisted anchor data

## Database Schema
```prisma
model Scenario {
  backgroundImageUrl   String?
  backgroundOpacity    Float?   @default(1.0)
  backgroundOffsetX    Int?     @default(0)
  backgroundOffsetY    Int?     @default(0)
  backgroundScale      Float?   @default(1.0)
  backgroundAnchors    Json?    // Two-anchor alignment data
}
```
