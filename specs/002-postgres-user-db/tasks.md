# Implementation Tasks: PostgreSQL Database with User Authentication

**Feature**: 002-postgres-user-db
**Branch**: `002-postgres-user-db`
**Status**: Ready for Implementation
**Created**: 2025-12-01

---

## Overview

This document breaks down the implementation into phases organized by user stories. Each user story is independently testable and can be delivered as a complete increment.

**Total User Stories**: 5 (3 P1, 1 P2, 1 P3)
**Approach**: Test-Driven Development (TDD) - Write tests first per constitution requirements
**MVP Scope**: User Story 1 only (authentication foundation)

---

## Phase 1: Setup & Infrastructure

**Goal**: Initialize project dependencies and database infrastructure

**Prerequisites**: None (foundational setup)

### Tasks

- [ ] T001 Install Prisma dependencies in backend: `npm install prisma @prisma/client bcrypt jsonwebtoken`
- [ ] T002 Install Prisma dev dependencies: `npm install -D @types/bcrypt @types/jsonwebtoken`
- [ ] T003 Initialize Prisma in backend: `npx prisma init` (creates `prisma/` directory)
- [ ] T004 Configure DATABASE_URL in `.env`: Add PostgreSQL connection string with connection pool limit
- [ ] T005 Add JWT secrets to `.env`: JWT_SECRET, JWT_ACCESS_EXPIRATION=7d, JWT_REFRESH_EXPIRATION=30d
- [ ] T006 Add bcrypt config to `.env`: BCRYPT_SALT_ROUNDS=12
- [ ] T007 Create backend/src/db/ directory structure for database layer
- [ ] T008 Create backend/src/services/ directory for business logic
- [ ] T009 Create backend/src/middleware/ directory for Express middleware
- [ ] T010 Create backend/tests/unit/, backend/tests/integration/, backend/tests/contract/ directories
- [ ] T011 Configure Jest for TypeScript testing in backend/jest.config.js
- [ ] T012 Add test scripts to backend/package.json: test, test:watch, test:coverage
- [ ] T013 Create backend/src/db/client.ts: Prisma client singleton with error handling
- [ ] T013-R1 [P1] Add responsive design testing checklist to backend/tests/README.md: Document viewport sizes (375px, 768px, 1920px), browser compatibility matrix (Chrome, Firefox, Safari, Edge latest 2 versions)
- [ ] T013-R2 [P1] Configure viewport testing in frontend/tests/setup.ts: Add @testing-library/react viewport helpers, configure window.matchMedia mock for media query testing
- [ ] T013-P1 [P2] Configure performance benchmarking infrastructure in backend/tests/performance/setup.ts: Install benchmark.js, create benchmark runner with P50/P95/P99 statistics, configure output format
- [ ] T013-P2 [P2] Create database query performance logger in backend/src/db/performance.ts: Prisma middleware to log slow queries >100ms with execution plans, collect timing statistics
- [ ] T013-A1 [P2] Configure accessibility testing tools in frontend/tests/setup.ts: Install jest-axe, configure axe-core with WCAG 2.1 AA ruleset, add toHaveNoViolations matcher
- [ ] T013-A2 [P2] Add accessibility testing documentation to frontend/tests/README.md: Document WCAG 2.1 AA requirements, keyboard navigation (Tab/Enter/Esc/Arrows), ARIA labels, color contrast (4.5:1 text, 3:1 UI), screen reader checklist
- [ ] T013-V1 [P1] Install input validation libraries in backend: Install zod for schema validation, express-validator, dompurify for XSS sanitization, validator.js
- [ ] T013-V2 [P1] Create validation schemas in backend/src/validation/schemas.ts: Define Zod schemas for user registration, character creation, game creation, game events with type safety
- [ ] T013-E1 [P1] Define error handling standards in backend/src/types/errors.ts: Create custom error classes (ValidationError, AuthError, NotFoundError, ConflictError), define standard error response format, document HTTP status codes
- [ ] T013-E2 [P1] Implement global error handler in backend/src/middleware/error.middleware.ts: Map errors to HTTP status codes, format all errors with standard structure, handle Prisma errors, log with stack traces (no stack in production responses)
- [ ] T013-E3 [P1] Test error handler middleware in backend/tests/unit/error-handler.test.ts: Test ValidationError→400, AuthError→401, NotFoundError→404, ConflictError→409, Prisma unique constraint→409, unknown errors→500

**Completion Criteria**:
- ✅ All dependencies installed
- ✅ Prisma initialized with connection to PostgreSQL
- ✅ Environment variables configured
- ✅ Directory structure matches plan.md
- ✅ Jest configured and test command works

---

## Phase 2: Foundational Database Schema

**Goal**: Define complete Prisma schema with all entities, relationships, and indexes

**Prerequisites**: Phase 1 complete

**Note**: This phase implements schema for ALL user stories to avoid migration churn. Features will be implemented incrementally in later phases.

### Tasks

