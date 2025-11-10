# Tasks: Hexhaven Multiplayer Tactical Board Game

**Feature Branch**: `001-hexhaven-multiplayer`
**Input**: Design documents from `/specs/001-hexhaven-multiplayer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This project follows TDD as mandated by the constitution. Test tasks are included for all user stories.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Shared**: `shared/types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project directory structure (backend/, frontend/, shared/, docs/)
- [X] T002 Initialize backend NestJS project with TypeScript, Prisma, Socket.io dependencies in backend/
- [X] T003 Initialize frontend React project with Vite, PixiJS, react-i18next dependencies in frontend/
- [X] T004 [P] Configure ESLint and Prettier for backend in backend/.eslintrc.json
- [X] T005 [P] Configure ESLint and Prettier for frontend in frontend/.eslintrc.json
- [X] T006 [P] Setup TypeScript strict mode for backend in backend/tsconfig.json
- [X] T007 [P] Setup TypeScript strict mode for frontend in frontend/tsconfig.json
- [X] T008 [P] Create shared types directory structure in shared/types/
- [X] T009 [P] Configure Workbox for PWA service workers in frontend/vite.config.ts
- [X] T010 [P] Create PWA manifest.json in frontend/public/manifest.json
- [X] T011 [P] Setup GitHub Actions CI workflow in .github/workflows/ci.yml (test + build + lint gates)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Backend Infrastructure

- [X] T012 Create Prisma schema with GameRoom, Player, GameState, Scenario tables in backend/src/db/schema.prisma
- [X] T013 Generate initial database migration in backend/src/db/migrations/
- [X] T014 Create database seed script with 6 character classes and 5 scenarios in backend/src/db/seed.ts
- [X] T015 [P] Create shared entity types (Player, GameRoom, Character, Monster, Scenario, HexTile, Condition, etc.) in shared/types/entities.ts
- [X] T016 [P] Create shared game state types in shared/types/game-state.ts
- [X] T017 [P] Create shared WebSocket event types in shared/types/events.ts

### Backend Core Services

- [X] T018 [P] Implement hex coordinate utilities (axialToCube, cubeDistance, hexRange, hexNeighbors) in backend/src/utils/hex-utils.ts
- [X] T019 [P] Implement structured logging service with correlation IDs in backend/src/utils/logger.ts
- [X] T020 [P] Implement validation decorators and DTOs using class-validator in backend/src/utils/validation.ts
- [X] T021 [P] Create error handling middleware with user-friendly messages in backend/src/utils/error-handler.ts
- [X] T022 [P] Create environment configuration module in backend/src/config/env.config.ts

### Frontend Core Infrastructure

- [X] T023 [P] Setup react-i18next with English translation files in frontend/src/i18n/
- [X] T024 [P] Create WebSocket client service with Socket.io integration in frontend/src/services/websocket.service.ts
- [X] T025 [P] Create game state management hook (useGameState) in frontend/src/hooks/useGameState.ts
- [X] T026 [P] Create WebSocket connection hook (useWebSocket) in frontend/src/hooks/useWebSocket.ts
- [X] T027 [P] Setup PixiJS Application wrapper component in frontend/src/game/PixiApp.tsx
- [X] T028 [P] Implement responsive layout utilities for mobile-first design in frontend/src/utils/responsive.ts
- [X] T029 [P] Create touch gesture utilities (tap, long-press, pinch-zoom, pan) in frontend/src/utils/gestures.ts

### Testing Infrastructure

- [X] T030 [P] Setup Jest configuration for backend unit/integration tests in backend/jest.config.js
- [X] T031 [P] Setup Jest configuration for frontend unit tests in frontend/jest.config.js
- [X] T032 [P] Setup Playwright configuration for E2E tests in frontend/playwright.config.ts
- [X] T033 [P] Create test fixtures for game room creation in backend/tests/fixtures/game-room.fixture.ts
- [X] T034 [P] Create test fixtures for player creation in backend/tests/fixtures/player.fixture.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Join and Play a Quick Battle (Priority: P1) 🎯 MVP

**Goal**: Players can create/join game rooms with shareable codes, see each other in lobby, start game, see hex grid with characters, and perform basic movement and attacks in real-time.

**Independent Test**: Open app on mobile, create game with room code, join from second device, both players select characters, host starts game, see hex grid battle map with both characters placed, click character → click hex to move, character moves and other player sees update in real-time.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T035 [P] [US1] E2E test: Create game room and receive room code in frontend/tests/e2e/us1-create-room.spec.ts
- [X] T036 [P] [US1] E2E test: Join game room with valid code in frontend/tests/e2e/us1-join-room.spec.ts
- [X] T037 [P] [US1] E2E test: Character selection and game start in frontend/tests/e2e/us1-start-game.spec.ts
- [X] T038 [P] [US1] E2E test: Character movement visible to both players in frontend/tests/e2e/us1-movement.spec.ts
- [X] T039 [P] [US1] Contract test: WebSocket join_room event in backend/tests/contract/join-room.test.ts
- [X] T040 [P] [US1] Contract test: WebSocket select_character event in backend/tests/contract/select-character.test.ts
- [X] T041 [P] [US1] Contract test: WebSocket start_game event in backend/tests/contract/start-game.test.ts
- [X] T042 [P] [US1] Contract test: WebSocket move_character event in backend/tests/contract/move-character.test.ts
- [X] T043 [P] [US1] Unit test: Room code generation (unique 6-char alphanumeric) in backend/tests/unit/room-service.test.ts
- [X] T044 [P] [US1] Unit test: Player validation (nickname unique within room) in backend/tests/unit/player-service.test.ts

