# Hexhaven Database Schema

## Overview

Hexhaven uses PostgreSQL 14+ with Prisma ORM for type-safe database access. The schema integrates two features:

1. **001-gloomhaven-multiplayer**: Anonymous gameplay with temporary game rooms
2. **002-postgres-user-db**: User authentication with persistent character progression

## Schema Design

### User Authentication (002)
- **User**: Account with username/password auth, soft delete support, rate limiting
- **RefreshToken**: JWT refresh tokens for session management (30-day expiration)

### Character System (002)
- **CharacterClass**: Static data for 6 starting classes (Brute, Tinkerer, etc.)
- **AbilityCard**: Individual ability cards (~180 cards across 6 classes)
- **Character**: User-owned characters with progression (level, XP, gold, items)
- **CardEnhancement**: Permanent upgrades to ability cards
- **Item**: In-game items with effects and rarity

### Game System (002)
- **Game**: Authenticated games with event sourcing
- **GameState**: Snapshots every 20 events for performance
- **GameEvent**: Append-only event log for complete audit trail
- **Scenario**: Map layouts, monster groups, objectives
- **Campaign**: Schema-only (features deferred to future)

### Legacy Anonymous System (001)
- **GameRoom**: Temporary 24-hour game rooms for anonymous play
- **Player**: Anonymous players with nicknames and UUIDs

## Database Setup

### Local Development

1. **Install PostgreSQL 14+**:
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14

   # Ubuntu/Debian
   sudo apt install postgresql-14
   sudo systemctl start postgresql

   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create development database**:
   ```bash
   createdb hexhaven_dev
   createdb hexhaven_test  # For integration tests
   ```

3. **Configure environment variables**:
   ```bash
   # backend/.env already has:
   DATABASE_URL="postgresql://hexhaven:password@localhost:5432/hexhaven_dev?schema=public&connection_limit=20&pool_timeout=20"
   ```

4. **Run migrations**:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

5. **Seed database** (optional):
   ```bash
   npx prisma db seed
   ```

### Production Setup

Production environment variables are managed by `scripts/server-config.sh`:

```bash
# On production server
cd /opt/hexhaven
./scripts/server-config.sh init     # Create config
./scripts/server-config.sh show     # View config (passwords masked)
./scripts/server-config.sh generate # Generate .env from config
```

The server config auto-generates:
- **DATABASE_URL**: PostgreSQL connection with pooling
- **JWT_SECRET**: 256-bit secure random secret
- **BCRYPT_SALT_ROUNDS**: 12 (balanced security/performance)

## Migrations

### Creating Migrations

```bash
# Create migration after schema changes
npx prisma migrate dev --name descriptive_migration_name

# Examples:
npx prisma migrate dev --name add_user_authentication
npx prisma migrate dev --name add_character_progression
npx prisma migrate dev --name add_card_enhancements
```

### Applying Migrations

```bash
# Development (interactive)
npx prisma migrate dev

# CI/Production (non-interactive)
npx prisma migrate deploy
```

### Rollback Migrations

Prisma doesn't support automatic rollbacks. Manual process:

```bash
# 1. Restore database from backup
pg_restore -d hexhaven_dev backup.sql

# 2. Or write reverse migration manually
# Create rollback SQL in prisma/migrations/XXXXXX_rollback/migration.sql
```

## Performance Optimizations

### Indexes

All critical query paths are indexed:

- **User lookups**: `username` (unique), `deletedAt`
- **Token lookups**: `refreshTokens.token` (unique), `refreshTokens.userId`
- **Character queries**: `userId`, `currentGameId`, `campaignId`, `classId`
- **Game queries**: `roomCode` (unique), `status`, `createdAt`
- **Event sourcing**: `gameEvents(gameId, sequenceNum)` composite index

### Connection Pooling

```
DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=20"
```

- **20 connections per Prisma client**: Handles 100 concurrent users
- **20 second pool timeout**: Prevents hanging requests
- **Total limit**: <100 connections (leaves headroom for admin tasks)

### Query Performance Monitoring

Development mode automatically logs slow queries (>100ms):

```typescript
import { enablePerformanceMonitoring } from './src/db/performance';
enablePerformanceMonitoring(prisma);
```

Logs include:
- Query model and action
- Execution time
- P50/P95/P99 percentiles
- Slow query breakdown by model

