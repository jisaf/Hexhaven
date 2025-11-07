# Research: Hexhaven Multiplayer Technical Decisions

**Feature**: 001-hexhaven-multiplayer
**Date**: 2025-11-07
**Phase**: 0 - Research & Architecture Decisions

This document captures research findings and technical decisions for unresolved questions from the Technical Context.

---

## 1. Internationalization (i18n) Framework

**Decision**: react-i18next

**Rationale**:
- Most popular React i18n library (11k+ GitHub stars vs 3k for react-intl)
- Better integration with React hooks (`useTranslation`)
- Lighter bundle size (~20KB vs ~60KB for FormatJS)
- Simple JSON-based translation files, easy for non-developers
- Built-in namespace support for code-splitting translations
- Excellent TypeScript support with typed translations
- Lazy loading support critical for mobile bundle size

**Alternatives Considered**:
- **FormatJS (react-intl)**: More comprehensive (includes number/date formatting), but heavier bundle. Hexhaven doesn't need complex ICU message syntax; simpler key-value translations sufficient for MVP.
- **Polyglot.js**: Too minimal, lacks React-specific optimizations like hooks and suspense integration.

**Implementation Approach**:
- Extract all UI strings to `frontend/src/i18n/locales/{lang}/translation.json`
- Use `t('key')` hook in all components, no hardcoded strings
- Initial languages: English (en), with structure ready for Spanish (es), French (fr), German (de), Chinese (zh)
- Namespace by feature: `common.json`, `game.json`, `lobby.json` for lazy loading

---

## 2. Backend Framework

**Decision**: NestJS

**Rationale**:
- Enterprise-grade architecture with built-in dependency injection, reducing boilerplate
- First-class WebSocket support via `@nestjs/websockets` and `@nestjs/platform-socket.io`
- Excellent TypeScript support (built for TypeScript, not JavaScript-first)
- Modular structure aligns with single-responsibility principle (GameModule, PlayerModule, etc.)
- Built-in validation with `class-validator` for DTOs (critical for server-authoritative validation)
- Auto-generated OpenAPI/Swagger documentation via decorators
- Testing utilities (Test module) simplify dependency injection in tests
- Better for complex game logic compared to raw Express (services, controllers, guards pattern)

**Alternatives Considered**:
- **Express**: Simpler but requires manual setup for validation, DI, WebSockets. Game logic complexity justifies NestJS structure. Would need to add libraries (express-validator, typedi, etc.) to match NestJS features.
- **Fastify**: Faster than Express, but NestJS supports Fastify as adapter anyway. Can switch later if benchmarks require it.

**Implementation Approach**:
- Modules: `GameModule`, `PlayerModule`, `RoomModule`, `MonsterModule`
- Services for game logic: `MonsterAIService`, `TurnOrderService`, `DamageCalculationService`
- Gateways for WebSocket: `GameGateway` handles real-time events
- Guards for authorization: `RoomAuthGuard` validates player access to rooms

---

## 3. WebSocket Library

**Decision**: Socket.io (via `@nestjs/platform-socket.io`)

**Rationale**:
- Automatic reconnection handling (critical for mobile network instability)
- Built-in room/namespace support perfect for game rooms
- Fallback to long-polling if WebSocket unavailable (corporate firewalls, old browsers)
- Binary message support for efficient game state updates
- NestJS has first-class integration (`@WebSocketGateway` decorator)
- Mature ecosystem with 58k+ GitHub stars, battle-tested
- Easier to implement reconnection logic (User Story 4) compared to raw WebSockets

**Alternatives Considered**:
- **Native `ws` library**: Lighter (no fallbacks), but would need to manually implement reconnection, rooms, namespaces. Socket.io abstracts these complexities well.
- **WebRTC Data Channels**: Lowest latency, but complex NAT traversal and STUN/TURN server requirements. Overkill for turn-based game (not real-time action).

**Implementation Approach**:
- Namespace per game room: `/game/:roomCode`
- Events: `player:move`, `player:attack`, `player:selectCards`, `game:stateUpdate`, `monster:activate`
- Automatic reconnection with session restoration via UUID stored in localStorage
- Emit game state delta updates (not full state) to reduce bandwidth

---

## 4. E2E Testing Framework

**Decision**: Playwright