### Backend Implementation for User Story 1

- [X] T045 [P] [US1] Create Player model in backend/src/models/player.model.ts
- [X] T046 [P] [US1] Create GameRoom model in backend/src/models/game-room.model.ts
- [X] T047 [P] [US1] Create Character model in backend/src/models/character.model.ts
- [X] T048 [US1] Implement RoomService with createRoom, joinRoom, getRoom methods in backend/src/services/room.service.ts
- [X] T049 [US1] Implement PlayerService with createPlayer, validateNickname methods in backend/src/services/player.service.ts
- [X] T050 [US1] Implement CharacterService with createCharacter, selectCharacter methods in backend/src/services/character.service.ts
- [X] T051 [US1] Implement GameGateway WebSocket handlers (join_room, select_character, start_game, move_character) in backend/src/websocket/game.gateway.ts
- [X] T052 [US1] Implement REST POST /api/rooms endpoint for room creation in backend/src/api/rooms.controller.ts
- [X] T053 [US1] Implement REST GET /api/rooms/:roomCode endpoint in backend/src/api/rooms.controller.ts
- [X] T054 [US1] Add server-authoritative validation for movement (range, obstacles, occupancy) in backend/src/services/validation.service.ts
- [X] T055 [US1] Implement real-time state broadcast on player actions in backend/src/websocket/game.gateway.ts

### Frontend Implementation for User Story 1

- [X] T056 [P] [US1] Create Lobby page component in frontend/src/pages/Lobby.tsx
- [X] T057 [P] [US1] Create GameBoard page component in frontend/src/pages/GameBoard.tsx
- [X] T058 [P] [US1] Create RoomCodeInput component in frontend/src/components/RoomCodeInput.tsx
- [X] T059 [P] [US1] Create CharacterSelect component in frontend/src/components/CharacterSelect.tsx
- [X] T060 [P] [US1] Create PlayerList component in frontend/src/components/PlayerList.tsx
- [X] T061 [US1] Implement HexGrid rendering with PixiJS in frontend/src/game/HexGrid.ts
- [X] T062 [US1] Implement HexTile sprite component in frontend/src/game/HexTile.ts
- [X] T063 [US1] Implement CharacterSprite component with tap-to-select in frontend/src/game/CharacterSprite.ts
- [X] T064 [US1] Implement hex coordinate conversion utilities (screen ↔ axial) in frontend/src/game/hex-utils.ts
- [X] T065 [US1] Implement movement range highlighting in frontend/src/game/MovementHighlight.ts
- [X] T066 [US1] Connect WebSocket events (room_joined, character_selected, game_started, character_moved) in frontend/src/services/websocket.service.ts
- [X] T067 [US1] Implement room creation flow (create button → API call → receive room code) in frontend/src/pages/Lobby.tsx
- [X] T068 [US1] Implement room join flow (enter code → WebSocket join → see other players) in frontend/src/pages/Lobby.tsx
- [X] T069 [US1] Implement character selection UI (6 classes, visual feedback on selection) in frontend/src/components/CharacterSelect.tsx
- [X] T070 [US1] Implement game start button (host only) in frontend/src/pages/Lobby.tsx
- [X] T071 [US1] Implement character movement (tap character → tap hex → emit move event) in frontend/src/pages/GameBoard.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - players can create/join rooms, select characters, start game, see hex grid, and move characters with real-time sync.

---

## Phase 4: User Story 2 - Complete a Full Scenario with Combat Mechanics (Priority: P1)

**Goal**: Players experience full tactical combat including ability card selection, initiative-based turn order, monster AI activation, attack resolution with modifier decks, elemental infusion, and scenario completion detection.

**Independent Test**: Start 2-player game, select scenario with monsters, each player selects two ability cards (top/bottom), turn order displays by initiative, monster AI moves toward nearest player and attacks, player attacks monster with damage calculation and modifier draw, elemental states update, scenario completes when all monsters defeated.

### Tests for User Story 2

- [ ] T072 [P] [US2] E2E test: Card selection phase and initiative determination in frontend/tests/e2e/us2-card-selection.spec.ts
- [ ] T073 [P] [US2] E2E test: Monster AI movement and attack in frontend/tests/e2e/us2-monster-ai.spec.ts
- [ ] T074 [P] [US2] E2E test: Attack resolution with modifier deck in frontend/tests/e2e/us2-attack.spec.ts
- [ ] T075 [P] [US2] E2E test: Elemental infusion generation and consumption in frontend/tests/e2e/us2-elements.spec.ts
- [ ] T076 [P] [US2] E2E test: Scenario completion detection in frontend/tests/e2e/us2-scenario-complete.spec.ts
- [ ] T077 [P] [US2] Contract test: WebSocket select_cards event in backend/tests/contract/select-cards.test.ts
- [ ] T078 [P] [US2] Contract test: WebSocket attack_target event in backend/tests/contract/attack-target.test.ts
- [ ] T079 [P] [US2] Contract test: WebSocket end_turn event in backend/tests/contract/end-turn.test.ts
- [ ] T080 [P] [US2] Unit test: Turn order calculation by initiative in backend/tests/unit/turn-order.test.ts
- [ ] T081 [P] [US2] Unit test: Monster AI focus target selection (closest enemy) in backend/tests/unit/monster-ai.test.ts
- [ ] T082 [P] [US2] Unit test: A* pathfinding for hex grids in backend/tests/unit/pathfinding.test.ts
- [ ] T083 [P] [US2] Unit test: Attack damage calculation with modifiers in backend/tests/unit/damage-calculation.test.ts
- [ ] T084 [P] [US2] Unit test: Attack modifier deck draw and reshuffle in backend/tests/unit/modifier-deck.test.ts
- [ ] T085 [P] [US2] Unit test: Elemental state transitions (inert → strong → waning → inert) in backend/tests/unit/elemental-state.test.ts

