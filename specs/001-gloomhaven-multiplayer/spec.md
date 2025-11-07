# Feature Specification: Hexhaven Multiplayer Tactical Board Game

**Feature Branch**: `001-hexhaven-multiplayer`
**Created**: 2025-11-07
**Status**: Draft
**Input**: User description: "build a mobile-first multiplayer game modeled on the game hexhaven. Read PRD.md and game-rules.md first to understand the product, underlying rules, and goals."

## Clarifications

### Session 2025-11-07

- Q: Real-time synchronization technology for game state updates? → A: WebSockets
- Q: Game state persistence strategy for reconnection and 24-hour session retention? → A: Start with A for MVP, plan for B for later versions
- Q: Authentication method for optional account creation (User Story 7)? → A: D for MVP, B for production
- Q: Frontend framework and rendering technology for mobile-first PWA? → A: B
- Q: Backend framework and language for server-authoritative game logic? → A: a

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Join and Play a Quick Battle (Priority: P1)

As a new player, I want to quickly join a game with friends on my phone and start playing a tactical battle without creating an account, so I can immediately experience the game with minimal friction.

**Why this priority**: This is the core value proposition - enabling instant, frictionless multiplayer gameplay on mobile devices. Without this, there is no product.

**Independent Test**: Can be fully tested by opening the app on a mobile device, creating a game room with a shareable code, having another player join via that code, and completing a single battle scenario with basic movement and attacks.

**Acceptance Scenarios**:

1. **Given** I open the app on my mobile phone, **When** I tap "Create Game" and enter a nickname, **Then** I receive a 6-character room code I can share with friends
2. **Given** my friend has the room code, **When** they enter it and their nickname, **Then** they join my game lobby and we can see each other's characters
3. **Given** both players are in the lobby, **When** the host starts the game, **Then** we see the hex grid battle map with our characters placed and can take turns
4. **Given** it's my turn, **When** I tap my character and then tap a valid hex within movement range, **Then** my character moves to that hex and my friend sees the movement in real-time
5. **Given** I'm adjacent to an enemy, **When** I select an attack ability and tap the enemy, **Then** the attack resolves with damage applied and both players see the updated enemy health

---

### User Story 2 - Complete a Full Scenario with Combat Mechanics (Priority: P1)

As a player in an active game, I want to experience complete tactical combat with monsters, turn order, abilities, and scenario objectives, so I can enjoy the strategic depth of Hexhaven gameplay.

**Why this priority**: This delivers the core Hexhaven experience - tactical combat with meaningful choices. Without full combat mechanics, the game is just a demo.

**Independent Test**: Can be tested by starting a 2-player game, selecting a scenario with monsters, and playing through multiple rounds where players and monsters alternate turns based on initiative, using ability cards with top/bottom actions, attacking monsters, taking damage, and completing the scenario objective.

**Acceptance Scenarios**:

1. **Given** the game has started, **When** each player selects two ability cards (top and bottom actions), **Then** turn order is determined by initiative and displayed to all players
2. **Given** it's a monster's turn, **When** the monster AI activates, **Then** the monster moves toward the nearest player using optimal pathfinding and attacks if in range
3. **Given** I take damage from a monster attack, **When** my health reaches zero, **Then** I am exhausted and removed from the scenario
4. **Given** all players or all monsters are defeated, **When** the condition is met, **Then** the scenario ends with appropriate victory/defeat results
5. **Given** I use an ability with elemental infusion, **When** the ability resolves, **Then** the elemental state updates and future players can consume that element for enhanced effects

---

### User Story 3 - Play on Mobile with Touch-Optimized Controls (Priority: P1)

As a mobile player, I want intuitive touch controls for hex selection, ability cards, and game actions on my phone or tablet, so I can comfortably play the entire game without a keyboard or mouse.

**Why this priority**: Mobile-first is a core requirement from the PRD. Desktop support is secondary. Without excellent mobile UX, the product fails its primary design goal.

**Independent Test**: Can be tested on various mobile devices (phones and tablets, different screen sizes) by performing all core actions - selecting cards via swipe or tap, moving units by tap-and-select, attacking via tap-to-target, viewing game state through pinch-zoom and pan gestures, and completing a full scenario using only touch input.

**Acceptance Scenarios**:

1. **Given** I'm viewing the game board on my phone, **When** I pinch to zoom, **Then** the hex grid scales appropriately and I can pan to see different areas of the map
2. **Given** I need to select ability cards, **When** card selection phase begins, **Then** my hand of cards is displayed in a mobile-friendly carousel I can swipe through
3. **Given** I'm selecting an action, **When** I long-press a hex or unit, **Then** a context menu appears with available actions (move, attack, interact)
4. **Given** I want to see monster details, **When** I tap a monster token, **Then** a mobile-optimized overlay shows its stats, abilities, and current conditions
5. **Given** the game UI needs to display information, **When** rendering on different screen sizes, **Then** all UI elements are readable, buttons are touch-target sized (44px minimum), and no information is cut off

---

### User Story 4 - Reconnect After Disconnection (Priority: P2)

As a player whose connection drops during a game, I want to automatically reconnect and rejoin the game in progress, so temporary network issues don't ruin the multiplayer experience.

**Why this priority**: Mobile connections are unreliable. This prevents frustration from common disconnections but isn't needed for initial MVP gameplay testing.

**Independent Test**: Can be tested by starting a multiplayer game, intentionally disconnecting one player (airplane mode or closing app), waiting 1-2 minutes, and reconnecting to verify the player rejoins the same game state with their turn position preserved.

**Acceptance Scenarios**:

1. **Given** I'm in an active game, **When** my connection drops, **Then** I see a "Reconnecting..." message and the game attempts to restore the connection
2. **Given** I reconnected within 10 minutes, **When** connection is restored, **Then** I rejoin the game at the current state and can resume my turn if it's active
3. **Given** another player disconnects, **When** they are offline, **Then** their turn is automatically skipped after 60 seconds and they can rejoin later
4. **Given** all players disconnect, **When** everyone is offline for more than 10 minutes, **Then** the game session is preserved for 24 hours before cleanup

---

### User Story 5 - Choose Characters and Scenarios (Priority: P2)

As a player creating a game, I want to select from multiple character classes and pre-built scenarios with different difficulty levels, so each game session offers variety and appropriate challenge.

**Why this priority**: Replayability and variety are important for retention but not needed for initial gameplay proof-of-concept. MVP can start with fixed character/scenario.

**Independent Test**: Can be tested by accessing the character selection screen, choosing different classes (Brute, Tinkerer, Spellweaver, etc.), starting games with different scenario selections, and verifying each character has unique ability cards and each scenario has different map layouts and objectives.

**Acceptance Scenarios**:

1. **Given** I'm creating a new game, **When** I reach character selection, **Then** I see 6 starting character classes with descriptions and can choose one
2. **Given** I've selected a character, **When** I proceed to scenario selection, **Then** I see 5 available scenarios with difficulty indicators and brief descriptions
3. **Given** I select a higher-level scenario, **When** the game starts, **Then** monsters have increased stats appropriate to the difficulty level
4. **Given** different players choose different characters, **When** the game begins, **Then** each player has their character's unique ability deck and stats

---

### User Story 6 - Support Multi-Lingual Play (Priority: P2)

As a non-English speaking player, I want the game interface and all text in my preferred language, so I can fully understand the game rules, abilities, and objectives.

**Why this priority**: Global accessibility is important for reach but can be added after core gameplay is validated. MVP can ship English-only.

**Independent Test**: Can be tested by changing device language settings and verifying all UI text, ability descriptions, scenario text, and error messages display in the selected language without layout breaking.

**Acceptance Scenarios**:

1. **Given** I change my device language to Spanish, **When** I open the app, **Then** all menus, buttons, and instructions are displayed in Spanish
2. **Given** I'm viewing ability cards, **When** language is set to French, **Then** ability names and descriptions are displayed in French with proper text expansion handling
3. **Given** I'm playing with text-heavy scenarios, **When** language is set to German, **Then** scenario descriptions and objectives are fully translated and readable
4. **Given** a new language is added, **When** it becomes available, **Then** users can download the language pack and switch to it without reinstalling the app

---

### User Story 7 - Optional Account Creation for Progress (Priority: P3)

As a regular player, I want to optionally create an account to save my character progression, unlocked content, and game history across devices, so I don't lose my progress if I change phones.

**Why this priority**: Progression systems drive retention but aren't necessary for core gameplay validation. Anonymous play is sufficient for MVP.

**Independent Test**: Can be tested by playing several games anonymously, creating an account mid-session, verifying progress is associated with the account, logging in on a different device, and confirming the saved data is restored.

**Acceptance Scenarios**:

1. **Given** I've played 5 games anonymously (UUID-based), **When** I choose "Create Account" and provide an email (production) or confirm account upgrade (MVP), **Then** my anonymous progress is converted to an account-backed profile
2. **Given** I have an account, **When** I complete scenarios, **Then** my character experience, unlocked perks, and completed scenarios are saved to my account
3. **Given** I'm logged into my account on a new device, **When** I open the app, **Then** my character progression and unlocked content are restored (production only; MVP account data is device-bound)
4. **Given** I want to play anonymously again, **When** I log out, **Then** I can still create and join games without an account