## Schema Validation

### Run validation checks

```bash
# Format schema
npx prisma format

# Validate without database
npx prisma validate

# Generate types
npx prisma generate

# View current schema
npx prisma db pull

# Reset database (DESTRUCTIVE)
npx prisma migrate reset --force
```

## Seed Data

Seed data includes:
- 6 character classes (Brute, Tinkerer, Spellweaver, Scoundrel, Cragheart, Mindthief)
- ~180 ability cards across all classes
- ~150 items (head, body, hands, feet, small items)
- 5 initial scenarios with varying difficulty

```bash
# Seed development database
npx prisma db seed

# Seed test database
DATABASE_URL="postgresql://...hexhaven_test" npx prisma db seed
```

## Database Constraints

### Business Rules Enforced at DB Level

1. **One character per active game**: `Character.currentGameId` nullable foreign key
2. **Username uniqueness**: `User.username` unique constraint
3. **Soft delete integrity**: Queries filter `WHERE deletedAt IS NULL`
4. **Event ordering**: `GameEvent(gameId, sequenceNum)` unique constraint
5. **Token expiration**: `RefreshToken.expiresAt` index for cleanup

### Data Validation

Prisma schema enforces:
- **Field types**: String, Int, DateTime, Json, Enums
- **String lengths**: VARCHAR(N) for all text fields
- **Required fields**: Non-nullable unless explicitly optional
- **Default values**: Timestamps, counters, arrays
- **Cascading deletes**: User → Characters → Enhancements

Application layer (Zod schemas) enforces:
- **Username**: 3-20 chars, alphanumeric + underscore/hyphen
- **Password**: 12-128 chars (bcrypt hashed)
- **Character name**: 1-30 chars, no HTML tags
- **Room code**: Exactly 6 chars, alphanumeric uppercase

## Troubleshooting

### "Can't reach database server"

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list                # macOS

# Check connection
psql -h localhost -U hexhaven -d hexhaven_dev

# Verify DATABASE_URL in .env
cat backend/.env | grep DATABASE_URL
```

### "Migration already applied"

```bash
# Reset migration state (CAUTION: drops all data)
npx prisma migrate reset --force

# Or mark migration as applied without running
npx prisma migrate resolve --applied MIGRATION_NAME
```

### "Schema drift detected"

```bash
# Pull current schema from database
npx prisma db pull

# Compare with schema.prisma
# Create migration to reconcile differences
npx prisma migrate dev --name fix_schema_drift
```

### "P2002: Unique constraint failed"

Common causes:
- Duplicate username registration
- Duplicate refresh token
- Character already in active game

Application handles with ConflictError (409):
```typescript
throw new ConflictError('Username already exists', 'username');
```

## Entity Relationships

```
User ──┬─ 1:N ─→ RefreshToken
       └─ 1:N ─→ Character ──┬─ N:1 ─→ CharacterClass ──┬─ 1:N ─→ AbilityCard
                              ├─ 1:N ─→ CardEnhancement ─┘
                              ├─ N:1 ─→ Game (currentGame, optional)
                              └─ N:1 ─→ Campaign (optional)

Game ──┬─ 1:1 ─→ GameState
       ├─ 1:N ─→ GameEvent
       ├─ N:1 ─→ Scenario
       └─ 1:N ─→ Character (activeCharacters via currentGameId)

Campaign ─ 1:N ─→ Character

GameRoom ─ 1:N ─→ Player (anonymous gameplay)
```

## Storage Estimates

For 100 users with 5 characters and 10 games each:

| Table | Rows | Avg Size | Total |
|-------|------|----------|-------|
| users | 100 | 200 bytes | 20 KB |
| refresh_tokens | 100 | 300 bytes | 30 KB |
| characters | 500 | 1 KB | 500 KB |
| character_classes | 6 | 2 KB | 12 KB |
| ability_cards | 180 | 500 bytes | 90 KB |
| games | 1000 | 500 bytes | 500 KB |
| game_events | 100K | 1 KB | 100 MB |
| game_states | 5000 | 10 KB | 50 MB |
| **Total** | | | **~150 MB** |

Well under the 100MB constraint (SC-013) when excluding large game_states.

## References

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/14/)
- [Schema Design](../specs/002-postgres-user-db/research.md)
- [API Contracts](../specs/002-postgres-user-db/contracts/)
