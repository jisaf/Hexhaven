# Card Action System Documentation

## Overview

The Card Action System is a unified, type-safe framework for handling all Gloomhaven card actions and effects. It replaces legacy string-based effects with structured, validated modifiers that are easy to extend and test.

## Architecture

### Core Components

1. **Modifiers System** (`backend/src/types/modifiers.ts`)
   - Type-safe definitions for all action modifiers
   - Structured effect representation instead of strings
   - Helper functions for modifier validation and extraction

2. **Action Dispatcher** (`backend/src/services/action-dispatcher.service.ts`)
   - Central service for applying actions
   - Validates actions before application
   - Handles action-specific logic (movement, attacks, healing)

3. **Condition Service** (`backend/src/services/condition.service.ts`)
   - Manages status condition application and removal
   - Tracks condition duration and expiration
   - Provides condition categorization and queries

4. **Forced Movement Service** (`backend/src/services/forced-movement.service.ts`)
   - Handles push and pull mechanics
   - Validates movement paths
   - Applies terrain effects (traps, hazardous terrain)

## Action Types

### 1. Attack Action

**Purpose**: Deal damage to a target

**Example**:
```json
{
  "type": "attack",
  "value": 3,
  "modifiers": [
    { "type": "range", "distance": 4 },
    { "type": "pierce", "value": 1 },
    { "type": "condition", "condition": "poison", "duration": "round" }
  ]
}
```

**Valid Modifiers**:
- `range` - Increase attack range in hexes
- `pierce` - Ignore X shield value
- `target` - Hit multiple targets
- `aoe` - Area of effect attack
- `condition` - Apply condition to target
- `push` / `pull` - Force movement
- `xp` - Award experience

**Validation Rules**:
- Attacker must not be DISARM or STUN
- Target must be in range
- Target must have line of sight (corner-to-corner)

### 2. Move Action

**Purpose**: Move character to a new location

**Example**:
```json
{
  "type": "move",
  "value": 3,
  "modifiers": [
    { "type": "jump" },
    { "type": "condition", "condition": "invisible", "duration": "round" }
  ]
}
```

**Valid Modifiers**:
- `jump` - Ignore obstacles and enemies
- `teleport` - Direct placement instead of pathfinding
- `condition` - Apply condition
- `push` / `pull` - Not typically used with move

**Validation Rules**:
- Character must not be IMMOBILIZE or STUN
- Path must be clear (except with jump modifier)
- Movement must not exceed movement value

### 3. Heal Action

**Purpose**: Restore health to self or target

**Example**:
```json
{
  "type": "heal",
  "value": 2,
  "modifiers": [
    { "type": "range", "distance": 2 },
    { "type": "consume", "element": "light", "bonus": { "effect": "heal", "value": 2 } }
  ]
}
```

**Valid Modifiers**:
- `range` - Heal target at range
- `consume` - Get bonus heal by consuming element
- `condition` - Apply condition (rare, healing negative effects)

**Validation Rules**:
- Target must be in range if specified
- Cannot overheal target (cap at max health)

### 4. Loot Action

**Purpose**: Collect money and treasure tokens

**Example**:
```json
{
  "type": "loot",
  "value": 2
}
```

**Valid Modifiers**:
- `range` - Collect loot at range

### 5. Special Action

**Purpose**: Apply effects without primary action (shield, retaliate, etc.)

**Example**:
```json
{
  "type": "special",
  "modifiers": [
    { "type": "shield", "value": 2, "duration": "persistent" },
    { "type": "retaliate", "value": 1, "duration": "round" }
  ]
}
```

**Valid Modifiers**:
- `shield` - Reduce damage taken
- `retaliate` - Damage on incoming attacks
- `condition` - Apply condition to self
- `infuse` - Generate element
- Any defensive modifier

### 6. Summon Action

**Purpose**: Spawn allies with their own stats and abilities

