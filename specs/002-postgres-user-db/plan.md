# Implementation Plan: PostgreSQL Database with User Authentication

**Branch**: `002-postgres-user-db` | **Date**: 2025-12-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-postgres-user-db/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement PostgreSQL database layer with user authentication for the Hexhaven multiplayer Gloomhaven application. Users can create accounts with username/password authentication (email deferred), create and manage multiple characters that level up and gain items, and participate in multiple concurrent games with different characters. Database uses Prisma ORM for type-safe access, implements event sourcing with periodic snapshots for game state, and includes JWT-based session management with refresh tokens. Character-to-game relationship enforced (one character = one active game), soft delete with anonymization for user accounts, and rate limiting for authentication security.

## Technical Context

**Language/Version**: TypeScript (latest stable) for both backend and frontend
**Primary Dependencies**: Prisma 5 (ORM), PostgreSQL 14+ (database), bcrypt (password hashing), jsonwebtoken (JWT auth)
**Storage**: PostgreSQL 14+ with 4GB shared_buffers on OCI Ampere instance
**Testing**: Jest for unit/integration tests, contract tests for API endpoints, test database for isolation
**Target Platform**: OCI Ampere Linux server (backend), web browsers (frontend)
**Project Type**: Web application (backend API + frontend)
**Performance Goals**:
- Authentication queries <50ms (P95)
- Character data retrieval <50ms
- Game state queries <100ms for 4 players + 20 monsters
- Password hashing <200ms per attempt (bcrypt)
- Support 100 concurrent users without connection pool exhaustion

**Constraints**:
- Database connection pool <100 connections
- Game state JSONB <10MB per game
- Database storage for 100 users with 5 characters and 10 games <100MB
- Migrations complete <60 seconds

**Scale/Scope**:
- 100 concurrent users (MVP)
- ~10 entities (User, RefreshToken, Character, CharacterClass, AbilityCard, CardEnhancement, Item, Game, GameState, GameEvent, Campaign, Scenario)
- Event sourcing with snapshots every 20 events
- Soft delete user accounts with anonymization

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality & Maintainability
- ✅ **YAGNI**: Building only for current requirements (username/password auth, email deferred)
- ✅ **KISS**: Using Prisma ORM (industry-standard), direct PostgreSQL (no unnecessary abstraction layers)
- ✅ **DRY**: Centralized authentication logic, reusable Prisma client
- ✅ **Type Safety**: TypeScript with Prisma for end-to-end type safety
- ✅ **Single Responsibility**: Each entity/service has clear purpose

### II. Testing Standards
- ✅ **TDD Required**: All authentication, character, and game state operations will have tests written first
- ✅ **Test Types**: Unit (business logic), integration (database operations), contract (API endpoints)
- ✅ **Test Database**: Separate test database for isolation
- ✅ **CI Gates**: All tests must pass before merge

### III. User Experience Consistency
- ✅ **User Story Driven**: 5 prioritized user stories (P1-P3) in spec
- ✅ **Acceptance Criteria**: Each story has testable Given-When-Then scenarios
- ✅ **Error Handling**: Clear error messages for auth failures, validation errors, rate limiting
- ✅ **Cross-Platform**: Web responsive design (mobile/desktop)
- ✅ **i18n Ready**: Database schema supports future i18n (no assumptions in data model)

### IV. Performance Requirements
- ✅ **Targets Defined**: Authentication <50ms, game state <100ms, specific thresholds documented
- ✅ **Database Indexes**: On username, game room codes, foreign keys
- ✅ **Connection Pooling**: Prisma manages pool, <100 connections limit

### V. Documentation & Communication
- ✅ **AI-First**: Spec has clear entity definitions, explicit business rules
- ✅ **Specification First**: spec.md completed with clarifications
- ✅ **Planning Document**: This plan.md defines technical approach
- ✅ **API Documentation**: Will generate OpenAPI schema in Phase 1

