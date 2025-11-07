# Data Model: Hexhaven Multiplayer

**Feature**: 001-hexhaven-multiplayer
**Date**: 2025-11-07
**Phase**: 1 - Design & Contracts

This document defines all entities, their attributes, relationships, validation rules, and state transitions for the Hexhaven multiplayer game.

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Player     │───┬──>│  GameRoom    │───┬──>│  Scenario    │
└──────────────┘   │   └──────────────┘   │   └──────────────┘
                   │                      │
                   │                      │
                   │   ┌──────────────┐   │   ┌──────────────┐
                   └──>│  Character   │<──┘   │   Monster    │
                       └──────────────┘       └──────────────┘
                              │                      │
                              │                      │
                       ┌──────────────┐       ┌──────────────┐
                       │ AbilityCard  │       │  HexTile     │
                       └──────────────┘       └──────────────┘
                              │
                              │
                       ┌──────────────┐
                       │  Condition   │
                       └──────────────┘
```

---

## Core Entities

### 1. Player

**Description**: A human participant in a game session, identified by nickname in anonymous mode or account in registered mode.

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | UUID | Yes | Valid UUID v4 | Unique identifier |
| `uuid` | String | Yes | 36 chars, alphanumeric + hyphens | Anonymous UUID stored in browser localStorage |
| `nickname` | String | Yes | 1-50 chars, alphanumeric + spaces | Display name chosen by player |
| `roomId` | UUID | No | Valid UUID v4, FK to GameRoom | Current game room (null if not in game) |
| `characterId` | UUID | No | Valid UUID v4, FK to Character | Selected character (null if not selected) |
| `isHost` | Boolean | Yes | true/false | Whether player created the room (host can start game) |
| `connectionStatus` | Enum | Yes | 'connected', 'disconnected', 'reconnecting' | Current connection state |
| `lastSeenAt` | Timestamp | Yes | ISO 8601 | Last activity timestamp for timeout detection |
| `createdAt` | Timestamp | Yes | ISO 8601 | Player creation timestamp |

**Relationships**:
- Belongs to one `GameRoom` (many-to-one)
- Has one `Character` (one-to-one when in game)

**State Transitions**:
```
[Created] ──join room──> [In Lobby] ──select character──> [Ready] ──game starts──> [Active] ──disconnect──> [Disconnected]
                                                                                      │                        │
                                                                                      └────<───reconnect───────┘
```

**Validation Rules**:
- Nickname must be unique within a game room
- Cannot join room if already in another active room
- Cannot disconnect for >10 minutes without being kicked (User Story 4)

**Invariants**:
- If `roomId` is set, room must exist and have status 'lobby' or 'active'
- If `characterId` is set, `roomId` must also be set

---

### 2. GameRoom

**Description**: A multiplayer session identified by a 6-character code, containing 2-4 players.

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | UUID | Yes | Valid UUID v4 | Unique identifier |
| `roomCode` | String | Yes | Exactly 6 chars, uppercase alphanumeric | Shareable room code (e.g., "A3X9K2") |
| `status` | Enum | Yes | 'lobby', 'active', 'completed', 'abandoned' | Room lifecycle state |
| `scenarioId` | UUID | No | Valid UUID v4, FK to Scenario | Selected scenario (null until host selects) |
| `currentRound` | Integer | No | >= 1 | Current game round (null if in lobby) |
| `currentTurnIndex` | Integer | No | >= 0, < turnOrder.length | Index into turn order array (null if not started) |
| `turnOrder` | Array<UUID> | No | Array of player/monster UUIDs | Initiative-sorted entity IDs (null until card selection) |
| `elementalState` | Object | No | 6 elements with states | Current elemental infusion states (fire, ice, air, earth, light, dark) |
| `createdAt` | Timestamp | Yes | ISO 8601 | Room creation timestamp |
| `updatedAt` | Timestamp | Yes | ISO 8601 | Last state update timestamp |
| `expiresAt` | Timestamp | Yes | ISO 8601, createdAt + 24 hours | Room expiration (User Story 4: 24-hour retention) |

**Relationships**:
- Has many `Players` (one-to-many)
- Has one `Scenario` (many-to-one)
- Has many `Monsters` (one-to-many)

**State Transitions**:
```
[Created] ──host selects scenario──> [Lobby] ──host starts game──> [Active] ──scenario ends──> [Completed]
    │                                    │                             │
    │                                    │                             └──all players leave──> [Abandoned]
    └────────────────all players leave for >10 min─────────────────────────────────────────> [Abandoned]
