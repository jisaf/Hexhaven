# God Object Technical Assessment

## Executive Summary

The Hexhaven codebase has two significant "God Object" anti-pattern violations that are impacting maintainability, testability, and developer velocity. This document provides a comprehensive survey of the issues and evaluates three approaches to resolution.

---

## Issue Survey

### Related GitHub Issues

| Issue | Status | Title | Priority |
|-------|--------|-------|----------|
| #365 | OPEN | Refactor: Extract services from GameGateway (God Object anti-pattern) | High |
| #434 | OPEN | Technical Debt: Refactor game.gateway.ts and game-state.service.ts | High |
| #355 | CLOSED | GameGateway class has too many responsibilities (SRP violation) | Major |
| #386 | OPEN | Code Quality: Minor improvements from PR #384 review | Low |
| #378 | OPEN | Code Quality: Minor improvements from PR #348 review | Low |

### Primary God Objects Identified

#### 1. Backend: `GameGateway` (`backend/src/websocket/game.gateway.ts`)

**Metrics:**
- **Lines of Code:** 6,945
- **Map-based State Stores:** 42
- **WebSocket Handlers:** 18+
- **Estimated Methods:** 460+

**Responsibilities (violating SRP):**
1. WebSocket connection lifecycle management
2. Room creation and player management
3. Player authentication and session tracking
4. Character selection and initialization
5. Scenario selection and map loading
6. Turn order management and game phases
7. Character movement with pathfinding
8. Combat resolution (player attacks, monster attacks)
9. Monster AI coordination and activation
10. Summon management and AI
11. Loot token spawning and collection
12. Elemental infusion state tracking
13. Objective progress tracking and evaluation
14. Narrative trigger evaluation and firing
15. Rest action handling (short/long rest)
16. Item usage and equipment management
17. Game logging and statistics
18. Victory/defeat scenario handling

**State Stores (partial list):**
```typescript
socketToPlayer, playerToSocket          // Connection mapping
roomNarratives                          // Narrative state
characterModifierDecks, monsterModifierDeck, allyModifierDeck  // Combat
roomMonsters, roomSummons               // Entity state
roomTurnOrder, currentTurnIndex, currentRound  // Turn management
roomGamePhase                           // Phase tracking
roomMaps, roomScenarios                 // Map/scenario data
roomLootTokens, roomCollectedLootHexes  // Loot state
roomElementalState                      // Elemental infusions
roomObjectives, roomObjectiveProgress   // Objectives
roomGameLogs, roomPlayerStats           // Statistics
roomOpenedDoors, roomCollectedTreasures // Exploration state
```

#### 2. Frontend: `GameStateService` (`frontend/src/services/game-state.service.ts`)

**Metrics:**
- **Lines of Code:** 1,573
- **State Fields:** 42+ in flat `GameState` interface
- **Event Handlers:** 15+

**Problems:**
- Flat state structure makes React memoization ineffective
- All state updates trigger full re-renders
- Mixed concerns: game data, UI state, combat state, rest state

---

## Impact Analysis

### Current Pain Points

1. **Testing Difficulty:** Cannot test combat logic without setting up entire gateway
2. **Merge Conflicts:** Multiple developers touching the same 7000-line file
3. **Cognitive Load:** Developers must understand entire file to make changes
4. **Bug Surface:** State mutations can have unintended side effects
5. **Performance:** Frontend flat state causes unnecessary re-renders
6. **Onboarding:** New developers overwhelmed by file complexity

### Existing Mitigations

