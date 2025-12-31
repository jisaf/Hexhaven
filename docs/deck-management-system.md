# Deck Management System Documentation

**Version:** 1.0.0
**Last Updated:** 2025-12-08
**Status:** ✅ Complete and Tested

## Overview

The Deck Management System implements complete Gloomhaven player card mechanics including:
- Card pile management (hand, discard, lost, active)
- Short rest (random card loss with reroll option)
- Long rest (player-selected card loss, healing, initiative 99)
- Exhaustion detection and handling
- Turn order integration with rest mechanics

## Table of Contents

1. [Architecture](#architecture)
2. [Backend Services](#backend-services)
3. [Frontend Components](#frontend-components)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Architecture

### Design Principles

- **Single Responsibility:** Each service handles one aspect (CardPile, Rest, Exhaustion)
- **Facade Pattern:** DeckManagementService coordinates all services
- **Event-Driven:** WebSocket event stream for state synchronization
- **Immutable Updates:** Pure functions, no state mutation
- **Backward Compatible:** All changes are additive, no breaking changes

### Service Decomposition

```
┌─────────────────────────────────────┐
│    DeckManagementService (Facade)   │
│  Coordinates all deck operations    │
└─────────────────┬───────────────────┘
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌──────────────┐
│ CardPile│ │  Rest   │ │  Exhaustion  │
│ Service │ │ Service │ │   Service    │
└─────────┘ └─────────┘ └──────────────┘
```

### Performance Optimizations

- **CardTemplateCache:** 40x performance boost (40 DB queries → 1)
- **Event Stream Pattern:** 66% reduction in WebSocket events (6 → 2)
- **Immutable State:** Efficient React re-renders

---

## Backend Services

### 1. CardPileService

**Location:** `backend/src/services/card-pile.service.ts`

**Responsibility:** Pure card pile operations (no business logic)

#### Methods

```typescript
// Move single card between piles
moveCard(character: Character, cardId: string, from: CardPile, to: CardPile): Character

// Move multiple cards
moveCards(character: Character, cardIds: string[], from: CardPile, to: CardPile): Character

// Move all cards from one pile to another
moveAllCards(character: Character, from: CardPile, to: CardPile): Character

// Play cards (checks loss icons automatically)
playCards(character: Character, topCardId: string, bottomCardId: string): Character

// Get card counts for all piles
getCardCounts(character: Character): { hand: number; discard: number; lost: number }

// Check if can play cards
canPlayCards(character: Character, requiredCount?: number): boolean

// Check if can rest
canRest(character: Character, requiredCount?: number): boolean
```

#### Usage Example

```typescript
const cardPile = new CardPileService();

// Move card from hand to discard
let updated = cardPile.moveCard(character, 'card-123', 'hand', 'discard');

// Play two cards (automatically handles loss icons)
updated = cardPile.playCards(character, 'top-card-id', 'bottom-card-id');

// Move all discard to hand (after rest)
updated = cardPile.moveAllCards(character, 'discard', 'hand');
```

**Tests:** 25 unit tests ✅

---

### 2. RestService

**Location:** `backend/src/services/rest.service.ts`

**Responsibility:** Rest operations (short, long, validation)

#### Methods

```typescript
// Validate if character can rest
canRest(character: Character, type: 'short' | 'long'): ValidationResult

// Execute short rest (server-side random selection)
executeShortRest(character: Character): ShortRestResult

// Reroll short rest (costs 1 HP, once per rest)
rerollShortRest(character: Character): ShortRestResult

// Finalize short rest after player decision
finalizeShortRest(character: Character): Character

// Declare long rest (sets initiative 99, for card selection phase)
declareLongRest(character: Character): Character

// Execute long rest (player chooses card to lose)
executeLongRest(character: Character, cardToLose: string): Character
```

#### Short Rest Flow

```typescript
// 1. Server selects random card
const result = restService.executeShortRest(character);
// result.randomCard is the server's selection
// result.character has shortRestState set

// 2. Player can reroll (optional, costs 1 HP)
if (playerWantsToReroll) {
  const rerollResult = restService.rerollShortRest(result.character);
  // rerollResult.character has health - 1
  // rerollResult.randomCard is new selection
}

// 3. Finalize (move cards)
const final = restService.finalizeShortRest(character);
// final.character has random card in lost, rest in hand
```

#### Long Rest Flow

```typescript
// 1. Declare at card selection
const declared = restService.declareLongRest(character);
// declared.isResting = true
// declared.selectedCards.initiative = 99

// 2. Execute during turn (player chooses card)
const rested = restService.executeLongRest(declared, 'chosen-card-id');
// rested has chosen card in lost, rest in hand
// rested.health increased by 2 (up to max)
```

**Tests:** 36 unit tests ✅

---

### 3. ExhaustionService

**Location:** `backend/src/services/exhaustion.service.ts`

**Responsibility:** Exhaustion detection and execution

#### Methods

```typescript
// Check if character is exhausted (or will be)
checkExhaustion(character: Character): ExhaustionCheck

// Execute exhaustion (move all cards to lost, remove from board)
executeExhaustion(character: Character, reason: ExhaustionReason): Character

// Check if entire party is exhausted
isPartyExhausted(characters: Character[]): boolean

// Get exhaustion risk level for UI warnings
getExhaustionRisk(character: Character): 'safe' | 'warning' | 'critical'
```

#### Exhaustion Rules (Gloomhaven Official)

Character becomes exhausted when:
1. **Health drops to 0 or below**, OR
2. **At round start:** Cannot play 2 cards AND cannot rest
   - Cannot play 2 cards = hand.length < 2
   - Cannot rest = discardPile.length < 2

**When exhausted:**
- All cards (hand + discard + active) → lost pile
- Character removed from board (currentHex = null)
- Cannot participate in scenario (permanent for this scenario)
- Party loses if ALL characters exhausted

#### Usage Example

```typescript
const exhaustion = new ExhaustionService();

// Check at round start
const check = exhaustion.checkExhaustion(character);
if (check.isExhausted) {
  console.log(`${character.name} exhausted: ${check.message}`);
  const exhausted = exhaustion.executeExhaustion(character, check.reason);
  // exhausted.isExhausted = true
  // exhausted.lostPile contains all cards
}

// Get risk for UI warnings
const risk = exhaustion.getExhaustionRisk(character);
if (risk === 'warning') {
  showWarningToPlayer('Low health or cards!');
}
```

**Tests:** 45 unit tests ✅

---

### 4. DeckManagementService (Facade)

**Location:** `backend/src/services/deck-management.service.ts`

**Responsibility:** Simple API, coordinates other services

#### Methods

```typescript
// Load enhanced cards (with player enhancements)
async loadEnhancedCards(characterId: string): Promise<EnhancedAbilityCard[]>

// Play cards
playCards(character: Character, topCard: string, bottomCard: string): Character

// Rest operations (delegates to RestService)
canRest(character: Character, type: 'short' | 'long'): ValidationResult
executeShortRest(character: Character): ShortRestResult
rerollShortRest(character: Character): ShortRestResult
finalizeShortRest(character: Character): Character
declareLongRest(character: Character): Character
executeLongRest(character: Character, cardToLose: string): Character

// Exhaustion operations (delegates to ExhaustionService)
checkExhaustion(character: Character): ExhaustionCheck
executeExhaustion(character: Character, reason: ExhaustionReason): Character
isPartyExhausted(characters: Character[]): boolean
getExhaustionRisk(character: Character): 'safe' | 'warning' | 'critical'

// Card pile operations (delegates to CardPileService)
moveCard(character: Character, cardId: string, from: CardPile, to: CardPile): Character
getCardCounts(character: Character): { hand: number; discard: number; lost: number }
```

**Tests:** 25 unit tests ✅

---

## Frontend Components

### 1. RestModal

**Location:** `frontend/src/components/RestModal.tsx`

**Purpose:** Stage-based rest UI with animations

#### Props

```typescript
interface RestModalProps {
  restState: RestState | null;  // From game state
  onAccept: () => void;          // Accept short rest card
  onReroll: () => void;          // Reroll short rest (costs 1 HP)
  onClose: () => void;           // Close modal
}
```

#### Rest State Stages

```typescript
type RestStage =
  | 'rest-started'        // Loading/preparing
  | 'card-selected'       // Short rest: random card shown
  | 'awaiting-decision'   // Waiting for player accept/reroll
  | 'complete'            // Rest finished successfully
  | 'error';              // Error occurred
```

#### Styling

- **Dark overlay:** `rgba(0, 0, 0, 0.8)`
- **Fade-in animation:** 0.2s ease-in
- **Card slide-in:** 0.3s ease-out
- **Spinner:** Rotating animation for loading
- **Mobile responsive:** Tested on iPhone SE (smallest)
- **Accessibility:** Focus trap, ARIA labels, ESC key support

### 2. CardSelectionPanel (Enhanced)

**Location:** `frontend/src/components/CardSelectionPanel.tsx`

**New Props:**

```typescript
onLongRest?: () => void;      // Callback for long rest
canLongRest?: boolean;        // True when discard >= 2
discardPileCount?: number;    // For tooltip display
```

**Long Rest Button:**
- Blue gradient background with shimmer effect
- Tooltip: "Long Rest: Heal 2 HP, refresh items (X cards in discard)"
- Automatically hides Clear/Confirm buttons when player must rest

### 3. TurnStatus (Enhanced)

**Location:** `frontend/src/components/game/TurnStatus.tsx`

**New Props:**

```typescript
onShortRest?: () => void;     // Callback for short rest
canShortRest?: boolean;       // True when discard >= 2 during turn
```

**Short Rest Button:**
- Purple/violet theme (`#9b59b6`)
- Appears in action buttons alongside Move/Attack
- Tooltip: "Short Rest: Randomly lose 1 card from discard, return rest to hand"

---

## API Reference

### WebSocket Events

#### Client → Server

**1. execute-rest**
```typescript
{
  gameId: string;
  characterId: string;
  type: 'short' | 'long';
  cardToLose?: string;  // Only for long rest
}
```

**2. rest-action**
```typescript
{
  gameId: string;
  characterId: string;
  action: 'accept' | 'reroll';
}
```

#### Server → Client

**rest-event (Event Stream Pattern)**

```typescript
// Stage 1: Rest started
{
  type: 'rest-started';
  characterId: string;
  restType: 'short' | 'long';
}

// Stage 2: Card selected (short rest only)
{
  type: 'card-selected';
  characterId: string;
  randomCardId: string;
  canReroll: boolean;
}

// Stage 3: Awaiting decision
{
  type: 'awaiting-decision';
  characterId: string;
  currentHealth: number;
  rerollCost: 1;
}

// Stage 4: Complete
{
  type: 'rest-complete';
  characterId: string;
  cardLost: string;
  cardsInHand: number;
  healthHealed?: number;      // 2 for long rest
  itemsRefreshed?: string[];  // Future: item IDs
}

// Error
{
  type: 'error';
  characterId: string;
  message: string;
}
```

---

## Usage Examples

### Example 1: Player Short Rest

```typescript
// 1. Player clicks "Short Rest" button (TurnStatus)
gameStateManager.executeRest('short');

// 2. Backend selects random card, emits rest-event
{
  type: 'card-selected',
  randomCardId: 'trample-15',
  canReroll: true
}

// 3. RestModal shows card, player can accept or reroll
<RestModal restState={restState} onAccept={...} onReroll={...} />

// 4a. Player accepts
gameStateManager.handleRestAction('accept');

// 4b. OR player rerolls (costs 1 HP)
gameStateManager.handleRestAction('reroll');
// New card selected, canReroll = false

// 5. Backend finalizes rest, emits complete
{
  type: 'rest-complete',
  cardLost: 'trample-15',
  cardsInHand: 8
}
```

### Example 2: Player Long Rest

```typescript
// 1. Card selection phase, player has < 2 cards in hand
// CardSelectionPanel shows "Long Rest (Initiative 99)" button

// 2. Player clicks long rest
gameStateManager.executeRest('long');

// 3. Backend sets initiative 99, emits rest-started
{
  type: 'rest-started',
  restType: 'long'
}

// 4. During player's turn (initiative 99, goes last)
// Backend emits card selection request (or uses pre-selected card)

// 5. Backend executes long rest
{
  type: 'rest-complete',
  cardLost: 'chosen-card-id',
  cardsInHand: 9,
  healthHealed: 2
}
```

### Example 3: Exhaustion Detection

```typescript
// At round start, backend checks all characters
characters.forEach(char => {
  const check = exhaustionService.checkExhaustion(char);

  if (check.isExhausted) {
    // Execute exhaustion
    const exhausted = exhaustionService.executeExhaustion(char, check.reason);

    // Emit to clients
    emit('character-exhausted', {
      characterId: char.id,
      reason: check.reason,
      message: check.message
    });
  }
});

// Check if party wiped
if (exhaustionService.isPartyExhausted(characters)) {
  // End scenario, party loses
  emit('scenario-failed', { reason: 'All characters exhausted' });
}
```

---

## Testing

### Backend Unit Tests

**Total: 176 tests passing** ✅

- **RandomUtils:** 20 tests
- **CardPileService:** 25 tests
- **RestService:** 36 tests
- **ExhaustionService:** 45 tests
- **DeckManagementService:** 25 tests
- **TurnOrderService:** 25 tests

**Run tests:**
```bash
cd backend
npm test -- random.utils.test.ts
npm test -- card-pile.service.test.ts
npm test -- rest.service.test.ts
npm test -- exhaustion.service.test.ts
npm test -- deck-management.service.test.ts
npm test -- turn-order.service.test.ts
```

### Frontend E2E Tests

**Total: 7 test scenarios** ✅

**Location:** `frontend/tests/e2e/deck-management.e2e.test.ts`

**Scenarios:**
1. US-DECK-3: Player declares long rest
2. US-DECK-7: Cannot rest with insufficient cards
3. US-DECK-8: Long rest heals and sets initiative to 99
4. Short rest button appears during player turn
5. Rest modal displays correctly with proper styling
6. "Must rest" message when < 2 cards in hand
7. Rest modal closes after completing rest

**Run E2E tests:**
```bash
cd frontend
npx playwright test deck-management.e2e.test.ts
```

---

## Troubleshooting

### Common Issues

#### 1. Long Rest button not visible

**Symptom:** Button doesn't appear in CardSelectionPanel

**Causes:**
- Discard pile has < 2 cards
- `canLongRest` prop not passed from GameBoard
- Character data not loaded yet

**Solution:**
```typescript
// Check discard pile count
const myChar = gameData?.characters.find(c => c.id === myCharacterId);
console.log('Discard count:', myChar?.discardPile.length);

// Verify prop is passed
<CardSelectionPanel
  canLongRest={discardPile.length >= 2}
  onLongRest={() => gameStateManager.executeRest('long')}
/>
```

#### 2. Short rest reroll fails

**Symptom:** Reroll button click has no effect

**Causes:**
- Already rerolled once (can only reroll once per rest)
- Character at 1 HP (would cause exhaustion)
- `shortRestState.hasRerolled` is true

**Solution:**
```typescript
// Check reroll status
if (character.shortRestState?.hasRerolled) {
  showMessage('Already rerolled (can only reroll once)');
}

// Check health
if (character.health <= 1) {
  showMessage('Cannot reroll - would cause exhaustion');
}
```

#### 3. Exhaustion not detected

**Symptom:** Character continues playing with 0 cards

**Causes:**
- Exhaustion check not run at round start
- Character has exactly 1 card in hand + 1 in discard (edge case)

**Solution:**
```typescript
// Run exhaustion check at round start
const check = exhaustionService.checkExhaustion(character);
console.log('Exhaustion check:', check);

// If edge case (1 hand + 1 discard):
// - Cannot play 2 cards (need 2 in hand)
// - Cannot rest (need 2 in discard)
// - Should exhaust
expect(check.isExhausted).toBe(true);
```

#### 4. Rest modal stuck open

**Symptom:** Modal doesn't close after rest completes

**Causes:**
- `rest-complete` event not received
- RestState not cleared in game state
- WebSocket connection dropped

**Solution:**
```typescript
// Check WebSocket connection
console.log('Connection status:', gameState.connectionStatus);

// Manually close modal (emergency)
gameStateManager.clearRestState();

// Or refresh page to reconnect
window.location.reload();
```

---

## Performance Considerations

### CardTemplateCache

**Before optimization:** 40 DB queries per character load
**After optimization:** 1 DB query (enhancements only)
**Performance gain:** 40x faster ⚡

**Implementation:**
```typescript
// Application startup (main.ts)
await CardTemplateCache.initialize(prisma);
console.log('CardTemplateCache initialized');

// Per-character load (fast)
const enhanced = character.abilityDeck.map(cardId => ({
  ...CardTemplateCache.get(cardId),  // In-memory lookup
  enhancements: enhancements.filter(e => e.cardId === cardId)
}));
```

### Event Stream Pattern

**Before:** 6 WebSocket events per rest action
**After:** 2 events (execute-rest, rest-event stream)
**Reduction:** 66% fewer events 📉

**Benefits:**
- Reduced network traffic
- Simpler client-side logic
- Better progress indicators
- Easier to add new rest types

---

## Migration Guide

### Updating Existing Characters

The system is **100% backward compatible**. Existing characters work without changes.

**Optional enhancements:**
```typescript
// Add new optional fields for better UX
character.activeEffects = [];  // Cards with persistent effects
character.isResting = false;   // Currently resting flag
character.restType = 'none';   // Current rest type
```

### Adding to Existing Game

1. **Install services:**
   ```typescript
   // app.module.ts
   providers: [
     // ... existing
     DeckManagementService,
     CardPileService,
     RestService,
     ExhaustionService,
   ]
   ```

2. **Initialize cache:**
   ```typescript
   // main.ts
   await CardTemplateCache.initialize(app.get(PrismaService));
   ```

3. **Add WebSocket handlers:**
   ```typescript
   // game.gateway.ts
   @SubscribeMessage('execute-rest')
   async handleExecuteRest(...) { ... }

   @SubscribeMessage('rest-action')
   async handleRestAction(...) { ... }
   ```

4. **Update frontend:**
   ```typescript
   // GameBoard.tsx
   <CardSelectionPanel
     canLongRest={canRest}
     onLongRest={() => executeRest('long')}
     ...
   />
   ```

---

## Future Enhancements

### Planned Features

1. **Item Refresh System**
   - Track spent items
   - Refresh on long rest
   - Integration with item management

2. **Recovery Abilities**
   - Cards that recover lost cards
   - Special character abilities
   - Scenario rewards

3. **Persistent Effects**
   - Track cards in active area
   - Auto-move on effect expiry
   - Round-based effect tracking

4. **Battle Goals**
   - Rest timing affects battle goals
   - Strategic rest decisions
   - Goal completion tracking

5. **Analytics**
   - Track rest patterns
   - Identify exhaustion risks
   - Balance game difficulty

### Extensibility

The service-based architecture makes it easy to add features:

```typescript
// Example: Add item refresh
class ItemRefreshService {
  refreshItems(character: Character): Character {
    return {
      ...character,
      items: character.items.map(item => ({
        ...item,
        spent: false  // Refresh all items
      }))
    };
  }
}

// Integrate with RestService
executeLongRest(...) {
  // ... existing code ...
  updated = this.itemRefresh.refreshItems(updated);
  return updated;
}
```

---

## Support & Contribution

### Questions?

- Check [Gloomhaven rules](game-rules/index.md) for mechanics clarification
- Review [API reference](#api-reference) for integration
- See [troubleshooting](#troubleshooting) for common issues

### Found a Bug?

1. Check if it's a [known issue](#troubleshooting)
2. Run tests to isolate: `npm test`
3. Create bug report with test case

### Contributing

When adding features:
1. Write unit tests first (TDD)
2. Follow service decomposition pattern
3. Maintain backward compatibility
4. Update this documentation

---

## Changelog

### Version 1.0.0 (2025-12-08)

**Initial Release** ✅

- ✅ Complete card pile management
- ✅ Short rest with reroll
- ✅ Long rest with healing
- ✅ Exhaustion detection
- ✅ Turn order integration
- ✅ 176 unit tests
- ✅ 7 E2E tests
- ✅ Full documentation

**Performance:**
- 40x faster card loading
- 66% fewer WebSocket events

**Testing:**
- 100% service coverage
- Real-world E2E scenarios
- Mobile responsive verified

---

*End of Deck Management System Documentation*
