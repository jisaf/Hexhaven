# Feature Specification: PostgreSQL Database with User Authentication

**Feature Branch**: `002-postgres-user-db`
**Created**: 2025-12-01
**Status**: Draft
**Input**: User description: "read the constitution, prd, and spec for 001-gloomhaven... then plan for the implementation of the database using postgres, and user accounts that just need a username and password (we will add email later). remember that users can have multiple games, they will have multiple characters that evolve over time (i.e. they use a base template, but level up and gain items and custom cards, etc), and multiple campaigns (implemented later)."

## Clarifications

### Session 2025-12-01

- Q: Password complexity requirements? → A: Minimum 12 characters, no complexity requirements (let bcrypt handle security)
- Q: Password validation rules beyond 12-char minimum? → A: Maximum 128 characters, all printable characters allowed including unicode, leading/trailing whitespace trimmed, no common password checks (rely on 12-char minimum + bcrypt)
- Q: JWT token session duration? → A: 7 days access token with 30-day refresh token
- Q: Concurrent character update strategy (optimistic locking vs last-write-wins)? → A: A character should never be in concurrent games. Player can have many characters. A character will have one campaign and one active game
- Q: User account deletion strategy (cascading deletes vs soft deletes)? → A: Soft delete user, anonymize data (mark deleted, anonymize username, preserve game history)
- Q: Authentication rate limiting strategy? → A: 5 failed attempts per 15 minutes per username (track in database)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Account and Start Playing (Priority: P1)

As a new player, I want to create an account with just a username and password so I can save my game progress and characters across sessions without friction.

**Why this priority**: User accounts are foundational for all other features. Without persistent user data, players cannot save progress, track character evolution, or return to their games.

**Independent Test**: Can be fully tested by creating an account with username/password, logging in, creating a character, playing a game, logging out, and logging back in to verify data persistence.

**Acceptance Scenarios**:

1. **Given** I am on the registration page, **When** I enter a unique username and password, **Then** my account is created and I am logged in
2. **Given** I have an existing account, **When** I enter my username and password on the login page, **Then** I am authenticated and can access my saved data
3. **Given** I am logged in, **When** I create a character and join a game, **Then** my character and game state are associated with my account
4. **Given** I log out and log back in, **When** I view my profile, **Then** I can see all my previous characters and games
5. **Given** I try to register with an existing username, **When** I submit the form, **Then** I receive an error message that the username is taken
6. **Given** I try to register with a password shorter than 12 characters, **When** I submit the form, **Then** I receive an error message requiring minimum 12 characters
7. **Given** I fail to log in 5 times within 15 minutes, **When** I attempt a 6th login, **Then** I receive an error that my account is temporarily locked with the unlock time

---

### User Story 2 - Manage Multiple Characters (Priority: P1)

As a player, I want to create and manage multiple characters that level up, gain items, and unlock custom cards so I can experience different playstyles and track character progression.

**Why this priority**: Character progression is core to the Gloomhaven experience. Players need persistent characters that evolve over time to maintain engagement and investment.

**Independent Test**: Can be tested by creating multiple characters for one user, playing games with different characters, gaining experience and items, leveling up, and verifying that each character maintains separate progression state.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I create a new character with a class selection, **Then** the character is saved with default stats from the class template
2. **Given** I have a character, **When** I complete a scenario and gain experience, **Then** my character's XP is updated in the database
3. **Given** my character has enough XP, **When** I level up, **Then** my character's level increases and I can select new ability cards
4. **Given** I complete a scenario, **When** I earn loot and items, **Then** those items are added to my character's inventory
5. **Given** I have multiple characters, **When** I view my character list, **Then** I can see each character's current level, XP, and equipment separately

---

### User Story 3 - Join and Track Multiple Games (Priority: P1)

As a player, I want to participate in multiple game sessions simultaneously so I can play with different groups of friends without losing track of any game state.

**Why this priority**: Multiplayer flexibility is essential. Players should be able to join multiple games with different friends, using different characters, without confusion or data conflicts.

