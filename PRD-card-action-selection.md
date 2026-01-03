# PRD: Card Action Selection System

**Issues:** #411, #412
**Status:** Draft
**Breaking Changes:** Yes - This is a breaking change to core gameplay mechanics

## Overview

Redesign the card selection and action execution system to align with Gloomhaven's actual gameplay mechanics. Players will select two cards during the card selection phase without committing to top/bottom actions. During their turn, they'll choose which card's top action and which card's bottom action to execute, along with selecting which card determines initiative.

## Problem Statement

Currently, the game forces players to commit to top/bottom actions during card selection, which is inconsistent with Gloomhaven rules and limits tactical flexibility. Players also cannot:
- Choose which card determines their initiative
- Execute non-move, non-attack actions (heal, shield, summon, etc.)
- Make tactical decisions about action order during their turn

The existing Move/Attack button system is rigid and doesn't support the full range of card abilities, making cards with special abilities (heal, summon, shield) unusable.

## Goals & Success Metrics

### Primary Goals
1. Enable true Gloomhaven-style card play with flexible top/bottom selection during player turns
2. Support all card action types (move, attack, heal, shield, summon, special, etc.)
3. Allow players to select which card determines initiative
4. Maintain or improve the current user experience quality

### Success Metrics
- All card action types can be executed successfully
- Players can complete full turns using only card actions (no Move/Attack buttons needed)
- Initiative selection works correctly and determines turn order
- Card selection flow feels intuitive and responsive
- Test coverage maintains >80% for new components

### What Does "Done" Look Like?
- Players select 2 cards and initiative during card selection phase
- During their turn, players see their 2 selected cards with clickable top/bottom sections
- Players can execute any card action type (move, attack, heal, shield, summon, special)
- Move and Attack buttons are removed entirely
- All existing E2E tests updated and passing
- New E2E tests cover the new card action flow

## User Stories

### Card Selection Phase
**As a player**, I want to select 2 cards from my hand without committing to top/bottom actions, so that I can make tactical decisions during my turn.

**As a player**, I want to select which of my 2 cards determines my initiative, so that I can control my position in turn order.

### Turn Execution Phase
**As a player on my turn**, I want to see my 2 selected cards displayed prominently, so that I can choose which actions to take.

**As a player on my turn**, I want to click the top or bottom section of either card as my first action, so that I can execute that action.

**As a player who has taken my first action**, I want to click the opposite section of my other card as my second action, so that I can complete my turn.

**As a player**, I want to execute heal, shield, summon, and other special abilities from my cards, so that I can use my full character abilities.

**As a player**, I want to long-press a card to see it enlarged, so that I can read the details while deciding which action to take.

**As a player**, I want to cancel my action selection if I haven't started executing that action yet, so that I can change my mind and choose a different action.

## Requirements

### Functional Requirements

#### Card Selection Phase (FR-CS)
- **FR-CS-1**: Players select 2 cards from their hand without designating top/bottom
- **FR-CS-2**: Players select which of the 2 cards determines initiative (before confirming)
- **FR-CS-3**: Initiative selection is stored and used for turn order determination
- **FR-CS-4**: UI clearly indicates which card is selected for initiative
- **FR-CS-5**: Players can change initiative selection before confirming
- **FR-CS-6**: After confirmation, selectedCards includes: topCardId, bottomCardId, initiativeCardId (or just the initiative value)

#### Turn Execution Phase (FR-TE)
- **FR-TE-1**: When a character's turn starts, display their 2 selected cards side-by-side
- **FR-TE-2**: Each card shows both top and bottom actions as distinct clickable regions
- **FR-TE-3**: On first action, player can click any of 4 options (top/bottom of either card)
- **FR-TE-4**: After first action, only the opposite section of the other card is clickable
- **FR-TE-5**: Cards use long-press to show enlarged view (reuse existing CardPiles pattern)
- **FR-TE-6**: Visual feedback shows which action was taken (greyed out, disabled, or removed)
- **FR-TE-7**: Move and Attack buttons are completely removed from the UI
- **FR-TE-8**: Player can cancel an action selection any time before the second tap confirms execution. Once confirmed, action executes immediately and cannot be undone

