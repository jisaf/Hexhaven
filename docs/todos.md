# Hexhaven Development Todos

Structured todo list tracking completed features and future enhancements.

---

## Completed Features

All items from Phases 1-9 of the Game Completion System (Issue #186).

### Phase 1: Backend - Round-End Completion Checks ✅

- [x] Move `checkScenarioCompletion()` call to after round boundary detection
- [x] Add `isRoundComplete()` method to TurnOrderService
- [x] Ensure completion check occurs at end of every round
- [x] Verify completion check doesn't trigger multiple times

**Files Modified**: `backend/src/websocket/game.gateway.ts`, `backend/src/services/turn-order.service.ts`

---

### Phase 2: Backend - Enhanced Scenario Completion ✅

- [x] Store scenario reference in room state
- [x] Calculate actual loot collected from roomLootTokens
- [x] Track game start time for completion time calculation
- [x] Pass real scenario object to `scenarioService.checkScenarioCompletion()`
- [x] Add `startedAt` and `scenarioId` fields to GameRoom model
- [x] Enhance completion detection with better data

**Files Modified**: `backend/src/websocket/game.gateway.ts`, `backend/src/models/game-room.model.ts`, `backend/src/services/scenario.service.ts`

---

### Phase 3: Backend - Objective System Foundation ✅

- [x] Create `ObjectiveDefinition` type system
- [x] Create `ObjectiveEvaluationContext` with sanitized game state
- [x] Implement `ObjectiveEvaluatorService` with 12 templates
- [x] Implement `ObjectiveContextBuilderService`
- [x] Add security validation for custom functions
- [x] Add progress tracking infrastructure
- [x] Add milestone notification system

**Files Created**: `shared/types/objectives.ts`, `backend/src/services/objective-evaluator.service.ts`, `backend/src/services/objective-context-builder.service.ts`

---

### Phase 4: Backend - Template Objective Implementations ✅

- [x] Implement `kill_all_monsters` template
- [x] Implement `kill_monster_type` template
- [x] Implement `kill_boss` template with health tracking
- [x] Implement `survive_rounds` template
- [x] Implement `collect_loot` template
- [x] Implement `reach_location` template
- [x] Implement `protect_npc` template (future NPCs)
- [x] Implement `time_limit` template (failure condition)
- [x] Implement `no_damage` template
- [x] Implement `minimum_health` template
- [x] Implement `collect_treasure` template
- [x] Implement `escape` template

**Files Modified**: `backend/src/services/objective-evaluator.service.ts`

---

### Phase 5: Backend - Custom Function Support ✅

- [x] Implement custom function security validation
- [x] Create sandboxed execution environment
- [x] Add forbidden pattern detection
- [x] Add execution timeout limits
- [x] Support both boolean and ObjectiveResult returns
- [x] Add error handling and logging

**Files Modified**: `backend/src/services/objective-evaluator.service.ts`

---

### Phase 6: Backend - Player Statistics Tracking ✅

- [x] Add `roomPlayerStats` map to GameGateway
- [x] Track damage dealt in `handleAttackTarget()`
- [x] Track damage taken in `handleAttackTarget()`
- [x] Track monsters killed on monster death
- [x] Track loot collected in `handleCollectLoot()`
- [x] Enhance `ScenarioCompletedPayload` with player stats
- [x] Add accumulated stats to ObjectiveEvaluationContext

**Files Modified**: `backend/src/websocket/game.gateway.ts`, `shared/types/events.ts`, `backend/src/services/objective-context-builder.service.ts`

---

### Phase 7: Backend - Game Result Persistence ✅

- [x] Create `GameResult` database model
- [x] Create `PlayerGameResult` database model
- [x] Implement `GameResultService` for saving results
- [x] Add objective progress to result records
- [x] Add completion time tracking
- [x] Store aggregate statistics (loot, XP, gold)
- [x] Run Prisma migration

**Files Created**: `backend/src/services/game-result.service.ts`
**Files Modified**: `backend/prisma/schema.prisma`

---

### Phase 8: Backend - Match History API ✅

- [x] Create `GameHistoryController` with REST endpoints
- [x] Implement `GET /api/games/history/:userId` endpoint
- [x] Implement `GET /api/games/history/result/:gameResultId` endpoint
- [x] Implement `GET /api/games/history/stats/:userId` endpoint
- [x] Add filtering support (victory, scenario, date range)
- [x] Add pagination support
- [x] Add JWT authentication guards

**Files Created**: `backend/src/api/game-history.controller.ts`, `backend/src/types/game-history.dto.ts`

---

### Phase 9: Frontend - Scenario Completion UI Integration ✅

- [x] Add WebSocket listener for `scenario_completed` event
- [x] Add state for scenario result in GameBoard
- [x] Wire `ScenarioCompleteModal` to event
- [x] Display victory/defeat modal with stats
- [x] Implement "Return to Lobby" button handler
- [x] Add state cleanup on lobby return
- [x] Test modal display with real game data

**Files Modified**: `frontend/src/pages/GameBoard.tsx`, `frontend/src/services/websocket.service.ts`

---

### Phase 10: Frontend - Exhaustion Visual Feedback ✅

- [x] Add visual indicator for exhausted characters
- [x] Show "(Exhausted)" label in turn order
- [x] Add grayscale filter to exhausted character sprites
- [x] Update CharacterSprite to handle exhaustion state
- [x] Test exhaustion UI with character death

**Files Modified**: `frontend/src/game/CharacterSprite.ts`, `frontend/src/components/game/TurnStatus.tsx`

---

### Phase 11: WebSocket Events Implementation ✅

- [x] Add `objectives_loaded` event
- [x] Add `objective_progress` event
- [x] Add `character_exhausted` event
- [x] Enhance `scenario_completed` event payload
- [x] Update event type definitions
- [x] Implement event broadcasting in GameGateway
- [x] Add frontend event listeners

**Files Modified**: `shared/types/events.ts`, `backend/src/websocket/game.gateway.ts`, `frontend/src/services/websocket.service.ts`

---

### Phase 12: Testing & Edge Cases ✅

- [x] Test all monsters defeated → victory
- [x] Test all players exhausted → defeat
- [x] Test mixed exhaustion (game continues)
- [x] Test last player exhausts mid-round
- [x] Test last monster dies mid-round
- [x] Test round boundary completion check
- [x] Test simultaneous death scenarios
- [x] Test return to lobby flow
- [x] Add contract tests for WebSocket events
- [x] Add unit tests for objective templates

**Files Modified**: `backend/tests/contract/end-turn.test.ts`, `backend/tests/unit/objective-evaluator.test.ts`

---

## In Progress

Currently no tasks in progress. All Phase 1-12 features are complete.

---

## Planned

Future enhancements and features beyond the MVP.

### P0: Critical Features (Next Sprint)

#### Card Exhaustion Mechanics
- [ ] Implement card depletion tracking
- [ ] Trigger exhaustion when hand size < 2
- [ ] Add "cards lost" to player statistics
- [ ] Add visual indicator for low card count
- [ ] Test exhaustion from card depletion

**Priority**: P0 (Critical for complete Gloomhaven experience)
**Effort**: Medium (2-3 days)
**Dependencies**: None

#### Long Rest Implementation
- [ ] Add long rest action to turn options
- [ ] Implement "discard one card" mechanic
- [ ] Restore discarded cards to hand (except chosen card)
- [ ] Add long rest to game state
- [ ] Add UI for card selection during long rest
- [ ] Test long rest flow end-to-end

**Priority**: P0 (Core Gloomhaven mechanic)
**Effort**: Medium (3-4 days)
**Dependencies**: Card exhaustion mechanics

---

### P1: High Priority Features (Next 2-3 Sprints)

#### Battle Goals
- [ ] Create BattleGoal model (database)
- [ ] Implement battle goal assignment at game start
- [ ] Add battle goal checking at scenario completion
- [ ] Add battle goal rewards (checkmarks for perks)
- [ ] Create battle goal UI in game board
- [ ] Add 20+ battle goal definitions

**Priority**: P1 (High engagement feature)
**Effort**: Large (5-7 days)
**Dependencies**: None

#### NPC System
- [ ] Create NPC entity model
- [ ] Add NPC spawn points to scenarios
- [ ] Implement NPC AI (basic movement)
- [ ] Add NPC health tracking
- [ ] Support `protect_npc` objectives
- [ ] Add NPC sprites and rendering
- [ ] Test escort mission scenarios

**Priority**: P1 (Enables new scenario types)
**Effort**: Large (7-10 days)
**Dependencies**: None

#### Campaign Progression
- [ ] Create Campaign model (database)
- [ ] Link scenarios in campaign chains
- [ ] Implement scenario unlocking
- [ ] Add campaign-wide prosperity tracking
- [ ] Add global achievements
- [ ] Create campaign UI/progress view
- [ ] Support scenario branching

**Priority**: P1 (Long-term engagement)
**Effort**: Very Large (2-3 weeks)
**Dependencies**: Battle goals, character progression

---

### P2: Medium Priority Features

#### Scenario Builder UI
- [ ] Create visual hex map editor
- [ ] Add monster placement tools
- [ ] Add objective configuration UI
- [ ] Add treasure placement
- [ ] Support custom scenarios
- [ ] Add scenario validation
- [ ] Enable scenario sharing (export/import JSON)

**Priority**: P2 (User-generated content)
**Effort**: Very Large (3-4 weeks)
**Dependencies**: None

#### Character Retirement
- [ ] Track character retirement goals
- [ ] Implement retirement rewards
- [ ] Add city event unlocking
- [ ] Add new character unlocking
- [ ] Create retirement ceremony UI
- [ ] Support legacy bonuses

**Priority**: P2 (Campaign feature)
**Effort**: Medium (4-5 days)
**Dependencies**: Campaign progression

#### Enhanced Match History
- [ ] Add match history frontend page
- [ ] Create detailed stats dashboard
- [ ] Add scenario-specific leaderboards
- [ ] Add character class statistics
- [ ] Support filtering and sorting
- [ ] Add graphs and visualizations
- [ ] Enable CSV export

**Priority**: P2 (Analytics & engagement)
**Effort**: Medium (5-7 days)
**Dependencies**: Match history API (complete)

#### Item Shop
- [ ] Create Item model (database)
- [ ] Implement item effects
- [ ] Add item equipping system
- [ ] Create shop UI
- [ ] Add item rarity/pricing
- [ ] Support item unlocking
- [ ] Add item crafting

**Priority**: P2 (Progression feature)
**Effort**: Large (7-10 days)
**Dependencies**: Character progression

---

### P3: Low Priority Features

#### Achievements System
- [ ] Define achievement criteria
- [ ] Create Achievement model (database)
- [ ] Track achievement progress
- [ ] Add achievement notifications
- [ ] Create achievements UI
- [ ] Add 50+ achievements
- [ ] Support Steam-style achievement unlocking

**Priority**: P3 (Nice to have)
**Effort**: Medium (4-5 days)
**Dependencies**: Player statistics tracking (complete)

#### Replay System
- [ ] Store event sequence in database
- [ ] Create replay playback engine
- [ ] Add replay UI controls (play, pause, speed)
- [ ] Support replay sharing
- [ ] Add replay export (video)
- [ ] Enable replay analysis mode

**Priority**: P3 (Content creation)
**Effort**: Large (10-14 days)
**Dependencies**: Event sourcing infrastructure

#### Advanced AI Options
- [ ] Add AI difficulty levels
- [ ] Implement advanced monster tactics
- [ ] Add boss-specific AI behaviors
- [ ] Support conditional abilities
- [ ] Add AI learning (heuristics)

**Priority**: P3 (Gameplay depth)
**Effort**: Very Large (3-4 weeks)
**Dependencies**: None

#### Social Features
- [ ] Add friend system
- [ ] Add in-game chat
- [ ] Add player profiles
- [ ] Support clan/guild creation
- [ ] Add social feed (achievements, completions)
- [ ] Enable player endorsements

**Priority**: P3 (Community building)
**Effort**: Very Large (4+ weeks)
**Dependencies**: User authentication (complete)

---

## Deferred / Backlog

Features acknowledged but not prioritized for current roadmap.

### Content Expansion
- [ ] Add 20+ additional scenarios
- [ ] Add 6+ new character classes
- [ ] Add expansion monsters
- [ ] Add alternate rule sets (e.g., Forgotten Circles)

### Technical Debt
- [ ] Migrate to event sourcing architecture
- [ ] Add Redis caching layer
- [ ] Implement GraphQL API
- [ ] Add full-text search for scenarios
- [ ] Optimize database queries (indexing)
- [ ] Add database connection pooling

### Performance
- [ ] Add WebSocket message compression
- [ ] Implement lazy loading for game assets
- [ ] Add sprite atlasing for faster rendering
- [ ] Optimize pathfinding algorithm
- [ ] Add server-side rendering for SEO

### Developer Experience
- [ ] Add Storybook for component development
- [ ] Create component library
- [ ] Add E2E test automation (CI/CD)
- [ ] Add performance monitoring (Sentry)
- [ ] Create developer onboarding guide

### Internationalization
- [ ] Add 10+ additional languages
- [ ] Support RTL languages (Arabic, Hebrew)
- [ ] Add region-specific content
- [ ] Enable community translations

---

## Feature Request Process

To propose a new feature:

1. Create issue in GitHub with `feature-request` label
2. Provide use case and user story
3. Estimate effort (Small/Medium/Large/Very Large)
4. Assign priority (P0/P1/P2/P3)
5. Team reviews in bi-weekly planning meeting
6. Approved features added to "Planned" section

---

## Priority Definitions

- **P0 (Critical)**: Must have for core gameplay, blocks other features
- **P1 (High)**: Important for player engagement, enhances experience
- **P2 (Medium)**: Nice to have, improves quality of life
- **P3 (Low)**: Future consideration, experimental features

---

## Effort Estimates

- **Small**: 1-2 days
- **Medium**: 3-5 days
- **Large**: 1-2 weeks
- **Very Large**: 3+ weeks

---

**Last Updated**: 2025-12-07
**Version**: 1.0.0
**Maintained By**: Development Team