- [ ] T014 Define User model in backend/prisma/schema.prisma with fields: id, username, passwordHash, email (nullable), failedLoginAttempts, lockedUntil, deletedAt, createdAt
- [ ] T015 Add User indexes: @@unique([username]), @@index([deletedAt])
- [ ] T016 Define RefreshToken model with fields: id, token, userId, expiresAt, createdAt
- [ ] T017 Add RefreshToken indexes: @@unique([token]), @@index([userId]), relation to User
- [ ] T018 Define CharacterClass model with fields: id, name, startingHealth, maxHealthByLevel (JSON), handSize, perks (JSON)
- [ ] T019 Add CharacterClass indexes: @@unique([name])
- [ ] T020 Define Character model with fields: id, name, userId, classId, level, experience, gold, currentGameId (nullable), campaignId (nullable), health, perks (JSON), inventory (JSON), createdAt, updatedAt
- [ ] T021 Add Character indexes: @@index([userId]), @@index([currentGameId]), @@index([campaignId]), relations to User, CharacterClass, Game (optional), Campaign (optional)
- [ ] T022 Define AbilityCard model with fields: id, classId, name, level, initiative, topAction (JSON), bottomAction (JSON)
- [ ] T023 Add AbilityCard indexes: @@index([classId]), relation to CharacterClass
- [ ] T024 Define CardEnhancement model with fields: id, characterId, cardId, slot (enum: TOP/BOTTOM), enhancementType, appliedAt
- [ ] T024-I1 [P1] Verify database indexes created in backend/tests/integration/indexes.test.ts: Query pg_indexes to verify User.username, RefreshToken.userId, Character.userId/currentGameId, Game.roomCode, GameEvent.gameId+sequenceNumber indexes exist, generate missing indexes report
- [ ] T024-I2 [P2] Benchmark index effectiveness in backend/tests/performance/index-effectiveness.bench.ts: Seed 1000 users/5000 characters/500 games, benchmark lookups by username/userId/roomCode, use EXPLAIN ANALYZE to verify index scans not sequential scans, query times <50ms
- [ ] T025 Add CardEnhancement indexes: @@index([characterId]), @@index([cardId]), relations to Character, AbilityCard
- [ ] T026 Define Item model with fields: id, name, type, rarity, effects (JSON), cost
- [ ] T027 Add Item indexes: @@index([rarity])
- [ ] T028 Define Game model with fields: id, roomCode, scenarioId, status (enum: LOBBY/ACTIVE/COMPLETED/ABANDONED), createdAt, updatedAt
- [ ] T029 Add Game indexes: @@unique([roomCode]), @@index([status])
- [ ] T030 Define GameState model with fields: id, gameId, sequenceNum, stateData (JSON), createdAt
- [ ] T031 Add GameState indexes: @@unique([gameId]), relation to Game
- [ ] T032 Define GameEvent model with fields: id, gameId, sequenceNum, eventType, eventData (JSON), playerId (nullable), createdAt
- [ ] T033 Add GameEvent indexes: @@index([gameId, sequenceNum]), relation to Game
- [ ] T034 Define Campaign model (schema only, features deferred) with fields: id, name, prosperityLevel, reputation, completedScenarios (JSON), createdAt
- [ ] T035 Define Scenario model with fields: id, name, difficulty, mapLayout (JSON), monsterGroups (JSON), objectives (JSON)
- [ ] T036 Add Scenario indexes: @@index([difficulty])
- [ ] T037 Run `npx prisma format` to validate schema syntax
- [ ] T038 Run `npx prisma generate` to generate Prisma Client types
- [ ] T039 Create initial migration: `npx prisma migrate dev --name init_database_schema`
- [ ] T040 Verify migration succeeded: Check prisma/migrations/ directory for SQL file
- [ ] T040-P1 [P2] Benchmark character data retrieval in backend/tests/performance/character.bench.ts: Benchmark character retrieval by ID (target <50ms P95), benchmark character list per user (target <50ms), test with 10/50/100 characters per user, generate performance report

**Completion Criteria**:
- ✅ All entities defined with correct fields and types
- ✅ All relationships (foreign keys) configured
- ✅ All indexes created for performance
- ✅ Migration applied successfully to development database
- ✅ Prisma Client generated with TypeScript types

---

## Phase 3: Seed Data for Character Classes & Game Content

**Goal**: Populate database with static game content (character classes, ability cards, items, scenarios)

**Prerequisites**: Phase 2 complete (schema exists)

### Tasks

- [ ] T041 Create backend/prisma/seed-data/ directory for JSON seed files
- [ ] T042 Create character-classes.json with 6 starting classes (Brute, Tinkerer, Spellweaver, Scoundrel, Cragheart, Mindthief) including stats, health progression, hand size, perks
- [ ] T043 Create ability-cards.json with ~30 cards per class (~180 total) including initiative, actions, level requirements
- [ ] T044 Create items.json with ~50 items including type, rarity, effects, cost
- [ ] T045 Create scenarios.json with 5 initial scenarios including map layout, monster groups, objectives, difficulty
- [ ] T046 Create backend/prisma/seed.ts script to load JSON files and upsert into database
- [ ] T047 Implement seedCharacterClasses() function with upsert logic (idempotent)
- [ ] T048 Implement seedAbilityCards() function with class lookup and upsert
- [ ] T049 Implement seedItems() function with upsert logic
- [ ] T050 Implement seedScenarios() function with upsert logic
- [ ] T051 Add seed script to package.json: `"prisma": { "seed": "ts-node prisma/seed.ts" }`
- [ ] T052 Run seed: `npx prisma db seed` and verify data in database
- [ ] T053 Test seed idempotence: Run seed twice, verify no duplicates

**Completion Criteria**:
- ✅ Seed data JSON files created with accurate Gloomhaven content
- ✅ Seed script runs successfully
- ✅ Database populated with 6 classes, ~180 cards, ~50 items, 5 scenarios
- ✅ Seed is idempotent (can run multiple times safely)

---

## Phase 4: User Story 1 - Create Account and Start Playing (P1)

**Goal**: Implement complete user registration, login, JWT authentication, and rate limiting

**Independent Test**: Create account → login → create character → logout → login → verify data persists

### Test Tasks (TDD - Write Tests First)

- [ ] T054 [P] [US1] Write unit test for AuthService.register() in backend/tests/unit/auth.service.test.ts: Test successful registration with valid username/password
- [ ] T055 [P] [US1] Write unit test for AuthService.register(): Test duplicate username rejection
- [ ] T056 [P] [US1] Write unit test for AuthService.register(): Test password < 12 characters rejection
- [ ] T057 [P] [US1] Write unit test for AuthService.login() in backend/tests/unit/auth.service.test.ts: Test successful login with valid credentials
- [ ] T058 [P] [US1] Write unit test for AuthService.login(): Test invalid credentials rejection
- [ ] T058-R1 [P1] [US1] Test login form responsive layout in frontend/tests/unit/LoginForm.responsive.test.tsx: Test form renders at 375px/768px, touch targets ≥44px on mobile, no horizontal scrolling on any viewport
- [ ] T058-A1 [P1] [US1] Test login form accessibility in frontend/tests/unit/LoginForm.a11y.test.tsx: Test no axe violations, all inputs have labels, errors announced (aria-live), keyboard navigation (Tab/Enter), focus management
- [ ] T058-A2 [P1] [US1] Test registration form accessibility in frontend/tests/unit/RegisterForm.a11y.test.tsx: Test no axe violations, password requirements announced, username availability accessible, rate limit errors accessible, aria-describedby on errors
- [ ] T059 [P] [US1] Write unit test for AuthService.login(): Test rate limiting after 5 failed attempts
- [ ] T060 [P] [US1] Write unit test for AuthService.login(): Test account unlock after 15 minutes
- [ ] T061 [P] [US1] Write unit test for AuthService.refreshAccessToken(): Test valid refresh token generates new access token
- [ ] T062 [P] [US1] Write unit test for AuthService.refreshAccessToken(): Test expired refresh token rejection
- [ ] T063 [P] [US1] Write unit test for AuthService.logout(): Test refresh token invalidation
- [ ] T063-V1 [P1] [US1] Implement input validation middleware in backend/src/middleware/validation.middleware.ts: Create Express middleware with Zod validation, return 400 with validation errors, sanitize error messages, log validation failures
- [ ] T063-V2 [P1] [US1] Test username validation in backend/tests/unit/validation.test.ts: Test length limits (min 3, max 20?), allowed characters (alphanumeric+underscore?), SQL injection rejected, XSS rejected, reserved usernames blocked (admin, system, deleted_user_*)
- [ ] T063-V3 [P1] [US1] Apply validation to auth routes in backend/src/routes/auth.routes.ts: Add validation middleware to POST /auth/register, /auth/login, /auth/refresh, validate all request bodies before processing
- [ ] T063-E1 [P1] [US1] Standardize auth error responses in backend/src/routes/auth.routes.ts: Use error handler for all auth errors, 401 for invalid credentials (same message for user not found vs wrong password), 409 for duplicate username, 429 for rate limit with lockedUntil, 400 for validation, document error codes in OpenAPI
- [ ] T063-E2 [P1] [US1] Test auth error scenarios in backend/tests/integration/auth-errors.test.ts: Test existing username→409 CONFLICT, invalid username→401 UNAUTHORIZED, invalid password→401, rate limited→429 TOO_MANY_REQUESTS, malformed body→400 BAD_REQUEST
- [ ] T064 [P] [US1] Write integration test for full registration → login → logout flow in backend/tests/integration/auth.integration.test.ts
- [ ] T065 [P] [US1] Write integration test for rate limiting with actual database
- [ ] T066 [P] [US1] Write contract test for POST /api/auth/register in backend/tests/contract/auth.contract.test.ts: Test API contract compliance
- [ ] T067 [P] [US1] Write contract test for POST /api/auth/login: Test response format (access token, refresh token, user data)
- [ ] T068 [P] [US1] Write contract test for POST /api/auth/refresh: Test token refresh flow
- [ ] T069 [P] [US1] Write contract test for POST /api/auth/logout: Test logout endpoint