**Example**:
```json
{
  "type": "summon",
  "modifiers": [
    { "type": "lost" },
    { "type": "xp", "value": 2 }
  ],
  "summon": {
    "name": "Mystic Ally",
    "health": 4,
    "attack": 2,
    "move": 3,
    "range": 2,
    "typeIcon": "🔮",
    "modifiers": [
      { "type": "push", "distance": 1 }
    ]
  }
}
```

**Valid Modifiers**:
- `lost` - Card is consumed
- `xp` - Experience for summoning
- Summon entities have their own modifiers

### 7. Text Action

**Purpose**: Flavor text and rules clarification

**Example**:
```json
{
  "type": "text",
  "title": "Infused Weapon",
  "description": "Your attacks gain the generated element",
  "quote": "Fire must be met with fire"
}
```

## Modifiers Reference

### Attack Modifiers

#### Range
Extends attack distance in hexes.
```json
{ "type": "range", "distance": 4 }
```

#### Target
Allows hitting multiple separate targets.
```json
{ "type": "target", "count": 2 }
```

#### Pierce
Ignore X shield value.
```json
{ "type": "pierce", "value": 2 }
```

#### Area of Effect
Attack multiple enemies in pattern.
```json
{ "type": "aoe", "pattern": "triangle", "size": 2 }
```

### Movement Modifiers

#### Jump
Ignore obstacles, enemies, and traps when moving.
```json
{ "type": "jump" }
```

#### Teleport
Place directly instead of pathfinding.
```json
{ "type": "teleport", "range": 6 }
```

### Forced Movement

#### Push
Force target away from attacker.
```json
{ "type": "push", "distance": 1, "direction": "away" }
```

#### Pull
Force target toward attacker.
```json
{ "type": "pull", "distance": 2 }
```

### Element Modifiers

#### Infuse
Generate element for future use.
```json
{ "type": "infuse", "element": "fire", "state": "generate" }
```

**States**:
- `generate` - Element available immediately
- `generate-after` - Element available next turn

**Elements**: fire, ice, air, earth, light, dark

#### Consume
Use element for bonus effect.
```json
{ "type": "consume", "element": "light", "bonus": { "effect": "heal", "value": 2 } }
```

### Condition Modifiers

#### Condition
Apply status effect to target.
```json
{ "type": "condition", "condition": "stun", "duration": "round" }
```

**Duration Types**:
- `round` - Lasts until end of next turn
- `persistent` - Lasts until card is lost
- `until-consumed` - Lasts until healed/cured

**Available Conditions**:

Negative:
- `poison` - +1 damage to attacks suffered
- `wound` - 1 damage at start of turn
- `muddle` - Disadvantage on attacks
- `immobilize` - Cannot move
- `disarm` - Cannot attack
- `stun` - Lose next turn
- `curse` - -2 card in modifier deck
- `brittle` - Next attack deals double damage
- `bane` - 10 damage at turn start, heal 2, remove

Positive:
- `strengthen` - Advantage on attacks
- `bless` - +2 card in modifier deck
- `regenerate` - Heal 1 at turn start
- `ward` - Next damage halved
- `invisible` - Cannot be targeted

### Card State Modifiers

#### Lost (Burn)
Card goes to lost pile after use.
```json
{ "type": "lost" }
```

#### Recover
Return cards from lost pile to hand.
```json
{ "type": "recover", "cardCount": 2 }
```

#### Discard
Return cards from lost pile to discard.
```json
{ "type": "discard", "cardCount": 1 }
```

### Special Modifiers

#### Shield
Reduce damage taken for duration.
```json
{ "type": "shield", "value": 2, "duration": "round" }
```

#### Retaliate
Deal damage to attackers in range.
```json
{ "type": "retaliate", "value": 2, "range": 1, "duration": "persistent" }
```

#### Heal
Restore health with modifiers.
```json
{ "type": "heal", "value": 3, "range": 2, "target": "allies" }
```

#### XP
Award experience points.
```json
{ "type": "xp", "value": 2 }
```

## Condition System

### Applying Conditions

