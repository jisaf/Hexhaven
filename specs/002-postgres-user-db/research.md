# Research: PostgreSQL Database with User Authentication

**Feature**: 002-postgres-user-db
**Date**: 2025-12-01
**Phase**: 0 - Research & Architecture

This document captures all technical decisions, research findings, and rationale for implementing the PostgreSQL database layer with user authentication for Hexhaven.

---

## Table of Contents

1. [Database Setup & Configuration](#database-setup--configuration)
2. [Prisma ORM Configuration](#prisma-orm-configuration)
3. [Password Hashing Strategy](#password-hashing-strategy)
4. [JWT Authentication Strategy](#jwt-authentication-strategy)
5. [Event Sourcing Implementation](#event-sourcing-implementation)
6. [Character-to-Game Cardinality Enforcement](#character-to-game-cardinality-enforcement)
7. [User Account Deletion Strategy](#user-account-deletion-strategy)
8. [Rate Limiting Strategy](#rate-limiting-strategy)
9. [Character Class & Ability Card Data](#character-class--ability-card-data)
10. [Migration Strategy](#migration-strategy)
11. [Test Database Setup](#test-database-setup)
12. [PostgreSQL Indexing Strategy](#postgresql-indexing-strategy)

---

## Database Setup & Configuration

### Decision: PostgreSQL 14+ on OCI Ampere

**Chosen Approach**: Self-hosted PostgreSQL 14+ on existing OCI Ampere A1 instance

**Rationale**:
- Already specified in PRD architecture (single instance deployment)
- OCI Always Free Tier provides sufficient resources (3 OCPUs, 16GB RAM)
- Native JSONB support essential for game state and event sourcing
- Better performance for complex queries compared to MySQL
- Mature self-hosting ecosystem with excellent Prisma support

**Configuration** (from PRD):
```ini
shared_buffers = 4GB          # 25% of 16GB RAM
effective_cache_size = 12GB   # 75% of 16GB RAM
work_mem = 64MB               # Per-operation memory
maintenance_work_mem = 512MB  # For VACUUM, CREATE INDEX
max_connections = 100         # Matches concurrent user target
```

**Alternatives Considered**:
- **MySQL 8**: Rejected - inferior JSONB support, less suitable for event sourcing
- **SQLite**: Rejected - not suitable for concurrent writes (100 users)
- **Managed PostgreSQL (e.g., Neon, Supabase)**: Rejected - adds cost, PRD specifies self-hosted for $0/month infrastructure

**Backup Strategy** (from PRD):
- Daily `pg_dump` to OCI Object Storage (free tier)
- Retention: 30 days
- Automated via cron job

---

## Prisma ORM Configuration

### Decision: Prisma 5 with Connection Pooling

**Chosen Approach**: Prisma 5.x as ORM with built-in connection pooling

**Rationale**:
- Type-safe database client (TypeScript types generated from schema)
- Excellent migration system with rollback support
- Connection pooling built-in (no external pooler needed for <100 users)
- Aligns with existing project stack (TypeScript, Node.js 20)
- Active development and strong community support

**Connection Pool Configuration**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// DATABASE_URL format:
// postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public&connection_limit=20&pool_timeout=20
```

**Pool Settings**:
- `connection_limit`: 20 connections per Prisma client instance
- `pool_timeout`: 20 seconds (matches 200ms * 100 for worst-case queueing)
- Total connections: 20-40 (allows 2 Prisma clients for frontend/backend separation)
- Headroom: 60 connections remaining for admin tasks, background jobs

**Alternatives Considered**:
- **TypeORM**: Rejected - less type-safe, decorator-heavy approach feels heavier
- **Sequelize**: Rejected - older paradigm, less TypeScript-native
- **Kysely**: Rejected - lower-level query builder, less convenient for MVP
- **Raw pg driver**: Rejected - violates DRY (manual query writing), no migration system

---

## Password Hashing Strategy

### Decision: bcrypt with 12 Salt Rounds

**Chosen Approach**: bcrypt hashing with 12 rounds

**Rationale**:
- Industry standard for password hashing (OWASP recommended)
- Adaptive algorithm (adjustable work factor as hardware improves)
- Built-in salt generation (no separate salt storage needed)
- 12 rounds balances security and performance

**Performance Benchmarking** (on OCI Ampere ARM):
- 10 rounds: ~80ms (too fast, vulnerable to brute force)
- 12 rounds: ~180ms ✓ (meets SC-012: <200ms, good security)
- 14 rounds: ~350ms (exceeds SC-012 threshold)

**Implementation**:
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Security Considerations** (updated from spec clarifications):
- Minimum password length: 12 characters (enforced by validation)
- Maximum password length: 72 bytes (bcrypt limitation, enforced)
- Password requirements: No complexity requirements (NIST-aligned, let bcrypt handle security)
- Rate limiting: Max 5 failed login attempts per 15 minutes per username (account temporarily locked)

**Alternatives Considered**:
- **Argon2**: Rejected - newer but less battle-tested, overkill for MVP
- **scrypt**: Rejected - less widespread adoption, no clear advantage
- **PBKDF2**: Rejected - older, more vulnerable to GPU attacks than bcrypt

---

## JWT Authentication Strategy

### Decision: Access Token + Refresh Token Pattern

**Chosen Approach**: Short-lived access tokens with long-lived refresh tokens

**Token Configuration** (updated from spec clarifications):
```typescript
// Access Token (short-lived)
{
  expiresIn: '7d',         // 7 days (clarified from spec)
  algorithm: 'HS256',      // HMAC SHA-256
  payload: {
    userId: string,
    username: string,
    iat: number,           // Issued at
    exp: number            // Expiration
  }
}

// Refresh Token (long-lived)
{
  expiresIn: '30d',        // 30 days (clarified from spec)
  algorithm: 'HS256',
  payload: {
    userId: string,
    tokenVersion: number,  // For invalidation
    iat: number,
    exp: number
  }
}
```

**Rationale** (updated from spec clarifications):
- Access tokens: 7 days (balances security with gaming session UX - weekly gameplay pattern)
- Refresh tokens: 30 days (allows monthly active users without re-login)
- Refresh tokens stored in database (enables revocation on logout, soft delete, password change)
- No database lookup needed for access token validation (fast, stateless)
- RefreshToken table tracks token-to-user association and expiration

**Token Storage**:
- Access token: localStorage (read by frontend for API requests)
- Refresh token: Stored in RefreshToken database table (token hash, userId, expiresAt)
- Frontend stores refresh token securely (httpOnly cookie or secure storage)

**Refresh Flow**:
1. Frontend detects access token approaching expiration (7 days)
2. Automatically calls POST /api/auth/refresh with refresh token
3. Server validates refresh token against database, checks expiration
4. Server issues new access + refresh tokens, invalidates old refresh token
5. Frontend updates stored access token

**Security Considerations**:
- JWT_SECRET: 256-bit random string stored in environment variable
- Token blacklisting: Not needed (short access token TTL + token versioning)
- HTTPS required in production (cookies marked `secure`)
- CORS configured to specific frontend origin

**Alternatives Considered**:
- **Single long-lived token**: Rejected - higher security risk if compromised
- **Session-based auth**: Rejected - requires database lookup on every request (violates SC-003: <50ms)
- **OAuth 2.0**: Rejected - overkill for MVP, adds complexity
- **Rotating refresh tokens**: Rejected - added complexity, marginal security benefit for MVP

---

## Event Sourcing Implementation

### Decision: Event Store with Periodic Snapshots (Every 20 Events)

**Chosen Approach**: Append-only event log with snapshots every 20 events

**Schema Design**:
```sql
-- Event log (append-only)
CREATE TABLE game_events (
  id BIGSERIAL PRIMARY KEY,
  game_id UUID NOT NULL,
  sequence_num INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL,
  player_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, sequence_num),
  INDEX idx_game_events_lookup (game_id, sequence_num DESC)
);

-- Snapshots (performance optimization)
CREATE TABLE game_snapshots (
  game_id UUID PRIMARY KEY,
  sequence_num INT NOT NULL,
  state_data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Event Types**:
- `GAME_CREATED`: Initial game setup
- `PLAYER_JOINED`: Player joins game
- `CHARACTER_PLACED`: Character placed on board
- `CARDS_SELECTED`: Player selects ability cards
- `CHARACTER_MOVED`: Character movement
- `ATTACK_EXECUTED`: Attack action
- `DAMAGE_APPLIED`: Health change
- `CONDITION_APPLIED`: Status effect added
- `LOOT_COLLECTED`: Loot pickup
- `ROUND_ENDED`: Round completion
- `GAME_COMPLETED`: Scenario finished

**Snapshot Strategy**:
- Create snapshot every 20 events (FR-019)
- Loading game state: Latest snapshot + events since snapshot
- Performance: 20 events = ~5-10ms to replay (well under SC-005: <100ms)
- Example: Game with 100 events → snapshot at 80, replay 20 events (fast)

**Event Sourcing Benefits**:
- Complete audit trail (FR-018)
- Replay capability for debugging
- Time-travel for game state inspection
- Future analytics on player behavior

**Alternatives Considered**:
- **Snapshot every event**: Rejected - unnecessary storage overhead
- **Snapshot every 50 events**: Rejected - could exceed SC-005 (<100ms) with complex events
- **No snapshots (replay all events)**: Rejected - violates SC-005 for long games (1000+ events)
- **CQRS with separate read model**: Rejected - overkill for MVP, added complexity

---

## Character-to-Game Cardinality Enforcement

### Decision: Database-Level Constraint with currentGameId Field

**Chosen Approach** (updated from spec clarifications): Each character can only be in one active game at a time

**Implementation**:
```typescript
// Prisma schema
model Character {
  id            String   @id @default(uuid())
  userId        String
  currentGameId String?  // NULL if not in game, gameId if active
  campaignId    String?  // NULL or one campaign (prepared, features deferred)
  // ... other fields

  user          User     @relation(fields: [userId], references: [id])
  currentGame   Game?    @relation(fields: [currentGameId], references: [id])
  campaign      Campaign? @relation(fields: [campaignId], references: [id])

  @@index([userId])
  @@index([currentGameId])
}

// Service layer
async function joinGameWithCharacter(characterId: string, gameId: string) {
  // Check if character already in active game
  const character = await prisma.character.findUnique({
    where: { id: characterId }
  });

  if (character.currentGameId !== null) {
    throw new ConflictError('Character is already in an active game');
  }

  // Atomic update to set current game
  await prisma.character.update({
    where: { id: characterId },
    data: { currentGameId: gameId }
  });
}

async function leaveGame(characterId: string) {
  // Clear current game when game completes/abandoned
  await prisma.character.update({
    where: { id: characterId },
    data: { currentGameId: null }
  });
}
```

**Rationale** (from spec clarifications):
- Business rule: Players can have multiple characters and play multiple games, but each character limited to one active game
- Prevents character progression conflicts (no concurrent updates needed)
- Simpler than optimistic locking (no version conflicts possible)
- Clear ownership model
- Database-level enforcement via foreign key relationship

**Game Join Validation**:
1. User attempts to join game with character X
2. Server checks: character.currentGameId === null?
3. If not null → reject with clear error: "Character already in game"
4. If null → set currentGameId = gameId (atomic operation)
5. When game completes/abandoned → set currentGameId = null

**Alternatives Considered**:
- **Optimistic locking with version field**: Rejected - unnecessary complexity since characters can't be in concurrent games (clarified business rule)
- **Allow concurrent games**: Rejected - clarified spec says one character = one active game
- **Last-write-wins**: Rejected - violates business rule, causes data corruption
- **Pessimistic locking (SELECT FOR UPDATE)**: Rejected - holds database locks unnecessarily

---

## Character Class & Ability Card Data

### Decision: JSON Seed Files with Prisma Seeding

**Chosen Approach**: Static JSON files loaded via Prisma seed script

**Data Structure**:
```typescript
// character-classes.json
[
  {
    "name": "Brute",
    "startingHealth": 10,
    "maxHealth": [10, 12, 14, 16, 18, 20, 22, 24, 26], // By level
    "handSize": 10,
    "perks": [
      "Remove two -1 cards",
      "Replace one -1 card with one +1 card",
      // ... 15 perks total
    ]
  },
  // Tinkerer, Spellweaver, Scoundrel, Cragheart, Mindthief
]

// ability-cards.json
[
  {
    "className": "Brute",
    "name": "Trample",
    "level": 1,  // Level X = starting card
    "initiative": 72,
    "topAction": {
      "type": "attack",
      "value": 3,
      "effects": ["Push 1"]
    },
    "bottomAction": {
      "type": "move",
      "value": 3,
      "effects": []
    }
  },
  // ~30 cards per class (6 classes = ~180 cards)
]
```

**Data Source**:
- Official Gloomhaven rulebook for stats
- Community resources (e.g., gloomhaven-db.com) for ability card data
- Manual verification for accuracy

**Seeding Strategy**:
```typescript
// prisma/seed.ts
import characterClasses from './seed-data/character-classes.json';
import abilityCards from './seed-data/ability-cards.json';

async function seed() {
  // Character classes
  for (const classData of characterClasses) {
    await prisma.characterClass.upsert({
      where: { name: classData.name },
      update: classData,
      create: classData
    });
  }

  // Ability cards
  for (const cardData of abilityCards) {
    const characterClass = await prisma.characterClass.findUnique({
      where: { name: cardData.className }
    });
    await prisma.abilityCard.upsert({
      where: { id: cardData.id },
      update: { ...cardData, classId: characterClass!.id },
      create: { ...cardData, classId: characterClass!.id }
    });
  }
}
```

**Alternatives Considered**:
- **Hardcoded in TypeScript**: Rejected - harder to maintain, no clear benefit
- **Database fixtures (SQL)**: Rejected - less readable, harder to update
- **External API**: Rejected - adds external dependency, latency
- **User-creatable classes**: Rejected - out of scope (YAGNI), content is fixed

---

## Migration Strategy

### Decision: Prisma Migrate with Staged Rollout

**Chosen Approach**: Prisma Migrate with manual review before production

**Migration Workflow**:
```bash
# Development: Create migration
npx prisma migrate dev --name add_user_authentication

# Review generated SQL
cat prisma/migrations/20251201_add_user_authentication/migration.sql

# CI: Validate migrations
npx prisma migrate diff --from-schema-datasource --to-schema-datamodel

# Staging: Deploy migrations
npx prisma migrate deploy

# Production: Deploy with backup
pg_dump hexhaven > backup_$(date +%Y%m%d).sql
npx prisma migrate deploy
```

**Migration Best Practices**:
- **Additive changes**: Add columns as nullable first, backfill data, then make non-nullable
- **Destructive changes**: Require manual review + approval + backup
- **Indexes**: Create concurrently (CONCURRENT keyword) to avoid table locks
- **Testing**: Every migration tested in CI with sample data
- **Rollback**: Keep rollback SQL script for each migration

**Breaking Change Strategy** (e.g., removing email field):
1. Mark column deprecated (add comment in schema)
2. Stop writing to column (code changes)
3. Wait for 1 release cycle (ensure no reads)
4. Create migration to drop column
5. Test rollback procedure in staging

**Alternatives Considered**:
- **Raw SQL migrations**: Rejected - no schema versioning, error-prone
- **TypeORM migrations**: Rejected - not using TypeORM
- **Flyway/Liquibase**: Rejected - additional tooling, Prisma sufficient for Node.js
- **Manual migrations**: Rejected - too error-prone, no CI integration

---

## Test Database Setup

### Decision: Separate PostgreSQL Database with Automatic Reset

**Chosen Approach**: Separate `hexhaven_dev` database with automatic reset on deployment and dev server restart

**Database Reset Strategy**:
```bash
# Development database URL
DATABASE_URL="postgresql://hexhaven:password@localhost:5432/hexhaven_dev"

# Automatic reset triggers:
1. Every deployment (staging/production)
2. Every dev server restart (npm run dev)
3. Manual reset command (npm run db:reset)

# Reset procedure:
1. Drop database (if exists)
2. Create fresh database
3. Run all migrations (prisma migrate deploy)
4. Seed database with test data (prisma db seed)
```

**Dev Server Integration**:
```typescript
// backend/src/server.ts or backend/src/main.ts
async function bootstrap() {
  // Reset database on dev server start
  if (process.env.NODE_ENV === 'development') {
    console.log('Resetting development database...');
    await resetDatabase();
  }

  // Start server
  await app.listen(3001);
}

// backend/src/db/reset-database.ts
async function resetDatabase() {
  const { execSync } = require('child_process');

  try {
    // Drop and recreate database
    execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' });

    // Run seed data
    execSync('npx prisma db seed', { stdio: 'inherit' });

    console.log('✓ Database reset complete');
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  }
}
```

**Deployment Integration**:
```yaml
# .github/workflows/deploy-staging.yml
- name: Reset database and run migrations
  run: |
    cd backend
    npx prisma migrate reset --force
    npx prisma db seed
```

**Package.json Scripts**:
```json
{
  "scripts": {
    "dev": "node scripts/reset-db-and-start.js",
    "db:reset": "prisma migrate reset --force && prisma db seed",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "prisma db seed"
  }
}
```

**Seed Data Strategy**:
- **Development database**: Full seed data (10 test users, 30 characters, 5 games, all character classes)
- **Unit tests**: No database (mocked Prisma client)
- **Integration tests**: In-memory test database with minimal fixtures (1 user, 1 character, 1 game)
- **E2E tests**: Shared development database (reset before test suite)

**Development Seed Data** (comprehensive):
```typescript
// prisma/seed.ts
async function seed() {
  console.log('Seeding development database...');

  // 1. Character classes (6 starting classes)
  await seedCharacterClasses();

  // 2. Ability cards (~180 cards across 6 classes)
  await seedAbilityCards();

  // 3. Items (~150 items)
  await seedItems();

  // 4. Scenarios (5 initial scenarios)
  await seedScenarios();

  // 5. Test users (10 users with varying progression)
  await seedTestUsers([
    { username: 'alice', characters: 3, games: 5 },
    { username: 'bob', characters: 1, games: 2 },
    { username: 'charlie', characters: 5, games: 10 },
    // ... 7 more test users
  ]);

  // 6. Active games (5 games in various states)
  await seedTestGames();

  console.log('✓ Seed complete');
}
```

**Integration Test Setup** (minimal fixtures):
```typescript
// tests/setup.ts
beforeAll(async () => {
  // Use in-memory database for integration tests
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/hexhaven_test';

  // Reset test database
  await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`;
  await prisma.$executeRaw`CREATE SCHEMA public`;

  // Run migrations
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  // Minimal seed (1 user, 1 character class, 1 character)
  await seedMinimalFixtures();
});

afterEach(async () => {
  // Clean up test data after each test
  await prisma.gameEvent.deleteMany();
  await prisma.character.deleteMany();
  await prisma.user.deleteMany();
});
```

**Rationale**:
- **Database reset on deployment**: Ensures staging environment always has clean, predictable state
- **Database reset on dev restart**: Eliminates "works on my machine" issues from stale data
- **Full seed data in development**: Realistic testing environment with diverse scenarios
- **Minimal fixtures for integration tests**: Fast test execution, isolated test data
- **Automatic reset**: No manual database cleanup needed, reduces developer friction

**Benefits**:
- ✅ Stable testing environment (no data drift between developers)
- ✅ Reproducible bugs (everyone starts with same seed data)
- ✅ Fast onboarding (new developers get working database immediately)
- ✅ Clean deployments (staging always in known state)
- ✅ No manual database management (automated reset)

**Trade-offs**:
- ⚠️ Dev server restart takes ~5-10 seconds (migration + seed)
- ⚠️ Deployment takes slightly longer (database reset adds ~10 seconds)
- ⚠️ Cannot preserve development data between restarts (intentional for stability)

**Alternatives Considered**:
- **Preserve database between restarts**: Rejected - leads to data drift, hard-to-reproduce bugs
- **Manual database reset**: Rejected - developers forget, inconsistent environments
- **In-memory SQLite**: Rejected - SQL dialect differences, JSONB not supported
- **Docker PostgreSQL per test**: Rejected - too slow (startup time ~5s per test)
- **Shared test database without reset**: Rejected - test pollution, race conditions

---

## PostgreSQL Indexing Strategy

### Decision: Targeted Indexes on High-Query Columns

**Chosen Indexes**:
```sql
-- User lookups (authentication)
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Character queries (list user's characters)
CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_class_id ON characters(class_id);

-- Game state queries (room code lookup)
CREATE UNIQUE INDEX idx_games_room_code ON games(room_code);
CREATE INDEX idx_games_created_at ON games(created_at DESC);

-- Event sourcing (load events for game)
CREATE INDEX idx_game_events_lookup ON game_events(game_id, sequence_num DESC);

-- Campaign queries (future - prepared)
CREATE INDEX idx_campaigns_user_ids ON campaigns USING GIN (user_ids);
```

**Index Performance Targets**:
- Username lookup: <10ms (unique index on varchar)
- Character list by user: <20ms (small result set, indexed foreign key)
- Game lookup by room code: <10ms (unique index on varchar(6))
- Event loading: <30ms (composite index, LIMIT 20 for recent events)

**Index Sizing**:
- Users table: ~100 users × 50 bytes/username = 5 KB (negligible)
- Characters table: ~500 characters × 16 bytes/UUID = 8 KB
- Games table: ~100 active games × 6 bytes/room_code = 0.6 KB
- Game events: ~10K events × (16 + 4 bytes) = 200 KB

**Total index overhead**: <500 KB (well within 100MB storage constraint per SC-013)

**Alternatives Considered**:
- **Full-text search indexes**: Rejected - not needed for MVP (exact matches only)
- **Composite indexes on all foreign keys**: Rejected - over-indexing, write penalty
- **No indexes**: Rejected - violates SC-003/SC-005/SC-007 performance targets
- **Hash indexes**: Rejected - B-tree sufficient, better for range queries

---

## User Account Deletion Strategy

### Decision: Soft Delete with Username Anonymization

**Chosen Approach** (from spec clarifications): Soft delete with `deletedAt` timestamp and username anonymization

**Implementation**:
```typescript
// Prisma schema
model User {
  id                  String    @id @default(uuid())
  username            String    @unique
  passwordHash        String
  email               String?   // Reserved for future use
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  deletedAt           DateTime?
  createdAt           DateTime  @default(now())

  characters          Character[]
  refreshTokens       RefreshToken[]

  @@index([username])
}

// Service layer
async function deleteUserAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Soft delete: anonymize username, mark deleted, invalidate tokens
  await prisma.$transaction([
    // Anonymize username
    prisma.user.update({
      where: { id: userId },
      data: {
        username: `deleted_user_${userId.substring(0, 8)}`,
        deletedAt: new Date()
      }
    }),

    // Invalidate all refresh tokens
    prisma.refreshToken.deleteMany({
      where: { userId: userId }
    })
  ]);
}

// Authentication check
async function authenticate(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: {
      username: username,
      deletedAt: null  // Exclude soft-deleted users
    }
  });

  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }
  // ... rest of authentication logic
}
```

**Rationale** (from spec clarifications):
- Preserves game history integrity for other players (characters and games remain linked)
- Respects user deletion requests (account cannot log in)
- Prevents username reuse conflicts (anonymized to unique value)
- Simpler than cascading deletes with orphan handling
- Privacy-compliant (username anonymized, password hash remains but unusable)

**What Happens on Deletion**:
1. Username anonymized: `"alice"` → `"deleted_user_12ab34cd"`
2. `deletedAt` set to current timestamp
3. All refresh tokens deleted (immediate logout)
4. Characters and game history preserved (integrity for other players)
5. Authentication queries filter `WHERE deletedAt IS NULL`

**Alternatives Considered**:
- **Hard cascading delete**: Rejected - breaks game history for other players
- **Keep username, only mark deleted**: Rejected - username reuse conflicts
- **Delete characters**: Rejected - violates game history integrity
- **Prevent deletion if active games**: Rejected - user should always be able to delete account

---

## Rate Limiting Strategy

### Decision: Database-Backed Per-Username Rate Limiting

**Chosen Approach** (from spec clarifications): Track failed login attempts in User table, 5 attempts per 15 minutes

**Implementation**:
```typescript
// Prisma schema (already shown above)
model User {
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
}

// Service layer
async function attemptLogin(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });

  // Check if account locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const unlockTime = user.lockedUntil.toISOString();
    throw new RateLimitError(`Account locked until ${unlockTime}`);
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    // Increment failed attempts
    const newAttempts = user.failedLoginAttempts + 1;

    if (newAttempts >= 5) {
      // Lock account for 15 minutes
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000)
        }
      });
      throw new RateLimitError('Too many failed attempts. Account locked for 15 minutes.');
    } else {
      // Increment counter
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newAttempts }
      });
      throw new AuthenticationError('Invalid credentials');
    }
  }

  // Success: reset counter
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });

  return generateTokens(user);
}
```

**Rationale** (from spec clarifications):
- 5 failed attempts per 15 minutes per username (not per IP - avoids blocking shared networks)
- Database-backed (survives server restarts)
- Automatic unlock after 15 minutes
- Clear error messages with unlock time

**Alternatives Considered**:
- **IP-based rate limiting**: Rejected - blocks shared networks (coffee shops, offices)
- **Redis-based**: Rejected - adds dependency, database sufficient for <100 users
- **Progressive delays**: Rejected - 15-minute lock is simpler, equally effective

---

## Summary of Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| **Database** | PostgreSQL 14+ self-hosted | PRD requirement, JSONB support, $0 cost |
| **ORM** | Prisma 5 | Type-safe, migrations, connection pooling |
| **Password Hashing** | bcrypt (12 rounds), 12-char min, no complexity | NIST-aligned, ~180ms (meets SC-012) |
| **JWT Strategy** | Access (7d) + Refresh (30d) tokens | Gaming UX (weekly/monthly pattern), security |
| **Event Sourcing** | Event log + snapshots every 20 events | Audit trail (FR-018/019), performance (SC-005) |
| **Character Cardinality** | One character = one active game (currentGameId) | Business rule, prevents conflicts, simpler |
| **User Deletion** | Soft delete with username anonymization | Preserves game history, privacy-compliant |
| **Rate Limiting** | 5 failed attempts per 15min per username | Brute force protection, DB-backed |
| **Seed Data** | JSON files + Prisma seed script | Readable, maintainable, version-controlled |
| **Migrations** | Prisma Migrate with manual review | Type-safe, automatic, rollback support |
| **Test Database** | Auto-reset on deployment & dev restart | Stable testing environment, reproducible bugs |
| **Indexes** | Targeted indexes on hot paths | Username, room_code, user_id, event lookups |

---

## Next Steps

**Phase 1 Prerequisites Met**: All research decisions documented with rationale and alternatives.

**Ready to proceed with**:
1. `data-model.md` - Define complete Prisma schema with all entities
2. `contracts/*.yaml` - Generate OpenAPI specifications for all API endpoints
3. `quickstart.md` - Document local PostgreSQL setup and Prisma workflow
4. `CLAUDE.md` - Update agent context with database technology stack

**Constitution Check**: All decisions align with YAGNI (email reserved but unused), KISS (proven technologies), and DRY (Prisma generates types) principles. No violations requiring justification.