Some extraction has already occurred:
- `NarrativeRewardService` - extracted from GameGateway (per #355)
- 44 existing services in `backend/src/services/`
- `ActionDispatcherService` for action routing

---

## Technical Approaches

### Approach 1: Surgical Extraction (Minor Changes)

**Philosophy:** Extract only the most painful hotspots while preserving current architecture.

**Scope:**
- Extract 3-4 high-churn modules from GameGateway
- Group frontend state into 4-5 nested objects
- Preserve existing patterns and dependencies

**Backend Changes:**

1. **Extract `CombatHandler`** (~800 lines)
   - `handleAttackTarget()` (lines 2596-3122)
   - `executeCardAttackAction()` (lines 3768-3936)
   - Modifier deck management
   - Damage calculation orchestration

2. **Extract `TurnManager`** (~400 lines)
   - Turn order initialization and management
   - Phase transitions
   - Round advancement logic

3. **Extract `MovementHandler`** (~500 lines)
   - Movement validation and execution
   - Narrative interrupt integration
   - Path calculation coordination

**Frontend Changes:**

1. Restructure `GameState` into nested groups:
   ```typescript
   interface GameState {
     core: CoreGameState;        // gameData, campaignId
     turn: TurnState;            // turnOrder, currentRound, isMyTurn
     cards: CardSelectionState;  // abilityDeck, selectedActions
     combat: CombatState;        // attackMode, targets, selectedTarget
     movement: MovementState;    // selectedHex, movementPoints
     ui: UIState;                // logs, connectionStatus, modals
   }
   ```

**Effort:** 2-3 weeks
**Risk:** Low
**Debt Reduction:** ~30%

**Pros:**
- Minimal disruption to existing code
- Can be done incrementally across PRs
- Immediate testability improvements for extracted modules

**Cons:**
- GameGateway remains >4000 lines
- Doesn't address architectural root cause
- State management still centralized in Maps

---

### Approach 2: Domain-Driven Refactor (Moderate Changes)

**Philosophy:** Reorganize around game domain boundaries with proper service layer.

**Scope:**
- Full extraction of domain handlers from GameGateway
- Introduce repository pattern for state management
- Frontend state machine for complex flows

**Backend Architecture:**

```
GameGateway (thin facade, ~500 lines)
    ├── Delegates to domain handlers
    └── Only handles WebSocket concerns

Domain Handlers (new layer):
    ├── RoomHandler         - join/leave/room management
    ├── CharacterHandler    - selection, movement, status
    ├── CombatHandler       - attacks, damage, conditions
    ├── TurnHandler         - phases, round management
    ├── LootHandler         - tokens, collection, rewards
    ├── NarrativeHandler    - triggers, rewards, dialogs
    └── ObjectiveHandler    - progress, completion

State Repository (centralized):
    └── GameStateRepository
        ├── getRoomState(roomCode)
        ├── updateRoomState(roomCode, changes)
        └── subscribeToChanges(roomCode, callback)
```

**Frontend Architecture:**

```
GameStateService (orchestrator)
    ├── CoreStateSlice      - immutable game data
    ├── TurnStateSlice      - turn/phase management
    ├── CombatStateMachine  - XState for combat flow
    ├── RestStateMachine    - XState for rest flow
    └── UIStateSlice        - transient UI state
```

**Implementation Steps:**

1. **Week 1-2:** Create `GameStateRepository` to centralize all Maps
2. **Week 3-4:** Extract domain handlers, inject repository
3. **Week 5:** Refactor GameGateway to thin facade
4. **Week 6-7:** Frontend state restructuring with slices
5. **Week 8:** Integration testing and bug fixes

**Effort:** 6-8 weeks
**Risk:** Medium
**Debt Reduction:** ~70%

**Pros:**
- Clear domain boundaries improve reasoning
- Repository pattern enables future persistence
- State machines prevent invalid state transitions
- Each handler is independently testable

**Cons:**
- Significant refactoring effort
- Risk of regressions during transition
- Team must learn new patterns
- Temporary feature freeze recommended

---

### Approach 3: Architecture Rewrite (Major Changes)

**Philosophy:** Rebuild game engine with event-sourcing and CQRS patterns.

**Scope:**
- Complete rewrite of game state management
- Event-sourced game history
- Separate read/write models
- Actor-based room management

**Backend Architecture:**

```
Event Store
    └── GameEvents (immutable log)
        ├── PlayerJoined, CharacterSelected
        ├── TurnStarted, CardPlayed
        ├── MovementExecuted, AttackResolved
        └── ObjectiveCompleted, GameEnded

Command Handlers (write side):
    ├── Validate commands against current state
    ├── Emit events on success
    └── Each handler is pure function

Projections (read side):
    ├── CurrentGameStateProjection
    ├── PlayerStatsProjection
    ├── TurnOrderProjection
    └── Real-time WebSocket sync

Room Actors (Akka-style):
    └── Each room is isolated actor
        ├── Owns its event stream
        ├── Processes commands serially
        └── Broadcasts state changes
```

**Frontend Architecture:**

```
Event-Driven State
    ├── Receive server events
    ├── Apply to local projections
    ├── Optimistic updates with rollback
    └── Time-travel debugging enabled

Component Architecture:
    ├── Container components subscribe to projections
    ├── Presentational components are pure
    └── Selector-based memoization
```

**Benefits:**

1. **Complete History:** Every game action is recorded
2. **Replay/Debug:** Can replay games, investigate bugs
3. **Undo Support:** Natural undo/redo capabilities
4. **Scalability:** Room actors can be distributed
5. **Testing:** Event handlers are pure functions
6. **Audit Trail:** Compliance and cheat detection

**Implementation Timeline:**

- **Month 1:** Event store and core events
- **Month 2:** Command handlers for critical paths
- **Month 3:** Projections and WebSocket integration
- **Month 4:** Migration tooling, parallel running
- **Month 5:** Frontend event-driven refactor
- **Month 6:** Testing, optimization, cutover

**Effort:** 5-6 months
**Risk:** High
**Debt Reduction:** 100%

**Pros:**
- Industry-standard game architecture
- Eliminates all current architectural debt
- Enables features impossible with current design
- Future-proof for scaling

**Cons:**
- Massive investment of time
- High risk of project stall
- Team needs to learn event-sourcing
- Parallel systems during migration
- May delay feature development significantly

---

## Recommendation Matrix

| Criteria | Approach 1 | Approach 2 | Approach 3 |
|----------|------------|------------|------------|
| Effort | Low (2-3 wks) | Medium (6-8 wks) | High (5-6 mo) |
| Risk | Low | Medium | High |
| Debt Reduction | ~30% | ~70% | 100% |
| Testability Improvement | Moderate | High | Complete |
| Feature Velocity Impact | Minimal | 1-2 month pause | 3+ month pause |
| Learning Curve | None | Low | High |
| Future Flexibility | Limited | Good | Excellent |

---

## Recommended Path

**Start with Approach 1, plan for Approach 2.**

### Immediate Actions (Approach 1):

1. Extract `CombatHandler` first - highest churn area
2. Create `GameStateRepository` to wrap Map stores
3. Restructure frontend `GameState` into nested objects

### Medium-term (Approach 2):

1. After Approach 1 stabilizes, continue domain extraction
2. Introduce state machines for complex flows (rest, combat targeting)
3. Build toward thin gateway facade

### Long-term Consideration (Approach 3):

Event-sourcing should be evaluated if:
- Game replay/spectating becomes a requirement
- Anti-cheat measures need audit trails
- Horizontal scaling is needed for concurrent rooms
- Team has bandwidth for architectural investment

---

## Appendix: File References

- Backend Gateway: `backend/src/websocket/game.gateway.ts`
- Frontend State: `frontend/src/services/game-state.service.ts`
- Existing Services: `backend/src/services/` (44 services)
- Related Issues: #365, #434, #355, #386, #378
