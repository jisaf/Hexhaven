# Campaign Narrative System

The narrative system enables rich storytelling in Gloomhaven campaigns through intro/outro narratives and mid-scenario triggers. All players must acknowledge each narrative before gameplay continues.

## Overview

Narratives can appear at three points during a scenario:
1. **Intro** - Before the scenario begins (full-screen story page)
2. **Triggers** - During gameplay when conditions are met (popup modal)
3. **Victory/Defeat** - After scenario completion (full-screen story page)

## Database Schema

### ScenarioNarrative

Each scenario can have one narrative definition:

```prisma
model ScenarioNarrative {
  id              String   @id @default(uuid())
  scenarioId      String   @unique

  // Before scenario
  introTitle      String?
  introText       String?
  introImageUrl   String?

  // After victory
  victoryTitle    String?
  victoryText     String?
  victoryImageUrl String?

  // After defeat
  defeatTitle     String?
  defeatText      String?
  defeatImageUrl  String?

  triggers        NarrativeTrigger[]
}
```

### NarrativeTrigger

Mid-scenario narratives triggered by game conditions:

```prisma
model NarrativeTrigger {
  id              String
  narrativeId     String
  triggerId       String   // Unique per scenario
  displayOrder    Int      // Order when multiple triggers fire

  title           String?
  text            String
  imageUrl        String?

  conditions      Json     // Condition tree (see below)
  rewards         Json?    // Gold, XP, items with distribution mode
  gameEffects     Json?    // Spawn monsters, unlock doors, etc.
}
```

## Condition System

Conditions determine when triggers fire. They support AND/OR logic with arbitrary nesting.

### Condition Types

| Type | Description | Params |
|------|-------------|--------|
| `character_on_hex` | Character at specific hex | `hex: {q, r}`, `characterClass?` |
| `characters_on_hexes` | Multiple characters at hexes | `hexes: [{q,r}...]`, `requireAll`, `mustBeSimultaneous` |
| `monsters_killed` | Kill count reached | `count`, `monsterType?` |
| `round_reached` | Game round reached | `round` |
| `all_enemies_dead` | All monsters defeated | - |
| `treasure_collected` | Specific treasure collected | `treasureId` |
| `door_opened` | Specific door opened | `hex: {q, r}` |
| `loot_collected` | Loot collected from hex | `hex: {q, r}` |

### Simple Condition

```json
{
  "type": "round_reached",
  "params": { "round": 3 }
}
```

### Compound Conditions (AND/OR)

```json
{
  "operator": "AND",
  "conditions": [
    { "type": "round_reached", "params": { "round": 5 } },
    { "type": "monsters_killed", "params": { "count": 3 } }
  ]
}
```

### Negation

Any condition can be negated:

```json
{
  "type": "all_enemies_dead",
  "negate": true
}
```

## Movement-Triggered Narratives

Hex entry triggers fire during character movement, **interrupting movement at that hex**. This means if a player moves 3 hexes but a trigger is at the first hex, movement stops at the trigger hex and the narrative displays.

```json
{
  "triggerId": "approach-enemy",
  "conditions": {
    "type": "character_on_hex",
    "params": { "hex": { "q": 2, "r": 0 } }
  }
}
```

**Important**: Each trigger only fires once per game. The system tracks fired triggers and prevents re-triggering.

## Game Effects

Triggers can modify game state when acknowledged:

```json
{
  "gameEffects": {
    "spawnMonsters": [
      { "type": "living-bones", "hex": {"q": 2, "r": 3}, "isElite": false },
      { "type": "training-dummy", "hex": {"q": 4, "r": 0}, "isElite": true }
    ],
    "unlockDoors": [
      { "q": 0, "r": 5 }
    ],
    "revealHexes": [
      { "q": 1, "r": 6 }, { "q": 2, "r": 6 }
    ]
  }
}
```

### Monster Spawning

The `spawnMonsters` effect creates new monsters when the narrative is acknowledged:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Monster type (e.g., `training-dummy`, `living-bones`) |
| `hex` | `{q, r}` | Spawn position on the map |
| `isElite` | boolean | Whether to spawn as elite (optional, defaults to false) |