### Implementation Tasks

- [ ] T070 [US1] Create backend/src/types/auth.types.ts: Define RegisterDto, LoginDto, TokenPair, JwtPayload interfaces
- [ ] T071 [US1] Create backend/src/services/auth.service.ts: Implement AuthService class structure with methods: register, login, refreshAccessToken, logout, verifyAccessToken
- [ ] T072 [US1] Implement AuthService.register() method: Validate password length (>=12 chars), check username uniqueness, hash password with bcrypt (12 rounds), create user in database
- [ ] T072-V1 [P1] [US1] Test password validation edge cases in backend/tests/unit/auth.validation.test.ts: Test 11-char rejected, 12-char accepted, 128-char accepted, 129-char rejected, unicode passwords (emoji, non-Latin), leading/trailing whitespace trimmed, passwords with spaces accepted
- [ ] T072-P1 [P2] [US1] Benchmark authentication performance in backend/tests/performance/auth.bench.ts: Benchmark registration (bcrypt <200ms), login (lookup+bcrypt <50ms), JWT generation (<10ms), test with 10/50/100 concurrent users
- [ ] T072-P2 [P2] [US1] Benchmark connection pool under load in backend/tests/performance/pool.bench.ts: Simulate 100 concurrent auth requests, monitor pool size/wait times, measure connection acquisition (<10ms), verify no exhaustion
- [ ] T073 [US1] Implement AuthService.login() method: Check account lock status (lockedUntil), verify password with bcrypt, handle failed attempts counter, generate JWT tokens
- [ ] T074 [US1] Implement rate limiting logic in login(): Increment failedLoginAttempts, set lockedUntil after 5 failures, reset counter on success
- [ ] T075 [US1] Implement JWT token generation: Create generateTokenPair() helper with 7-day access token, 30-day refresh token, store refresh token in database
- [ ] T076 [US1] Implement AuthService.refreshAccessToken(): Validate refresh token from database, check expiration, generate new token pair, invalidate old refresh token
- [ ] T077 [US1] Implement AuthService.logout(): Delete refresh token from database
- [ ] T078 [US1] Implement AuthService.verifyAccessToken(): Verify JWT signature, check expiration, return decoded payload
- [ ] T079 [US1] Create backend/src/middleware/auth.middleware.ts: Implement authenticateJWT middleware that extracts Bearer token, verifies with AuthService, attaches user to request
- [ ] T080 [US1] Create backend/src/routes/auth.routes.ts: Define POST /api/auth/register, /api/auth/login, /api/auth/refresh, /api/auth/logout routes
- [ ] T081 [US1] Implement register route handler: Call AuthService.register(), return access token + refresh token + user data
- [ ] T082 [US1] Implement login route handler: Call AuthService.login(), return tokens + user data, handle rate limit errors with 429 status
- [ ] T083 [US1] Implement refresh route handler: Extract refresh token from cookie or body, call AuthService.refreshAccessToken()
- [ ] T084 [US1] Implement logout route handler: Extract refresh token, call AuthService.logout()
- [ ] T085 [US1] Add auth routes to backend/src/server.ts: Mount router at /api/auth
- [ ] T086 [US1] Run all US1 tests: `npm test -- auth` and verify all pass

### Frontend Tasks

- [ ] T087 [P] [US1] Create frontend/src/types/auth.types.ts: Define User, LoginCredentials, RegisterCredentials, TokenPair interfaces (matching backend)
- [ ] T088 [P] [US1] Create frontend/src/services/auth.service.ts: Implement AuthService with methods: register, login, logout, refreshToken, getAccessToken, isAuthenticated
- [ ] T089 [US1] Implement AuthService.register(): POST to /api/auth/register, store tokens in localStorage, handle validation errors
- [ ] T090 [US1] Implement AuthService.login(): POST to /api/auth/login, store access token in localStorage, store refresh token securely, handle rate limit errors
- [ ] T091 [US1] Implement AuthService.logout(): POST to /api/auth/logout, clear tokens from localStorage, redirect to login
- [ ] T092 [US1] Implement AuthService.refreshToken(): POST to /api/auth/refresh, update access token in localStorage
- [ ] T093 [US1] Implement token refresh interceptor: Detect 401 errors, automatically refresh token, retry failed request
- [ ] T094 [P] [US1] Create frontend/src/components/auth/RegisterForm.tsx: Form with username and password fields, password length validation (>=12 chars), submit handler
- [ ] T095 [P] [US1] Create frontend/src/components/auth/LoginForm.tsx: Form with username and password fields, error display for rate limiting, submit handler
- [ ] T096 [US1] Add RegisterForm to appropriate page (e.g., /register route)
- [ ] T097 [US1] Add LoginForm to appropriate page (e.g., /login route)
- [ ] T098 [US1] Test frontend registration flow: Create account, verify redirect to dashboard/game
- [ ] T099 [US1] Test frontend login flow: Login with existing account, verify authentication state
- [ ] T100 [US1] Test frontend logout flow: Logout, verify redirect to login page, verify tokens cleared

