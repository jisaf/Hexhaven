# Hexhaven Multiplayer - System Architecture

**Version**: 1.0
**Last Updated**: 2025-12-15
**Status**: Production-Ready (MVP)

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Data Flow](#data-flow)
5. [Component Architecture](#component-architecture)
6. [Database Schema](#database-schema)
7. [API Design](#api-design)
8. [Real-Time Communication](#real-time-communication)
9. [Security](#security)
10. [Performance Considerations](#performance-considerations)
11. [Deployment](#deployment)

---

## Overview

Hexhaven is a mobile-first multiplayer tactical board game implementing Gloomhaven rules. The system enables 2-4 players to join game rooms via shareable codes and play turn-based hex grid battles with real-time synchronization.

**Key Features**:
- Real-time multiplayer gameplay (WebSocket-based)
- Mobile-first PWA (offline-capable)
- 6 character classes, 5 scenarios
- Turn-based tactical combat with monster AI
- Multi-lingual support (5 languages)
- Optional account system with progression tracking

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  React PWA (Vite)                                           │
│  ├── UI Components (React)                                  │
│  ├── Game Rendering (PixiJS)                                │
│  ├── State Management (React Hooks)                         │
│  ├── WebSocket Client (Socket.io)                           │
│  └── Service Worker (Workbox)                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            │
┌─────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  NestJS Backend (Node.js + TypeScript)                      │
│  ├── REST API Controllers                                   │
│  ├── WebSocket Gateway (Socket.io)                          │
│  ├── Game Logic Services                                    │
│  │   ├── Monster AI                                         │
│  │   ├── Turn Order                                         │
│  │   ├── Damage Calculation                                 │
│  │   ├── Pathfinding (A*)                                   │
│  │   ├── Items & Inventory (Issue #205)                     │
│  │   └── Progression Tracking                               │
│  └── Validation & Security                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Prisma ORM
                            │
┌─────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                      │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                        │
│  ├── Normalized Tables (Players, Rooms, Scenarios)         │
│  ├── JSONB State (Full game state)                         │
│  └── Account & Progression Data                            │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Decisions

**Hybrid Database Schema**:
- **Normalized tables** for queryable data (active rooms, player lookup)
- **JSONB columns** for full game state (fast serialization for reconnection)
- **Rationale**: Balance between query performance and state restoration speed

**Server-Authoritative Design**:
- All game logic runs on server
- Client sends actions, server validates and broadcasts results
- **Rationale**: Prevents cheating, ensures game rule consistency

**Monorepo Structure**:
- Single repository with `backend/`, `frontend/`, `shared/` workspaces
- Shared TypeScript types between frontend and backend
- **Rationale**: Type-safe WebSocket communication, easier refactoring

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18+ | UI framework |
| **Vite** | 5+ | Build tool & dev server |
| **PixiJS** | 7+ | Canvas/WebGL rendering (60 FPS hex grid) |
| **Socket.io Client** | 4+ | WebSocket communication |
| **react-i18next** | Latest | Internationalization |
| **TypeScript** | 5+ | Type safety |
| **Playwright** | Latest | E2E testing |
| **Jest** | Latest | Unit testing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **NestJS** | 10+ | Enterprise Node.js framework |
| **Socket.io** | 4+ | WebSocket server |
| **Prisma** | 5+ | ORM with type-safe queries |
| **PostgreSQL** | 14+ | Primary database |
| **TypeScript** | 5+ | Type safety |
| **Jest** | Latest | Unit & integration testing |

### Shared

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Shared type definitions |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |

### Shared Utilities

```
shared/
├── constants/           # Shared constants
│   ├── index.ts         # Barrel export
│   └── game.ts          # MAX_CHARACTERS_PER_PLAYER, LONG_REST_INITIATIVE, etc.
├── types/               # Shared TypeScript types
│   ├── entities.ts      # Item, ItemState, ItemSlot, ItemRarity enums
│   ├── events.ts        # WebSocket event payloads
│   └── ...
└── utils/               # Shared utility functions
    ├── index.ts         # Barrel export
    ├── inventory.ts     # getMaxSmallSlots, formatItemEffect, SLOT_DISPLAY_INFO
    └── character-colors.ts # CHARACTER_COLORS, getCharacterColor, getCharacterColorWithOpacity
```

---

## Data Flow

### Game Room Creation Flow

```
Client                    Server                  Database
  │                         │                        │
  │─── POST /api/rooms ───>│                        │
  │                         │──── Create Room ─────>│
  │                         │<──── Return Room ─────│
  │<─── Room Code ─────────│                        │
  │                         │                        │
  │─── join_room (WS) ────>│                        │
  │                         │──── Save Player ─────>│
  │<─── room_joined ───────│                        │
```

### Turn-Based Combat Flow

```
Player 1                  Server                  Player 2
  │                         │                        │
  │─── select_cards ──────>│                        │
  │                         │<─── select_cards ─────│
  │                         │                        │
  │                         │──[ Calculate Turn Order ]
  │                         │                        │
  │<─ turn_order_determined─│─ turn_order_determined─>│
  │                         │                        │
  │─── move_character ────>│                        │
  │                         │──[ Validate Move ]    │
  │<─ character_moved ──────│─ character_moved ─────>│
  │                         │                        │
  │                         │──[ Monster AI Turn ]  │
  │<─ monster_activated ────│─ monster_activated ───>│
```

### Reconnection Flow

```
Client                    Server                  Database
  │                         │                        │
  │ [Disconnect]            │                        │
  │                         │──[ Store State ]─────>│
  │                         │                        │
  │ [Reconnect]             │                        │
  │─── reconnect (UUID) ──>│                        │
  │                         │──[ Load State ]──────>│
  │                         │<──[ Game State ]──────│
  │<─── state_restored ────│                        │
```

---

## Component Architecture

### Frontend Architecture

```
frontend/src/
├── components/           # Reusable UI components
│   ├── HexGrid.tsx      # Hex grid container
│   ├── CharacterSelect.tsx
│   ├── TurnOrderDisplay.tsx
│   ├── AccountUpgradeModal.tsx
│   ├── inventory/       # Issue #205: Inventory components
│   │   ├── InventoryPanel.tsx
│   │   ├── InventoryTabContent.tsx
│   │   ├── ItemCard.tsx
│   │   └── ItemIcon.tsx
│   └── ...
├── game/                # PixiJS rendering layer
│   ├── PixiApp.tsx      # PixiJS application wrapper
│   ├── HexGrid.ts       # Hex grid renderer
│   ├── HexTile.ts       # Tile sprite
│   ├── CharacterSprite.ts
│   ├── MonsterSprite.ts
│   └── hex-utils.ts     # Coordinate conversion
├── pages/               # Page-level components
│   ├── Lobby.tsx        # Room creation/join
│   ├── GameBoard.tsx    # Main game view
│   └── Profile.tsx      # Account & progression
├── services/            # Centralized state management & external communication
│   ├── websocket.service.ts               # Socket.io client
│   ├── room-session.service.ts            # Room session state manager
│   ├── game-state.service.ts              # Game state manager with visual callbacks
│   ├── game-session-coordinator.service.ts # Lifecycle coordinator (facade pattern)
│   └── api.service.ts                     # REST API client
├── hooks/               # React hooks
│   ├── useGameState.ts           # Game state subscription hook
│   ├── useRoomSession.ts         # Room session subscription hook
│   ├── useCharacterSelection.ts  # Character selection management
│   ├── useHexGrid.ts             # HexGrid rendering management
│   ├── useOrientation.ts         # Orientation handling
│   └── useBackgroundImage.ts     # Issue #191: Background image state management
└── i18n/                # Internationalization
    ├── index.ts
    └── locales/         # Translation files (en, es, fr, de, zh)
```

### Backend Architecture

```
backend/src/
├── api/                 # REST endpoints
│   ├── rooms.controller.ts
│   ├── scenarios.controller.ts
│   ├── items.controller.ts      # Issue #205: Item CRUD endpoints
│   ├── inventory.controller.ts  # Issue #205: Character inventory endpoints
│   └── accounts.controller.ts
├── websocket/           # Real-time communication
│   └── game.gateway.ts  # Socket.io event handlers
├── services/            # Business logic
│   ├── room.service.ts
│   ├── monster-ai.service.ts
│   ├── turn-order.service.ts
│   ├── damage-calculation.service.ts
│   ├── pathfinding.service.ts
│   ├── account.service.ts
│   ├── progression.service.ts
│   ├── scenario.service.ts
│   ├── item.service.ts          # Issue #205: Item CRUD with role-based access
│   ├── inventory.service.ts     # Issue #205: Character inventory management
│   └── background-upload.service.ts  # Issue #191: Background image uploads
├── models/              # Domain models
│   ├── player.model.ts
│   ├── game-room.model.ts
│   ├── character.model.ts
│   ├── monster.model.ts
│   ├── account.model.ts
│   └── progression.model.ts
├── db/                  # Database
│   ├── schema.prisma    # Prisma schema
│   ├── migrations/      # DB migrations
│   └── seed.ts          # Initial data
└── utils/               # Utilities
    ├── hex-utils.ts     # Hex coordinate math
    ├── validation.ts    # Server-side validation
    └── logger.ts        # Structured logging
```

---

## State Management Architecture

### Centralized State Management

Hexhaven uses a **three-layer centralized state management architecture** to separate concerns between networking, business logic, and rendering:

```
┌─────────────────────────────────────────────┐
│         React Components (View Layer)       │
│  - Lobby.tsx                                │
│  - GameBoard.tsx                            │
│  - Subscribe to state via hooks             │
│  - Register visual callbacks for rendering  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│    Centralized State Managers (Logic Layer) │
│  ┌─────────────────────────────────────┐   │
│  │  RoomSessionManager                  │   │
│  │  - Room metadata (code, status)     │   │
│  │  - Player list                       │   │
│  │  - Connection status                 │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  GameStateManager                    │   │
│  │  - Game data (characters, monsters)  │   │
│  │  - Turn order and round              │   │
│  │  - Player hand and selected cards    │   │
│  │  - Movement and attack state         │   │
│  │  - Event handlers                    │   │
│  │  - Visual callback triggers          │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌────────────────────┐
│ WebSocket Layer  │   │  Rendering Layer   │
│ - Connection mgmt│   │  - HexGrid (PixiJS)│
│ - Event handling │   │  - Character/      │
│                  │   │    Monster sprites │
└──────────────────┘   └────────────────────┘
```

### Visual Callback Pattern

To maintain clean separation between state management and rendering (PixiJS), Hexhaven implements a **visual callback system**:

**Problem**: PixiJS rendering logic should not be coupled to WebSocket event handlers or state managers.

**Solution**: GameStateManager accepts callback functions for visual updates and invokes them when state changes:

```typescript
// GameStateManager registers visual callbacks from HexGrid
interface VisualUpdateCallbacks {
  moveCharacter?: (characterId: string, toHex: Axial, movementPath?: Axial[]) => void;
  updateMonsterPosition?: (monsterId: string, newHex: Axial) => void;
  updateCharacterHealth?: (characterId: string, health: number) => void;
  updateMonsterHealth?: (monsterId: string, health: number) => void;
}

// GameBoard registers callbacks when HexGrid is ready
useEffect(() => {
  if (hexGridReady) {
    gameStateManager.registerVisualCallbacks({
      moveCharacter,
      updateMonsterPosition,
      updateCharacterHealth,
      updateMonsterHealth,
    });
  }
}, [hexGridReady, ...]);

// GameStateManager triggers visual updates on events
private handleCharacterMoved(data: CharacterMovedPayload): void {
  // 1. Trigger visual update
  this.visualCallbacks.moveCharacter?.(data.characterId, data.toHex, data.movementPath);

  // 2. Update state
  // ... state updates ...

  // 3. Emit to React subscribers
  this.emitStateUpdate();
}
```

**Benefits**:
- ✅ State management decoupled from rendering
- ✅ Single source of truth for game state
- ✅ Testable in isolation (mock callbacks)
- ✅ Clear, unidirectional data flow

### State Subscription Pattern

Components subscribe to state changes via custom hooks:

```typescript
// useGameState hook
export function useGameState() {
  const [gameState, setGameState] = useState(gameStateManager.getState());

  useEffect(() => {
    const unsubscribe = gameStateManager.subscribe(setGameState);
    return unsubscribe; // Cleanup on unmount
  }, []);

  return gameState;
}

// Usage in components
const gameState = useGameState();
// Component re-renders automatically when state changes
```

**Advantages**:
- Automatic re-renders when state changes
- No prop drilling
- Centralized state accessible from any component
- Proper cleanup prevents memory leaks

### GameSessionCoordinator (Lifecycle Coordinator Pattern)

To prevent coordination bugs when switching games, Hexhaven implements a **GameSessionCoordinator** that provides atomic lifecycle operations:

**Problem**: Developers must manually coordinate RoomSessionManager and GameStateManager, leading to bugs when one reset is forgotten.

**Solution**: Facade pattern coordinator provides single entry point:

```typescript
// GameSessionCoordinator orchestrates both managers
class GameSessionCoordinator {
    switchGame() {
        roomSessionManager.switchRoom();  // Reset room state
        gameStateManager.reset();          // Reset game state
    }

    leaveGame() {
        gameStateManager.reset();          // Reset game state only
        roomSessionManager.clearGameState();
    }

    resetAll() {
        roomSessionManager.reset();        // Full room reset
        gameStateManager.reset();          // Full game reset
    }
}
```

**Usage in Components**:
```typescript
// Lobby.tsx - when mounting (clean slate)
gameSessionCoordinator.switchGame();

// GameBoard.tsx - when room code changes
gameSessionCoordinator.switchGame();
```

**Benefits**:
- ✅ Eliminates coordination bugs (impossible to forget one reset)
- ✅ Preserves existing architecture (managers remain independent)
- ✅ Explicit lifecycle dependencies (visible in coordinator code)
- ✅ Single entry point for lifecycle operations
- ✅ Easy to extend with new coordinated operations

### Background Image System (Issue #191)

The Scenario Designer supports background image uploads for visual reference when designing hex maps.

**Architecture**:
```
┌─────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Scenario Designer  │────>│  Backend API        │────>│  File Storage    │
│  (React + PixiJS)   │     │  (NestJS + Multer)  │     │  (nginx static)  │
└─────────────────────┘     └─────────────────────┘     └──────────────────┘
         │                           │
         │                           │
         ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  HexGrid.ts         │     │  PostgreSQL         │
│  (PixiJS Sprite)    │     │  (URL + opacity)    │
└─────────────────────┘     └─────────────────────┘
```

**Key Components**:
- **BackgroundUploadService** (`backend/src/services/background-upload.service.ts`): Handles file uploads via Multer, stores to `frontend/public/backgrounds/`
- **HexGrid.setBackgroundImage()** (`frontend/src/game/HexGrid.ts`): Loads image as PixiJS sprite, auto-fits to 1024×1024 world bounds
- **useBackgroundImage hook** (`frontend/src/hooks/useBackgroundImage.ts`): Manages upload state, opacity, and cleanup

**File Storage**:
- Images stored in `frontend/public/backgrounds/` directory
- Served via nginx with `/backgrounds/` location rule
- SELinux context: `httpd_sys_content_t` (required for nginx access)
- Max file size: 5MB (configurable via `MAX_UPLOAD_SIZE_MB`)
- Supported formats: JPEG, PNG, GIF, WebP

**World Bounds**:
- Fixed 1024×1024 pixel world size (`WORLD_PIXEL_SIZE` constant)
- Background auto-scaled to fit world bounds edge-to-edge
- Gold border drawn around world perimeter for visual reference
- Viewport clamped to world bounds to prevent losing the map

### Items and Inventory System (Issue #205)

The game implements a Gloomhaven-inspired item and inventory system with role-based access control.

**Architecture**:
```
┌─────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Frontend UI        │────>│  Backend Services   │────>│  PostgreSQL      │
│  (React + RPG Icons)│     │  (NestJS + DI)      │     │  (Prisma ORM)    │
└─────────────────────┘     └─────────────────────┘     └──────────────────┘
         │                           │
         │                           │
         ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Shared Utilities   │     │  WebSocket Gateway  │
│  (inventory.ts)     │     │  (Real-time events) │
└─────────────────────┘     └─────────────────────┘
```

**Key Components**:

1. **ItemService** (`backend/src/services/item.service.ts`):
   - CRUD operations for items with role-based access
   - Creator role required for create/update
   - Admin role required for delete
   - Effect validation (heal, shield, attack_modifier, etc.)

2. **InventoryService** (`backend/src/services/inventory.service.ts`):
   - Character inventory management
   - Equip/unequip with slot validation
   - Item state tracking (READY, SPENT, CONSUMED)
   - Slot capacity by level: `ceil(level / 2)` for small items

3. **Shared Utilities** (`shared/utils/inventory.ts`):
   - `getMaxSmallSlots(level)`: Calculate small item slots by level
   - `formatItemEffect(effect)`: Format effect for display
   - `SLOT_DISPLAY_INFO`: UI constants for slot icons/labels

**Equipment Slots** (per Gloomhaven rules):
- HEAD: 1 slot
- BODY: 1 slot
- LEGS: 1 slot
- ONE_HAND: 2 slots (or 1 TWO_HAND)
- TWO_HAND: Uses both hand slots
- SMALL: Level-dependent (`ceil(level / 2)`)

**Item States**:
- `READY`: Can be used
- `SPENT`: Used this round, refreshes on long rest
- `CONSUMED`: Permanently used, removed from inventory

**Security**:
- JWT authentication via `JwtAuthGuard`
- Character ownership verification for inventory operations
- Role-based access for item CRUD (creator/admin)
- In-game equipment changes blocked (ConflictError)

### Multi-Character Control System

Players can control multiple characters (up to 4) in a single game session, enabling solo play with multiple characters or controlling additional characters when fewer players are available.

**Architecture**:
```
┌─────────────────────────┐     ┌─────────────────────────┐
│  useCharacterSelection  │────>│  RoomSessionManager     │
│  (React Hook)           │     │  (Single Source of Truth)│
└─────────────────────────┘     └─────────────────────────┘
         │                               │
         │ WebSocket emit                │ State subscription
         ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  WebSocket Service      │────>│  Backend Gateway        │
│  (Socket.io Client)     │     │  (NestJS + Socket.io)   │
└─────────────────────────┘     └─────────────────────────┘
```

**Key Components**:

1. **useCharacterSelection Hook** (`frontend/src/hooks/useCharacterSelection.ts`):
   - Subscribes to RoomSessionManager for authoritative state
   - Provides `addCharacter`, `removeCharacter`, `setActiveCharacter` methods
   - ID-based operations (preferred) with index-based deprecated methods
   - Calculates `disabledCharacterIds` for characters selected by other players

2. **RoomSessionManager** (`frontend/src/services/room-session.service.ts`):
   - Single source of truth for character selection state
   - Stores `currentPlayerCharacters: { characterClasses, characterIds, activeIndex }`
   - Updates state when receiving `character_selected` events

3. **Shared Constants** (`shared/constants/game.ts`):
   - `MAX_CHARACTERS_PER_PLAYER = 4`
   - Shared between frontend and backend to prevent duplication

4. **Character Colors** (`shared/utils/character-colors.ts`):
   - `CHARACTER_COLORS`: Color mapping for each character class
   - `getCharacterColor(classType)`: Get hex color for character
   - `getCharacterColorWithOpacity(classType, opacity)`: Get RGBA color

**WebSocket Events**:
```typescript
// Client → Server
select_character {
  characterId?: string;      // Character UUID or class name
  action: 'add' | 'remove' | 'set_active';
  targetCharacterId?: string; // For ID-based remove/set_active (preferred)
  index?: number;            // Deprecated: For index-based operations
}

// Server → Client
character_selected {
  playerId: string;
  characterClasses: CharacterClass[];  // All selected characters
  characterIds?: string[];             // Persistent character IDs
  activeIndex: number;                 // Currently active character
}
```

**Design Decisions**:
- **No optimistic updates**: Wait for server confirmation before UI updates
- **ID-based operations**: More robust than index-based (deprecated)
- **Single source of truth**: RoomSessionManager, not component state
- **Backward compatibility**: Both ID and index methods supported during migration

---

## Database Schema

### Core Tables

```sql
-- Game Rooms (normalized for queries)
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE,
  status VARCHAR(20),      -- 'lobby', 'active', 'completed'
  scenario_id UUID,
  created_at TIMESTAMP,
  expires_at TIMESTAMP     -- 24-hour TTL
);

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE, -- Anonymous UUID
  nickname VARCHAR(50),
  room_id UUID REFERENCES game_rooms(id),
  is_host BOOLEAN,
  connection_status VARCHAR(20),
  last_seen_at TIMESTAMP
);

-- Game State (JSONB for fast serialization)
CREATE TABLE game_states (
  room_id UUID PRIMARY KEY REFERENCES game_rooms(id),
  state JSONB,             -- Full game state
  updated_at TIMESTAMP
);

-- Scenarios (static data)
CREATE TABLE scenarios (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  difficulty INTEGER,
  map_layout JSONB,
  monster_groups JSONB,
  objective_primary VARCHAR(500),
  -- Background image fields (Issue #191)
  background_image_url VARCHAR(500),  -- URL path to uploaded image
  background_opacity FLOAT DEFAULT 1.0  -- Opacity (0.0 - 1.0)
);

-- Accounts (User Story 7)
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE,
  email VARCHAR(255) UNIQUE NULLABLE,
  created_at TIMESTAMP
);

-- Progression (User Story 7)
CREATE TABLE progressions (
  account_uuid VARCHAR(36) PRIMARY KEY,
  scenarios_completed INTEGER,
  total_experience INTEGER,
  characters_played JSONB,
  character_experience JSONB,
  perks_unlocked JSONB,
  completed_scenario_ids JSONB
);

-- Items (Issue #205)
CREATE TABLE items (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  slot VARCHAR(20),              -- HEAD, BODY, LEGS, ONE_HAND, TWO_HAND, SMALL
  usage_type VARCHAR(20),        -- PERSISTENT, SPENT, CONSUMED
  max_uses INTEGER,
  cost INTEGER,
  rarity VARCHAR(20),            -- COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
  effects JSONB,                 -- Array of { type, value, description }
  triggers JSONB,                -- Array of { event, conditions }
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES accounts(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Character Inventory (Issue #205)
CREATE TABLE character_inventory (
  character_id UUID REFERENCES characters(id),
  item_id UUID REFERENCES items(id),
  acquired_at TIMESTAMP,
  PRIMARY KEY (character_id, item_id)
);

-- Character Equipment (Issue #205)
CREATE TABLE character_equipment (
  id UUID PRIMARY KEY,
  character_id UUID REFERENCES characters(id),
  item_id UUID REFERENCES items(id),
  slot VARCHAR(20),              -- Matches item slot
  slot_index INTEGER,            -- For SMALL slots (0-based index)
  equipped_at TIMESTAMP
);

-- Character Item State (Issue #205)
CREATE TABLE character_item_state (
  character_id UUID REFERENCES characters(id),
  item_id UUID REFERENCES items(id),
  state VARCHAR(20),             -- READY, SPENT, CONSUMED
  uses_remaining INTEGER,
  PRIMARY KEY (character_id, item_id)
);
```

### Game State JSONB Structure

```typescript
{
  roomCode: string;
  currentRound: number;
  currentTurnIndex: number;
  turnOrder: UUID[];  // Player and monster UUIDs

  characters: {
    [uuid: string]: {
      id: UUID;
      playerId: UUID;
      classType: "Brute" | "Tinkerer" | ...;
      health: number;
      currentHex: { q: number, r: number };
      hand: UUID[];        // Ability card IDs
      activeCards: { top: UUID, bottom: UUID };
      conditions: string[];
    }
  };

  monsters: {
    [uuid: string]: {
      id: UUID;
      type: string;
      isElite: boolean;
      health: number;
      currentHex: { q: number, r: number };
      conditions: string[];
    }
  };

  elementalState: {
    fire: "inert" | "waning" | "strong";
    ice: "inert" | "waning" | "strong";
    // ... (6 elements)
  };

  lootTokens: Array<{ hex: { q, r }, gold: number }>;
}
```

---

## API Design

### REST Endpoints

```
GET  /api/health              # Health check
GET  /api                     # API info

# Rooms
POST /api/rooms               # Create new room
GET  /api/rooms               # List active rooms
GET  /api/rooms/:code         # Get room details
GET  /api/rooms/my-room/:uuid # Get player's room

# Scenarios
GET  /api/scenarios           # List scenarios
GET  /api/scenarios/:id       # Get scenario details

# Accounts (User Story 7)
POST /api/accounts            # Create/upgrade account
GET  /api/accounts/:uuid      # Get account details
GET  /api/accounts/:uuid/progression     # Get progression
POST /api/accounts/:uuid/progression     # Update progression
POST /api/accounts/:uuid/progression/scenario  # Track completion
POST /api/accounts/:uuid/progression/perk      # Unlock perk

# Items (Issue #205)
GET    /api/items             # List items (with filters: slot, usageType, rarity)
GET    /api/items/:id         # Get item details
POST   /api/items             # Create item (creator role required)
PUT    /api/items/:id         # Update item (creator role required)
DELETE /api/items/:id         # Delete item (admin role required)

# Character Inventory (Issue #205)
GET  /api/characters/:id/inventory  # Get character inventory (owner auth)
POST /api/characters/:id/equip      # Equip item
POST /api/characters/:id/unequip    # Unequip item
```

### WebSocket Events

**Client → Server**:
```typescript
join_room        { roomCode, nickname }
leave_room       { roomCode }
select_character { characterId?, action?, targetCharacterId?, index? }  # Multi-character support
start_game       { roomCode, scenarioId }
move_character   { roomCode, characterId, targetHex }
select_cards     { roomCode, characterId?, cards: { top, bottom } }
attack_target    { roomCode, characterId?, targetId }
collect_loot     { roomCode, lootId }
end_turn         { roomCode }

# Items (Issue #205)
use_item         { roomCode, characterId, itemId }
equip_item       { roomCode, characterId, itemId, slotIndex? }
unequip_item     { roomCode, characterId, itemId }
```

**Server → Client**:
```typescript
room_joined         { roomCode, players }  # players include characterClasses[]
player_joined       { player }
player_left         { playerId }
character_selected  { playerId, characterClasses[], characterIds?, activeIndex }
game_started        { scenario, initialState }
character_moved     { characterId, newHex }
turn_order_determined { turnOrder }
next_turn_started   { entityId }
monster_activated   { monsterId, actions }
attack_resolved     { attackerId, targetId, damage }
scenario_completed  { victory, reason }
player_disconnected { playerId }
player_reconnected  { playerId }

# Items (Issue #205)
item_used           { characterId, itemId, effects, newState }
item_equipped       { characterId, itemId, slot, slotIndex }
item_unequipped     { characterId, itemId }
items_refreshed     { characterId, refreshedItems }
```

---

## Real-Time Communication

### Socket.io Configuration

```typescript
// Server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Client
const socket = io(serverUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

### Room Management

- Each game room is a Socket.io room
- Players join/leave rooms dynamically
- Server broadcasts state updates to room members
- Disconnect handling with 10-minute grace period

### State Synchronization

**Optimistic Updates**: Client predicts movement, server validates
**Authoritative Server**: Server is source of truth for all game state
**Delta Updates**: Only changed state broadcast (not full state)

---

## Security

### Input Validation

- **All WebSocket events validated** using class-validator
- **Room codes sanitized** (6-char alphanumeric only)
- **Nickname validation** (1-50 chars, no special characters)
- **Move validation** (server checks range, obstacles, occupancy)
- **Attack validation** (range, target alive, not disarmed)

### Authentication

**MVP**: UUID-based anonymous authentication
- UUID stored in localStorage
- No sensitive data in MVP
- Ready for production email auth

**Production**: Email + magic link authentication (planned)

### CORS

- Configured for specific frontend origin
- No wildcard CORS in production

### Rate Limiting

- Connection rate limiting (future enhancement)
- Action rate limiting per player (future enhancement)

---

## Performance Considerations

### Frontend Performance

**Target**: 60 FPS on mid-range mobile (iPhone 12, Galaxy S21+)

**Optimizations**:
- PixiJS sprite batching (hundreds of hex tiles)
- Texture atlases for reduced draw calls
- Sprite pooling for damage numbers
- Viewport culling (don't render off-screen)
- Service worker caching (app shell, assets)

**Bundle Size**:
- Code splitting by route
- Lazy-loaded translations
- Tree-shaking enabled

### Backend Performance

**Target**: <200ms API response, <500ms monster AI

**Optimizations**:
- Indexed database queries (room_code, uuid, status)
- JSONB for fast state serialization
- A* pathfinding cached per turn
- Connection pooling (Prisma)

**Scalability**:
- **Current**: Single server, 100 concurrent sessions
- **Future**: Redis for session storage, horizontal scaling

---

## Deployment

### Development

```bash
# Start all services
npm run dev

# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### Production

**Backend**:
```bash
npm run build
npm run start:prod
```

**Frontend**:
```bash
npm run build
# Serve dist/ with static file server
```

**Database**:
```bash
npx prisma migrate deploy
npm run db:seed
```

### Environment Variables

```env
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/hexhaven
PORT=3000
FRONTEND_URL=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

---

## Future Enhancements

### Performance
- Redis for session storage
- Horizontal scaling with load balancer
- CDN for static assets

### Features
- Email authentication
- Campaign mode
- Item shop
- Achievements
- Spectator mode

### Infrastructure
- Docker containers
- Kubernetes orchestration
- CI/CD pipeline (GitHub Actions)
- Automated E2E testing
- Monitoring & alerting (Prometheus, Grafana)

---

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Socket.io Documentation](https://socket.io/docs)
- [PixiJS Documentation](https://pixijs.com/guides)
- [Red Blob Games - Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/)
- [Gloomhaven Rules](https://online.flippingbook.com/view/598058/)

---

**Document Status**: ✅ Complete
**Maintainer**: Hexhaven Development Team
**Last Review**: 2025-12-15