**Rationale**:
- Better mobile browser testing (WebKit for iOS Safari emulation)
- Faster and more reliable than Cypress (auto-waits, no flakiness)
- Multi-browser support (Chromium, Firefox, WebKit) vs Cypress's Chromium-only
- Native TypeScript support
- Better for testing real-time WebSocket interactions (can intercept network)
- Parallel test execution out of the box
- Smaller resource footprint (important for CI)

**Alternatives Considered**:
- **Cypress**: Easier to debug with time-travel, but mobile browser support weaker. Hexhaven is mobile-first, so iOS Safari testing critical. Cypress's WebKit support experimental.
- **TestCafe**: Cross-browser but slower than Playwright.

**Implementation Approach**:
- Test files: `frontend/tests/e2e/user-story-*.spec.ts` (one file per user story)
- Fixtures for game setup: create rooms, join players, seed scenarios
- Page Object Model for game board, lobby, card selection
- Test on mobile viewports (iPhone SE 375px, iPad 768px) and desktop (1920px)

---

## 5. PixiJS Best Practices for Hex Grid Games

**Decision**: Use PixiJS v7+ with `@pixi/react` wrapper for React integration

**Rationale**:
- PixiJS is industry-standard for 2D Canvas/WebGL rendering (40k+ stars)
- Excellent mobile performance (60 FPS achievable on target devices)
- Sprite batching for hundreds of hex tiles without frame drops
- Built-in interaction manager for touch events (tap, long-press, pinch-zoom)
- `@pixi/react` provides React components wrapping PixiJS (declarative rendering)

**Hex Grid Rendering Best Practices**:
- **Coordinate System**: Use **axial coordinates (q, r)** with conversion utilities to cube (q, r, s) for distance calculations. Axial simpler for storage; cube better for algorithms (pathfinding, range).
- **Tile Rendering**: Use sprite sheets for hex tiles (normal, obstacle, difficult terrain) to reduce draw calls.
- **Viewport Management**: Use `pixi-viewport` plugin for pan/zoom with inertia and boundary constraints.
- **Performance**:
  - Cull off-screen tiles (don't render what's not visible)
  - Use Container for logical grouping (tiles layer, units layer, UI layer)
  - Pool sprites for frequently added/removed objects (damage numbers, effects)
  - Texture atlases to minimize texture switches

**Alternatives Considered**:
- **DOM-based rendering**: Too slow for 60 FPS with hundreds of hex tiles and animations. Would violate SC-003.
- **Three.js**: Overkill for 2D; larger bundle size than PixiJS.

**Implementation Approach**:
- Components: `<HexGrid>`, `<HexTile>`, `<CharacterSprite>`, `<MonsterSprite>`
- Coordinate utilities: `axialToCube()`, `cubeDistance()`, `hexNeighbors()`, `hexRange()`
- Interaction: Use PixiJS `pointerdown`, `pointermove` for tap-to-select and drag-to-pan

---

## 6. PWA Patterns for Offline Support

**Decision**: Use Workbox 7 for service worker generation

**Rationale**:
- Industry-standard PWA library from Google Chrome team
- Precaching for app shell (HTML, JS, CSS) ensures offline loading
- Runtime caching strategies for game assets (sprites, sounds)
- Integration with Vite/Webpack via plugins (`vite-plugin-pwa`)
- Automatic cache versioning and updates
- Background sync for queued actions when connection restored

**Offline Strategy**:
- **App Shell**: Precache all frontend assets (HTML, JS, CSS, manifest)
- **Game Assets**: Cache-first strategy for sprites, ability card images
- **Multiplayer**: Requires online connection (WebSocket); show "offline" banner
- **Solo Play (FR-024)**: Store game state in IndexedDB, run AI locally
- **Reconnection**: Service worker intercepts failed WebSocket, queues actions, replays on reconnect

**Alternatives Considered**:
- **Manual service worker**: More control but error-prone. Workbox handles edge cases (cache invalidation, versioning).
- **No offline support**: Violates FR-024 (offline solo play).

**Implementation Approach**:
- Service worker at `frontend/public/sw.js` generated by Workbox
- Manifest.json: `name`, `short_name`, `icons`, `start_url`, `display: standalone`, `theme_color`
- Prompt user to install PWA (beforeinstallprompt event)
- Use IndexedDB (via Dexie.js) for offline game state storage