### Backend Implementation for User Story 2

- [ ] T086 [P] [US2] Create Monster model in backend/src/models/monster.model.ts
- [ ] T087 [P] [US2] Create AbilityCard model in backend/src/models/ability-card.model.ts
- [ ] T088 [P] [US2] Create AttackModifierDeck model in backend/src/models/modifier-deck.model.ts
- [ ] T089 [P] [US2] Create Scenario model with map layout and monster groups in backend/src/models/scenario.model.ts
- [ ] T090 [US2] Implement TurnOrderService (calculate initiative, build turn order array) in backend/src/services/turn-order.service.ts
- [ ] T091 [US2] Implement MonsterAIService (determineFocus, calculateMovement, selectAttack) in backend/src/services/monster-ai.service.ts
- [ ] T092 [US2] Implement PathfindingService (A* algorithm for hex grids) in backend/src/services/pathfinding.service.ts
- [ ] T093 [US2] Implement DamageCalculationService (base damage + modifier + effects) in backend/src/services/damage-calculation.service.ts
- [ ] T094 [US2] Implement ModifierDeckService (draw, reshuffle on null/x2) in backend/src/services/modifier-deck.service.ts
- [ ] T095 [US2] Implement ElementalStateService (generate, consume, decay per round) in backend/src/services/elemental-state.service.ts
- [ ] T096 [US2] Implement ScenarioService (load scenario, spawn monsters, check completion) in backend/src/services/scenario.service.ts
- [ ] T097 [US2] Add WebSocket handlers (select_cards, attack_target, end_turn) in backend/src/websocket/game.gateway.ts
- [ ] T098 [US2] Implement server-authoritative attack validation (range, target alive, not disarmed) in backend/src/services/validation.service.ts
- [ ] T099 [US2] Implement monster activation logic (AI calculates actions, broadcasts results) in backend/src/services/monster-ai.service.ts
- [ ] T100 [US2] Implement scenario completion detection (all monsters dead or all players exhausted) in backend/src/services/scenario.service.ts
- [ ] T101 [US2] Add REST GET /api/scenarios endpoint for scenario browsing in backend/src/api/scenarios.controller.ts
- [ ] T102 [US2] Add REST GET /api/scenarios/:id endpoint for scenario details in backend/src/api/scenarios.controller.ts

### Frontend Implementation for User Story 2

