# Game Completion System

Complete documentation for the Hexhaven Game Completion system (Issue #186).

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [WebSocket Events](#websocket-events)
5. [Player Statistics Tracking](#player-statistics-tracking)
6. [Match History](#match-history)
7. [Return to Lobby Flow](#return-to-lobby-flow)
8. [API Endpoints](#api-endpoints)

---

## Overview

The Game Completion system handles everything that happens when a scenario ends:

- Detecting victory/defeat conditions
- Recording game results in the database
- Tracking player statistics (damage, kills, loot, etc.)
- Displaying completion modal to players
- Enabling "Return to Lobby" functionality
- Providing match history API

### Key Features

- **Automatic Detection**: Game completion is checked after every turn and round
- **Objective Support**: Primary, secondary, and failure conditions
- **Statistics Tracking**: Per-player combat and resource stats
- **Persistent Storage**: All results saved to PostgreSQL
- **Match History**: REST API for viewing past games
- **WebSocket Events**: Real-time notifications to all players

---

## Architecture

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         GAME BOARD                              │
│  Players take turns → Actions resolve → Events occur            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETION CHECKS                             │
│  • After each turn                                               │
│  • At round boundaries                                           │
│  • After monster death                                           │
│  • After character exhaustion                                    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OBJECTIVE EVALUATION                            │
│  ObjectiveEvaluatorService:                                      │
│  • Build context from game state                                 │
│  • Evaluate primary objective                                    │
│  • Evaluate secondary objectives                                 │
│  • Check failure conditions                                      │
│  • Calculate progress                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   ┌─────────┐      ┌─────────┐
   │ VICTORY │      │ DEFEAT  │
   └────┬────┘      └────┬────┘
        │                │
        └────────┬────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESULT RECORDING                              │
│  GameResultService:                                              │
│  • Create GameResult record                                      │
│  • Create PlayerGameResult for each player                       │
│  • Store objective progress                                      │
│  • Calculate completion time                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WEBSOCKET BROADCAST                             │
│  scenario_completed event:                                       │
│  • Victory/defeat status                                         │
│  • Player statistics                                             │
│  • Objective completion data                                     │
│  • Experience and loot                                           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND MODAL                                │
│  ScenarioCompleteModal:                                          │
│  • Display victory/defeat message                                │
│  • Show player statistics                                        │
│  • Display rewards                                               │
│  • "Return to Lobby" button                                      │
│  • "View Match History" button                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction

**Backend Services**:
- `ObjectiveEvaluatorService` - Evaluates objectives
- `ObjectiveContextBuilderService` - Builds evaluation context
- `GameResultService` - Persists results to database
- `ScenarioService` - Checks completion conditions
- `GameGateway` - Broadcasts WebSocket events

**Frontend Components**:
- `GameBoard` - Listens for scenario_completed
- `ScenarioCompleteModal` - Displays results
- `MatchHistory` - Shows past games
- `WebSocketService` - Handles events

**Database Models**:
- `GameResult` - Stores game outcome
- `PlayerGameResult` - Stores per-player stats

---

## Database Schema

### GameResult Table

Stores high-level information about completed games.

```prisma
model GameResult {
  id                          String   @id @default(uuid())
  gameId                      String   @unique
  roomCode                    String
  scenarioId                  String?
  scenarioName                String?
  victory                     Boolean
  completedAt                 DateTime @default(now())
  roundsCompleted             Int
  completionTimeMs            Int?

  // Objective tracking
  primaryObjectiveCompleted   Boolean  @default(false)
  secondaryObjectiveCompleted Boolean  @default(false)
  objectivesCompletedList     Json     @default("[]")
  objectiveProgress           Json     @default("{}")

  // Aggregate stats
  totalLootCollected          Int      @default(0)
  totalExperience             Int      @default(0)
  totalGold                   Int      @default(0)

  // Relations
  game          Game
  playerResults PlayerGameResult[]
}
```

**Key Fields**:
- `gameId` - Links to the Game model
- `victory` - True for victory, false for defeat
- `completionTimeMs` - Duration from game start to completion
- `objectivesCompletedList` - Array of completed objective IDs
- `objectiveProgress` - Final progress for all objectives

### PlayerGameResult Table

Stores per-player statistics for a completed game.

```prisma
model PlayerGameResult {
  id              String   @id @default(uuid())
  gameResultId    String
  userId          String
  characterId     String
  characterClass  String
  characterName   String

  // Survival stats
  survived        Boolean  @default(true)
  wasExhausted    Boolean  @default(false)

  // Combat stats
  damageDealt     Int      @default(0)
  damageTaken     Int      @default(0)
  monstersKilled  Int      @default(0)

  // Resource stats
  lootCollected   Int      @default(0)
  cardsLost       Int      @default(0)

  // Rewards
  experienceGained Int     @default(0)
  goldGained       Int     @default(0)

  // Relations
  gameResult GameResult
  user       User
}
```

**Key Fields**:
- `survived` - Did the character survive to the end?
- `wasExhausted` - Was the character exhausted at completion?
- `damageDealt` - Total damage dealt by this player
- `monstersKilled` - Number of monsters this player killed
- `experienceGained` - XP earned (includes bonuses)

### Data Relationships

```
Game (1) ──→ (1) GameResult
                    │
                    └──→ (N) PlayerGameResult
                              │
                              └──→ (1) User
```

---

## WebSocket Events

### objectives_loaded

Sent when game starts to inform clients of scenario objectives.

**Payload**:
```typescript
{
  primary: {
    id: string,
    description: string,
    trackProgress: boolean
  },
  secondary: Array<{
    id: string,
    description: string,
    trackProgress: boolean,
    optional: boolean
  }>,
  failureConditions?: Array<{
    id: string,
    description: string
  }>
}
```

**Example**:
```json
{
  "primary": {
    "id": "primary-1",
    "description": "Defeat all enemies",
    "trackProgress": true
  },
  "secondary": [
    {
      "id": "secondary-1",
      "description": "Complete in 8 rounds or less",
      "trackProgress": true,
      "optional": true
    }
  ]
}
```

**When Sent**: Game start (after game_started event)

---

### objective_progress

Sent when objective progress updates.

**Payload**:
```typescript
{
  objectiveId: string,
  description: string,
  current: number,
  target: number,
  percentage: number,
  milestone?: number  // 25, 50, 75, 100
}
```

**Example**:
```json
{
  "objectiveId": "primary-1",
  "description": "Defeat all enemies",
  "current": 3,
  "target": 5,
  "percentage": 60,
  "milestone": 50
}
```

**When Sent**: After actions that affect objective progress (monster death, loot collection, etc.)

---

### scenario_completed

Sent when scenario ends (victory or defeat).

**Payload**:
```typescript
{
  victory: boolean,
  experience: number,
  loot: Array<{
    playerId: string,
    gold: number,
    items: string[]
  }>,
  completionTime: number,  // milliseconds

  // Objective data
  primaryObjectiveCompleted: boolean,
  secondaryObjectivesCompleted: string[],
  objectiveProgress: Record<string, { current: number, target: number }>,

  // Player stats
  playerStats: Array<{
    playerId: string,
    damageDealt: number,
    damageTaken: number,
    monstersKilled: number,
    cardsLost: number
  }>
}
```

**Example**:
```json
{
  "victory": true,
  "experience": 15,
  "loot": [
    {
      "playerId": "player-uuid-1",
      "gold": 25,
      "items": []
    },
    {
      "playerId": "player-uuid-2",
      "gold": 30,
      "items": ["item-potion-healing"]
    }
  ],
  "completionTime": 1800000,
  "primaryObjectiveCompleted": true,
  "secondaryObjectivesCompleted": ["secondary-1"],
  "objectiveProgress": {
    "primary-1": { "current": 5, "target": 5 },
    "secondary-1": { "current": 7, "target": 8 }
  },
  "playerStats": [
    {
      "playerId": "player-uuid-1",
      "damageDealt": 45,
      "damageTaken": 12,
      "monstersKilled": 3,
      "cardsLost": 2
    },
    {
      "playerId": "player-uuid-2",
      "damageDealt": 38,
      "damageTaken": 8,
      "monstersKilled": 2,
      "cardsLost": 1
    }
  ]
}
```

**When Sent**: Immediately when victory/defeat conditions are met

---

### character_exhausted

Sent when a character becomes exhausted.

**Payload**:
```typescript
{
  characterId: string,
  characterName: string,
  playerId: string,
  reason: 'health' | 'cards' | 'manual'
}
```

**Example**:
```json
{
  "characterId": "char-uuid-1",
  "characterName": "Valeria the Brute",
  "playerId": "player-uuid-1",
  "reason": "health"
}
```

**When Sent**: When character health reaches 0 or cards are depleted

---

## Player Statistics Tracking

### What Gets Tracked

The system tracks per-player statistics throughout the game:

- **Damage Dealt**: Total damage inflicted on monsters
- **Damage Taken**: Total damage received from monsters
- **Monsters Killed**: Number of monsters killed by this player
- **Loot Collected**: Number of loot tokens collected
- **Cards Lost**: Number of ability cards permanently lost
- **Experience Gained**: Base XP + objective bonuses
- **Gold Gained**: Loot value + objective bonuses

### How Tracking Works

Statistics are tracked in-memory during the game:

```typescript
// In GameGateway
private roomPlayerStats = new Map<string, Map<string, PlayerStats>>();

interface PlayerStats {
  damageDealt: number;
  damageTaken: number;
  monstersKilled: number;
  lootCollected: number;
  cardsLost: number;
}
```

**Tracking Points**:

1. **Damage Dealt** - Updated in `handleAttackTarget()` when attack resolves
2. **Damage Taken** - Updated in `handleAttackTarget()` for character targets
3. **Monsters Killed** - Updated when monster health reaches 0
4. **Loot Collected** - Updated in `handleCollectLoot()`
5. **Cards Lost** - Updated during rest mechanics (future)

### Statistics Persistence

When game completes:

1. In-memory stats are read from `roomPlayerStats`
2. Experience and gold calculated based on objectives
3. `GameResultService.saveGameResult()` creates records
4. Stats persist to `PlayerGameResult` table

---

## Match History

### Viewing Match History

Players can view their game history through the frontend or API.

**Frontend Route**: `/match-history` (future)

**API Endpoint**: `GET /api/games/history/:userId`

### History Features

- List of all completed games
- Filter by victory/defeat
- Filter by scenario
- Filter by date range
- Pagination support
- Detailed view per game

### Statistics Dashboard

Aggregate statistics across all games:

- Total games played
- Win/loss record
- Win rate percentage
- Total experience earned
- Total gold earned
- Total monsters killed
- Favorite character class

**API Endpoint**: `GET /api/games/history/stats/:userId`

---

## Return to Lobby Flow

### User Journey

1. Scenario completes (victory or defeat)
2. `scenario_completed` WebSocket event fires
3. `ScenarioCompleteModal` appears
4. Player reviews results
5. Player clicks "Return to Lobby"
6. Frontend navigates to `/`
7. Game state is cleared
8. Player can create/join new game

### Implementation Details

**Frontend (GameBoard.tsx)**:
```typescript
const handleReturnToLobby = () => {
  // Clear game state
  setGameState(null);
  setScenarioResult(null);

  // Disconnect from game room
  websocketService.emit('leave_room', {});

  // Navigate to landing page
  navigate('/');
};
```

**Backend (GameGateway)**:
```typescript
@SubscribeMessage('leave_room')
handleLeaveRoom(client: Socket): void {
  // Remove player from room
  // Clean up room if empty
  // Broadcast player_left event
}
```

### State Cleanup

When returning to lobby:

- Frontend clears `gameState`
- Frontend clears `scenarioResult`
- Backend removes player from room
- Room deleted if all players leave
- WebSocket connection maintained for new game

---

## API Endpoints

See [api-reference.md](./api-reference.md) for complete API documentation.

### Quick Reference

**Match History**:
- `GET /api/games/history/:userId` - Get player's game history
- `GET /api/games/history/result/:gameResultId` - Get detailed game result
- `GET /api/games/history/stats/:userId` - Get player statistics

**Authentication**: All endpoints require JWT authentication

---

## Error Handling

### Common Scenarios

**Scenario**: Game completion called multiple times
- **Prevention**: Flag added to room state to prevent duplicate saves
- **Behavior**: First completion saves, subsequent calls are ignored

**Scenario**: Player disconnects during completion
- **Behavior**: Result still saved, player sees modal on reconnect
- **Implementation**: Result stored in database, modal reshown if `gameState.completed`

**Scenario**: Database save fails
- **Behavior**: Error logged, players still see completion modal
- **Recovery**: Manual database fix may be needed
- **Future**: Retry mechanism with exponential backoff

---

## Future Enhancements

### Planned Features

- **Leaderboards**: Fastest completions, highest scores
- **Achievements**: Special accomplishments across games
- **Replays**: Ability to replay completed scenarios
- **Season Stats**: Statistics per season/time period
- **Character Progression**: XP and gold apply to persistent characters
- **Campaign Tracking**: Track completion across linked scenarios

### Phase 2 Features (Deferred)

- Battle goals (personal objectives)
- Random dungeons
- Challenge modes (hard mode, permadeath)
- Community scenarios

---

## Development Guide

### Adding New Statistics

1. Add field to `PlayerStats` interface
2. Track in appropriate handler (e.g., `handleAttackTarget`)
3. Add to `GameResultData` interface
4. Update `PlayerGameResult` schema
5. Run Prisma migration
6. Update frontend display

**Example**: Adding "Healing Done"

```typescript
// 1. Interface
interface PlayerStats {
  // ... existing fields
  healingDone: number;
}

// 2. Tracking
private recordHealing(roomCode: string, playerId: string, amount: number) {
  const stats = this.getPlayerStats(roomCode, playerId);
  stats.healingDone += amount;
}

// 3. Persistence (GameResultService)
healingDone: player.healingDone ?? 0

// 4. Schema
healingDone Int @default(0)

// 5. Migration
npx prisma migrate dev --name add-healing-stat
```

### Adding New Objective Templates

See [objective-system-guide.md](./objective-system-guide.md) for complete guide.

---

## Testing

### Unit Tests

Test objective evaluation:

```typescript
// backend/tests/unit/objective-evaluator.test.ts
describe('ObjectiveEvaluatorService', () => {
  it('should complete kill_all_monsters when all dead', () => {
    const result = evaluator.evaluateObjective(objective, context);
    expect(result.complete).toBe(true);
  });
});
```

### Integration Tests

Test game completion flow:

```typescript
// backend/tests/integration/game-completion.test.ts
describe('Game Completion', () => {
  it('should save result when all monsters killed', async () => {
    // Kill all monsters
    // Verify scenario_completed event
    // Check database for GameResult
  });
});
```

### E2E Tests

Test full user journey:

```typescript
// frontend/tests/e2e/game-completion.spec.ts
test('complete scenario and return to lobby', async ({ page }) => {
  // Start game
  // Complete objective
  // Verify modal appears
  // Click "Return to Lobby"
  // Verify navigation
});
```

---

## Troubleshooting

### Issue: Objectives not evaluating

**Check**:
- Scenario has `objectives` field in database/JSON
- ObjectiveEvaluatorService is registered in module
- No errors in backend logs

**Fix**:
- Verify scenario schema is correct
- Check ObjectiveContextBuilder for errors
- Enable debug logging

### Issue: Statistics not tracking

**Check**:
- PlayerStats map is initialized for room
- Tracking code runs after relevant events
- No race conditions in event handlers

**Fix**:
- Add logging to tracking functions
- Verify event order is correct
- Check for null player IDs

### Issue: Completion modal doesn't show

**Check**:
- Frontend WebSocket listener is registered
- `scenario_completed` event payload is valid
- Modal component is rendered conditionally

**Fix**:
- Check browser console for errors
- Verify WebSocket connection is active
- Test with mock event

---

## Architecture Decisions

### Why Separate GameResult from Game?

- **Reason**: Games are mutable during play, results are immutable
- **Benefit**: Clear separation of concerns
- **Benefit**: Can query results without loading full game state

### Why Track Stats In-Memory?

- **Reason**: Avoid database writes on every action
- **Benefit**: Better performance (fewer DB queries)
- **Trade-off**: Stats lost if server crashes (acceptable for MVP)
- **Future**: Event sourcing for full audit trail

### Why JSON Fields for Objectives?

- **Reason**: Flexible schema without migrations
- **Benefit**: Easy to add new objective types
- **Trade-off**: Can't query by objective details (acceptable)

---

## Related Documentation

- [objective-system-guide.md](./objective-system-guide.md) - Creating objectives
- [scenario-migration-guide.md](./scenario-migration-guide.md) - Migrating scenarios
- [api-reference.md](./api-reference.md) - API documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

---

**Last Updated**: 2025-12-07
**Version**: 1.0.0 (Issue #186 - Game Completion System)