### VI. Security & Reliability
- ✅ **Authentication**: bcrypt with >=10 salt rounds, 12-char minimum passwords
- ✅ **Rate Limiting**: 5 failed attempts per 15 minutes prevents brute force
- ✅ **JWT Security**: 7-day access tokens, 30-day refresh tokens stored in database
- ✅ **Input Validation**: Prisma schema validation + application-level checks
- ✅ **Soft Delete**: User account anonymization preserves data integrity
- ✅ **Secrets Management**: Database credentials in environment variables (not committed)

### Gates Status
**✅ ALL GATES PASSED** - No constitution violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-postgres-user-db/
├── spec.md              # Feature specification (completed with clarifications)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── auth.yaml        # Authentication endpoints
│   ├── characters.yaml  # Character management endpoints
│   └── games.yaml       # Game management endpoints
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Web Application Structure** (existing structure):

```text
backend/
├── src/
│   ├── db/                    # NEW: Database layer
│   │   ├── schema.prisma      # Prisma schema definition
│   │   ├── migrations/        # Database migrations
│   │   ├── seed.ts            # Seed data (character classes, items, scenarios)
│   │   └── client.ts          # Prisma client singleton
│   ├── services/              # NEW: Business logic services
│   │   ├── auth.service.ts    # Authentication (register, login, JWT, rate limiting)
│   │   ├── user.service.ts    # User management (soft delete, anonymization)
│   │   ├── character.service.ts # Character CRUD and progression
│   │   └── game.service.ts    # Game state persistence (event sourcing)
│   ├── middleware/            # NEW: Express middleware
│   │   ├── auth.middleware.ts # JWT verification
│   │   └── rate-limit.middleware.ts # Rate limiting
│   ├── routes/                # EXISTING: Express routes (will add auth routes)
│   ├── types/                 # EXISTING: TypeScript types
│   └── server.ts              # EXISTING: Express server
└── tests/
    ├── unit/                  # NEW: Unit tests for services
    ├── integration/           # NEW: Integration tests with test database
    └── contract/              # NEW: API contract tests

frontend/
├── src/
│   ├── services/              # EXISTING: Will add auth service
│   │   └── auth.service.ts    # NEW: Client-side auth (login, register, token management)
│   ├── components/            # EXISTING: React components
│   │   ├── auth/              # NEW: Auth UI components
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   └── character/         # NEW: Character management UI
│   │       └── CharacterList.tsx
│   ├── pages/                 # EXISTING: Page components
│   └── types/                 # EXISTING: TypeScript types (will add auth types)
└── tests/
    └── unit/                  # EXISTING: Component tests
```

**Structure Decision**: Using existing web application structure with backend/frontend split. Database layer added to backend with Prisma ORM. Authentication and user services are new additions. Character and game services integrate with existing game logic. Frontend adds authentication UI and character management components.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations to justify.** All design choices align with constitution principles (YAGNI, KISS, type safety, testing).


## Planning Status

**Phase 0: Research & Technology Decisions** ✅ COMPLETE
- All technology decisions documented in [research.md](./research.md)
- Spec clarifications integrated:
  - Password requirements: 12-char minimum, no complexity
  - JWT tokens: 7-day access, 30-day refresh
  - Character cardinality: One character = one active game
  - User deletion: Soft delete with anonymization
  - Rate limiting: 5 failed attempts per 15 minutes

**Phase 1: Design & Contracts** - Ready to proceed
- Next: Generate data-model.md with Prisma schema
- Next: Generate contracts/ with OpenAPI specifications
- Next: Generate quickstart.md with setup instructions
- Next: Update agent context with technology stack

**Phase 2: Task Breakdown** - Pending
- Will be generated by `/speckit.tasks` command after Phase 1 complete

---

**Last Updated**: 2025-12-01
**Status**: Plan updated with spec clarifications, research complete, ready for Phase 1