- [ ] T103 [P] [US2] Create AbilityCard component in frontend/src/components/AbilityCard.tsx
- [ ] T104 [P] [US2] Create CardSelectionPanel component with swipe carousel in frontend/src/components/CardSelectionPanel.tsx
- [ ] T105 [P] [US2] Create TurnOrderDisplay component in frontend/src/components/TurnOrderDisplay.tsx
- [ ] T106 [P] [US2] Create MonsterSprite component in frontend/src/game/MonsterSprite.ts
- [ ] T107 [P] [US2] Create AttackAnimation component in frontend/src/game/AttackAnimation.ts
- [ ] T108 [P] [US2] Create DamageNumber component (pooled sprites for performance) in frontend/src/game/DamageNumber.ts
- [ ] T109 [P] [US2] Create ElementalStateDisplay component in frontend/src/components/ElementalStateDisplay.tsx
- [ ] T110 [P] [US2] Create ScenarioCompleteModal component in frontend/src/components/ScenarioCompleteModal.tsx
- [ ] T111 [US2] Implement card selection phase UI (select 2 cards, highlight selected) in frontend/src/pages/GameBoard.tsx
- [ ] T112 [US2] Connect WebSocket events (cards_selected, turn_order_determined, next_turn_started, monster_activated, attack_resolved, scenario_completed) in frontend/src/services/websocket.service.ts
- [ ] T113 [US2] Implement turn indicator (highlight current entity's turn) in frontend/src/components/TurnOrderDisplay.tsx
- [ ] T114 [US2] Implement monster rendering on hex grid in frontend/src/game/HexGrid.ts
- [ ] T115 [US2] Implement attack target selection (tap enemy → confirm attack) in frontend/src/pages/GameBoard.tsx
- [ ] T116 [US2] Implement attack animation and damage number display in frontend/src/game/AttackAnimation.ts
- [ ] T117 [US2] Implement elemental state UI (6 element icons with states) in frontend/src/components/ElementalStateDisplay.tsx
- [ ] T118 [US2] Implement scenario completion UI (victory/defeat modal) in frontend/src/components/ScenarioCompleteModal.tsx
- [ ] T119 [P] [US2] Create LootToken model in backend/src/models/loot-token.model.ts
- [ ] T120 [US2] Implement loot token spawning in ScenarioService in backend/src/services/scenario.service.ts
- [ ] T121 [US2] Add loot collection action to GameGateway (WebSocket: collect_loot event) in backend/src/websocket/game.gateway.ts
- [ ] T122 [P] [US2] Create LootTokenSprite component in frontend/src/game/LootTokenSprite.ts
- [ ] T123 [US2] Implement loot collection UI (tap token → collect) in frontend/src/pages/GameBoard.tsx
- [ ] T124 [US2] Implement end-of-scenario loot distribution modal in frontend/src/components/LootDistributionModal.tsx
- [ ] T125 [P] [US2] E2E test: Loot token collection and distribution in frontend/tests/e2e/us2-loot.spec.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - full tactical combat with cards, monsters, attacks, loot collection, and scenario completion is functional.

---

## Phase 5: User Story 3 - Play on Mobile with Touch-Optimized Controls (Priority: P1)

**Goal**: All game interactions work smoothly on mobile devices using touch gestures - pinch-zoom, pan, tap-to-select, long-press context menus, swipe card carousel, and responsive layouts for phones and tablets.

**Independent Test**: Open game on mobile phone (iPhone SE 375px), perform pinch-zoom on hex grid, pan to see different areas, long-press hex for context menu, swipe through ability cards, tap character and hex to move, all UI elements are touch-target sized (44px min), works in portrait and landscape orientation.

### Tests for User Story 3

- [ ] T126 [P] [US3] E2E test: Pinch-zoom on hex grid (mobile viewport) in frontend/tests/e2e/us3-pinch-zoom.spec.ts
- [ ] T127 [P] [US3] E2E test: Pan gesture on game board in frontend/tests/e2e/us3-pan.spec.ts
- [ ] T128 [P] [US3] E2E test: Long-press context menu in frontend/tests/e2e/us3-long-press.spec.ts
- [ ] T129 [P] [US3] E2E test: Card carousel swipe gesture in frontend/tests/e2e/us3-swipe-cards.spec.ts
- [ ] T130 [P] [US3] E2E test: Orientation change (portrait ↔ landscape) preserves state in frontend/tests/e2e/us3-orientation.spec.ts
- [ ] T131 [P] [US3] E2E test: Touch target sizes (all buttons ≥44px) in frontend/tests/e2e/us3-touch-targets.spec.ts
- [ ] T132 [P] [US3] Unit test: Touch gesture detection (tap, long-press, pinch, pan) in frontend/tests/unit/gestures.test.ts

### Frontend Implementation for User Story 3

- [ ] T133 [P] [US3] Integrate pixi-viewport for pan and pinch-zoom in frontend/src/game/HexGrid.ts
- [ ] T134 [P] [US3] Implement pinch-zoom with inertia and boundary constraints in frontend/src/game/Viewport.ts
- [ ] T135 [P] [US3] Implement pan gesture with momentum scrolling in frontend/src/game/Viewport.ts
- [ ] T136 [P] [US3] Implement long-press detection for context menus in frontend/src/utils/gestures.ts
- [ ] T137 [P] [US3] Create ContextMenu component for hex actions in frontend/src/components/ContextMenu.tsx
- [ ] T138 [P] [US3] Implement swipeable card carousel (react-swipeable or custom) in frontend/src/components/CardSelectionPanel.tsx
- [ ] T139 [P] [US3] Add touch-target sizing utility (44px min) in frontend/src/utils/touch-targets.ts
- [ ] T140 [US3] Apply responsive breakpoints (375px phone, 768px tablet, 1920px desktop) in frontend/src/utils/responsive.ts
- [ ] T141 [US3] Implement orientation change handler (save viewport state, re-render) in frontend/src/hooks/useOrientation.ts
- [ ] T142 [US3] Optimize PixiJS rendering for mobile (sprite culling, texture atlases, pooling) in frontend/src/game/PixiApp.tsx
- [ ] T143 [US3] Test on mobile viewports in Playwright (iPhone SE, iPad, Pixel 5) in frontend/playwright.config.ts

**Checkpoint**: All user stories 1, 2, and 3 should now work independently - game is fully playable on mobile with excellent touch UX.

---

## Phase 6: User Story 4 - Reconnect After Disconnection (Priority: P2)

**Goal**: Players who disconnect (airplane mode, app close, network drop) see a "Reconnecting..." message, automatically rejoin the game within 10 seconds when connection restores, and resume their turn if active. Other players see disconnect/reconnect notifications. Game session persists for 24 hours.

**Independent Test**: Start 2-player game, intentionally disconnect one player (airplane mode), wait 1-2 minutes, reconnect, verify player rejoins same game state with turn position preserved, other player sees "PlayerTwo reconnected" message.

### Tests for User Story 4

- [ ] T144 [P] [US4] E2E test: Player disconnects and reconnects within 10 minutes in frontend/tests/e2e/us4-reconnect.spec.ts
- [ ] T145 [P] [US4] E2E test: Disconnected player's turn is skipped after 60s timeout in frontend/tests/e2e/us4-turn-skip.spec.ts
- [ ] T146 [P] [US4] E2E test: Game session persists for 24 hours in backend/tests/integration/session-persistence.test.ts
- [ ] T147 [P] [US4] Contract test: WebSocket reconnection with session restoration in backend/tests/contract/reconnect.test.ts
- [ ] T148 [P] [US4] Unit test: Session expiration (24-hour TTL) in backend/tests/unit/session.test.ts

### Backend Implementation for User Story 4

- [ ] T149 [US4] Implement session persistence (save game state to DB on every action) in backend/src/services/session.service.ts
- [ ] T150 [US4] Implement session restoration on reconnect (load state from DB by UUID) in backend/src/services/session.service.ts
- [ ] T151 [US4] Add 24-hour TTL to game rooms (auto-cleanup expired sessions) in backend/src/services/room.service.ts
- [ ] T152 [US4] Implement player timeout detection (60s idle → skip turn) in backend/src/websocket/game.gateway.ts
- [ ] T153 [US4] Add WebSocket reconnection handler (restore player state, broadcast reconnect) in backend/src/websocket/game.gateway.ts
- [ ] T154 [US4] Implement disconnect notification broadcast in backend/src/websocket/game.gateway.ts

### Frontend Implementation for User Story 4

- [ ] T155 [P] [US4] Create ReconnectingModal component with "Reconnecting..." message in frontend/src/components/ReconnectingModal.tsx
- [ ] T156 [P] [US4] Create PlayerDisconnectedBanner component in frontend/src/components/PlayerDisconnectedBanner.tsx
- [ ] T157 [US4] Implement automatic reconnection with exponential backoff in frontend/src/services/websocket.service.ts
- [ ] T158 [US4] Store UUID in localStorage for session restoration in frontend/src/utils/storage.ts
- [ ] T159 [US4] Handle player_disconnected event (show banner with player name) in frontend/src/services/websocket.service.ts
- [ ] T160 [US4] Handle player_reconnected event (hide banner, update UI) in frontend/src/services/websocket.service.ts
- [ ] T161 [US4] Display reconnect status to user ("Reconnecting...", "Connected") in frontend/src/components/ReconnectingModal.tsx

**Checkpoint**: Reconnection works reliably - players can disconnect/reconnect without losing game state.

---

## Phase 7: User Story 5 - Choose Characters and Scenarios (Priority: P2)

**Goal**: Players can select from 6 starting character classes (Brute, Tinkerer, Spellweaver, Scoundrel, Cragheart, Mindthief) with descriptions, and host can choose from 5 scenarios with different difficulty levels and objectives.

**Independent Test**: Create game, see 6 character classes with descriptions, select Brute, host sees 5 scenarios with difficulty indicators and objectives, select "Crypt of Blood" (difficulty 2), start game, verify Brute-specific ability cards and scenario 2 map layout.

### Tests for User Story 5

- [ ] T162 [P] [US5] E2E test: Character class selection with descriptions in frontend/tests/e2e/us5-character-selection.spec.ts
- [ ] T163 [P] [US5] E2E test: Scenario browsing and selection in frontend/tests/e2e/us5-scenario-selection.spec.ts
- [ ] T164 [P] [US5] E2E test: Different characters have unique ability decks in frontend/tests/e2e/us5-unique-abilities.spec.ts
- [ ] T165 [P] [US5] E2E test: Different scenarios have unique map layouts in frontend/tests/e2e/us5-scenario-maps.spec.ts
- [ ] T166 [P] [US5] Unit test: Load character data (6 classes with stats and ability decks) in backend/tests/unit/character-data.test.ts
- [ ] T167 [P] [US5] Unit test: Load scenario data (5 scenarios with maps and objectives) in backend/tests/unit/scenario-data.test.ts

### Backend Implementation for User Story 5

- [ ] T168 [P] [US5] Create character data JSON (6 classes: Brute, Tinkerer, Spellweaver, Scoundrel, Cragheart, Mindthief) in backend/src/data/characters.json
- [ ] T169 [P] [US5] Create ability card data JSON (unique decks per class) in backend/src/data/ability-cards.json
- [ ] T170 [P] [US5] Create scenario data JSON (5 scenarios with maps, monsters, objectives) in backend/src/data/scenarios.json
- [ ] T171 [US5] Implement CharacterDataService (load character by class, get ability deck) in backend/src/services/character-data.service.ts
- [ ] T172 [US5] Implement ScenarioDataService (load scenario by ID, get map layout) in backend/src/services/scenario-data.service.ts
- [ ] T173 [US5] Update database seed to load 6 characters and 5 scenarios from JSON in backend/src/db/seed.ts
- [ ] T174 [US5] Add difficulty-based monster stat scaling in backend/src/services/scenario.service.ts

### Frontend Implementation for User Story 5

- [ ] T175 [P] [US5] Create CharacterCard component with class description and stats in frontend/src/components/CharacterCard.tsx
- [ ] T176 [P] [US5] Create ScenarioCard component with difficulty and objective in frontend/src/components/ScenarioCard.tsx
- [ ] T177 [P] [US5] Create ScenarioSelectionPanel component (host only) in frontend/src/components/ScenarioSelectionPanel.tsx
- [ ] T178 [US5] Fetch scenarios from API (/api/scenarios) in frontend/src/services/api.service.ts
- [ ] T179 [US5] Implement character selection grid (6 cards, visual feedback) in frontend/src/pages/Lobby.tsx
- [ ] T180 [US5] Implement scenario selection UI (5 cards, host only) in frontend/src/pages/Lobby.tsx
- [ ] T181 [US5] Display selected character's ability deck in game in frontend/src/components/CardSelectionPanel.tsx

**Checkpoint**: Variety is added - players can choose characters and scenarios for different gameplay experiences.

---

## Phase 8: User Story 6 - Support Multi-Lingual Play (Priority: P2)

**Goal**: Game interface and all text display in the player's preferred language (English, Spanish, French, German, Chinese) without layout breaking. Language detected from device settings or manually selectable.

**Independent Test**: Change device language to Spanish, open app, verify all menus, buttons, instructions, ability descriptions, and scenario text display in Spanish. Change to German, verify text expands properly without UI breaking.

### Tests for User Story 6

- [ ] T182 [P] [US6] E2E test: Language changes to Spanish, all UI text updates in frontend/tests/e2e/us6-spanish.spec.ts
- [ ] T183 [P] [US6] E2E test: Language changes to French, all UI text updates in frontend/tests/e2e/us6-french.spec.ts
- [ ] T184 [P] [US6] E2E test: Language changes to German, text expansion doesn't break layout in frontend/tests/e2e/us6-german-layout.spec.ts
- [ ] T185 [P] [US6] Unit test: Translation keys exist for all UI strings in frontend/tests/unit/i18n.test.ts

### Frontend Implementation for User Story 6

- [ ] T186 [P] [US6] Create Spanish translation file in frontend/src/i18n/locales/es/translation.json
- [ ] T187 [P] [US6] Create French translation file in frontend/src/i18n/locales/fr/translation.json
- [ ] T188 [P] [US6] Create German translation file in frontend/src/i18n/locales/de/translation.json
- [ ] T189 [P] [US6] Create Chinese translation file in frontend/src/i18n/locales/zh/translation.json
- [ ] T190 [US6] Extract all hardcoded UI strings to translation keys in all components
- [ ] T191 [US6] Implement language detection from device settings in frontend/src/i18n/index.ts
- [ ] T192 [US6] Create LanguageSelector component for manual language change in frontend/src/components/LanguageSelector.tsx
- [ ] T193 [US6] Add namespace-based lazy loading (common.json, game.json, lobby.json) in frontend/src/i18n/index.ts
- [ ] T194 [US6] Test layout with long German strings (30-50% longer than English) in frontend/tests/e2e/us6-german-layout.spec.ts

**Checkpoint**: Game is fully internationalized - players can play in their preferred language.

---

## Phase 9: User Story 7 - Optional Account Creation for Progress (Priority: P3)

**Goal**: Players can optionally create an account to save character progression, unlocked content, and game history. MVP uses UUID-based account upgrade (device-only storage), production will add email + magic link authentication.

**Independent Test**: Play 5 games anonymously (UUID-based), click "Create Account", provide confirmation, verify anonymous progress is converted to account-backed profile, character experience and completed scenarios are saved, logout and login again, verify data persists (MVP: device-only; Production: cross-device).

### Tests for User Story 7

- [ ] T195 [P] [US7] E2E test: Anonymous play and account upgrade in frontend/tests/e2e/us7-account-upgrade.spec.ts
- [ ] T196 [P] [US7] E2E test: Progress persists after account creation in frontend/tests/e2e/us7-progress-persistence.spec.ts
- [ ] T197 [P] [US7] Integration test: Anonymous UUID converts to account in backend/tests/integration/account-upgrade.test.ts
- [ ] T198 [P] [US7] Unit test: Character progression tracking (experience, perks) in backend/tests/unit/progression.test.ts

### Backend Implementation for User Story 7

- [ ] T199 [P] [US7] Create Account model with UUID, email (nullable), created_at in backend/src/models/account.model.ts
- [ ] T200 [P] [US7] Create Progression model with character XP, unlocked perks, completed scenarios in backend/src/models/progression.model.ts
- [ ] T201 [US7] Implement AccountService (createAccount, upgradeAnonymousAccount) in backend/src/services/account.service.ts
- [ ] T202 [US7] Implement ProgressionService (trackScenarioCompletion, addExperience, unlockPerk) in backend/src/services/progression.service.ts
- [ ] T203 [US7] Add REST POST /api/accounts endpoint for account creation in backend/src/api/accounts.controller.ts
- [ ] T204 [US7] Add REST GET /api/accounts/:uuid/progression endpoint in backend/src/api/accounts.controller.ts
- [ ] T205 [US7] Save progression on scenario completion in backend/src/services/scenario.service.ts

### Frontend Implementation for User Story 7

- [ ] T206 [P] [US7] Create AccountUpgradeModal component in frontend/src/components/AccountUpgradeModal.tsx
- [ ] T207 [P] [US7] Create ProgressionDisplay component (XP, perks, history) in frontend/src/components/ProgressionDisplay.tsx
- [ ] T208 [US7] Implement account creation flow (modal → confirm → API call) in frontend/src/pages/Profile.tsx
- [ ] T209 [US7] Store account UUID in localStorage in frontend/src/utils/storage.ts
- [ ] T210 [US7] Fetch and display progression on profile page in frontend/src/pages/Profile.tsx
- [ ] T211 [US7] Track scenario completion and send to backend in frontend/src/services/api.service.ts

**Checkpoint**: Basic progression tracking works - players can upgrade to accounts and save progress (device-only in MVP).

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T212 [P] Create ARCHITECTURE.md with system architecture diagrams in docs/ARCHITECTURE.md
- [ ] T213 [P] Create README.md with project overview and quickstart link in README.md
- [ ] T214 [P] Add API documentation auto-generation from JSDoc/decorators in backend/src/
- [ ] T215 [P] Add loading indicators for operations >200ms across all pages in frontend/src/components/LoadingSpinner.tsx
- [ ] T216 [P] Add error boundaries for graceful error handling in frontend/src/components/ErrorBoundary.tsx
- [ ] T217 [P] Optimize PixiJS texture atlases and sprite pooling in frontend/src/game/
- [ ] T218 [P] Add performance monitoring (FPS counter, latency display) in frontend/src/utils/performance.ts
- [ ] T219 [P] Run security audit (input validation, XSS prevention, secrets check) across backend/
- [ ] T220 [P] Add structured logging with correlation IDs across all services in backend/src/
- [ ] T221 [P] Create unit tests for hex utilities (80% coverage target) in backend/tests/unit/hex-utils.test.ts
- [ ] T222 [P] Create unit tests for game state management in frontend/tests/unit/useGameState.test.ts
- [ ] T223 Run full quickstart.md validation (follow steps on clean machine) as documented in specs/001-hexhaven-multiplayer/quickstart.md
- [ ] T224 Run all tests (unit + integration + E2E) and verify 80% coverage in CI pipeline
- [ ] T225 Perform code review for constitution compliance (YAGNI, KISS, DRY, type safety)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) - SOFT dependency on US1 (extends basic gameplay to full combat)
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) - Can start in parallel with US1/US2, focuses on mobile UX
- **User Story 4 (Phase 6)**: Depends on US1 (needs basic game sessions to reconnect to) - Independent of US2/US3
- **User Story 5 (Phase 7)**: Depends on Foundational (Phase 2) - Can start in parallel, adds character/scenario variety
- **User Story 6 (Phase 8)**: Depends on Foundational (Phase 2) - Can start in parallel, focuses on i18n
- **User Story 7 (Phase 9)**: Depends on US2 (needs scenario completion for progression tracking) - Independent of US3/US4/US5/US6
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundation (Phase 2)
     ├──> US1: Join and Play (Phase 3) ─────────┐
     │                                           │
     │                                           v
     ├──> US2: Combat Mechanics (Phase 4) ──────> US4: Reconnection (Phase 6)
     │         │                                  │
     │         │                                  │
     │         └──────────────────────────────────> US7: Accounts (Phase 9)
     │
     ├──> US3: Mobile Touch (Phase 5) ──────────> (Independent)
     │
     ├──> US5: Character/Scenario Choice ───────> (Independent)
     │    (Phase 7)
     │
     └──> US6: Multi-Lingual (Phase 8) ─────────> (Independent)
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints/UI
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Foundational Phase (Phase 2)**:
- Tasks T015-T017 (shared types) can run in parallel
- Tasks T018-T022 (backend utilities) can run in parallel
- Tasks T023-T029 (frontend infrastructure) can run in parallel
- Tasks T030-T034 (testing infrastructure) can run in parallel