**Independent Test**: Can be tested by creating one user account, joining multiple game rooms with different characters, making progress in each game independently, and verifying that game states don't interfere with each other.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I join a game room with a specific character, **Then** my user account is linked to that game session
2. **Given** I am in multiple games, **When** I view my active games list, **Then** I see all game rooms I've joined with their current status (each with a different character)
3. **Given** I have a character already in an active game, **When** I try to join another game with the same character, **Then** I receive an error message that the character is already in a game
4. **Given** I am in a game, **When** the game state updates (movement, attacks, turn changes), **Then** those changes are persisted to the database
5. **Given** I leave a game and rejoin later, **When** I reconnect, **Then** I see the current game state including all actions that occurred while I was away
6. **Given** a game is completed or abandoned, **When** I view my games list, **Then** I can see the game marked with its final status and outcome

---

### User Story 4 - Character Progression Persistence (Priority: P2)

As a player, I want my character's progression (perks, card enhancements, unlocked abilities) to persist across game sessions so I can continue developing my character over time.

**Why this priority**: Long-term character development drives player retention and investment, but can be implemented after basic character stats and inventory tracking.

**Independent Test**: Can be tested by playing multiple scenarios with one character, earning checkmarks for battle goals, selecting perks, enhancing ability cards, and verifying all progression data persists between sessions.

**Acceptance Scenarios**:

1. **Given** I earn checkmarks from battle goals, **When** I spend them on perks, **Then** my selected perks are saved to my character
2. **Given** I have gold and available card enhancements, **When** I enhance an ability card, **Then** the enhancement is permanently associated with that card instance
3. **Given** I level up, **When** I unlock new ability cards, **Then** those cards are added to my character's available deck
4. **Given** I modify my attack modifier deck with perks, **When** I start a new game, **Then** my customized deck is loaded with those modifications
5. **Given** my character has progression data, **When** I view character details, **Then** I can see all perks, enhancements, and unlocked cards

---

### User Story 5 - Support Future Campaign System (Priority: P3)

As a player, I want the database to support campaign progression tracking so that future features can track completed scenarios, unlocked content, and campaign-level progress.

**Why this priority**: Campaign features are planned for later but the database schema should accommodate them without major restructuring.

**Independent Test**: Can be tested by verifying database schema includes campaign-related tables and relationships, even if campaign features aren't fully implemented yet.

**Acceptance Scenarios**:

1. **Given** a campaign entity exists in the database, **When** I create or join a campaign, **Then** my user is associated with that campaign
2. **Given** a campaign tracks completed scenarios, **When** my group completes a scenario, **Then** the scenario completion is recorded for the campaign
3. **Given** campaigns have prosperity and unlocks, **When** campaign data is updated, **Then** the database stores prosperity level and unlocked classes/scenarios
4. **Given** multiple users join a campaign, **When** I query campaign members, **Then** I can retrieve all users participating in that campaign
5. **Given** the schema supports campaigns, **When** I test database migrations, **Then** the campaign tables are created without errors

---

### Edge Cases