```typescript
await conditionService.applyCondition(
  target,
  Condition.POISON,
  'until-consumed',
  { source: 'trap', intensity: 'high' }
);
```

### Checking Conditions

```typescript
// Check single condition
if (conditionService.hasCondition(character, Condition.STUN)) {
  // Cannot act
}

// Get all conditions
const conditions = conditionService.getConditions(character);

// Get negative conditions (debuffs)
const debuffs = conditionService.getNegativeConditions(character);

// Check if incapacitated
if (conditionService.isIncapacitated(character)) {
  // Cannot move or attack
}
```

### Expiring Conditions

Round-based conditions expire automatically:

```typescript
// At end of round
const expiredConditions = await conditionService.expireRoundBasedConditions(
  character,
  currentRound
);
```

### Consuming Conditions

Some conditions can be consumed (e.g., by healing):

```typescript
await conditionService.consumeCondition(character, Condition.POISON);
```

## Applying Actions

### Basic Usage

```typescript
const action: AttackAction = {
  type: 'attack',
  value: 3,
  modifiers: [
    { type: 'range', distance: 2 },
    { type: 'condition', condition: Condition.POISON, duration: 'round' }
  ]
};

const result = await dispatcher.applyAction(
  action,
  sourceCharacter,
  targetId,
  gameId
);

if (result.success) {
  console.log('Action applied!');
  console.log('Affected entities:', result.affectedEntities);
  console.log('Applied modifiers:', result.appliedModifiers);
} else {
  console.log('Action failed');
  console.log('Failed modifiers:', result.failedModifiers);
}
```

### Action Result Structure

```typescript
interface EffectApplicationResult {
  success: boolean;
  appliedModifiers: Modifier[];
  failedModifiers?: { modifier: Modifier; reason: string }[];
  affectedEntities?: string[]; // Entity IDs affected
}
```

## Validation

All actions are validated before application:

### Attack Validation
- Attacker must not be DISARM or STUN
- Target must be in range
- Target must have line of sight

### Move Validation
- Character must not be IMMOBILIZE or STUN
- Path must be clear (unless jump modifier)
- Distance must not exceed movement value

### Heal Validation
- Target must be in range if specified
- Cannot overheal target

## Card Data Format

### Old Format (Deprecated)
```json
{
  "effects": ["Push 1", "Stun"],
  "elementGenerate": "fire",
  "elementBonus": { "effect": "Heal", "value": 2 }
}
```

### New Format (Current)
```json
{
  "modifiers": [
    { "type": "push", "distance": 1 },
    { "type": "condition", "condition": "stun", "duration": "round" },
    { "type": "infuse", "element": "fire", "state": "generate" },
    { "type": "consume", "element": "fire", "bonus": { "effect": "heal", "value": 2 } }
  ]
}
```

## Migration Guide

To update existing card data from string-based effects to typed modifiers:

1. **Push/Pull Effects**
   - `"Push 1"` → `{ "type": "push", "distance": 1 }`
   - `"Pull 2"` → `{ "type": "pull", "distance": 2 }`

2. **Conditions**
   - `"Stun"` → `{ "type": "condition", "condition": "stun", "duration": "round" }`
   - `"Poison"` → `{ "type": "condition", "condition": "poison", "duration": "until-consumed" }`

3. **Shields & Retaliate**
   - `"Shield 2"` → `{ "type": "shield", "value": 2, "duration": "round" }`
   - `"Retaliate 1"` → `{ "type": "retaliate", "value": 1, "duration": "persistent" }`

4. **Elements**
   - `"elementGenerate": "fire"` → `{ "type": "infuse", "element": "fire", "state": "generate" }`
   - `"elementConsume": "light"` → `{ "type": "consume", "element": "light", "bonus": {...} }`

## Testing

Comprehensive test suites are provided:

- `backend/tests/action-dispatcher.spec.ts` - Action application tests
- `backend/tests/condition.service.spec.ts` - Condition management tests
- `backend/tests/forced-movement.service.spec.ts` - Movement mechanics tests