---

## 7. PostgreSQL Schema Patterns for Game State

**Decision**: Single `game_state` JSONB column with normalized relational tables for queryable entities

**Rationale**:
- **Hybrid approach**: Store full game state as JSONB for fast serialization/deserialization (reconnection, state sync), but also maintain normalized tables for queries (find active rooms, player lookup).
- JSONB enables schema flexibility for game state (complex nested structures: elemental state, ability decks, conditions).
- GIN index on JSONB for fast queries (`WHERE game_state->>'roomCode' = ?`).
- Normalized tables for: `players`, `game_rooms`, `characters`, `monsters` (for joins and analytics).
- PostgreSQL JSONB is performant enough for MVP (100 concurrent sessions). Redis migration path remains for horizontal scaling.

**Schema Design**:
```sql
-- Normalized tables for queryable entities
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20), -- 'lobby', 'active', 'completed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE players (
  id UUID PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE, -- anonymous UUID
  nickname VARCHAR(50),
  room_id UUID REFERENCES game_rooms(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Full game state for fast serialization
CREATE TABLE game_states (
  room_id UUID PRIMARY KEY REFERENCES game_rooms(id),
  state JSONB NOT NULL, -- full game state (entities, turn order, board, etc.)
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_game_state_room_code ON game_states USING GIN ((state->'roomCode'));
```

**Alternatives Considered**:
- **Fully normalized**: Separate tables for monsters, hexes, conditions, etc. Would require complex joins for state serialization. Slower reconnection.
- **JSONB-only (no normalized tables)**: Can't efficiently query "all active rooms" or "player's game history". Hybrid is best of both worlds.
- **Event sourcing**: Complete history, enables replay, but complex for MVP. Deferred to post-MVP.

**Implementation Approach**:
- Use Prisma ORM for type-safe database access (generates TypeScript types from schema)
- Migrations in `backend/src/db/migrations/`
- Repositories pattern: `GameRoomRepository`, `PlayerRepository`
- Full state updates on game events, partial JSONB updates for performance (`UPDATE ... SET state = jsonb_set(...)`)

---

## 8. Hex Grid Coordinate System

**Decision**: Axial coordinates (q, r) for storage, cube coordinates (q, r, s) for algorithms

**Rationale**:
- **Axial coordinates**: 2D representation (q, r), simpler to store and serialize. Industry standard for hex grids (Red Blob Games, Civilization VI).
- **Cube coordinates**: 3D representation (q + r + s = 0), easier for distance, range, pathfinding algorithms. Convert from axial as needed.
- Conversion is cheap: `s = -q - r` (axial → cube), discard `s` (cube → axial).

**Coordinate Utilities**:
```typescript
// Axial to Cube
function axialToCube(q: number, r: number): { q: number; r: number; s: number } {
  return { q, r, s: -q - r };
}

// Distance between two hexes (cube coordinates)
function cubeDistance(a: Cube, b: Cube): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

// All hexes within range N
function hexRange(center: Axial, range: number): Axial[] {
  const results: Axial[] = [];
  for (let q = -range; q <= range; q++) {
    for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }
  return results;
}
```

**Alternatives Considered**:
- **Offset coordinates (row, col)**: Common in square grids, but complicated for hex grids (even/odd row offsets). Axial is cleaner.
- **Cube-only**: Wastes storage (3 values instead of 2), but algorithms slightly simpler. Axial + conversion utils are best balance.

**Implementation Approach**:
- Store `{ q: number, r: number }` in database and game state
- Utility file: `shared/types/hex-utils.ts` with conversion, distance, range, neighbors functions
- Use cube coordinates internally in pathfinding and range calculation services

---

## 9. Monster AI Pathfinding Algorithm

**Decision**: A* pathfinding with hex grid heuristic

**Rationale**:
- **A* algorithm**: Optimal pathfinding (guaranteed shortest path), fast enough for game boards (<100 hexes).
- Hex grid heuristic: Use cube distance as heuristic (admissible, ensures A* optimality).
- Performance: A* on 50-hex board completes in <10ms (well under 500ms monster AI budget, SC-014).
- Handles obstacles, difficult terrain (movement cost modifiers).