- What happens when two users try to register with the same username simultaneously? The database unique constraint should cause one transaction to fail, returning a clear error to the second user
- What happens when a user exceeds the login attempt rate limit? After 5 failed attempts within 15 minutes, the account is temporarily locked with lockedUntil timestamp set to 15 minutes from the first failed attempt. User receives a clear error message with unlock time
- What happens when a user tries to join a game with a character that's already in another active game? The system must prevent this with validation and return a clear error message. Users can play multiple games simultaneously but must use different characters for each game
- What happens when a game's state data exceeds PostgreSQL's JSONB size limits? The system should implement data compression or pagination strategies for very large game states
- What happens when a game completes and character progression needs to be saved? The system should update character state (XP, level, items, perks) atomically within a database transaction to prevent partial updates
- What happens when a user account is deleted? The system performs a soft delete: marks the user with deletedAt timestamp, anonymizes the username, invalidates all refresh tokens, and prevents future authentication. Characters and game history are preserved to maintain data integrity for other players
- What happens when database migrations fail midway? The migration system should support rollback and transactional DDL operations
- What happens when a user's access token expires during a game? The authentication layer should use the refresh token to obtain a new access token without disrupting the active game connection. If the refresh token is also expired, the user should be redirected to login

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use PostgreSQL 14+ as the primary database
- **FR-002**: System MUST implement user authentication with username and password (bcrypt hashing with salt rounds >= 10, passwords must be minimum 12 characters with no complexity requirements)
- **FR-029**: System MUST implement authentication rate limiting: 5 failed login attempts per username within 15 minutes triggers temporary account lock
- **FR-003**: System MUST store user credentials securely with hashed passwords (email field reserved for future use)
- **FR-004**: System MUST allow each user to create multiple characters
- **FR-005**: System MUST associate each character with a base class template but track individual progression
- **FR-006**: System MUST persist character experience, level, items, and ability cards
- **FR-007**: System MUST track custom ability card enhancements per character
- **FR-008**: System MUST allow users to join multiple games simultaneously
- **FR-009**: System MUST link game state to specific characters and users
- **FR-010**: System MUST persist full game state including entity positions, health, conditions, and turn order
- **FR-011**: System MUST use Prisma 5 as the ORM for type-safe database access
- **FR-012**: System MUST implement database migrations for schema evolution
- **FR-013**: System MUST include indexes on frequently queried fields (user lookups, game queries, character queries)
- **FR-014**: System MUST support campaign entities with relationships to users and scenarios (implementation deferred)
- **FR-015**: System MUST handle database connection pooling for concurrent users (<100 connections)
- **FR-016**: System MUST enforce that each character can only participate in one active game at a time with database-level validation
- **FR-027**: System MUST associate each character with at most one campaign (relationship tracked but features deferred)
- **FR-017**: System MUST validate username uniqueness at the database level with unique constraints
- **FR-018**: System MUST store game event history for replay and audit (event sourcing pattern from PRD)
- **FR-019**: System MUST create periodic game state snapshots (every 20 events as per PRD)
- **FR-020**: System MUST implement soft deletes for user account removal with username anonymization and deletedAt timestamp
- **FR-028**: System MUST prevent authentication for soft-deleted users and invalidate all refresh tokens on deletion
- **FR-021**: System MUST store character ability cards with references to base card templates plus instance-specific enhancements
- **FR-022**: System MUST persist attack modifier deck state per character including perks modifications
- **FR-023**: System MUST track scenario completion per character for unlock progression
- **FR-024**: System MUST store character inventory with items that can be equipped, consumed, or stored
- **FR-025**: System MUST implement JWT token generation for session management (7-day access tokens with 30-day refresh tokens)
- **FR-026**: System MUST store refresh tokens in database with user association and expiration tracking

### Key Entities

- **User**: Represents a player account with username, hashed password, account creation timestamp, and optional deletedAt timestamp for soft deletes. Includes rate limiting fields: failedLoginAttempts (counter) and lockedUntil (timestamp) to prevent brute force attacks. When deleted, the username is anonymized (e.g., "deleted_user_12345") and authentication is prevented, but the user record remains to preserve game history integrity. Each user can have multiple characters and participate in multiple games and campaigns. Email field reserved for future use.

- **RefreshToken**: Represents a refresh token for session management. Each token has a unique identifier, user association, expiration timestamp (30 days), and creation timestamp. Allows secure long-term sessions with short-lived access tokens.

- **Character**: Represents a playable character instance owned by a user. Contains reference to base character class template, current level, experience points, health, inventory, ability card deck (both base and unlocked), card enhancements, attack modifier deck customizations, and selected perks. Each character can participate in only one active game at a time and belongs to at most one campaign. Characters evolve over time through gameplay.

- **CharacterClass**: Represents a base character class template (Brute, Tinkerer, Spellweaver, etc.) with default stats, starting ability cards, health progression by level, and available perks. This is the template that character instances are based on.

- **AbilityCard**: Represents ability card definitions belonging to character classes. Each card has initiative value, top action, bottom action, level requirement, and class association. Character-specific instances track enhancements.