Monsters spawn at the scenario's difficulty level and are immediately added to the game state. A `narrative_monster_spawned` event is emitted to all clients.

## Rewards

Triggers and victory narratives can grant rewards:

```json
{
  "rewards": {
    "gold": 10,
    "xp": 5,
    "items": ["item-uuid-1", "item-uuid-2"],
    "distribution": "triggerer"
  }
}
```

### Reward Distribution Modes

The `distribution` field controls how rewards are distributed among players:

| Mode | Description | Use Case |
|------|-------------|----------|
| `everyone` | Each player gets the full reward amount (default) | Victory rewards, group achievements |
| `triggerer` | Only the player who triggered it gets the reward | Personal discoveries, hex entry rewards |
| `collective` | Total is split evenly among all players | Shared treasure, pooled resources |

**Examples**:

With 4 players and `gold: 20`:
- **everyone**: Each player gets 20 gold (80 total)
- **triggerer**: Only the triggering player gets 20 gold
- **collective**: Each player gets 5 gold (20 total, split 4 ways)

### Victory Rewards

Victory narratives automatically include rewards (configurable in game.gateway.ts):
- **Default**: 10 gold + 10 XP per player (`everyone` distribution)

```typescript
// In checkScenarioCompletion
const victoryRewards = isVictory ? { gold: 10, xp: 10 } : undefined;
```

### Reward Events

When rewards are applied, a `narrative_rewards_granted` event is emitted:

```typescript
{
  rewards: [
    { playerId: "...", characterId: "...", gold: 10, xp: 5 }
  ],
  distribution: "triggerer"
}
```

## Narrative Queue System

When multiple narratives would fire simultaneously (e.g., stepping on a trigger hex while intro is showing), the system queues them:

1. Active narrative displays to all players
2. New triggers are added to a queue
3. When current narrative is dismissed, next queued narrative displays
4. Queue is cleared when scenario completes (victory/defeat clears stale triggers)

## Player Acknowledgment

All connected players must acknowledge each narrative:
1. Narrative displayed to all players simultaneously
2. Each player clicks "Continue" button
3. Player acknowledgment status shown in real-time
4. When all acknowledge, game effects and rewards apply, gameplay resumes
5. Disconnected players auto-acknowledge after timeout (60s)

### Keyboard Accessibility
- **Enter** or **Space** key acknowledges the narrative
- Focus automatically moves to the acknowledge button

## Frontend Components

### NarrativeOverlay
Main container that routes to appropriate display:
- `NarrativeStoryPage` for intro/victory/defeat (full-screen)
- `NarrativePopup` for triggers (modal overlay)

### useNarrative Hook
React hook managing narrative state:
```typescript
const {
  activeNarrative,    // Current narrative payload
  isDisplaying,       // Whether narrative is shown
  acknowledgments,    // Player acknowledgment status
  myAcknowledgment,   // Current user's status
  acknowledge,        // Function to acknowledge
} = useNarrative(myPlayerId);
```

### NarrativeStateService
Singleton service that manages narrative state independently of component lifecycle:
```typescript
import { narrativeStateService } from './services/narrative-state.service';

// Get current state
const state = narrativeStateService.getState();

// Subscribe to changes
const unsubscribe = narrativeStateService.subscribe((state) => {
  console.log('Narrative state updated:', state);
});

// Acknowledge current narrative
narrativeStateService.acknowledge(playerId);

// Reset on game leave
narrativeStateService.reset();
```

## WebSocket Events

### Server to Client
| Event | Description | Payload |
|-------|-------------|---------|
| `narrative_display` | Display narrative with acknowledgments | `NarrativeDisplayPayload` |
| `narrative_acknowledged` | Player acknowledged (broadcasts to all) | `NarrativeAcknowledgedPayload` |
| `narrative_dismissed` | All acknowledged, narrative closed | `NarrativeDismissedPayload` |
| `narrative_monster_spawned` | Monster spawned by trigger | `{ monsterId, monsterType, hex, ... }` |
| `narrative_door_unlocked` | Door unlocked by trigger | `{ hex }` |
| `narrative_hexes_revealed` | Hexes revealed by trigger | `{ hexes }` |
| `narrative_rewards_granted` | Rewards applied to players | `{ rewards, distribution }` |

