# Objective System Guide

Comprehensive guide to creating and managing objectives in Hexhaven Multiplayer.

## Table of Contents

1. [Overview](#overview)
2. [Template-Based Objectives](#template-based-objectives)
3. [Custom JavaScript Objectives](#custom-javascript-objectives)
4. [Progress Tracking](#progress-tracking)
5. [Rewards System](#rewards-system)
6. [Scenario Integration](#scenario-integration)
7. [Testing Objectives](#testing-objectives)

---

## Overview

### What Are Objectives?

Objectives are goals that players must complete during a scenario. They determine when a game ends and whether players win or lose. Hexhaven supports three types of objectives:

- **Primary Objectives**: Required for victory (e.g., "Kill all monsters")
- **Secondary Objectives**: Optional bonus objectives (e.g., "Complete in 8 rounds or less")
- **Failure Conditions**: Conditions that cause immediate defeat (e.g., "NPC dies")

### Why Objectives Matter

Objectives provide:
- Clear win/loss conditions for scenarios
- Variety in gameplay (not just "kill everything")
- Progress feedback to players
- Bonus rewards for skilled play
- Framework for complex scenario design

### How Objectives Affect Game Completion

The game checks objectives:
- After every turn
- At the end of each round
- When significant events occur (monster death, character exhaustion)

Victory occurs when the primary objective is complete.
Defeat occurs when all players are exhausted OR a failure condition triggers.

---

## Template-Based Objectives

Templates are pre-built objective types with standard evaluation logic. They're the easiest way to create objectives.

### 1. kill_all_monsters

**Purpose**: Victory when all monsters on the board are dead.

**Required Parameters**: None

**Progress Tracking**: Automatically tracks dead monsters / total monsters

**Example JSON**:
```json
{
  "id": "primary-1",
  "type": "kill_all_monsters",
  "description": "Defeat all enemies",
  "trackProgress": true
}
```

**Use Cases**:
- Standard combat scenarios
- Wave defense scenarios
- Boss battles (when combined with other objectives)

---

### 2. kill_monster_type

**Purpose**: Victory when all monsters of specific type(s) are dead.

**Required Parameters**:
- `monsterType` (string): Single monster type to eliminate
- OR `monsterTypes` (string[]): Multiple monster types to eliminate

**Progress Tracking**: Tracks dead target monsters / total target monsters

**Example JSON**:
```json
{
  "id": "primary-1",
  "type": "kill_monster_type",
  "description": "Eliminate all Bandit Guards",
  "params": {
    "monsterType": "Bandit Guard"
  },
  "trackProgress": true
}
```

**Multiple Types Example**:
```json
{
  "id": "secondary-1",
  "type": "kill_monster_type",
  "description": "Defeat all undead enemies",
  "params": {
    "monsterTypes": ["Living Bones", "Corpse", "Zombie"]
  },
  "trackProgress": true
}
```

**Use Cases**:
- "Kill the boss" scenarios
- "Eliminate specific threat" objectives
- "Clear undead" or other type-specific goals

---

### 3. kill_boss

**Purpose**: Victory when a specific boss monster dies. Tracks boss health.

**Required Parameters**:
- `monsterType` (string): The boss monster type

**Progress Tracking**: Shows boss health remaining (percentage-based)

**Example JSON**:
```json
{
  "id": "primary-1",
  "type": "kill_boss",
  "description": "Defeat the Inox Shaman",
  "params": {
    "monsterType": "Inox Shaman"
  },
  "trackProgress": true,
  "milestones": [25, 50, 75]
}
```

**Use Cases**:
- Boss fight scenarios
- Mini-boss encounters
- Named enemy elimination

**Special Behavior**: Progress shows boss health depletion (0% to 100%)

---

### 4. survive_rounds

**Purpose**: Victory when players survive for N rounds without exhaustion.

**Required Parameters**:
- `rounds` (number): Number of rounds to survive

**Progress Tracking**: Current round / target rounds

**Example JSON**:
```json
{
  "id": "primary-1",
  "type": "survive_rounds",
  "description": "Survive for 6 rounds",
  "params": {
    "rounds": 6
  },
  "trackProgress": true
}
```

**Use Cases**:
- Survival scenarios
- Escape sequences
- Hold-the-line battles

**Special Behavior**: Objective fails if any character dies or exhausts

---

### 5. collect_loot

**Purpose**: Victory when N loot tokens are collected.

**Required Parameters**:
- `target` (number): Number of loot tokens to collect

**Progress Tracking**: Loot collected / target loot

**Example JSON**:
```json
{
  "id": "primary-1",
  "type": "collect_loot",
  "description": "Collect 5 loot tokens",
  "params": {
    "target": 5
  },
  "trackProgress": true
}
```

**Use Cases**:
- Treasure hunt scenarios
- Resource gathering missions
- Bonus objectives for greedy players

---

### 6. reach_location

**Purpose**: Victory when character(s) reach specific hex position(s).

**Required Parameters**:
- `location` (AxialCoordinates): Single target location
- OR `locations` (AxialCoordinates[]): Multiple valid locations

**Optional Parameters**:
- `requireAll` (boolean): Do all characters need to reach? Default: false

**Progress Tracking**: Characters at location / total required

**Example JSON (One Character)**:
```json
{
  "id": "primary-1",
  "type": "reach_location",
  "description": "Reach the exit",
  "params": {
    "locations": [
      { "q": 5, "r": 5 },
      { "q": 5, "r": 6 }
    ],
    "requireAll": false
  },
  "trackProgress": true
}
```

**Example JSON (All Characters)**:
```json
{
  "id": "primary-1",
  "type": "reach_location",
  "description": "All characters reach the extraction point",
  "params": {
    "location": { "q": 10, "r": 10 },
    "requireAll": true
  },
  "trackProgress": true
}
```

**Use Cases**:
- Escape scenarios
- Exploration missions
- "Reach the goal" objectives

---

### 7. protect_npc

**Purpose**: Victory when NPC survives for N rounds. (Future feature)

**Required Parameters**:
- `npcId` (string): ID of the NPC to protect
- `rounds` (number): Number of rounds NPC must survive

**Progress Tracking**: Rounds survived / target rounds, NPC health

**Example JSON**:
```json
{
  "id": "primary-1",
  "type": "protect_npc",
  "description": "Protect the merchant for 5 rounds",
  "params": {
    "npcId": "merchant-1",
    "rounds": 5
  },
  "trackProgress": true
}
```

**Use Cases**:
- Escort missions
- VIP protection
- Defense scenarios

**Special Behavior**: Objective fails if NPC dies

---

### 8. time_limit

**Purpose**: Failure condition if N rounds pass without completing primary objective.

**Required Parameters**:
- `rounds` (number): Maximum number of rounds allowed

**Progress Tracking**: Current round / max rounds (countdown)

**Example JSON (Failure Condition)**:
```json
{
  "objectives": {
    "primary": {
      "id": "primary-1",
      "type": "kill_all_monsters",
      "description": "Defeat all enemies"
    },
    "failureConditions": [
      {
        "id": "fail-1",
        "type": "time_limit",
        "description": "Time limit exceeded",
        "params": {
          "rounds": 10
        },
        "trackProgress": true
      }
    ]
  }
}
```

**Use Cases**:
- Timed challenges
- Urgency mechanics
- Preventing stalemate

**Special Behavior**: Typically used as a failure condition, not primary objective

---

### 9. no_damage

**Purpose**: Bonus objective for completing scenario without taking damage.

**Required Parameters**: None

**Progress Tracking**: Characters at full health / total characters

**Example JSON**:
```json
{
  "id": "secondary-1",
  "type": "no_damage",
  "description": "Complete without taking damage",
  "trackProgress": false,
  "rewards": {
    "experience": 5,
    "gold": 10
  }
}
```

**Use Cases**:
- Perfect victory conditions
- Skill-based challenges
- Bonus rewards

**Special Behavior**: Fails permanently if any character takes damage (tracked in accumulated stats)

---

### 10. minimum_health

**Purpose**: Objective requiring all characters stay above a health threshold.

**Required Parameters**:
- `healthPercent` (number): Minimum health percentage (0-100)

**Progress Tracking**: Characters above threshold / total characters

**Example JSON**:
```json
{
  "id": "secondary-1",
  "type": "minimum_health",
  "description": "Keep all characters above 50% health",
  "params": {
    "healthPercent": 50
  },
  "trackProgress": true
}
```

**Use Cases**:
- Partial no-damage conditions
- Risk management challenges
- Healing-focused objectives

---

### 11. collect_treasure

**Purpose**: Victory when specific treasure(s) are collected.

**Required Parameters**:
- `treasureIds` (string[]): Specific treasure IDs to collect
- OR `target` (number): Number of any treasures to collect

**Progress Tracking**: Treasures collected / target treasures

**Example JSON (Specific Treasures)**:
```json
{
  "id": "primary-1",
  "type": "collect_treasure",
  "description": "Collect the ancient artifact",
  "params": {
    "treasureIds": ["treasure-artifact-1"]
  },
  "trackProgress": true
}
```

**Example JSON (Any Treasures)**:
```json
{
  "id": "secondary-1",
  "type": "collect_treasure",
  "description": "Loot 3 treasure chests",
  "params": {
    "target": 3
  },
  "trackProgress": true
}
```

**Use Cases**:
- MacGuffin quests
- Treasure hunting
- Multi-objective scenarios

---

### 12. escape

**Purpose**: Victory when all living characters reach exit location(s).

**Required Parameters**:
- `location` (AxialCoordinates): Single exit location
- OR `locations` (AxialCoordinates[]): Multiple valid exits

**Progress Tracking**: Characters escaped / total living characters

**Example JSON**:
```json
{
  "id": "primary-1",
  "type": "escape",
  "description": "Escape through the portal",
  "params": {
    "locations": [
      { "q": 0, "r": 0 },
      { "q": 0, "r": 1 }
    ]
  },
  "trackProgress": true
}
```

**Use Cases**:
- Escape scenarios
- Evacuation missions
- "Get out alive" objectives

**Special Behavior**: Only counts living (non-exhausted) characters

---

## Custom JavaScript Objectives

For scenarios that need unique logic, you can write custom JavaScript functions.

### How Custom Functions Work

Custom objectives execute sandboxed JavaScript code with access to game state through a `context` object. The function must return either:
- A boolean (true = complete, false = incomplete)
- An ObjectiveResult object with progress data

### Security Restrictions

For security, the following patterns are **forbidden**:

```javascript
// FORBIDDEN PATTERNS (will be rejected)
require()           // Module imports
import()            // Dynamic imports
process.            // Process access
global.             // Global scope
eval()              // Code evaluation
Function()          // Function constructor
fs.                 // File system
child_process       // Process spawning
while(true)         // Infinite loops
for(;;)             // Infinite loops
setTimeout          // Async timers
async/await         // Async operations
fetch()             // Network requests
.prototype          // Prototype manipulation
Object.defineProperty // Property manipulation
```

**Why These Are Blocked**: To prevent malicious code, resource exhaustion, and escape from sandbox.

### Available Context Variables

Your custom function receives a `context` object with:

```typescript
context = {
  // All characters in the game
  characters: [
    {
      id: string,
      playerId: string,
      classType: string,
      health: number,
      maxHealth: number,
      position: { q: number, r: number },
      conditions: string[],
      inventory: { gold: number, items: string[] },
      isExhausted: boolean,
      isDead: boolean
    }
  ],

  // All monsters (including dead ones)
  monsters: [
    {
      id: string,
      type: string,
      health: number,
      maxHealth: number,
      position: { q: number, r: number },
      isDead: boolean,
      isElite: boolean,
      conditions: string[]
    }
  ],

  // NPCs (future feature)
  npcs: [],

  // Board state
  board: {
    lootTokens: [
      {
        id: string,
        position: { q: number, r: number },
        value: number,
        isCollected: boolean,
        collectedBy: string | null
      }
    ],
    treasures: [
      {
        id: string,
        position: { q: number, r: number },
        isCollected: boolean,
        collectedBy: string | null
      }
    ],
    specialLocations: [
      {
        type: string,
        position: { q: number, r: number },
        data: object
      }
    ],
    bounds: {
      minQ: number,
      maxQ: number,
      minR: number,
      maxR: number
    }
  },

  // Game state
  game: {
    currentRound: number,
    turnCount: number,
    elementsActive: {
      fire: 'inert' | 'waning' | 'strong',
      ice: 'inert' | 'waning' | 'strong',
      // ... other elements
    },
    difficulty: number,
    scenarioId: string,
    roomId: string
  },

  // Progress for all objectives (keyed by objective ID)
  progress: {
    'objective-id': {
      current: number,
      target: number,
      percent: number,
      milestonesReached: number[],
      details: object
    }
  },

  // Accumulated statistics
  accumulated: {
    totalMonstersKilled: number,
    totalDamageDealt: number,
    totalDamageTaken: number,
    totalLootCollected: number,
    totalGoldCollected: number,
    roundsCompleted: number,
    charactersExhausted: number,
    characterDeaths: number
  }
}
```

### Custom Objective Examples

#### Example 1: Kill Boss Before Round 5

```json
{
  "id": "primary-1",
  "type": "custom",
  "description": "Defeat the boss before round 5",
  "customFunction": "const boss = context.monsters.find(m => m.type === 'Ancient Drake'); if (!boss) return false; return boss.isDead && context.game.currentRound < 5;",
  "trackProgress": false
}
```

#### Example 2: Protect Specific Character

```json
{
  "id": "secondary-1",
  "type": "custom",
  "description": "Keep the Brute alive throughout the scenario",
  "customFunction": "const brute = context.characters.find(c => c.classType === 'Brute'); if (!brute) return false; return !brute.isDead && !brute.isExhausted;",
  "trackProgress": false
}
```

#### Example 3: Collect Loot at Specific Location

```json
{
  "id": "primary-1",
  "type": "custom",
  "description": "Collect the loot at the shrine",
  "customFunction": "const shrineLoot = context.board.lootTokens.find(t => t.position.q === 5 && t.position.r === 5); return shrineLoot && shrineLoot.isCollected;",
  "trackProgress": false
}
```

#### Example 4: All Characters Use Elements

```json
{
  "id": "secondary-1",
  "type": "custom",
  "description": "Use each element at least once",
  "customFunction": "const elements = context.game.elementsActive; const usedCount = [elements.fire, elements.ice, elements.air, elements.earth, elements.light, elements.dark].filter(state => state !== 'inert').length; return usedCount === 6;",
  "trackProgress": false
}
```

#### Example 5: Complex Objective with Progress

```json
{
  "id": "primary-1",
  "type": "custom",
  "description": "Kill 10 monsters and collect 5 loot",
  "customFunction": "const monstersKilled = context.accumulated.totalMonstersKilled; const lootCollected = context.accumulated.totalLootCollected; const complete = monstersKilled >= 10 && lootCollected >= 5; const totalProgress = (monstersKilled / 10) * 50 + (lootCollected / 5) * 50; return { complete, progress: { current: Math.floor(totalProgress), target: 100, percent: Math.floor(totalProgress), milestonesReached: [25, 50, 75, 100].filter(m => totalProgress >= m) } };",
  "trackProgress": true
}
```

### Best Practices for Custom Objectives

1. **Keep it Simple**: Complex logic is harder to debug and slower to execute
2. **Use Null Checks**: Always check if entities exist before accessing properties
3. **Return Early**: Exit as soon as you know the result
4. **Avoid Math.random()**: Results must be deterministic
5. **Test Thoroughly**: Custom code can have edge cases
6. **Document Intent**: Use clear descriptions
7. **Prefer Templates**: Only use custom when necessary

### Debugging Tips

**Problem**: Custom function always returns false
- Check for typos in monster/character names
- Verify entity IDs match what's in the scenario
- Add console logging (in development): `console.log(context.monsters)`

**Problem**: Custom function causes errors
- Check for missing null checks
- Verify JSON syntax is valid
- Look for forbidden patterns in error message

**Problem**: Progress not showing
- Ensure `trackProgress: true` is set
- Return an ObjectiveResult object with progress field
- Check progress calculations for divide-by-zero

---

## Progress Tracking

### How to Enable Progress Tracking

Set `trackProgress: true` in the objective definition:

```json
{
  "id": "primary-1",
  "type": "kill_all_monsters",
  "description": "Defeat all enemies",
  "trackProgress": true
}
```

### Progress Display Format

Progress shows as: **"Current / Target"** (e.g., "3 / 5 monsters killed")

Backend sends `objective_progress` WebSocket events when progress changes.

### Milestone Notifications

Milestones trigger at specific percentages (25%, 50%, 75%, 100%).

Define custom milestones:

```json
{
  "id": "primary-1",
  "type": "kill_boss",
  "description": "Defeat the boss",
  "params": {
    "monsterType": "Dragon"
  },
  "trackProgress": true,
  "milestones": [
    { "percent": 25, "message": "The dragon roars in anger!" },
    { "percent": 50, "message": "The dragon's scales crack!" },
    { "percent": 75, "message": "The dragon falters!" },
    { "percent": 100, "message": "The dragon falls!" }
  ]
}
```

Default milestones (if not specified): `[25, 50, 75, 100]`

---

## Rewards System

### Primary vs Secondary Objectives

- **Primary Objective**: Required for victory. Rewards are part of base scenario completion.
- **Secondary Objectives**: Optional. Provide bonus rewards.

### Reward Configuration

Add rewards to any objective:

```json
{
  "id": "secondary-1",
  "type": "no_damage",
  "description": "Complete without taking damage",
  "rewards": {
    "experience": 5,
    "gold": 10,
    "items": ["item-potion-healing"],
    "unlocks": ["scenario-8"]
  }
}
```

**Reward Fields**:
- `experience` (number): Bonus XP
- `gold` (number): Bonus gold
- `items` (string[]): Item IDs to grant
- `unlocks` (string[]): Scenario or character unlocks

### Experience and Gold Bonuses

Base rewards are calculated from scenario completion. Secondary objective rewards stack on top.

Example:
- Base scenario completion: 10 XP, 20 gold
- Secondary objective 1: +5 XP, +10 gold
- Secondary objective 2: +3 XP, +5 gold
- **Total**: 18 XP, 35 gold

---

## Scenario Integration

### How to Add Objectives to scenarios.json

Edit `/backend/src/data/scenarios.json`:

```json
{
  "scenarios": [
    {
      "id": "scenario-1",
      "name": "Black Barrow",
      "difficulty": 1,
      "objectives": {
        "primary": {
          "id": "primary-1",
          "type": "kill_all_monsters",
          "description": "Defeat all enemies",
          "trackProgress": true
        },
        "secondary": [
          {
            "id": "secondary-1",
            "type": "collect_treasure",
            "description": "Loot the treasure chest",
            "params": {
              "target": 1
            },
            "trackProgress": true,
            "rewards": {
              "gold": 10
            }
          }
        ]
      },
      "mapLayout": [...],
      "monsterGroups": [...]
    }
  ]
}
```

### How to Add Objectives to Database Scenarios

Use Prisma migrations:

```typescript
await prisma.scenario.update({
  where: { id: 'scenario-1' },
  data: {
    objectives: {
      primary: {
        id: 'primary-1',
        type: 'kill_all_monsters',
        description: 'Defeat all enemies',
        trackProgress: true
      },
      secondary: []
    }
  }
});
```

Or use the seed script:

```typescript
// backend/prisma/seed.ts
const scenarios = [
  {
    name: 'Black Barrow',
    difficulty: 1,
    objectives: {
      primary: {
        id: 'primary-1',
        type: 'kill_all_monsters',
        description: 'Defeat all enemies',
        trackProgress: true
      },
      secondary: []
    },
    // ... rest of scenario
  }
];
```

### Migration Guide for Existing Scenarios

See [scenario-migration-guide.md](./scenario-migration-guide.md) for detailed instructions.

---

## Testing Objectives

### How to Test Objectives

1. **Create Test Scenario**: Add scenario to scenarios.json with your objective
2. **Start Game**: Create game room and select scenario
3. **Trigger Conditions**: Perform actions that satisfy/fail the objective
4. **Verify Events**: Check WebSocket events in browser DevTools
5. **Check Completion**: Verify victory/defeat modal appears correctly

### Common Pitfalls

**Pitfall**: Objective never completes
- **Fix**: Check entity IDs/types match scenario definition
- **Fix**: Verify progress calculations are correct

**Pitfall**: Progress shows wrong values
- **Fix**: Check current/target calculations in template
- **Fix**: Ensure trackProgress is enabled

**Pitfall**: Custom function throws errors
- **Fix**: Add null checks for all entities
- **Fix**: Avoid forbidden patterns (see security section)

**Pitfall**: Multiple objectives conflict
- **Fix**: Ensure primary can be completed independently
- **Fix**: Test edge cases (e.g., last monster dies while collecting loot)

### Troubleshooting

**Problem**: Objectives don't load
- Check JSON syntax in scenario definition
- Verify scenario exists in database/scenarios.json
- Look for errors in backend logs

**Problem**: Progress not updating
- Verify WebSocket connection is active
- Check that evaluation happens after game events
- Ensure trackProgress is enabled

**Problem**: Wrong victory/defeat
- Review failure condition logic
- Check priority: failure conditions > primary objective > secondary
- Verify exhaustion/death handling

---

## Complete Example Scenario

Here's a full scenario with multiple objective types:

```json
{
  "id": "scenario-complex",
  "name": "The Rescue Mission",
  "difficulty": 3,
  "objectives": {
    "primary": {
      "id": "primary-1",
      "type": "reach_location",
      "description": "Reach the prisoner's cell",
      "params": {
        "location": { "q": 10, "r": 10 },
        "requireAll": false
      },
      "trackProgress": true
    },
    "secondary": [
      {
        "id": "secondary-1",
        "type": "kill_monster_type",
        "description": "Defeat all guards",
        "params": {
          "monsterType": "Prison Guard"
        },
        "trackProgress": true,
        "rewards": {
          "experience": 5,
          "gold": 15
        }
      },
      {
        "id": "secondary-2",
        "type": "time_limit",
        "description": "Complete within 8 rounds",
        "params": {
          "rounds": 8
        },
        "trackProgress": true,
        "rewards": {
          "experience": 3
        }
      },
      {
        "id": "secondary-3",
        "type": "no_damage",
        "description": "Complete without taking damage",
        "trackProgress": false,
        "rewards": {
          "gold": 20
        }
      }
    ],
    "failureConditions": [
      {
        "id": "fail-1",
        "type": "custom",
        "description": "Alarm triggered",
        "customFunction": "const guards = context.monsters.filter(m => m.type === 'Prison Guard'); const guardsSeeingPlayers = guards.filter(g => !g.isDead && context.characters.some(c => Math.abs(g.position.q - c.position.q) <= 3 && Math.abs(g.position.r - c.position.r) <= 3)); return guardsSeeingPlayers.length >= 3;"
      }
    ]
  },
  "mapLayout": [...],
  "monsterGroups": [...]
}
```

This scenario demonstrates:
- Primary objective (reach location)
- Multiple secondary objectives (combat, speed, perfection)
- Custom failure condition (stealth mechanic)
- Progress tracking on some objectives
- Varied reward structures

---

## Summary

Objectives in Hexhaven provide:
- 12 template types for common scenarios
- Custom JavaScript for unique mechanics
- Progress tracking with milestones
- Flexible reward system
- Secure sandboxed evaluation
- Easy JSON-based configuration

For questions or advanced scenarios, consult:
- [game-completion-system.md](./game-completion-system.md) - System architecture
- [scenario-migration-guide.md](./scenario-migration-guide.md) - Migrating old scenarios
- [api-reference.md](./api-reference.md) - API documentation

---

**Last Updated**: 2025-12-07
**Version**: 1.0.0 (Issue #186 - Game Completion System)