**US1 Completion Criteria**:
- ✅ All US1 tests pass (unit, integration, contract)
- ✅ User can register with username + password (12+ chars)
- ✅ User can login and receive JWT tokens
- ✅ Rate limiting works (5 attempts lock account for 15 min)
- ✅ Token refresh works automatically
- ✅ User can logout and tokens are invalidated
- ✅ Frontend forms work with proper validation

**Story Dependencies**: None (foundational)

---

## Phase 5: User Story 2 - Manage Multiple Characters (P1)

**Goal**: Implement character creation, listing, progression tracking (XP, level, items, ability cards)

**Independent Test**: Create multiple characters → level up → add items → verify each character maintains separate state

### Test Tasks (TDD - Write Tests First)

- [ ] T101 [P] [US2] Write unit test for CharacterService.createCharacter() in backend/tests/unit/character.service.test.ts: Test character creation with class selection, verify default stats from CharacterClass
- [ ] T102 [P] [US2] Write unit test for CharacterService.listUserCharacters(): Test retrieving all characters for a user
- [ ] T103 [P] [US2] Write unit test for CharacterService.getCharacter(): Test retrieving single character with full details
- [ ] T104 [P] [US2] Write unit test for CharacterService.updateExperience(): Test XP increase, verify level-up when threshold reached
- [ ] T105 [P] [US2] Write unit test for CharacterService.levelUp(): Test level increase, max health update, ability card unlocking
- [ ] T106 [P] [US2] Write unit test for CharacterService.addItemToInventory(): Test item addition to character inventory
- [ ] T107 [P] [US2] Write unit test for CharacterService.deleteCharacter(): Test character deletion (only if not in active game)
- [ ] T108 [P] [US2] Write integration test for create character → gain XP → level up → add item flow
- [ ] T109 [P] [US2] Write contract test for POST /api/characters: Test character creation endpoint
- [ ] T110 [P] [US2] Write contract test for GET /api/characters: Test character list endpoint
- [ ] T111 [P] [US2] Write contract test for GET /api/characters/:id: Test character details endpoint
- [ ] T112 [P] [US2] Write contract test for PATCH /api/characters/:id/experience: Test XP update endpoint
- [ ] T113 [P] [US2] Write contract test for PATCH /api/characters/:id/level-up: Test level-up endpoint
- [ ] T114 [P] [US2] Write contract test for POST /api/characters/:id/items: Test add item endpoint

### Implementation Tasks