---

### Edge Cases

- What happens when a player disconnects mid-turn during a critical action (e.g., attacking)? The action should not resolve, and their turn should be skipped after a timeout.
- What happens when the host leaves the game? Host migration should occur automatically, transferring control to another player.
- What happens when two players try to move the same unit simultaneously? Server-authoritative model resolves conflicts - first action received is processed, second is rejected with error message.
- What happens when a scenario objective is completed but players want to continue exploring? Game should offer an option to continue the scenario after primary objective completion.
- What happens when a player's device orientation changes during gameplay (portrait to landscape)? Layout should adapt responsively without disrupting the game state.
- What happens when network latency causes actions to appear out of order? Server maintains authoritative turn order and broadcasts corrections if clients display incorrect state.
- What happens when a player tries to join a full game room? They receive a clear error message that the game is full and cannot join.
- What happens when the room code expires or the game session times out? Players receive a notification and are returned to the main menu with an explanation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow players to create game rooms with unique 6-character alphanumeric codes that can be shared
- **FR-002**: System MUST allow players to join existing game rooms by entering the 6-character code
- **FR-003**: System MUST support 2-4 players per game session
- **FR-004**: System MUST display a hex grid battle map that can be zoomed and panned on mobile devices
- **FR-005**: System MUST allow players to select ability cards during the card selection phase
- **FR-006**: System MUST calculate initiative order based on selected ability cards and display turn order to all players
- **FR-007**: System MUST enable character movement on the hex grid with valid movement range highlighted
- **FR-008**: System MUST implement monster AI that determines focus targets and movement/attack actions automatically
- **FR-009**: System MUST support attack actions with damage calculation, including attack modifier deck draws
- **FR-010**: System MUST track health, conditions (poison, wound, stun, etc.), and status effects for all entities
- **FR-011**: System MUST broadcast all game state changes to all connected players in real-time using WebSockets for bidirectional communication
- **FR-012**: System MUST validate all player actions against game rules on the server before applying
- **FR-013**: System MUST support touch gestures (tap, long-press, pinch-zoom, pan) for all game interactions
- **FR-014**: System MUST persist game state to relational database (PostgreSQL/MySQL) so sessions can be resumed after disconnections (MVP uses database-only; migration to Redis planned for post-MVP performance optimization)
- **FR-015**: System MUST support responsive layouts that work on phone screens (375px width minimum) and tablets (768px width minimum)
- **FR-016**: System MUST allow players to rest (short or long) and recover cards according to game rules
- **FR-017**: System MUST implement elemental infusion system (6 elements: fire, ice, air, earth, light, dark) with waning/strong states
- **FR-018**: System MUST support loot token collection and end-of-scenario loot distribution
- **FR-019**: System MUST detect scenario completion conditions (all monsters defeated, all players exhausted, objective met)
- **FR-020**: System MUST support both portrait and landscape orientations on mobile devices
- **FR-021**: System MUST extract all user-facing text for translation into multiple languages
- **FR-022**: System MUST support anonymous play without requiring account creation, using UUID-based identity stored in browser local storage
- **FR-023**: System MUST allow optional account upgrade from anonymous to persistent account (MVP: UUID-based with device-only storage; Production: Email + password with magic link authentication)
- **FR-024**: System MUST work in offline mode for solo play against AI (online connection only required for multiplayer)
- **FR-025**: System MUST implement exhaustion mechanics when players run out of cards or health

### Key Entities