```

**Validation Rules**:
- Room code must be unique across all active/lobby rooms
- Must have 2-4 players to start game (FR-003)
- Cannot start game without scenario selected
- Turn order must include all players and monsters when game is active

**Invariants**:
- If `status` is 'active', `scenarioId`, `currentRound`, `turnOrder` must be set
- `turnOrder` contains exactly (player count + monster count) UUIDs
- `elementalState` has exactly 6 entries: `{ fire, ice, air, earth, light, dark }`
- Each element state is one of: 'inert', 'waning', 'strong'

**Elemental State Structure**:
```typescript
elementalState: {
  fire: 'inert' | 'waning' | 'strong',
  ice: 'inert' | 'waning' | 'strong',
  air: 'inert' | 'waning' | 'strong',
  earth: 'inert' | 'waning' | 'strong',
  light: 'inert' | 'waning' | 'strong',
  dark: 'inert' | 'waning' | 'strong'
}
```

---

### 3. Character

**Description**: A playable class (Brute, Tinkerer, Spellweaver, etc.) with unique ability deck and stats.

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | UUID | Yes | Valid UUID v4 | Unique identifier |
| `playerId` | UUID | Yes | Valid UUID v4, FK to Player | Player controlling this character |
| `classType` | Enum | Yes | 'Brute', 'Tinkerer', 'Spellweaver', 'Scoundrel', 'Cragheart', 'Mindthief' | Character class (6 starting classes) |
| `health` | Integer | Yes | 1 to maxHealth | Current health points |
| `maxHealth` | Integer | Yes | > 0 | Maximum health (class-specific) |
| `experience` | Integer | Yes | >= 0 | Current experience points |
| `level` | Integer | Yes | 1-9 | Character level (determines ability card enhancements) |
| `currentHex` | Axial | No | Valid hex coordinates | Current position on board (null if exhausted) |
| `abilityDeck` | Array<UUID> | Yes | Array of AbilityCard UUIDs | Full ability deck (class-specific) |
| `hand` | Array<UUID> | Yes | Subset of abilityDeck | Cards currently in hand |
| `discardPile` | Array<UUID> | Yes | Subset of abilityDeck | Discarded cards (recoverable with rest) |
| `lostPile` | Array<UUID> | Yes | Subset of abilityDeck | Lost cards (not recoverable until scenario end) |
| `activeCards` | Object | No | {top: UUID, bottom: UUID} | Cards selected this round (null if not selected) |
| `conditions` | Array<Enum> | Yes | List of active conditions | Active status effects (poison, wound, stun, etc.) |
| `isExhausted` | Boolean | Yes | true/false | Whether character is exhausted (health <= 0 or out of cards) |

**Relationships**:
- Belongs to one `Player` (one-to-one)
- Has many `AbilityCards` (one-to-many)
- Has many `Conditions` (many-to-many)

**State Transitions**:
```
[Created] ──placed on board──> [Active] ──health to 0 OR no cards──> [Exhausted]
              │                    │
              └────<──long rest────┘