**User Story 1 Tests**:
- Tasks T035-T044 (all US1 tests) can run in parallel

**User Story 1 Backend Models**:
- Tasks T045-T047 (Player, GameRoom, Character models) can run in parallel

**User Story 1 Frontend Components**:
- Tasks T056-T060 (Lobby, GameBoard, RoomCodeInput, CharacterSelect, PlayerList) can run in parallel

**User Story 2 Tests**:
- Tasks T072-T085 (all US2 tests) can run in parallel

**User Story 2 Backend Models**:
- Tasks T086-T089 (Monster, AbilityCard, ModifierDeck, Scenario models) can run in parallel

**User Story 2 Frontend Components**:
- Tasks T103-T110 (ability cards, turn order, monsters, animations, elements) can run in parallel

**Across User Stories (after Foundation complete)**:
- US1, US3, US5, and US6 can all start in parallel (different focus areas)
- US2 should complete before US4 and US7 (soft dependency)

---

## Parallel Example: User Story 1

```bash
# After Foundation (Phase 2) completes, launch all US1 tests in parallel:
Task: "E2E test: Create game room and receive room code"
Task: "E2E test: Join game room with valid code"
Task: "E2E test: Character selection and game start"
Task: "E2E test: Character movement visible to both players"
Task: "Contract test: WebSocket join_room event"
Task: "Contract test: WebSocket select_character event"
Task: "Contract test: WebSocket start_game event"
Task: "Contract test: WebSocket move_character event"
Task: "Unit test: Room code generation"
Task: "Unit test: Player validation"

# Then launch all US1 backend models in parallel:
Task: "Create Player model in backend/src/models/player.model.ts"
Task: "Create GameRoom model in backend/src/models/game-room.model.ts"
Task: "Create Character model in backend/src/models/character.model.ts"

# Then launch all US1 frontend components in parallel:
Task: "Create Lobby page component in frontend/src/pages/Lobby.tsx"
Task: "Create GameBoard page component in frontend/src/pages/GameBoard.tsx"
Task: "Create RoomCodeInput component in frontend/src/components/RoomCodeInput.tsx"
Task: "Create CharacterSelect component in frontend/src/components/CharacterSelect.tsx"
Task: "Create PlayerList component in frontend/src/components/PlayerList.tsx"
```