- **Player** (`Player` model in data-model.md): A human participant in a game session, identified by nickname in anonymous mode or account in registered mode. Has selected character class, health, experience, active ability cards, and current game room.
- **Game Room** (`GameRoom` model in data-model.md): A multiplayer session identified by a 6-character code. Contains 2-4 players, current scenario, turn order, round number, and elemental state. Persists for up to 24 hours or until scenario completion.
- **Character** (`Character` model in data-model.md): A playable class (Brute, Tinkerer, Spellweaver, Scoundrel, Cragheart, Mindthief, etc.). Has unique ability deck, starting health, base stats, and class-specific mechanics.
- **Ability Card** (`AbilityCard` model in data-model.md): A playable action card with initiative value, top action, bottom action, and optional elemental requirements/generation. Cards can be in hand, active, discard pile, or lost pile.
- **Monster** (`Monster` model in data-model.md): An AI-controlled enemy entity with monster type, elite/normal status, health, movement, attack, range, special abilities, and current hex position. Follows deterministic AI rules.
- **Hex Tile** (`HexTile` model in data-model.md): A single space on the hexagonal game board. Has coordinates (q, r, s in cube system), terrain type (normal, obstacle, difficult, hazardous), and occupancy status.
- **Scenario** (`Scenario` model in data-model.md): A pre-defined battle setup with map layout, monster groups, objectives, difficulty level, and special rules. Contains spawn points, overlay tiles, and victory conditions.
- **Attack Modifier Deck** (`AttackModifierDeck` model in data-model.md): A deck of cards that modify attack values. Contains base cards, bless/curse cards, and player-specific enhancements from perks. Shuffles on reshuffle card draw.
- **Condition** (`Condition` enum in data-model.md): A status effect applied to entities (poison, wound, stun, immobilize, disarm, muddle, strengthen, invisible, etc.). Has duration and game rule effects.
- **Elemental Infusion** (`ElementalInfusion` structure in data-model.md): The state of six elemental types (fire, ice, air, earth, light, dark). Each can be inert, waning, or strong. Decays at end of each round.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can create a game and have a friend join within 30 seconds from opening the app on mobile
- **SC-002**: System supports 100 concurrent game sessions (200-400 concurrent players) without performance degradation
- **SC-003**: Game maintains 60 FPS on mid-range mobile devices (iPhone 12, Samsung Galaxy S21 equivalent or newer)
- **SC-004**: All UI elements are touch-target sized (44px minimum) and usable with thumbs on phones
- **SC-005**: Real-time game updates have less than 200ms latency between player action and all clients displaying the update
- **SC-006**: 95% of player actions (movement, attacks, card selection) complete within 3 taps on mobile
- **SC-007**: Players can complete a full 2-player scenario (30-45 minute gameplay) without disconnections or crashes
- **SC-008**: Game reconnection succeeds within 10 seconds after network interruption for 90% of disconnections
- **SC-009**: Touch controls are accurate - player can select any hex on the board within 2 attempts 99% of the time
- **SC-010**: All text and UI elements are readable on the smallest supported screen size (iPhone SE, 375px width) without scrolling or zooming
- **SC-011**: System handles orientation changes (portrait ↔ landscape) without losing game state or disrupting active actions
- **SC-012**: 90% of new players successfully join their first multiplayer game within 2 minutes of app launch
- **SC-013**: Multi-lingual UI displays correctly without text overflow or layout breaking across 5+ supported languages
- **SC-014**: Monster AI calculations complete within 500ms so player turns don't have noticeable delays
- **SC-015**: Game consumes less than 150MB memory on mobile devices during active gameplay

### Assumptions

- Players have stable internet connection for multiplayer (4G/LTE or WiFi recommended)
- Players are familiar with turn-based strategy games or willing to learn through tutorials
- Mobile devices support WebGL or equivalent for rendering hex grid graphics (frontend built with React + Canvas/WebGL using PixiJS or similar library for 60 FPS performance)
- Players have access to voice chat apps (Discord, etc.) for verbal communication during games - in-game voice chat not required for MVP
- Hexhaven rulebook is available for players to reference for detailed game rules - in-app rule encyclopedia not required for MVP
- Scenarios are pre-designed and hardcoded - custom scenario builder not required for MVP
- Character progression and campaign mode are post-MVP features - MVP focuses on individual scenario gameplay
- Players accept that some complex Hexhaven mechanics (campaign events, character retirement, prosperity, city/road events) are not included in initial release
- Desktop play is supported but mobile is the primary platform - desktop can have simplified controls
- Payment/monetization systems not required for MVP - game is free to play initially
- Frontend is a Progressive Web App (PWA) built with React and Canvas/WebGL rendering (PixiJS) for cross-platform mobile compatibility
- Backend is built with Node.js (TypeScript) using Express or NestJS framework for server-authoritative game logic, enabling code sharing with frontend

## Out of Scope (Explicitly Not Included in MVP)

- Campaign progression tracking (unlocks, city events, road events, achievements)
- Character retirement and unlocking new classes
- Item shop, purchasing, and item management
- Personal quest cards
- Battle goal cards and perk progression
- Custom scenario creation tools
- In-game voice chat or text chat (players use external apps)
- Matchmaking system with skill-based ranking
- Replays or game recording features
- Advanced graphics settings or customization
- Native mobile apps (MVP is web-based progressive web app)
- Payment systems or monetization features
- Social features (friends list, profiles, achievements)
- Tournament or competitive modes