- [ ] T115 [US2] Create backend/src/types/character.types.ts: Define CreateCharacterDto, UpdateCharacterDto, CharacterResponse interfaces
- [ ] T116 [US2] Create backend/src/services/character.service.ts: Implement CharacterService class structure
- [ ] T117 [US2] Implement CharacterService.createCharacter(): Validate classId exists, fetch CharacterClass, create Character with default stats (level 1, starting health, empty inventory)
- [ ] T118 [US2] Implement CharacterService.listUserCharacters(): Query characters by userId, include class data, return list
- [ ] T119 [US2] Implement CharacterService.getCharacter(): Query single character with includes (class, items, ability cards), return full details
- [ ] T120 [US2] Implement CharacterService.updateExperience(): Add XP to character, check if level-up threshold reached, auto-level if needed
- [ ] T121 [US2] Implement level-up logic: Calculate XP thresholds per level, increment level, update max health from CharacterClass data
- [ ] T122 [US2] Implement CharacterService.addItemToInventory(): Add item to character's inventory JSON field, update database
- [ ] T123 [US2] Implement CharacterService.deleteCharacter(): Check currentGameId is null (not in active game), delete character if allowed
- [ ] T124 [US2] Create backend/src/routes/character.routes.ts: Define routes: POST /api/characters, GET /api/characters, GET /api/characters/:id, PATCH /api/characters/:id/experience, PATCH /api/characters/:id/level-up, POST /api/characters/:id/items, DELETE /api/characters/:id
- [ ] T124-V1 [P1] [US2] Implement character name sanitization in backend/src/services/character.service.ts: Validate name length (min 1, max 30), sanitize for XSS (no HTML tags), test SQL injection attempts, trim whitespace
- [ ] T124-V2 [P1] [US2] Apply validation to character routes in backend/src/routes/character.routes.ts: Add validation middleware to POST /characters and PATCH /characters/:id, validate classId exists, validate userId matches authenticated user
- [ ] T124-E1 [P1] [US2] Standardize character error responses in backend/src/routes/character.routes.ts: Return 404 for not found, 403 for unauthorized access (wrong user), 400 for invalid classId, 409 for character already in game (can't delete), document error codes
- [ ] T125 [US2] Protect all character routes with authenticateJWT middleware
- [ ] T126 [US2] Implement createCharacter route handler: Extract userId from JWT, validate classId, call CharacterService.createCharacter()
- [ ] T127 [US2] Implement listCharacters route handler: Extract userId from JWT, call CharacterService.listUserCharacters()
- [ ] T128 [US2] Implement getCharacter route handler: Validate character ownership (userId matches), call CharacterService.getCharacter()
- [ ] T129 [US2] Implement updateExperience route handler: Validate ownership, call CharacterService.updateExperience()
- [ ] T130 [US2] Implement levelUp route handler: Validate ownership, check XP sufficient, call level-up logic
- [ ] T131 [US2] Implement addItem route handler: Validate ownership and itemId, call CharacterService.addItemToInventory()
- [ ] T132 [US2] Implement deleteCharacter route handler: Validate ownership, call CharacterService.deleteCharacter()
- [ ] T133 [US2] Add character routes to backend/src/server.ts: Mount router at /api/characters
- [ ] T134 [US2] Run all US2 tests: `npm test -- character` and verify all pass

### Frontend Tasks

- [ ] T135 [P] [US2] Create frontend/src/types/character.types.ts: Define Character, CharacterClass, CreateCharacterRequest interfaces
- [ ] T136 [P] [US2] Create frontend/src/services/character.service.ts: Implement CharacterService with methods: create, list, get, updateExperience, levelUp, addItem, delete
- [ ] T137 [US2] Implement CharacterService.create(): POST to /api/characters with classId, include auth token
- [ ] T138 [US2] Implement CharacterService.list(): GET /api/characters, return user's characters
- [ ] T139 [US2] Implement CharacterService.get(): GET /api/characters/:id, return character details
- [ ] T140 [P] [US2] Create frontend/src/components/character/CharacterList.tsx: Display list of user's characters with name, class, level, XP, health
- [ ] T141 [P] [US2] Create frontend/src/components/character/CreateCharacterForm.tsx: Form to select class and enter character name
- [ ] T142 [P] [US2] Create frontend/src/components/character/CharacterDetails.tsx: Display full character details including inventory, ability cards, perks
- [ ] T142-R1 [P1] [US2] Test character list responsive layout in frontend/tests/unit/CharacterList.responsive.test.tsx: Test cards stack vertically on mobile (375px), use grid on tablet/desktop (768px+), selection works with touch gestures, no content overflow
- [ ] T142-A1 [P1] [US2] Test character list accessibility in frontend/tests/unit/CharacterList.a11y.test.tsx: Test no axe violations, semantic HTML (article/heading), keyboard accessible selection (Arrows/Enter), character details announced to screen readers, delete/edit buttons have accessible labels
- [ ] T142-A2 [P1] [US2] Test character creation form accessibility in frontend/tests/unit/CharacterCreate.a11y.test.tsx: Test no axe violations, class selection keyboard accessible (radio group), class descriptions announced, form validation errors accessible
- [ ] T142-C1 [P1] [US2] Test concurrent character XP updates in backend/tests/integration/character-concurrency.test.ts: Test two simultaneous XP update requests, verify Prisma transactions prevent lost updates, both increments applied, document expected behavior
- [ ] T142-C2 [P1] [US2] Test character inventory race conditions in backend/tests/integration/character-inventory-race.test.ts: Test simultaneous item additions, verify both added (no lost updates), test item removal races, test equipped item conflicts (same slot)
- [ ] T143 [US2] Add CharacterList to appropriate page (e.g., /characters route)
- [ ] T144 [US2] Add CreateCharacterForm to character creation page
- [ ] T145 [US2] Add CharacterDetails to character detail page (/characters/:id route)
- [ ] T146 [US2] Test frontend create character flow: Select class, create character, verify appears in list
- [ ] T147 [US2] Test frontend character list: Create multiple characters, verify all appear with correct data
- [ ] T148 [US2] Test frontend character details: Click character in list, verify details page shows full info

**US2 Completion Criteria**:
- ✅ All US2 tests pass
- ✅ User can create multiple characters with class selection
- ✅ Each character starts with default stats from class template
- ✅ Character XP can be updated and level-up works
- ✅ Items can be added to character inventory
- ✅ Character list displays all user's characters separately
- ✅ Character details page shows full progression

**Story Dependencies**: US1 (requires authentication)

---

## Phase 6: User Story 3 - Join and Track Multiple Games (P1)

**Goal**: Implement game creation, joining games with characters, game state persistence with event sourcing, character-to-game cardinality enforcement

**Independent Test**: Create user → create 2 characters → join 2 games with different characters → verify game states don't interfere → verify same character cannot join 2 games

### Test Tasks (TDD - Write Tests First)

- [ ] T149 [P] [US3] Write unit test for GameService.createGame() in backend/tests/unit/game.service.test.ts: Test game creation with room code generation, scenario selection
- [ ] T150 [P] [US3] Write unit test for GameService.joinGame(): Test character joining game, verify currentGameId set on character
- [ ] T151 [P] [US3] Write unit test for GameService.joinGame(): Test rejection when character already in active game (currentGameId not null)
- [ ] T152 [P] [US3] Write unit test for GameService.listUserGames(): Test retrieving all games user has joined
- [ ] T153 [P] [US3] Write unit test for GameService.getGameState(): Test retrieving current game state (latest snapshot + recent events)
- [ ] T154 [P] [US3] Write unit test for GameService.appendGameEvent(): Test event appending, snapshot creation every 20 events
- [ ] T155 [P] [US3] Write unit test for GameService.leaveGame(): Test character leaving game, verify currentGameId cleared
- [ ] T156 [P] [US3] Write unit test for GameService.completeGame(): Test game completion, verify all characters' currentGameId cleared
- [ ] T157 [P] [US3] Write integration test for create game → 2 users join → game state updates → both users see changes
- [ ] T158 [P] [US3] Write integration test for character in game A → attempt to join game B → verify rejection
- [ ] T159 [P] [US3] Write contract test for POST /api/games: Test game creation endpoint
- [ ] T160 [P] [US3] Write contract test for POST /api/games/:roomCode/join: Test join game endpoint
- [ ] T161 [P] [US3] Write contract test for GET /api/games: Test user's games list endpoint
- [ ] T162 [P] [US3] Write contract test for GET /api/games/:roomCode/state: Test get game state endpoint
- [ ] T163 [P] [US3] Write contract test for POST /api/games/:roomCode/events: Test append event endpoint
- [ ] T164 [P] [US3] Write contract test for POST /api/games/:roomCode/leave: Test leave game endpoint

### Implementation Tasks

- [ ] T165 [US3] Create backend/src/types/game.types.ts: Define CreateGameDto, JoinGameDto, GameEventDto, GameStateResponse interfaces
- [ ] T166 [US3] Create backend/src/services/game.service.ts: Implement GameService class structure
- [ ] T167 [US3] Implement GameService.createGame(): Generate unique 6-char room code, validate scenarioId, create Game with status LOBBY
- [ ] T168 [US3] Implement room code generation: Random alphanumeric, check uniqueness in database, retry if collision
- [ ] T169 [US3] Implement GameService.joinGame(): Validate character exists and belongs to user, check character.currentGameId === null, set character.currentGameId = gameId atomically
- [ ] T170 [US3] Add error handling for duplicate join attempt: Return clear error "Character already in active game"
- [ ] T171 [US3] Implement GameService.listUserGames(): Query games where user has a character joined, return game list with room codes and status
- [ ] T172 [US3] Implement GameService.getGameState(): Load latest GameState snapshot, load GameEvents since snapshot (sequenceNum > snapshot.sequenceNum), replay events to reconstruct current state
- [ ] T173 [US3] Implement event replay logic: Apply each event to state object based on eventType (MOVE, ATTACK, etc.)
- [ ] T174 [US3] Implement GameService.appendGameEvent(): Create GameEvent with auto-increment sequenceNum, check if sequenceNum % 20 === 0, if yes create GameState snapshot
- [ ] T175 [US3] Implement snapshot creation: Serialize current game state to JSONB, store in GameState table with sequenceNum
- [ ] T176 [US3] Implement GameService.leaveGame(): Set character.currentGameId = null, remove character from game
- [ ] T177 [US3] Implement GameService.completeGame(): Set game.status = COMPLETED, clear currentGameId for all characters in game
- [ ] T178 [US3] Create backend/src/routes/game.routes.ts: Define routes: POST /api/games, POST /api/games/:roomCode/join, GET /api/games, GET /api/games/:roomCode/state, POST /api/games/:roomCode/events, POST /api/games/:roomCode/leave, POST /api/games/:roomCode/complete
- [ ] T178-V1 [P1] [US3] Implement game event validation in backend/src/services/game.service.ts: Validate event structure matches schema, sanitize JSONB data (no code execution), validate event size <1MB (DoS prevention), test malicious JSONB rejected, validate eventType is whitelisted
- [ ] T178-V2 [P1] [US3] Test JSONB injection attempts in backend/tests/integration/jsonb-security.test.ts: Test SQL injection in JSONB, extremely large payloads >10MB, deeply nested objects (DoS), circular references, verify all rejected with 400
- [ ] T178-V3 [P1] [US3] Apply validation to game routes in backend/src/routes/game.routes.ts: Add validation middleware to POST /games, POST /games/:id/events, PATCH /games/:id, validate all JSONB fields before database insert
- [ ] T178-E1 [P1] [US3] Standardize game error responses in backend/src/routes/game.routes.ts: Return 404 for game not found, 409 for character already in game (CHAR_ALREADY_IN_GAME), 403 for unauthorized access, 400 for invalid state transitions, 409 for duplicate room code, document error codes
- [ ] T178-E2 [P1] [US3] Test game error scenarios in backend/tests/integration/game-errors.test.ts: Test join with character already in game→409, invalid characterId→400, non-existent game→404, submit event to game not in→403, verify error codes and messages
- [ ] T179 [US3] Protect all game routes with authenticateJWT middleware
- [ ] T180 [US3] Implement createGame route handler: Extract userId, validate scenarioId, call GameService.createGame()
- [ ] T181 [US3] Implement joinGame route handler: Extract userId and characterId from request, validate ownership, call GameService.joinGame()
- [ ] T182 [US3] Implement listGames route handler: Extract userId, call GameService.listUserGames()
- [ ] T183 [US3] Implement getGameState route handler: Validate user is in game, call GameService.getGameState()
- [ ] T184 [US3] Implement appendEvent route handler: Validate user is in game, call GameService.appendGameEvent()
- [ ] T185 [US3] Implement leaveGame route handler: Validate user in game, call GameService.leaveGame()
- [ ] T186 [US3] Implement completeGame route handler: Validate user in game, call GameService.completeGame()
- [ ] T187 [US3] Add game routes to backend/src/server.ts: Mount router at /api/games
- [ ] T188 [US3] Run all US3 tests: `npm test -- game` and verify all pass

### Frontend Tasks

- [ ] T189 [P] [US3] Create frontend/src/types/game.types.ts: Define Game, GameState, GameEvent, JoinGameRequest interfaces
- [ ] T190 [P] [US3] Create frontend/src/services/game.service.ts: Implement GameService with methods: create, join, list, getState, leaveGame
- [ ] T191 [US3] Implement GameService.create(): POST to /api/games with scenarioId, return room code
- [ ] T192 [US3] Implement GameService.join(): POST to /api/games/:roomCode/join with characterId, handle "character already in game" error
- [ ] T193 [US3] Implement GameService.list(): GET /api/games, return user's active games
- [ ] T194 [US3] Implement GameService.getState(): GET /api/games/:roomCode/state, return current game state
- [ ] T195 [P] [US3] Create frontend/src/components/game/GameList.tsx: Display list of user's games with room code, status, characters
- [ ] T196 [P] [US3] Create frontend/src/components/game/JoinGameForm.tsx: Form to enter room code and select character, handle character-already-in-game error
- [ ] T196-R1 [P1] [US3] Test game board responsive controls in frontend/tests/unit/GameBoard.responsive.test.tsx: Test game controls accessible on mobile, ability cards readable at 375px, pinch-to-zoom works (using gestures.test.ts patterns), turn order wraps on narrow screens
- [ ] T196-A1 [P1] [US3] Test game board accessibility in frontend/tests/unit/GameBoard.a11y.test.tsx: Test no axe violations, ability card selection keyboard accessible, hex grid keyboard navigation (Arrows), turn order announced to screen readers, game state changes announced (aria-live)
- [ ] T196-A2 [P2] [US3] Test color contrast compliance in frontend/tests/unit/GameBoard.contrast.test.tsx: Test all text meets 4.5:1 contrast, UI elements 3:1, elemental infusion colors distinguishable, enemy health bars sufficient contrast
- [ ] T196-C1 [P1] [US3] Test character already in game validation in backend/tests/integration/character-one-game.test.ts: Test two simultaneous game join requests with same character, verify constraint prevents multiple games, clear error for second request, test Character.currentGameId uniqueness
- [ ] T196-C2 [P2] [US3] Test game state concurrent event inserts in backend/tests/integration/game-event-concurrency.test.ts: Test multiple players submit events simultaneously, verify GameEvent.sequenceNumber increments correctly, no duplicate sequence numbers, event ordering matches submission
- [ ] T196-P1 [P2] [US3] Benchmark game state queries in backend/tests/performance/game.bench.ts: Benchmark state retrieval (4 players + 20 monsters, target <100ms), event insertion (<50ms), snapshot creation (<200ms), test JSONB with varying sizes (1MB, 5MB, 10MB)
- [ ] T197 [US3] Add GameList to games page (/games route)
- [ ] T198 [US3] Add JoinGameForm to join game page
- [ ] T199 [US3] Test frontend create game flow: Create game, verify room code displayed
- [ ] T200 [US3] Test frontend join game flow: Join with character, verify game appears in list
- [ ] T201 [US3] Test frontend join validation: Try joining 2 games with same character, verify error message displayed

**US3 Completion Criteria**:
- ✅ All US3 tests pass
- ✅ User can create games with unique room codes
- ✅ User can join games with characters
- ✅ System enforces one character = one active game
- ✅ Game state persists using event sourcing
- ✅ Snapshots created every 20 events
- ✅ Users can list all their active games
- ✅ Game state can be retrieved and displays correctly
- ✅ Characters can leave games and currentGameId is cleared

**Story Dependencies**: US1 (auth), US2 (characters exist)

---

## Phase 7: User Story 4 - Character Progression Persistence (P2)

**Goal**: Implement perks system, card enhancements, ability card unlocking, attack modifier deck customization

**Independent Test**: Create character → earn checkmarks → select perks → enhance cards → verify persists across sessions

### Test Tasks (TDD - Write Tests First)

- [ ] T202 [P] [US4] Write unit test for CharacterService.addPerk() in backend/tests/unit/character.service.test.ts: Test adding perk to character
- [ ] T203 [P] [US4] Write unit test for CharacterService.enhanceCard(): Test enhancing ability card, verify CardEnhancement created
- [ ] T204 [P] [US4] Write unit test for CharacterService.unlockAbilityCard(): Test unlocking card when leveling up
- [ ] T205 [P] [US4] Write unit test for CharacterService.getModifierDeck(): Test retrieving attack modifier deck with perk modifications
- [ ] T206 [P] [US4] Write integration test for perk selection → card enhancement → ability unlock flow
- [ ] T207 [P] [US4] Write contract test for POST /api/characters/:id/perks: Test add perk endpoint
- [ ] T208 [P] [US4] Write contract test for POST /api/characters/:id/card-enhancements: Test enhance card endpoint
- [ ] T209 [P] [US4] Write contract test for POST /api/characters/:id/ability-cards: Test unlock card endpoint
- [ ] T210 [P] [US4] Write contract test for GET /api/characters/:id/modifier-deck: Test get modifier deck endpoint

### Implementation Tasks

- [ ] T211 [US4] Update backend/src/types/character.types.ts: Add Perk, CardEnhancement, AbilityCardUnlock interfaces
- [ ] T212 [US4] Implement CharacterService.addPerk(): Add perk to character's perks JSON array, update database
- [ ] T213 [US4] Implement CharacterService.enhanceCard(): Create CardEnhancement record linking character, cardId, slot, enhancementType
- [ ] T214 [US4] Implement CharacterService.unlockAbilityCard(): Add card to character's unlocked cards when leveling up
- [ ] T215 [US4] Implement CharacterService.getModifierDeck(): Start with base deck, apply perk modifications (remove -1, add +1, etc.), return modified deck
- [ ] T216 [US4] Add routes to backend/src/routes/character.routes.ts: POST /api/characters/:id/perks, POST /api/characters/:id/card-enhancements, POST /api/characters/:id/ability-cards, GET /api/characters/:id/modifier-deck
- [ ] T217 [US4] Implement addPerk route handler: Validate ownership, validate perk available for character's class, call CharacterService.addPerk()
- [ ] T218 [US4] Implement enhanceCard route handler: Validate ownership, validate gold sufficient, call CharacterService.enhanceCard()
- [ ] T219 [US4] Implement unlockAbilityCard route handler: Validate ownership and level, call CharacterService.unlockAbilityCard()
- [ ] T220 [US4] Implement getModifierDeck route handler: Validate ownership, call CharacterService.getModifierDeck()
- [ ] T221 [US4] Run all US4 tests: `npm test -- character.*perk|character.*enhance` and verify all pass

### Frontend Tasks

- [ ] T222 [P] [US4] Update frontend/src/types/character.types.ts: Add Perk, CardEnhancement types
- [ ] T223 [P] [US4] Update frontend/src/services/character.service.ts: Add methods: addPerk, enhanceCard, unlockCard, getModifierDeck
- [ ] T224 [US4] Implement CharacterService.addPerk(): POST to /api/characters/:id/perks
- [ ] T225 [US4] Implement CharacterService.enhanceCard(): POST to /api/characters/:id/card-enhancements
- [ ] T226 [P] [US4] Create frontend/src/components/character/PerkSelection.tsx: Display available perks for character class, allow selection
- [ ] T227 [P] [US4] Create frontend/src/components/character/CardEnhancement.tsx: Display ability cards, allow enhancement selection and application
- [ ] T228 [P] [US4] Create frontend/src/components/character/ModifierDeck.tsx: Display attack modifier deck with perk modifications applied
- [ ] T229 [US4] Add PerkSelection to character details page
- [ ] T230 [US4] Add CardEnhancement to character details page
- [ ] T231 [US4] Add ModifierDeck to character details page
- [ ] T232 [US4] Test frontend perk selection: Select perk, verify persists in character details
- [ ] T233 [US4] Test frontend card enhancement: Enhance card, verify enhancement appears in character details

**US4 Completion Criteria**:
- ✅ All US4 tests pass
- ✅ User can select perks for characters
- ✅ User can enhance ability cards
- ✅ Card enhancements persist and display correctly
- ✅ Attack modifier deck reflects perk modifications
- ✅ Ability cards unlock at appropriate levels

**Story Dependencies**: US2 (characters exist)

---

## Phase 8: User Story 5 - Support Future Campaign System (P3)

**Goal**: Verify Campaign schema exists and relationships work (no features implemented, just schema validation)

**Independent Test**: Create campaign → associate characters → verify database relationships work

### Test Tasks (TDD - Write Tests First)

- [ ] T234 [P] [US5] Write integration test for Campaign creation in backend/tests/integration/campaign.integration.test.ts: Test creating campaign with name, prosperity, reputation
- [ ] T235 [P] [US5] Write integration test for associating characters with campaign: Test setting character.campaignId
- [ ] T236 [P] [US5] Write integration test for querying campaign with characters: Test loading campaign with all associated characters

### Implementation Tasks

- [ ] T237 [US5] Create backend/src/types/campaign.types.ts: Define Campaign, CampaignResponse interfaces (schema only)
- [ ] T238 [US5] Create backend/src/services/campaign.service.ts: Implement CampaignService class structure (placeholder methods)
- [ ] T239 [US5] Implement CampaignService.createCampaign(): Create Campaign record with name, prosperityLevel=1, reputation=0, completedScenarios=[]
- [ ] T240 [US5] Implement CampaignService.associateCharacter(): Set character.campaignId = campaignId
- [ ] T241 [US5] Implement CampaignService.getCampaign(): Load campaign with associated characters
- [ ] T242 [US5] Create backend/src/routes/campaign.routes.ts: Define routes: POST /api/campaigns (create only), GET /api/campaigns/:id, POST /api/campaigns/:id/characters (associate character)
- [ ] T243 [US5] Protect campaign routes with authenticateJWT middleware
- [ ] T244 [US5] Implement createCampaign route handler: Call CampaignService.createCampaign()
- [ ] T245 [US5] Implement getCampaign route handler: Call CampaignService.getCampaign()
- [ ] T246 [US5] Implement associateCharacter route handler: Validate ownership, call CampaignService.associateCharacter()
- [ ] T247 [US5] Add campaign routes to backend/src/server.ts: Mount router at /api/campaigns (schema validation only, minimal implementation)
- [ ] T248 [US5] Run all US5 tests: `npm test -- campaign` and verify all pass
- [ ] T249 [US5] Verify schema migrations work: Run `npx prisma migrate dev` and check for errors
- [ ] T249-P1 [P2] [US5] Generate performance regression report in backend/tests/performance/regression-report.md: Run all performance benchmarks, compare to constitution targets, document regressions/concerns, generate optimization recommendations if targets not met

**US5 Completion Criteria**:
- ✅ All US5 tests pass
- ✅ Campaign schema exists in database
- ✅ Characters can be associated with campaigns (campaignId field)
- ✅ Database migrations work without errors
- ✅ Basic campaign CRUD endpoints exist (placeholder implementation)
- ✅ No full campaign features implemented (deferred as per spec)

**Story Dependencies**: US2 (characters exist)

---

## Phase 9: Polish & Cross-Cutting Concerns

**Goal**: Add user deletion, comprehensive error handling, logging, performance optimization, documentation

### Tasks

- [ ] T250 [P] Create backend/src/services/user.service.ts: Implement UserService for user management
- [ ] T251 [P] Implement UserService.deleteAccount(): Soft delete with username anonymization, invalidate all refresh tokens
- [ ] T252 [P] Write unit test for UserService.deleteAccount(): Test soft delete logic, username anonymization format
- [ ] T253 Add DELETE /api/users/me route to auth.routes.ts: Implement user deletion endpoint
- [ ] T254 Implement standardized error handling middleware in backend/src/middleware/error.middleware.ts: Catch all errors, format responses consistently
- [ ] T255 Add structured logging with Winston: Configure log levels, add correlation IDs for requests
- [ ] T256 Log authentication events: User registration, login, logout, failed attempts, account locks
- [ ] T257 Log character operations: Character creation, XP updates, level-ups
- [ ] T258 Log game operations: Game creation, joins, state updates, completions
- [ ] T259 Add database query logging in development: Log slow queries (>100ms)
- [ ] T260 Implement health check endpoint GET /api/health: Check database connection, return status
- [ ] T261 Add API documentation: Generate OpenAPI spec from route definitions
- [ ] T262 Create backend README.md: Document local setup, environment variables, running tests, database migrations
- [ ] T263 Create frontend README.md: Document local setup, environment variables, running dev server
- [ ] T263-A1 [P2] Generate accessibility audit report in docs/accessibility-audit.md: Run axe DevTools on all pages, test keyboard navigation on all flows, test screen reader compatibility (NVDA/JAWS/VoiceOver), document WCAG 2.1 AA violations, create remediation plan
- [ ] T264 Add database indexes verification script: Check all expected indexes exist
- [ ] T265 Run full test suite: `npm test` in backend and frontend, verify all tests pass
- [ ] T266 Run linter: `npm run lint` in backend and frontend, fix any warnings
- [ ] T267 Run type check: `npx tsc --noEmit` in backend and frontend, fix any errors
- [ ] T268 Test end-to-end user flow: Register → login → create character → join game → verify persistence
- [ ] T269 Test rate limiting manually: Attempt 6 failed logins, verify account lock, wait 15 min, verify unlock
- [ ] T270 Test soft delete: Delete account, verify username anonymized, attempt login (should fail), verify game history preserved

**Phase 9 Completion Criteria**:
- ✅ User account deletion works (soft delete with anonymization)
- ✅ Error handling is consistent across all endpoints
- ✅ Logging captures all important events
- ✅ Health check endpoint works
- ✅ API documentation generated
- ✅ README files document setup and testing
- ✅ All tests pass
- ✅ Linter and type check pass
- ✅ End-to-end flows work

---

## Dependencies & Execution Order

### Story Dependencies Graph

```
Phase 1 (Setup) → Phase 2 (Schema) → Phase 3 (Seed Data)
                                              ↓
                                    Phase 4 (US1: Auth)
                                              ↓
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                        Phase 5 (US2: Characters)    [Parallel]
                                    ↓
                        Phase 6 (US3: Games)
                                    ↓
                        ┌───────────┴───────────┐
                        ↓                       ↓
            Phase 7 (US4: Progression)  Phase 8 (US5: Campaign)
                        ↓                       ↓
                        └───────────┬───────────┘
                                    ↓
                            Phase 9 (Polish)
```

### Required Completion Before Story Start

- **US1 (Auth)**: Phases 1, 2, 3 complete
- **US2 (Characters)**: US1 complete (auth required)
- **US3 (Games)**: US1 + US2 complete (need auth + characters)
- **US4 (Progression)**: US2 complete (need characters)
- **US5 (Campaign)**: US2 complete (need characters for association)
- **Polish**: All user stories complete

### Parallelization Opportunities

**Within Phase 4 (US1)**:
- T054-T069 (test writing) can all run in parallel
- T087-T088, T094-T095 (frontend components) can run in parallel

**Within Phase 5 (US2)**:
- T101-T114 (test writing) can all run in parallel
- T135-T136, T140-T142 (frontend components) can run in parallel

**Within Phase 6 (US3)**:
- T149-T164 (test writing) can all run in parallel
- T189-T190, T195-T196 (frontend components) can run in parallel

**Within Phase 7 (US4)**:
- T202-T210 (test writing) can all run in parallel
- T222-T223, T226-T228 (frontend components) can run in parallel

**Within Phase 8 (US5)**:
- T234-T236 (test writing) can all run in parallel

**Across Stories** (if team has multiple developers):
- US4 and US5 can be implemented in parallel (both depend on US2 only)

---

## MVP Scope Recommendation

**Recommended MVP**: User Story 1 (US1) only

**Rationale**:
- US1 provides complete authentication foundation
- Demonstrates database persistence and JWT security
- Independently testable and deliverable
- Minimal scope for initial release
- All other stories build incrementally on US1

**MVP Deliverables**:
- User registration with username/password
- User login with JWT tokens (7-day access, 30-day refresh)
- Rate limiting (5 attempts per 15 min)
- Token refresh mechanism
- User logout
- Frontend forms for register/login
- All tests passing for US1

**Post-MVP Phases**:
- Phase 1: Add US2 (character management)
- Phase 2: Add US3 (game joining and persistence)
- Phase 3: Add US4 (advanced character progression)
- Phase 4: Add US5 (campaign schema validation)
- Phase 5: Polish and production hardening

---

## Task Summary

**Total Tasks**: 270
**Test Tasks**: 66 (TDD approach per constitution)
**Implementation Tasks**: 204

**Tasks by Phase**:
- Phase 1 (Setup): 13 tasks
- Phase 2 (Schema): 27 tasks
- Phase 3 (Seed Data): 13 tasks
- Phase 4 (US1 - Auth): 47 tasks (16 tests + 31 implementation)
- Phase 5 (US2 - Characters): 48 tasks (14 tests + 34 implementation)
- Phase 6 (US3 - Games): 53 tasks (16 tests + 37 implementation)
- Phase 7 (US4 - Progression): 32 tasks (9 tests + 23 implementation)
- Phase 8 (US5 - Campaign): 16 tasks (3 tests + 13 implementation)
- Phase 9 (Polish): 21 tasks

**Parallel Opportunities**: 66 tasks marked [P] can be parallelized

**Independent User Stories**: Each story (US1-US5) is independently testable per acceptance criteria

**Format Validation**: ✅ All tasks follow checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

---

## Implementation Strategy

1. **TDD Approach**: Write tests first for each feature (constitution requirement)
2. **Incremental Delivery**: Each user story is a complete, testable increment
3. **MVP First**: Start with US1 only, validate, then expand
4. **Parallel Development**: Use [P] markers to identify parallelizable tasks
5. **Database First**: Complete schema before starting user story implementation
6. **Test Coverage**: Aim for 80%+ code coverage per constitution
7. **Performance**: Run benchmarks after each phase to verify <50ms auth, <100ms game state targets

---

**Ready for Implementation**: All tasks defined, dependencies clear, format validated, MVP scope identified.