#### Action Execution (FR-AE)
- **FR-AE-1**: System supports all CardAction types: move, attack, heal, loot, special, summon, text
- **FR-AE-2**: Move actions allow hex selection and movement (existing behavior)
- **FR-AE-3**: Attack actions allow target selection and attack execution (existing behavior)
- **FR-AE-4**: Heal actions allow target selection (self or ally) and heal execution
- **FR-AE-5**: Shield actions apply shield value to character for the round
- **FR-AE-6**: Summon actions trigger summon placement flow
- **FR-AE-7**: Special actions display description and apply effects as configured
- **FR-AE-8**: After both actions are taken, End Turn button becomes available
- **FR-AE-9**: Cards move to appropriate pile immediately after each action executes (not at end of turn):
  - Lost actions → lost pile
  - Non-lost actions → discard pile
  - Round bonus actions → active area (until end of round, then to appropriate pile)
- **FR-AE-10**: Stat bonuses from cards apply only after action execution, not after card selection

#### Backend State Management (FR-BE)
- **FR-BE-1**: Character state tracks selectedCards: { topCardId, bottomCardId, initiative }
- **FR-BE-2**: During turn, track which actions have been used (topUsed, bottomUsed, which card each came from)
- **FR-BE-3**: Validate that first action is one of 4 options, second action is the opposite section of the other card
- **FR-BE-4**: New WebSocket event: `use_card_action` with payload: { cardId, position: 'top' | 'bottom', targetId?, targetHex? }
- **FR-BE-5**: Turn order calculation uses the initiative value from selectedCards

### Non-Functional Requirements

#### Performance (NFR-P)
- **NFR-P-1**: Card action selection response time < 100ms
- **NFR-P-2**: Card rendering supports smooth animations for action selection
- **NFR-P-3**: Long-press enlarge renders within 200ms

#### Usability (NFR-U)
- **NFR-U-1**: Cards clearly show top/bottom action boundaries with subtle highlight borders
- **NFR-U-2**: Disabled/used actions are visually distinct from available actions
- **NFR-U-3**: Initiative selection is visually clear and intuitive
- **NFR-U-4**: Mobile and desktop experiences are both fully functional
- **NFR-U-5**: Touch and mouse interactions both supported for all actions
- **NFR-U-6**: Click-to-confirm paradigm: first tap highlights/selects action, second tap confirms execution
- **NFR-U-7**: Entire card half (top or bottom) is clickable, not just small action regions

#### Accessibility (NFR-A)
- **NFR-A-1**: Keyboard navigation supports full card action selection flow
- **NFR-A-2**: Screen readers can identify clickable card regions
- **NFR-A-3**: Visual indicators don't rely solely on color

#### Testing (NFR-T)
- **NFR-T-1**: Unit test coverage >80% for new components and services
- **NFR-T-2**: E2E tests cover full card selection and action execution flow
- **NFR-T-3**: Contract tests updated for new WebSocket events

## Technical Approach

### Reuse Opportunities

#### Existing Components to Leverage
1. **CardSelectionPanel.tsx** - Core structure for displaying cards
   - Location: `/home/ubuntu/hexhaven/frontend/src/components/CardSelectionPanel.tsx`
   - Reuse: Card grid layout, selection state management, confirm/clear buttons
   - Adapt: Remove top/bottom commitment, add initiative selection UI

2. **AbilityCard2.tsx** - Card rendering component
   - Currently used in CardSelectionPanel
   - Reuse: Card visualization, long-press behavior
   - Adapt: Add clickable top/bottom regions, visual state for used/available actions

3. **CardPiles Pattern** - Long-press to enlarge
   - Already implemented for deck management
   - Reuse: Long-press gesture detection, modal enlarge view
   - Adapt: Apply to turn phase card display

4. **WebSocket Event Pattern** (shared/types/events.ts)
   - Existing: `SelectCardsPayload`, `UseAbilityPayload`
   - Reuse: Event structure and typing patterns
   - Adapt: Create new `UseCardActionPayload` event