```

**Validation Rules**:
- `health` must be between 0 and `maxHealth`
- `hand`, `discardPile`, `lostPile` must partition `abilityDeck` (no overlap, union = abilityDeck)
- `hand` size must be >= 2 (or character is exhausted)
- `activeCards` must reference cards in `hand` when selected
- `currentHex` must not overlap with another entity's hex (unless flying over)

**Invariants**:
- If `isExhausted` is true, `currentHex` is null
- `hand.length + discardPile.length + lostPile.length + (activeCards ? 2 : 0) === abilityDeck.length`

**Axial Coordinate Structure**:
```typescript
currentHex: { q: number, r: number } | null
```

---

### 4. Monster

**Description**: An AI-controlled enemy entity with monster type, stats, and behavior rules.

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | UUID | Yes | Valid UUID v4 | Unique identifier |
| `roomId` | UUID | Yes | Valid UUID v4, FK to GameRoom | Game room this monster belongs to |
| `monsterType` | String | Yes | 1-50 chars | Monster name (e.g., "Bandit Guard", "Living Bones") |
| `isElite` | Boolean | Yes | true/false | Elite (stronger) vs Normal monster |
| `health` | Integer | Yes | 1 to maxHealth | Current health points |
| `maxHealth` | Integer | Yes | > 0 | Maximum health (type + elite status determines this) |
| `movement` | Integer | Yes | >= 0 | Movement range this turn (from monster ability card) |
| `attack` | Integer | Yes | >= 0 | Attack value this turn (from monster ability card) |
| `range` | Integer | Yes | >= 0 | Attack range (0 = melee, >0 = ranged) |
| `currentHex` | Axial | Yes | Valid hex coordinates | Current position on board |
| `specialAbilities` | Array<String> | No | List of ability names | Special abilities (e.g., "Flying", "Retaliate 2", "Shield 1") |
| `conditions` | Array<Enum> | Yes | List of active conditions | Active status effects (poison, wound, stun, etc.) |
| `isDead` | Boolean | Yes | true/false | Whether monster is defeated (health <= 0) |

**Relationships**:
- Belongs to one `GameRoom` (many-to-one)

**State Transitions**:
```
[Spawned] ──takes turn──> [Active] ──health to 0──> [Dead]
              │               │
              └───<──round──>─┘