**Hexhaven Monster AI Rules** (from game-rules.md and PRD.md):
1. **Focus target**: Closest enemy by shortest path distance (not line-of-sight).
2. **Movement**: Move toward focus target, prioritize hexes that enable attack.
3. **Attack**: If in range, attack focus target (or closest if tied).
4. **Ties**: Break ties by proximity to monster's current position.

**Algorithm**:
```typescript
// A* pathfinding for hex grids
function findPath(start: Axial, goal: Axial, obstacles: Set<string>): Axial[] {
  const openSet = new PriorityQueue<Node>(); // min-heap by f-score
  const cameFrom = new Map<string, Axial>();
  const gScore = new Map<string, number>(); // cost from start
  const fScore = new Map<string, number>(); // gScore + heuristic

  const startKey = axialKey(start);
  gScore.set(startKey, 0);
  fScore.set(startKey, cubeDistance(axialToCube(start), axialToCube(goal)));
  openSet.push({ hex: start, fScore: fScore.get(startKey)! });

  while (!openSet.isEmpty()) {
    const current = openSet.pop()!.hex;
    if (axialEqual(current, goal)) {
      return reconstructPath(cameFrom, current);
    }

    for (const neighbor of hexNeighbors(current)) {
      if (obstacles.has(axialKey(neighbor))) continue; // skip obstacles

      const tentativeGScore = gScore.get(axialKey(current))! + 1; // movement cost
      if (!gScore.has(axialKey(neighbor)) || tentativeGScore < gScore.get(axialKey(neighbor))!) {
        cameFrom.set(axialKey(neighbor), current);
        gScore.set(axialKey(neighbor), tentativeGScore);
        const heuristic = cubeDistance(axialToCube(neighbor), axialToCube(goal));
        fScore.set(axialKey(neighbor), tentativeGScore + heuristic);
        openSet.push({ hex: neighbor, fScore: fScore.get(axialKey(neighbor))! });
      }
    }
  }

  return []; // no path found
}
```

**Alternatives Considered**:
- **Dijkstra's algorithm**: Explores all directions equally (no heuristic). Slower than A* for single-target pathfinding.
- **Breadth-First Search (BFS)**: Simpler but doesn't handle movement cost modifiers (difficult terrain in Hexhaven).
- **Jump Point Search**: Optimization for uniform-cost grids, but hex grids with obstacles don't benefit much.

**Implementation Approach**:
- Service: `MonsterAIService` with methods: `determineFocus()`, `calculateMovement()`, `selectAttack()`
- Pathfinding utility: `shared/types/pathfinding.ts` with A* implementation
- Cache paths per turn (monsters don't recalculate mid-turn)
- Unit tests: verify correct focus selection with multiple enemies, obstacle avoidance, attack range priority

---

## Summary of Decisions

| Area | Decision | Key Rationale |
|------|----------|---------------|
| **i18n Framework** | react-i18next | Lighter bundle, better React integration, simpler for MVP |
| **Backend Framework** | NestJS | Built-in DI, WebSocket support, enterprise architecture for complex game logic |
| **WebSocket Library** | Socket.io | Automatic reconnection, room support, fallbacks for reliability |
| **E2E Testing** | Playwright | Better mobile browser support (WebKit for iOS), faster, more reliable |
| **Rendering Library** | PixiJS v7 with `@pixi/react` | Industry-standard 2D WebGL, achieves 60 FPS on mobile |
| **Hex Coordinates** | Axial (storage) + Cube (algorithms) | Industry standard, simple conversion, optimal for both storage and computation |
| **PWA Library** | Workbox 7 | Industry-standard, handles offline caching and service worker complexity |
| **Database Schema** | Hybrid (JSONB + normalized tables) | Fast serialization + queryability, balances flexibility and performance |
| **Pathfinding Algorithm** | A* with hex heuristic | Optimal paths, fast enough (<10ms), handles obstacles and terrain costs |

All decisions align with Constitution principles:
- **YAGNI**: No speculative features (e.g., no event sourcing for MVP)
- **KISS**: Simplest solutions chosen (e.g., PostgreSQL before Redis, axial coordinates)
- **Performance**: All choices meet 60 FPS, <200ms latency, <500ms AI targets
- **Type Safety**: TypeScript across stack, Prisma for DB types, shared type library

---

**Next Phase**: Phase 1 - Design & Contracts (data-model.md, contracts/, quickstart.md)