- **CardEnhancement**: Represents enhancements applied to specific ability card instances for a character (stickers in physical game). Tracks which card, which slot (top/bottom), enhancement type, and when applied.

- **Item**: Represents equipment and consumable items that characters can own. Includes item type, rarity, effects, and whether it's equipped or in inventory.

- **Game**: Represents a game session with unique room code, scenario reference, current state, participating users/characters, turn order, and status (lobby, active, completed, abandoned). Links to GameState for detailed state storage.

- **GameState**: Stores the full game state as JSONB including hex grid, entity positions, health/conditions, elemental infusions, round number, and active effects. Uses event sourcing pattern with periodic snapshots.

- **GameEvent**: Stores individual game events for event sourcing (player moved, attacked, used ability, etc.). Each event has sequence number, event type, event data, player reference, and timestamp.

- **Campaign** (future): Represents a campaign that tracks scenario progression, prosperity, unlocked content, and participating users. Schema prepared but features deferred.

- **Scenario**: Represents scenario definitions with map layout, monster groups, objectives, and difficulty. Used by games and tracked by campaigns for completion status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create an account and log in within 30 seconds
- **SC-002**: Database supports 100 concurrent users without connection pool exhaustion
- **SC-003**: User authentication queries complete in under 50ms (P95)
- **SC-004**: Character progression data (XP, level, items) saves within 100ms of game events
- **SC-005**: Game state queries return full state within 100ms for games with up to 4 players and 20 monsters
- **SC-006**: Database schema supports adding email authentication in future without breaking changes
- **SC-007**: Character data retrieval for game join completes within 50ms
- **SC-008**: Users can create up to 10 characters without performance degradation
- **SC-009**: Database migrations run successfully in under 60 seconds for schema changes
- **SC-010**: Game event history queries support replay functionality with all events for a game retrieved in under 200ms
- **SC-011**: Database handles concurrent character updates without data corruption (race condition testing)
- **SC-012**: Password hashing (bcrypt) completes within 200ms per authentication attempt
- **SC-013**: Database storage for 100 users with average 5 characters each and 10 completed games stays under 100MB
- **SC-014**: Campaign schema additions (future) don't require rewriting existing user/character/game tables
- **SC-015**: All database queries are type-safe via Prisma with zero runtime type errors in production

### Assumptions

- PostgreSQL 14+ is already installed and configured on the OCI Ampere instance as per PRD
- Database has sufficient resources (4GB shared_buffers from PRD configuration)
- Connection pooling is managed by Prisma with appropriate pool size for <100 concurrent users
- Users accept that email is not required for account creation in initial version
- Character class templates are seeded into the database during initial setup
- Ability card data is imported from Gloomhaven game data as static content
- Item definitions are seeded from game data rather than being user-creatable
- Game state JSONB size remains reasonable (<10MB per game) for expected scenarios
- Campaign features are deferred to post-MVP but schema supports future implementation
- Database backups are handled by OCI infrastructure (daily dumps to Object Storage per PRD)
- Users can play multiple games simultaneously but must use different characters for each game (each character limited to one active game)
- Character retirement and class unlocking (campaign features) are not needed for MVP database schema
- Database indexes are created on username, game room codes, and foreign key relationships
- Authentication uses 7-day access tokens and 30-day refresh tokens to balance security with gaming session UX

## Out of Scope (Explicitly Not Included in MVP)

- Email-based authentication (username field reserved, schema prepared)
- Password reset functionality (requires email)
- Social authentication (Google, Discord, etc.)
- Campaign progression features (schema prepared, implementation deferred)
- Character retirement mechanics
- City/road event tracking
- Prosperity and global unlocks system
- Achievement and statistics tracking
- User profile customization (avatars, bio)
- Friends list and social features
- Account recovery mechanisms
- Two-factor authentication
- Rate limiting at database level (handled in application layer)
- Database replication for high availability (single instance per PRD)
- Real-time database triggers for game events (handled by application)
- Full-text search on usernames or character names
- Database-level encryption beyond connection TLS
- Automated database performance monitoring (handled by Sentry per PRD)
- Multi-region database deployment