```

**Validation Rules**:
- `health` must be between 0 and `maxHealth`
- `currentHex` must not overlap with another entity's hex (unless flying)
- If `isDead` is true, monster is removed from turn order

**Invariants**:
- If `isDead` is true, `health` is 0
- `movement`, `attack`, `range` are updated from monster ability card each round

---

### 5. AbilityCard

**Description**: A playable action card with initiative, top action, bottom action, and optional elemental effects.

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | UUID | Yes | Valid UUID v4 | Unique identifier |
| `characterClass` | Enum | Yes | Character class this card belongs to | Card's character class |
| `name` | String | Yes | 1-100 chars | Card name (e.g., "Trample", "Warding Strength") |
| `level` | Integer | Yes | 1 or X (1 = starter, X = level unlock) | Card level (determines when unlockable) |
| `initiative` | Integer | Yes | 1-99 | Initiative value (lower goes first) |
| `topAction` | Object | Yes | Action definition | Top half of card (primary action) |
| `bottomAction` | Object | Yes | Action definition | Bottom half of card (primary action) |
| `imageUrl` | String | No | Valid URL or path | Card image asset path |

**Relationships**:
- Belongs to one `Character` (many-to-one)

**Validation Rules**:
- `initiative` must be unique per character (no two cards with same initiative for one class)
- Actions must have at least one effect (move, attack, heal, etc.)

**Action Structure**:
```typescript
topAction: {
  type: 'move' | 'attack' | 'heal' | 'loot' | 'special',
  value?: number,                    // e.g., Move 4, Attack 3
  range?: number,                    // Attack range (0 = melee)
  effects?: Array<string>,           // Additional effects (e.g., "Push 2", "Stun")
  elementGenerate?: 'fire' | 'ice' | 'air' | 'earth' | 'light' | 'dark',  // Element generated
  elementConsume?: 'fire' | 'ice' | 'air' | 'earth' | 'light' | 'dark',   // Element consumed
  elementBonus?: { effect: string, value: number }  // Bonus if element consumed
}
```

---

### 6. Scenario

**Description**: A pre-defined battle setup with map layout, monster groups, and victory conditions.

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | UUID | Yes | Valid UUID v4 | Unique identifier |
| `name` | String | Yes | 1-100 chars | Scenario name (e.g., "Black Barrow", "Crypt of Blood") |
| `difficulty` | Integer | Yes | 0-7 | Difficulty level (affects monster stats) |
| `mapLayout` | Array<HexTile> | Yes | Non-empty array | Hex tiles defining the board |
| `monsterGroups` | Array<MonsterGroup> | Yes | Non-empty array | Monster spawn definitions |
| `objectivePrimary` | String | Yes | 1-500 chars | Primary victory condition |
| `objectiveSecondary` | String | No | 1-500 chars | Optional secondary objective |
| `treasures` | Array<TreasureLocation> | No | List of treasure hex coords | Treasure locations on map |

**Relationships**:
- Has many `GameRooms` (one-to-many, many rooms can use same scenario)

**Validation Rules**:
- `mapLayout` must have at least 10 tiles
- `monsterGroups` must spawn at valid hex coordinates from `mapLayout`
- All spawn points must be on `normal` terrain (not obstacles)

**Monster Group Structure**:
```typescript
monsterGroups: [
  {
    type: 'Bandit Guard',
    count: 3,              // Number of monsters
    spawnPoints: [         // Hex coordinates for spawning
      { q: 2, r: 3 },
      { q: 2, r: 4 },
      { q: 3, r: 3 }
    ],
    isElite: false
  }
]
```

---

### 7. HexTile

**Description**: A single space on the hexagonal game board with terrain type and occupancy status.

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `coordinates` | Axial | Yes | Valid hex coordinates (q, r) | Unique position identifier |
| `terrain` | Enum | Yes | 'normal', 'obstacle', 'difficult', 'hazardous' | Terrain type |
| `occupiedBy` | UUID | No | FK to Character or Monster | Entity currently on this hex (null if empty) |
| `hasLoot` | Boolean | Yes | true/false | Whether loot token is on this hex |
| `hasTreasure` | Boolean | Yes | true/false | Whether treasure is on this hex |

**Relationships**:
- Belongs to one `Scenario` (many-to-one)
- Can be occupied by one `Character` or `Monster` (one-to-one)

**Validation Rules**:
- `coordinates` must be unique within a scenario
- If `terrain` is 'obstacle', `occupiedBy` must be null (unless entity has "Flying")
- If `terrain` is 'difficult', movement cost is doubled

**Invariants**:
- At most one entity per hex (unless flying)

---

### 8. AttackModifierDeck

**Description**: A deck of cards that modify attack values, including bless/curse cards.

**Attributes**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `characterId` | UUID | Yes | Valid UUID v4, FK to Character | Character this deck belongs to |
| `cards` | Array<ModifierCard> | Yes | Non-empty array | Current deck contents |
| `discardPile` | Array<ModifierCard> | Yes | List of used cards | Discarded modifiers (reshuffle on reshuffle card) |

**ModifierCard Structure**:
```typescript
{
  modifier: number,           // +2, +1, 0, -1, -2, or 'null', 'x2'
  isReshuffle: boolean,       // True for 'null' and 'x2' cards (trigger reshuffle)
  effects?: Array<string>     // Additional effects (e.g., "+1 Push 1", "Stun")
}
```

**Validation Rules**:
- Base deck has 20 cards: 1x null, 1x x2, 5x +1, 5x -1, 6x +0, 1x -2, 1x +2
- Bless cards (+2) are temporary (removed after draw)
- Curse cards (null) are temporary (removed after draw)

**State Transitions**:
```
[Draw] ──modifier applied──> [Discard] ──reshuffle card drawn──> [Shuffle all discards back to deck]
```

---

### 9. Condition

**Description**: A status effect applied to entities (poison, wound, stun, etc.).

**Enumeration Values**:
- `poison`: Entity takes 1 damage at end of turn
- `wound`: Entity takes 1 damage at end of turn, cannot heal
- `stun`: Entity loses next turn, then condition removed
- `immobilize`: Entity cannot move next turn, then condition removed
- `disarm`: Entity cannot attack next turn, then condition removed
- `muddle`: Entity has disadvantage on attacks (draw 2 attack modifiers, use worse)
- `strengthen`: Entity has advantage on attacks (draw 2 attack modifiers, use better)
- `invisible`: Entity cannot be targeted by enemies

**Duration**:
- Most conditions last until end of entity's next turn
- `poison` and `wound` persist until cured
- `invisible` lasts until entity attacks or end of round

---

### 10. ElementalInfusion

**Description**: Global state of six elemental types, tracking waning/strong states.

**Structure**:
```typescript
{
  fire: 'inert' | 'waning' | 'strong',
  ice: 'inert' | 'waning' | 'strong',
  air: 'inert' | 'waning' | 'strong',
  earth: 'inert' | 'waning' | 'strong',
  light: 'inert' | 'waning' | 'strong',
  dark: 'inert' | 'waning' | 'strong'
}
```

**State Transitions** (per element):
```
[Inert] ──ability generates element──> [Strong] ──end of round──> [Waning] ──end of next round──> [Inert]
           │                                         │
           └──ability consumes element──────────────┘