5. **Action Dispatcher Service** (backend/src/services/action-dispatcher.service.ts)
   - Handles ability execution routing
   - Reuse: Action type routing, validation patterns
   - Adapt: Extend to handle all CardAction types from cards

#### Existing Backend Services
1. **AbilityCardService** (backend/src/services/ability-card.service.ts)
   - Provides card data by ID
   - Reuse: Card retrieval, validation of card ownership

2. **TurnOrderService** (backend/src/services/turn-order.service.ts)
   - Calculates turn order from initiatives
   - Reuse: Turn order calculation logic
   - Adapt: Read initiative from selectedCards.initiative

3. **Character Model** (backend/src/models/character.model.ts)
   - Existing fields: `activeCards`, `selectedCards` (in events.ts)
   - Reuse: selectedCards structure
   - Adapt: Ensure initiative is stored in selectedCards

### New Development Needed

#### Frontend Components

1. **InitiativeSelector Component** (NEW)
   - Purpose: Allow player to select which card determines initiative
   - Location: `frontend/src/components/InitiativeSelector.tsx`
   - Props: `topCard: AbilityCard`, `bottomCard: AbilityCard`, `selectedInitiative: 'top' | 'bottom'`, `onChange: (value) => void`
   - Renders: Two options showing card names and initiative values, radio/toggle selection

2. **TurnActionPanel Component** (NEW)
   - Purpose: Display 2 selected cards during turn with clickable actions
   - Location: `frontend/src/components/TurnActionPanel.tsx`
   - Props: `topCard: AbilityCard`, `bottomCard: AbilityCard`, `onActionSelect: (cardId, position) => void`, `usedActions: { cardId, position }[]`
   - Renders: Two cards side-by-side, with clickable top/bottom regions
   - Behavior: Long-press to enlarge, click to execute action, disable used actions

3. **CardActionRegion Component** (NEW)
   - Purpose: Clickable top or bottom section of a card
   - Location: `frontend/src/components/CardActionRegion.tsx`
   - Props: `action: CardAction`, `position: 'top' | 'bottom'`, `disabled: boolean`, `onClick: () => void`
   - Renders: Action icon/description, visual affordance for clickability
   - States: Available (clickable), Used (greyed), Disabled (not clickable yet)

#### Frontend State Updates

1. **Card Selection State**
   - Add: `selectedInitiativeCard: 'top' | 'bottom' | null`
   - Track which card player chose for initiative

2. **Turn State**
   - Add: `selectedCardsForTurn: { topCard: AbilityCard, bottomCard: AbilityCard }`
   - Add: `usedActions: Array<{ cardId: string, position: 'top' | 'bottom' }>`
   - Track which card actions have been used this turn

#### Backend Changes

1. **New WebSocket Event: `use_card_action`**
   - Payload: `{ characterId: string, cardId: string, position: 'top' | 'bottom', targetId?: string, targetHex?: AxialCoordinates }`
   - Handler: Validate action is available, execute action, track usage, emit result

2. **Update `SelectCardsPayload`**
   - Add field: `initiativeCardId: string` (which card determines initiative)
   - Or store derived: `initiative: number` (the actual initiative value to use)

3. **Character Turn State**
   - Track per-turn: `currentTurnActions: { firstAction?: { cardId, position }, secondAction?: { cardId, position } }`
   - Validate action sequence rules (first action = any of 4, second = opposite of other card)

4. **Action Execution Router**
   - Extend ActionDispatcherService to route all CardAction types
   - Map: move → movement service, attack → combat service, heal → new heal handler, shield → condition service, summon → summon service

5. **Card Action Handlers** (NEW services as needed)
   - HealActionHandler: Apply heal value to target character
   - ShieldActionHandler: Apply shield condition for round
   - SpecialActionHandler: Display text, apply modifiers as configured

#### Database/State Schema

No database schema changes needed. Character state already has `selectedCards` field in events.ts:

```typescript
selectedCards?: {
  topCardId: string;
  bottomCardId: string;
  initiative: number; // The initiative value to use (from selected card)
}
```

This will be populated during card selection phase.

#### Testing Strategy