---

## Parallel Example: Across User Stories

```bash
# After Foundation (Phase 2) completes, these user stories can start in parallel:

# Developer A: User Story 1 (Join and Play)
Task: "All US1 tasks (T035-T071)"

# Developer B: User Story 3 (Mobile Touch Controls)
Task: "All US3 tasks (T126-T143)"

# Developer C: User Story 5 (Character/Scenario Selection)
Task: "All US5 tasks (T162-T181)"

# Developer D: User Story 6 (Multi-Lingual Support)
Task: "All US6 tasks (T182-T194)"

# These 4 user stories have minimal dependencies and can proceed in parallel
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only)

**Core Gameplay MVP**:

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Join and Play)
4. **STOP and VALIDATE**: Test US1 independently
5. Complete Phase 4: User Story 2 (Combat Mechanics)
6. **STOP and VALIDATE**: Test US2 independently
7. Complete Phase 5: User Story 3 (Mobile Touch Controls)
8. **STOP and VALIDATE**: Test US3 on mobile devices
9. Deploy/demo MVP - fully playable multiplayer Hexhaven on mobile

**MVP Scope**: 225 tasks total
- Foundation: 34 tasks (T001-T034)
- User Story 1: 37 tasks (T035-T071)
- User Story 2: 54 tasks (T072-T125, includes loot mechanics)
- User Story 3: 18 tasks (T126-T143)

**Estimated MVP Effort**: 6-8 weeks for single developer, 3-4 weeks for team of 3-4

### Incremental Delivery

**Release 1 (MVP)**: US1 + US2 + US3
- Core gameplay: Join rooms, play scenarios, mobile touch controls
- **Value**: Fully functional multiplayer tactical combat game

**Release 2**: Add US4 (Reconnection)
- **Value**: Reliable mobile experience with reconnection handling

**Release 3**: Add US5 (Character/Scenario Variety)
- **Value**: Replayability with 6 characters and 5 scenarios

**Release 4**: Add US6 (Multi-Lingual)
- **Value**: Global reach with 5 language support

**Release 5**: Add US7 (Accounts and Progression)
- **Value**: Long-term retention with progression tracking

### Parallel Team Strategy

**Team of 4 Developers (Optimal)**:

**Phase 1-2 (Setup + Foundation)**: All developers collaborate (1 week)
- Developer A: Backend setup + database
- Developer B: Frontend setup + PWA
- Developer C: Shared types + testing infrastructure
- Developer D: Backend services + utilities

**Phase 3-9 (User Stories)**: Parallel development (4-6 weeks)
- Developer A: US1 + US4 (core gameplay + reconnection)
- Developer B: US2 + US7 (combat mechanics + accounts)
- Developer C: US3 (mobile touch controls, full focus)
- Developer D: US5 + US6 (characters/scenarios + i18n)

**Phase 10 (Polish)**: All developers collaborate (1 week)
- Code review, testing, documentation, performance optimization

**Total Timeline**: 6-8 weeks with team of 4

---

## Task Count Summary

| Phase | Task Count | Notes |
|-------|-----------|-------|
| Setup | 11 | T001-T011 |
| Foundational | 23 | T012-T034 (BLOCKS all stories) |
| User Story 1 (P1) | 37 | T035-T071 (MVP core) |
| User Story 2 (P1) | 54 | T072-T125 (MVP combat + loot) |
| User Story 3 (P1) | 18 | T126-T143 (MVP mobile) |
| User Story 4 (P2) | 18 | T144-T161 |
| User Story 5 (P2) | 20 | T162-T181 |
| User Story 6 (P2) | 13 | T182-T194 |
| User Story 7 (P3) | 17 | T195-T211 |
| Polish | 14 | T212-T225 |
| **TOTAL** | **225** | All tasks |

**MVP Task Count**: 143 tasks (Setup + Foundation + US1 + US2 + US3)
**Post-MVP Task Count**: 68 tasks (US4-US7)
**Polish Task Count**: 14 tasks

---

## Parallel Opportunities Summary

- **34 tasks** can run in parallel during Foundational phase (Phase 2)
- **10 tasks** can run in parallel for User Story 1 tests
- **3 tasks** can run in parallel for User Story 1 backend models
- **5 tasks** can run in parallel for User Story 1 frontend components
- **14 tasks** can run in parallel for User Story 2 tests
- **4 tasks** can run in parallel for User Story 2 backend models
- **8 tasks** can run in parallel for User Story 2 frontend components
- **4+ user stories** can run in parallel after Foundation completes (US1, US3, US5, US6)

**Total Parallelizable Tasks**: ~100+ tasks (45% of total)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- TDD approach: Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP = User Stories 1, 2, 3 (fully playable multiplayer Hexhaven game)
- Constitution gates: All tests MUST pass before marking tasks complete
- Follow quickstart.md for local development setup
- See plan.md for architecture decisions and research.md for technical rationale