Run tests:
```bash
npm run test:backend
```

## Future Extensions

The modular design supports future additions:

1. **Advanced Modifiers** (Phase 3-4)
   - `brittle`, `bane` conditions
   - `curse`, `bless` modifier deck effects
   - Advanced AoE patterns

2. **Element Interactions** (Phase 3-4)
   - Element decay system
   - Element combination effects
   - Element-based passive abilities

3. **Custom Effects** (Phase 4+)
   - Extensible effect handler system
   - Custom modifier types per character class
   - Dynamic ability effects

## Element System

The element system allows cards to generate and consume elemental energy for bonus effects.

### Element States

Elements cycle through three states:

```
INERT → STRONG → WANING → INERT
```

| State | Description | Consumable |
|-------|-------------|------------|
| `INERT` | No elemental energy present | No |
| `STRONG` | Freshly generated, full power | Yes |
| `WANING` | Decaying, still usable | Yes |

### Element Types

Six elements are available:
- `fire` - Offensive, damage bonuses
- `ice` - Defensive, immobilize effects
- `air` - Movement, evasion bonuses
- `earth` - Durability, obstacle manipulation
- `light` - Healing, positive effects
- `dark` - Stealth, negative conditions

### Element Lifecycle

#### Generation (Infuse)

When a card with an `infuse` modifier is played:

```typescript
// Element becomes STRONG immediately
elementalState[element] = ElementState.STRONG;

// WebSocket event emitted
server.emit('elemental_state_updated', { roomCode, elementalState });
```

**Infuse Modifier**:
```json
{ "type": "infuse", "element": "fire", "state": "generate" }
```

The `state` field can be:
- `generate` - Element available immediately after action
- `generate-after` - Element available at end of turn (rare)

#### Consumption (Consume)

When a card with a `consume` modifier is played and the element is available:

```typescript
// Check if element is consumable (STRONG or WANING)
if (elementalState[element] !== ElementState.INERT) {
  // Apply bonus effect
  applyBonus(consume.bonus);

  // Element returns to INERT
  elementalState[element] = ElementState.INERT;
}
```

**Consume Modifier**:
```json
{
  "type": "consume",
  "element": "light",
  "bonus": { "effect": "heal", "value": 2 }
}
```

**Bonus Effect Types**:
- `damage` - Add value to attack damage
- `heal` - Add value to healing
- `move` - Add value to movement
- `range` - Add value to range
- `custom` - Special effect (see card description)

#### Decay

At the end of each round, all elements decay one step:

```typescript
function decayElements(elementalState: ElementalInfusion): void {
  for (const element of Object.keys(elementalState)) {
    if (elementalState[element] === ElementState.STRONG) {
      elementalState[element] = ElementState.WANING;
    } else if (elementalState[element] === ElementState.WANING) {
      elementalState[element] = ElementState.INERT;
    }
  }
}
```

**Decay Timeline**:
| Round | Action | Fire State |
|-------|--------|------------|
| 1 | Player generates Fire | STRONG |
| 1 (end) | Round ends, decay | WANING |
| 2 | Element still available | WANING |
| 2 (end) | Round ends, decay | INERT |
| 3 | Element no longer available | INERT |

### Element Integration Example

```typescript
// In attack handler (game.gateway.ts)

// 1. Check for element consumption before damage
const consumeModifiers = getConsumeModifiers(attackModifiers);
for (const consume of consumeModifiers) {
  const elementState = roomElementalState.get(roomCode);
  if (elementState && elementState[consume.element] !== ElementState.INERT) {
    // Apply bonus
    if (consume.bonus.effect === 'damage') {
      damage += consume.bonus.value;
    }
    // Consume the element
    elementState[consume.element] = ElementState.INERT;
  }
}

// 2. Apply damage...

// 3. Generate elements after attack
const infuseModifiers = getInfuseModifiers(attackModifiers);
for (const infuse of infuseModifiers) {
  elementState[infuse.element] = ElementState.STRONG;
}

// 4. Emit updated state
server.emit('elemental_state_updated', { roomCode, elementalState });
```