1. **Unit Tests**
   - InitiativeSelector: Initiative selection changes, visual states
   - TurnActionPanel: Action click handling, disable logic, long-press
   - CardActionRegion: Click events, disabled states
   - Backend: use_card_action validation, action sequence rules

2. **Integration Tests**
   - Card selection → initiative selection → confirmation flow
   - Turn start → display cards → action execution → end turn flow
   - Each action type execution (move, attack, heal, shield, summon, special)

3. **E2E Tests**
   - Full round: select cards with initiative → turn executes → actions work → turn ends
   - All action types: Verify heal, shield, summon, special actions work end-to-end
   - Multi-character: Initiative selection affects turn order correctly

4. **Contract Tests**
   - Update: `select_cards.test.ts` to include initiative selection
   - New: `use_card_action.test.ts` for action execution event

### Architecture Considerations

#### State Flow
```
Card Selection Phase:
User selects 2 cards → User selects initiative card → Confirm
  ↓
Backend stores: selectedCards { topCardId, bottomCardId, initiative }
  ↓
Turn order calculated using initiative value

Turn Execution Phase:
Turn starts → Frontend displays 2 cards with clickable regions
  ↓
User clicks card action (cardId + position)
  ↓
Backend validates, executes action, tracks usage
  ↓
User clicks opposite action on other card
  ↓
Backend validates, executes, marks turn actions complete
  ↓
End Turn available
```

#### Component Hierarchy
```
GamePage
├── CardSelectionPanel (existing, modified)
│   ├── AbilityCard2 (existing, adapted)
│   ├── InitiativeSelector (NEW)
│   └── Confirm/Clear buttons
│
└── TurnActionPanel (NEW, replaces ActionButtons)
    ├── CardActionRegion (NEW) for top card top action
    ├── CardActionRegion (NEW) for top card bottom action
    ├── CardActionRegion (NEW) for bottom card top action
    └── CardActionRegion (NEW) for bottom card bottom action
```

#### Event Flow
```
Client Events:
- select_cards (MODIFIED): Add initiativeCardId or derived initiative
- use_card_action (NEW): Execute card action during turn

Server Events:
- cards_selected (EXISTING): Confirms selection
- turn_started (EXISTING): Signals turn start
- card_action_executed (NEW): Confirms action execution, updates state
- turn_complete (EXISTING): Signals turn end
```

## Out of Scope

The following are explicitly NOT covered by this PRD:

1. **Card Enhancement System** - Stickers/enhancements to cards (separate feature)
2. **Attack Modifier Deck UI** - Improvements to modifier card display (separate feature)
3. **Rest Mechanics Changes** - Short/long rest behavior (covered by existing implementation)
4. **Multi-target Attack UI** - Advanced targeting for multi-target attacks (can be follow-up)
5. **Elemental Infusion UI** - Visual improvements to element consumption/generation (can be follow-up)
6. **Card Ability Tooltips** - Detailed hover explanations of modifiers (can be follow-up)
7. **Animation Polish** - Advanced animations for card actions (can be follow-up)
8. **Undo Action** - Ability to undo a selected card action (not in Gloomhaven rules)

## Design Decisions (Resolved)

1. **Visual Design**: Subtle highlight border for clickable regions. Use a click-to-confirm paradigm since there's no hover on mobile - first tap selects/highlights the action, second tap confirms it.

2. **Initiative Tie-breaking**: Show cards in order selected (first selected card shown first in selector).

3. **Lost Action Behavior**: Flash the lost icon prominently after first tap (selection). No confirmation dialog needed - if user taps again, action executes. If they cancel before confirming, that's a valid cancel.

4. **Mobile Touch Targets**: Minimum 44x44px touch targets, but make the entire card half (top or bottom) clickable for ease of use rather than just small action regions.

5. **Card Order Display**: First selected card appears in top/left position.

6. **Error Recovery**: On reconnect, restore turn state showing which actions are still available.

7. **Tap vs Long-Press Interaction**: Long-press enlarges card for viewing. Quick tap selects/highlights action. Second tap confirms and executes the action.