```

**Rules**:
- Elements are global to the game room (shared across all players/monsters)
- Consuming an element immediately sets it to 'inert'
- At end of each round: 'strong' → 'waning', 'waning' → 'inert'

---

## Database Schema (PostgreSQL + Prisma)

```prisma
// Hybrid schema: JSONB for full state, normalized tables for queries

model GameRoom {
  id          String   @id @default(uuid())
  roomCode    String   @unique @db.VarChar(6)
  status      RoomStatus
  scenarioId  String?  @db.Uuid
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  expiresAt   DateTime

  players     Player[]
  gameState   GameState?
  scenario    Scenario? @relation(fields: [scenarioId], references: [id])
}

model Player {
  id               String   @id @default(uuid())
  uuid             String   @unique @db.VarChar(36)
  nickname         String   @db.VarChar(50)
  roomId           String?  @db.Uuid
  isHost           Boolean  @default(false)
  connectionStatus ConnectionStatus
  lastSeenAt       DateTime @default(now())
  createdAt        DateTime @default(now())

  room             GameRoom? @relation(fields: [roomId], references: [id])
}

model GameState {
  roomId    String   @id @db.Uuid
  state     Json     // Full game state as JSONB (characters, monsters, board, etc.)
  updatedAt DateTime @updatedAt

  room      GameRoom @relation(fields: [roomId], references: [id])
}

model Scenario {
  id                String   @id @default(uuid())
  name              String   @db.VarChar(100)
  difficulty        Int
  mapLayout         Json     // Array of HexTiles
  monsterGroups     Json     // Array of MonsterGroups
  objectivePrimary  String   @db.VarChar(500)
  objectiveSecondary String?  @db.VarChar(500)
  treasures         Json?    // Array of TreasureLocations

  rooms             GameRoom[]
}

enum RoomStatus {
  lobby
  active
  completed
  abandoned
}

enum ConnectionStatus {
  connected
  disconnected
  reconnecting
}
```

---

## Validation Summary

### Server-Authoritative Validation (FR-012)

All player actions are validated server-side before applying:

1. **Movement**:
   - Hex is within movement range
   - Hex is not occupied
   - Hex is not obstacle (unless flying)
   - Player has movement action available

2. **Attack**:
   - Target is within attack range
   - Player has attack action available
   - Attacker is not disarmed

3. **Card Selection**:
   - Cards are in player's hand
   - Exactly 2 cards selected
   - Cards belong to player's character

4. **Room Join**:
   - Room exists and status is 'lobby'
   - Room has < 4 players
   - Player is not already in another room

5. **Game Start**:
   - Player is room host
   - All players have selected characters
   - Scenario is selected
   - Room has 2-4 players

---

## Next Steps

Phase 1 continues with:
- **API Contracts**: WebSocket event schemas and REST endpoint definitions → `contracts/`
- **Quickstart Guide**: Getting started with local development → `quickstart.md`
- **Agent Context Update**: Update Claude context with new technology decisions