## Experience (XP) System

Characters earn experience points during scenarios for performing certain actions.

### XP Sources

1. **Card Actions** - Some cards grant XP when used
2. **Kill Bonuses** - Some cards grant XP when killing enemies (via `xpOnKill`)
3. **Scenario Completion** - Base XP for completing objectives

### XP Modifier

Cards can include an XP modifier:

```json
{
  "type": "attack",
  "value": 3,
  "modifiers": [
    { "type": "xp", "value": 2 }
  ]
}
```

### XP Tracking

Experience is tracked per-character during the scenario:

```typescript
// Character model
class Character {
  private _experience: number = 0;

  get experience(): number {
    return this._experience;
  }

  addExperience(amount: number): number {
    if (amount < 0) {
      throw new Error('Experience amount must be non-negative');
    }
    this._experience += amount;
    return this._experience;
  }
}
```

### XP Award Flow

When an action with XP modifier is executed:

```typescript
// In attack handler
const xpValue = getXPValue(attackModifiers);
if (xpValue > 0) {
  character.addExperience(xpValue);

  // Notify clients
  server.emit('xp_awarded', {
    characterId: character.id,
    amount: xpValue,
    total: character.experience,
  });
}
```

### Helper Function

```typescript
import { getXPValue } from '../../../shared/types/modifiers';

// Returns XP value from modifiers, or 0 if none
const xp = getXPValue(action.modifiers);
```

## Card Recovery & Discard System

Managing card piles is central to Gloomhaven gameplay. The `CardPileService` handles all pile operations.

### Card Piles

Each character has three card piles:

| Pile | Description | Recovery |
|------|-------------|----------|
| `hand` | Cards available to play | - |
| `discardPile` | Used cards, recoverable | Short/Long rest |
| `lostPile` | Burned cards, limited recovery | Special abilities only |

### Pile Operations

#### Moving Cards Between Piles

```typescript
// Move single card
const updated = cardPileService.moveCard(
  character,
  'card-id',
  'hand',      // from
  'discard'    // to
);

// Move multiple cards
const updated = cardPileService.moveCards(
  character,
  ['card-1', 'card-2'],
  'discard',
  'hand'
);
```

#### Playing Cards

When two cards are selected for a round:

```typescript
const updated = cardPileService.playCards(
  character,
  topCardId,
  bottomCardId,
  topHasLoss,    // true if top action has loss icon
  bottomHasLoss  // true if bottom action has loss icon
);
```

Cards with `lost` modifier go to `lostPile`, others go to `discardPile`.

### Recovery Mechanics

#### Recover Cards (Lost → Hand)

Used by cards with "Recover X" effect:

```typescript
// Recover specific cards
const updated = cardPileService.recoverCards(
  character,
  ['card-1', 'card-2']  // specific card IDs
);

// Recover N random cards
const updated = cardPileService.recoverCards(
  character,
  undefined,  // no specific cards
  2           // recover 2 cards
);
```

**Recover Modifier**:
```json
{ "type": "recover", "cardCount": 2 }
```

#### Return to Discard (Lost → Discard)

Less powerful recovery, returns lost cards to discard pile:

```typescript
const updated = cardPileService.returnCardsToDiscard(
  character,
  ['card-1'],  // specific cards, or undefined
  1            // count if random
);
```

**Discard Modifier**:
```json
{ "type": "discard", "cardCount": 1 }
```

#### Discard from Hand

Used when taking damage (discard 2 cards to negate):

```typescript
const updated = cardPileService.discardFromHand(
  character,
  ['card-1', 'card-2']
);
```

#### Lose from Hand

Used for damage mitigation (lose 1 card to negate):

```typescript
const updated = cardPileService.loseFromHand(
  character,
  ['card-1']
);
```

### Rest Mechanics

#### Short Rest

Automatic recovery with random card loss:

```typescript
// Execute short rest
const { character: rested, randomCard } = restService.executeShortRest(character);

// Player can reroll once (loses 1 HP)
const rerolled = restService.rerollShortRest(rested);

// Finalize rest
const final = restService.finalizeShortRest(rerolled);
```

#### Long Rest

Player chooses which card to lose, heals 2 HP:

```typescript
// Declare intent (affects initiative to 99)
const declared = restService.declareLongRest(character);

// Execute at end of round
const rested = restService.executeLongRest(declared, 'card-to-lose');
```

### Card Count Queries

```typescript
const counts = cardPileService.getCardCounts(character);
// { hand: 5, discard: 3, lost: 2, total: 10 }

const canPlay = cardPileService.canPlayCards(character, 2);
// true if hand.length >= 2

const canRest = cardPileService.canRest(character, 2);
// true if discardPile.length >= 2
```

### Exhaustion

Characters become exhausted when they cannot continue:

```typescript
const check = exhaustionService.checkExhaustion(character);
// { isExhausted: true/false, reason: 'damage' | 'insufficient_cards' }

if (check.isExhausted) {
  const exhausted = exhaustionService.executeExhaustion(character, check.reason);
  // Character removed from play, all cards to lost pile
}
```

**Exhaustion Triggers**:
- Health reaches 0 (damage)
- Cannot play 2 cards and cannot rest (insufficient_cards)

## Testing

### Test File Locations

```
backend/tests/
├── unit/
│   ├── card-pile.service.test.ts      # Card pile operations
│   ├── rest.service.test.ts           # Rest mechanics
│   ├── exhaustion.service.test.ts     # Exhaustion detection
│   ├── deck-management.service.test.ts # Deck facade
│   ├── elemental-state.test.ts        # Element system
│   ├── damage-calculation.test.ts     # Damage computation
│   └── condition.service.test.ts      # Condition management (if exists)
├── contract/
│   ├── attack-target.test.ts          # Attack action contract
│   ├── move-character.test.ts         # Move action contract
│   └── select-cards.test.ts           # Card selection contract
└── integration/
    └── game-flow.test.ts              # Full game flow
```

### Running Tests

```bash
# All tests
npm run test:backend

# Specific test file
npm test -- card-pile.service.test.ts

# With coverage
npm test -- --coverage
```

## Performance Considerations

- Condition checking is O(n) where n is conditions on entity (typically < 5)
- Action validation is O(1) for most actions
- Pathfinding for movement is O(n log n) using A* algorithm
- Terrain effect application is O(1) per hex
- Element state lookup is O(1) per element

## Common Patterns

### Chain Attacks with Conditions
```json
{
  "type": "attack",
  "value": 2,
  "modifiers": [
    { "type": "target", "count": 2 },
    { "type": "condition", "condition": "wound", "duration": "round" },
    { "type": "push", "distance": 1 }
  ]
}
```

### Defensive Special Action
```json
{
  "type": "special",
  "modifiers": [
    { "type": "shield", "value": 3, "duration": "persistent" },
    { "type": "retaliate", "value": 1, "range": 1, "duration": "round" }
  ]
}
```

### Elemental Healing
```json
{
  "type": "heal",
  "value": 2,
  "modifiers": [
    { "type": "range", "distance": 3 },
    { "type": "infuse", "element": "light", "state": "generate" },
    { "type": "consume", "element": "light", "bonus": { "effect": "heal", "value": 3 } }
  ]
}
```

## Troubleshooting

### Condition Not Applying
- Check character's condition set is initialized
- Verify duration parameter is valid
- Check condition type is in Condition enum

### Action Validation Failing
- Check attacker/defender conditions
- Verify range and line of sight
- Ensure movement path is clear (unless jump)

### Modifier Not Working
- Confirm modifier is in appliedModifiers list
- Check modifier type matches expected handler
- Verify modifier parameters are valid

## See Also

- [Game Rules](./game-rules.md)
- [Character System](./character-system.md)
- [Element System](./element-system.md)