8. **Action Cancellation**: Player can cancel at any time before confirming (second tap). Once confirmed, the action executes immediately and cannot be undone.

9. **Self-Heal Targeting**: Range 0 actions (target self) are valid options unless the card specifically says "ally" or is an offensive action. Self-targeting still requires the tap-to-confirm flow.

10. **Card Movement Timing**: Per Gloomhaven rules, cards are placed in discard/lost pile immediately after each action is performed (not at end of turn). If action has lost symbol, goes to lost pile. Round bonus cards stay in active area until end of round.

11. **Stat Bonus Timing**: Character stat bonuses from cards only apply AFTER the action is executed, not after card selection. Example: +1 Attack bonus card must be played (executed) before the attack action. +1 Shield for round only applies after that card action is executed. This also applies to monster ability bonuses.

## Dependencies

### Internal Dependencies
1. **Summon System** (Issue #228) - Already implemented, needed for summon actions
2. **Action Dispatcher Service** - Already exists, needs extension for new action types
3. **Long-Press Behavior** - Already implemented in CardPiles, needs application to TurnActionPanel
4. **WebSocket Infrastructure** - Existing, needs new event types

### External Dependencies
None - This is entirely internal to the game system

### Blocking Dependencies
None - All required systems are already in place

## Implementation Notes

### Phase 1: Backend Foundation
1. Add `initiativeCardId` or derived `initiative` to SelectCardsPayload
2. Create `use_card_action` WebSocket event and handler
3. Implement action validation logic (4 options → 1 remaining option)
4. Extend ActionDispatcherService for all CardAction types
5. Update turn order calculation to use selectedCards.initiative

### Phase 2: Frontend Card Selection
1. Create InitiativeSelector component
2. Update CardSelectionPanel to include initiative selection
3. Update select_cards emission to include initiative
4. Add visual feedback for initiative selection

### Phase 3: Frontend Turn Execution
1. Create CardActionRegion component
2. Create TurnActionPanel component
3. Wire up use_card_action event emission
4. Remove ActionButtons (Move/Attack buttons)
5. Implement long-press to enlarge for turn cards

### Phase 4: Action Execution
1. Implement heal action handler
2. Implement shield action handler
3. Implement special action handler
4. Test all action types end-to-end

### Phase 5: Testing & Polish
1. Update all E2E tests for new flow
2. Add contract tests for use_card_action
3. Visual polish and UX refinements
4. Performance testing and optimization

## Acceptance Criteria

- [ ] During card selection, player can select 2 cards and choose which determines initiative
- [ ] Initiative selection is stored and affects turn order correctly
- [ ] During player's turn, 2 selected cards are displayed side-by-side
- [ ] Each card has clickable top and bottom regions
- [ ] First action: All 4 regions (top/bottom of both cards) are clickable
- [ ] After first action: Only opposite region of other card is clickable
- [ ] Player can cancel action selection any time before second tap confirms
- [ ] First tap selects/highlights action, second tap confirms and executes
- [ ] Long-press on card enlarges it without selecting action
- [ ] Move actions execute successfully (hex selection, movement)
- [ ] Attack actions execute successfully (target selection, damage)
- [ ] Heal actions execute successfully (target selection, healing)
- [ ] Shield actions execute successfully (shield applied)
- [ ] Summon actions execute successfully (summon placement)
- [ ] Special actions execute successfully (effects applied)
- [ ] Lost actions move cards to lost pile immediately after execution
- [ ] Non-lost actions move cards to discard pile immediately after execution
- [ ] Round bonus actions stay in active area until end of round
- [ ] Stat bonuses from cards apply after action execution, not after selection
- [ ] Move and Attack buttons are removed from UI
- [ ] Long-press on cards shows enlarged view
- [ ] All existing E2E tests updated and passing
- [ ] New E2E tests cover full card action flow
- [ ] Test coverage >80% for new code
- [ ] Mobile and desktop both fully functional
- [ ] No console errors or warnings during gameplay

---

**Document Version:** 1.0
**Last Updated:** 2025-12-31
**Author:** Claude (PRD Architect Agent)
**Reviewers:** [To be assigned]