### Client to Server
| Event | Description | Payload |
|-------|-------------|---------|
| `acknowledge_narrative` | Player acknowledges current narrative | `{ narrativeId }` |

## Example: Trivial Training Campaign

The "Trivial Training" campaign demonstrates the narrative system:

### Training Dummy - Part 1
- **Intro**: Welcome message from instructor
- **Trigger (hex 1,0)**: Encouragement when approaching dummy
- **Trigger (round 2)**: Mid-battle encouragement
- **Victory**: First steps taken, reward and unlock part 2
- **Defeat**: Encouraging message to try again

### Training Dummy - Part 2
- **Intro**: Advanced challenge introduction
- **Trigger (hex 2,0)**:
  - Story about approaching reinforced dummy
  - **Spawns**: Second training dummy at hex (4,0)
  - **Rewards**: 10 gold (triggerer only)
- **Trigger (round 3)**: Halfway encouragement
- **Victory**: Campaign complete with 10 gold + 10 XP rewards
- **Defeat**: Encouragement to retry

## Adding Narratives

### Via Database Seed

```typescript
// In backend/prisma/seed.ts
const narrative = await prisma.scenarioNarrative.upsert({
  where: { scenarioId: scenario.id },
  update: { /* narrative fields */ },
  create: {
    scenarioId: scenario.id,
    introTitle: 'Title',
    introText: 'Story text...',
    victoryTitle: 'Victory!',
    victoryText: 'You won...',
    defeatTitle: 'Defeat',
    defeatText: 'You lost...',
  },
});

// Add a trigger with rewards and game effects
await prisma.narrativeTrigger.create({
  data: {
    narrativeId: narrative.id,
    triggerId: 'surprise-ambush',
    displayOrder: 0,
    title: 'Ambush!',
    text: 'Enemies appear from the shadows...',
    conditions: {
      type: 'character_on_hex',
      params: { hex: { q: 3, r: 2 } }
    },
    rewards: {
      gold: 15,
      distribution: 'triggerer',  // Only triggering player gets gold
    },
    gameEffects: {
      spawnMonsters: [
        { type: 'living-bones', hex: { q: 4, r: 2 }, isElite: false },
        { type: 'living-bones', hex: { q: 4, r: 3 }, isElite: true },
      ],
    },
  },
});
```

### Via API (Future)
Narrative CRUD endpoints are planned for the creator role.

## TypeScript Types

Key types from `shared/types/narrative.ts`:

```typescript
// Reward distribution modes
type RewardDistribution = 'triggerer' | 'collective' | 'everyone';

// Rewards structure
interface NarrativeRewards {
  gold?: number;
  xp?: number;
  items?: string[];
  distribution?: RewardDistribution; // Defaults to 'everyone'
}

// Game effects structure
interface NarrativeGameEffects {
  spawnMonsters?: MonsterSpawnDef[];
  unlockDoors?: HexCoordinate[];
  revealHexes?: HexCoordinate[];
}

// Monster spawn definition
interface MonsterSpawnDef {
  type: string;
  hex: HexCoordinate;
  isElite?: boolean;
}

// Active narrative (runtime state)
interface ActiveNarrative {
  id: string;
  type: NarrativeType;  // 'intro' | 'trigger' | 'victory' | 'defeat'
  triggerId?: string;
  triggeredBy?: string;  // Player ID who triggered (for distribution)
  content: NarrativeContent;
  rewards?: NarrativeRewards;
  gameEffects?: NarrativeGameEffects;
  acknowledgments: NarrativeAcknowledgment[];
  displayedAt: number;
  timeoutMs: number;
  disconnectedPlayers: string[];
}
```

## Testing

Run narrative-related tests:
```bash
npm test -- --testPathPattern="narrative"
```

Tests cover:
- Condition evaluation (AND/OR, negation, all types)
- Service state management
- Trigger checking and ordering
- Acknowledgment system
- Disconnected player handling
- Reward distribution modes
- Game effects (monster spawning, door unlocking)
