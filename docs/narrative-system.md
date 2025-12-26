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
  rewards         Json?    // Gold, XP, items
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

## Game Effects

Triggers can modify game state when acknowledged:

```json
{
  "gameEffects": {
    "spawnMonsters": [
      { "type": "living-bones", "hex": {"q": 2, "r": 3}, "isElite": false }
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

## Rewards

Triggers can grant rewards:

```json
{
  "rewards": {
    "gold": 10,
    "xp": 5,
    "items": ["item-uuid-1", "item-uuid-2"]
  }
}
```

## Player Acknowledgment

All connected players must acknowledge each narrative:
1. Narrative displayed to all players simultaneously
2. Each player clicks "Continue" button
3. Player acknowledgment status shown in real-time
4. When all acknowledge, game effects apply and gameplay resumes
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

## WebSocket Events

### Server to Client
- `narrative_display` - Display narrative with acknowledgments
- `narrative_acknowledged` - Player acknowledged (broadcasts to all)
- `narrative_dismissed` - All acknowledged, narrative closed
- `narrative_monster_spawned` - Monster spawned by trigger
- `narrative_door_unlocked` - Door unlocked by trigger
- `narrative_hexes_revealed` - Hexes revealed by trigger

### Client to Server
- `acknowledge_narrative` - Player acknowledges current narrative

## Example: Trivial Training Campaign

The "Trivial Training" campaign includes example narratives demonstrating the system:

### Training Dummy - Part 1
- **Intro**: Welcome message from instructor
- **Trigger**: Encouragement at round 2
- **Victory**: First steps taken, reward and unlock part 2
- **Defeat**: Encouraging message to try again

### Training Dummy - Part 2
- **Intro**: Advanced challenge introduction
- **Trigger**: Halfway encouragement at round 3
- **Victory**: Campaign complete celebration
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

await prisma.narrativeTrigger.create({
  data: {
    narrativeId: narrative.id,
    triggerId: 'my-trigger',
    displayOrder: 1,
    title: 'Event!',
    text: 'Something happened...',
    conditions: { type: 'round_reached', params: { round: 2 } },
  },
});
```

### Via API (Future)
Narrative CRUD endpoints are planned for the creator role.

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
