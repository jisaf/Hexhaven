# Server-Authoritative Gloomhaven-Style Hex Game PRD

## Executive Summary

This Product Requirements Document outlines the development of a server-authoritative, multiplayer hex-based tactical board game with Gloomhaven-style mechanics. The architecture prioritizes security, scalability, and cost-effectiveness for <100 concurrent users, using PostgreSQL for persistence and WebSocket-based real-time communication.

**Key Technical Decisions:**
- Server-authoritative model with complete anti-cheat protection
- PostgreSQL with in-memory caching for $0/month infrastructure (OCI Always Free Tier)
- Event sourcing with deterministic action propagation
- Dual-event WebSocket pattern for animations and state updates
- Hybrid authentication (anonymous + optional accounts)
- Simplified architecture following YAGNI and KISS principles
- 16-week development timeline for 3 parallel AI agents

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [Database Selection & Cost Analysis](#database-selection--cost-analysis)
3. [Technical Stack](#technical-stack)
4. [Development Team Structure](#development-team-structure)
5. [16-Week Development Timeline](#16-week-development-timeline)
6. [Core Features](#core-features)
7. [Implementation Details](#implementation-details)
8. [Risk Mitigation](#risk-mitigation)
9. [Success Metrics](#success-metrics)
10. [Refactor & Technical Debt](#refactor--technical-debt)

## Core Architecture

### Server-Authoritative Model

**Problem:** Client-authoritative models are vulnerable to cheating through client-side manipulation.

**Solution:** Server maintains complete control over game state:
- Clients send only inputs/actions (e.g., "move unit from [3,5] to [4,6]")
- Server validates every action against game rules
- Server broadcasts validated state changes to all clients
- Clients render server state but never compute game logic

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│                      (User's Browser)                           │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App                                                    │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐           │
│  │   Pages    │  │  Components │  │ Pixi.js Game │           │
│  │   Router   │  │   (React)   │  │   Engine     │           │
│  └─────┬──────┘  └──────┬──────┘  └──────┬───────┘           │
│        └────────────────┴────────────────┘                     │
│              ┌──────────▼───────────┐                          │
│              │  Socket.io Client    │                          │
│              └──────────┬───────────┘                          │
└─────────────────────────┼─────────────────────────────────────┘
                          │ HTTPS/WSS
┌─────────────────────────▼─────────────────────────────────────┐
│                  OCI AMPERE A1 INSTANCE                       │
│         (Staging Server - Always Free Tier)                   │
│         3 OCPUs, 16GB RAM, 50GB Storage                       │
│         Terraform-managed Infrastructure                      │
├───────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Nginx (Reverse Proxy + SSL)                           │  │
│  │  • Frontend (/)                                         │  │
│  │  • Backend API (/api/*)                                 │  │
│  │  • WebSocket (/socket.io/*)                            │  │
│  └────────────┬──────────────┬────────────────────────────┘  │
│               │              │                                 │
│  ┌────────────▼──────────┐  ┌▼──────────────────────────┐   │
│  │  Next.js Server       │  │  Game Server (Node.js)    │   │
│  │  Port: 3000           │  │  Port: 3001               │   │
│  │  • SSR/SSG            │  │  • Express API            │   │
│  │  • Static Assets      │  │  • Socket.io Server       │   │
│  └───────────────────────┘  │  • Game Logic             │   │
│                              │  • Monster AI             │   │
│                              └───┬───────────────────────┘   │
│  ┌──────────────────────────────▼───────────────────────┐   │
│  │         Server-Authoritative Game Logic               │   │
│  │  ┌────────────┐ ┌──────────────┐ ┌─────────────────┐ │   │
│  │  │   Action   │ │    Game      │ │    Monster      │ │   │
│  │  │ Validation │ │ State Engine │ │      AI         │ │   │
│  │  └────────────┘ └──────────────┘ └─────────────────┘ │   │
│  └──────────────────────┬─────────────────────────────────┘   │
│              Event Sourcing Layer                              │
│                         │                                      │
│  ┌──────────────────────▼───────────────────────────────┐    │
│  │              PERSISTENCE LAYER                        │    │
│  │  ┌─────────────────────────────────────────────────┐  │    │
│  │  │  PostgreSQL 14+                                 │  │    │
│  │  │  Port: 5432                                     │  │    │
│  │  │  4GB shared_buffers                             │  │    │
│  │  │  • game_events (event sourcing)                 │  │    │
│  │  │  • game_snapshots (performance optimization)    │  │    │
│  │  │  • players (user data)                          │  │    │
│  │  │  • sessions (JWT-based auth)                    │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  In-Memory Cache (Node.js process):                    │    │
│  │  • Active game states (Map/LRU cache)                  │    │
│  │  • Rate limiting (simple in-memory tracking)           │    │
│  └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

### State Synchronization Strategy

**Approach:** Dual-event pattern with deterministic action propagation

The dual-event WebSocket pattern separates visual feedback from authoritative state updates:

1. **Animation Events** (immediate, optimistic):
   - Broadcast instantly for smooth UX
   - Allow client-side animation to start
   - Not persisted to event store

2. **State Update Events** (after validation):
   - Broadcast after server validation
   - Authoritative state changes only
   - Persisted to event sourcing system

**Event Flow:**
```typescript
// Client sends action
socket.emit('player-action', { type: 'move', from: [3,5], to: [4,6] });

// Server immediately broadcasts animation event
socket.broadcast.emit('game-action', {
  source: { type: 'player', id: playerId },
  action: { type: 'move', to: { q: 4, r: 6 } }
});

// Server validates and broadcasts state update
socket.broadcast.emit('game-state-update', {
  path: 'entities.player1.position',
  value: { q: 4, r: 6 }
});
```

This enables:
- Smooth animations without lag
- Server authority over game logic
- Complete audit trail
- Rollback capability if validation fails

**Database Schema:**
```sql
CREATE TABLE game_events (
  id BIGSERIAL PRIMARY KEY,
  game_id UUID NOT NULL,
  sequence_num INT NOT NULL,
  event_type VARCHAR(50),
  event_data JSONB,
  player_id UUID,
  created_at TIMESTAMP,
  UNIQUE(game_id, sequence_num)
);

CREATE TABLE game_snapshots (
  game_id UUID PRIMARY KEY,
  sequence_num INT,
  state_data JSONB,
  created_at TIMESTAMP
);

CREATE INDEX idx_events_lookup ON game_events(game_id, sequence_num DESC);
```

## Database Selection & Infrastructure Cost Analysis

### Deployment Strategy: OCI Ampere Always Free Tier

**Single Instance Architecture**
- **Platform:** Oracle Cloud Infrastructure (OCI) Ampere A1
- **Specs (Always Free):** 3 ARM-based OCPUs, 16GB RAM, 50GB storage
- **Components:** All services on single instance
  - Nginx reverse proxy
  - Next.js frontend (Node.js 20)
  - Express backend (Node.js 20)
  - PostgreSQL 14+ database
  - In-memory caching (Node.js process - no external cache needed)
- **Cost:** **$0/month** (Always Free Tier)
- **Deployment:** Terraform-managed infrastructure + SSH deployment on PR events
- **Architecture Philosophy:** YAGNI & KISS - removed Redis for simplicity, using in-memory caching sufficient for <100 concurrent users

**PostgreSQL (Primary Database)**
- **Self-hosted** on OCI instance
- **Version:** PostgreSQL 14+
- **JSONB support:** Essential for event sourcing
- **Configuration:** Optimized for 16GB RAM
  - shared_buffers: 4GB
  - effective_cache_size: 12GB
  - work_mem: 64MB
  - maintenance_work_mem: 512MB
- **Backup strategy:** Daily dumps to OCI Object Storage (also free tier)

**In-Memory Caching (Simplified Approach)**
- **Implementation:** JavaScript Map/LRU cache in Node.js process
- **Max Memory:** ~512MB (configurable, part of Node.js heap)
- **Use Cases:** Active game states, rate limiting tracking
- **Ultra-low latency:** <0.1ms response (in-process)
- **Persistence:** Not needed - cache is temporary, PostgreSQL is source of truth
- **Eviction Policy:** LRU (Least Recently Used) with configurable TTL
- **Why No Redis:** YAGNI principle - for <100 concurrent users, in-memory caching is sufficient and eliminates external dependency

**Why PostgreSQL over MySQL:**
- Native JSONB support for event data
- Better performance for complex queries
- Superior support for event sourcing patterns
- Mature self-hosting ecosystem

### Cost Projections

| Phase | Users | OCI Ampere | Total |
|-------|-------|-----------|-------|
| Dev | 0-10 | $0 | **$0** |
| Beta | 25-50 | $0 | **$0** |
| Production | 100 | $0 | **$0** |
| Scale (500) | 500 | $0 | **$0** |

**Note:** OCI Always Free Tier provides sufficient resources for prototype and early scaling. As usage grows beyond 500-1000 concurrent users, may need to upgrade to paid tiers or add additional instances.

## Technical Stack

### Frontend (Agent A Domain)
- **Framework:** Next.js 14 with React 18
- **Game Rendering:** Pixi.js 7 (WebGL-based)
- **Hex Grid:** honeycomb-grid (framework agnostic, better performance)
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **WebSocket:** Socket.io-client

### Backend (Agent B Domain)
- **Runtime:** Node.js 20 LTS with TypeScript
- **WebSocket Server:** Socket.io
- **REST API:** Express 4
- **Validation:** Zod
- **Authentication:** JWT (jsonwebtoken) with hybrid approach
- **Game Logic:** Custom TypeScript implementation

### Infrastructure (Agent C Domain)
- **Primary Database:** PostgreSQL 14+ (self-hosted)
- **ORM:** Prisma 5
- **Caching:** In-memory LRU cache (lru-cache npm package)
- **Containerization:** Docker / systemd
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry
- **Web Server:** Nginx (reverse proxy)
- **Process Manager:** PM2

### Hosting Architecture
- **Platform:** OCI Ampere A1 (Always Free Tier)
- **Single Instance Components:**
  - Nginx reverse proxy (frontend + API + WebSocket)
  - Next.js frontend (SSR/SSG)
  - Express/Socket.io game server (with in-memory cache)
  - PostgreSQL database
- **Deployment:** SSH-based deployment on PR merge
- **SSL:** Let's Encrypt (certbot)
- **Backups:** Daily PostgreSQL dumps to OCI Object Storage

## Development Team Structure

### Three AI Agent Specialization

**Agent A: Frontend/UI Specialist**
- **Complexity Level:** Haiku-Sonnet
- **Technologies:** React, Pixi.js, Socket.io-client
- **Workspace:** `apps/web-app/`, `packages/game-engine/`
- **Responsibilities:**
  - Game canvas and hex grid rendering
  - User input handling
  - Animation system
  - Responsive design
  - Client-side state management

**Agent B: Backend/Game Logic Specialist**
- **Complexity Level:** Sonnet-Opus
- **Technologies:** Node.js, Socket.io, Game algorithms
- **Workspace:** `packages/api/`, `packages/shared/types/`
- **Responsibilities:**
  - Server-authoritative game logic
  - Action validation
  - Monster AI
  - Event sourcing
  - API implementation

**Agent C: Infrastructure/Database/DevOps Specialist**
- **Complexity Level:** Haiku-Sonnet
- **Technologies:** PostgreSQL, Docker, CI/CD, Node.js caching
- **Workspace:** `packages/database/`, `infrastructure/`
- **Responsibilities:**
  - Database schema and migrations
  - In-memory caching strategy (LRU cache implementation)
  - Deployment pipelines
  - Monitoring and logging
  - Performance optimization

### Monorepo Structure

```
gloomhaven-hex-game/
├── apps/
│   └── web-app/                 # Next.js frontend (Agent A)
├── packages/
│   ├── game-engine/             # Pixi.js rendering (Agent A)
│   ├── api/                     # Game server (Agent B)
│   ├── database/                # Schemas & migrations (Agent C)
│   ├── shared/
│   │   ├── types/               # TypeScript contracts (All agents)
│   │   └── constants/           # Game constants (All agents)
│   └── testing/
│       └── mocks/               # Shared mock implementations
└── infrastructure/              # DevOps configs (Agent C)
```

## 16-Week Development Timeline

### Week 1-2: Foundation (Sequential)

#### Week 1: Planning & Contracts
| Agent | Task | Complexity | Duration |
|-------|------|------------|----------|
| All | Define API contracts (OpenAPI 3.0) | Medium | 1 day |
| B | Create TypeScript types | Simple | 4 hours |
| C | Design database schema | Medium | 1 day |
| C | Set up monorepo with Turborepo | Simple | 2 hours |

#### Week 2: Infrastructure Setup
| Agent | Task | Complexity | Duration |
|-------|------|------------|----------|
| C | Set up PostgreSQL with Prisma on OCI | Medium | 6 hours |
| C | Implement in-memory LRU cache | Simple | 2 hours |
| C | Create CI/CD pipeline | Medium | 4 hours |
| C | Configure SSH deployment to OCI | Medium | 4 hours |
| A | Initialize Next.js app | Simple | 2 hours |
| A | Set up Pixi.js canvas with honeycomb-grid | Medium | 4 hours |
| B | Scaffold Socket.io server with dual-event pattern | Medium | 4 hours |
| B | Implement hybrid JWT auth (anonymous + optional) | Medium | 4 hours |

### Week 3-4: Core Game State

#### Agent A Tasks
- UI component library (6 components) - Simple
- Hex grid coordinate system with honeycomb-grid - Medium
- Character sprite rendering - Medium
- Lobby interface - Medium
- Zustand state management - Medium

#### Agent B Tasks
- Game state machine - Complex
- Action validation framework - Medium
- Event sourcing system with progressive implementation - Complex
- Turn processing logic - Medium
- WebSocket dual-event schema (kebab-case naming) - Medium

#### Agent C Tasks
- Database indexes (4) - Simple
- Connection pooling - Medium
- LRU cache optimization and TTL configuration - Simple
- Monitoring with Sentry - Simple
- Seed data creation - Simple

### Week 5-6: Game Mechanics

#### Agent A Tasks
- Ability card selection UI - Medium
- Movement visualization - Complex
- Attack animations - Medium
- Monster stat displays - Simple
- Turn order indicator - Simple

#### Agent B Tasks
- Movement rules implementation - Complex
- Attack calculation system - Complex
- Monster AI - Complex
- Initiative order - Medium
- Card mechanics - Medium

#### Agent C Tasks
- Query optimization - Medium
- State snapshotting (every 20 events) - Medium
- Cache invalidation strategy - Simple
- Backup procedures - Simple
- Performance dashboard - Medium

### Week 7-8: Advanced Features

#### Agent A Tasks
- Health/XP tracking UI - Medium
- Inventory management - Medium
- Battle modifier deck - Medium
- Chat system UI - Simple
- Sound effects - Simple
- Elemental infusion indicators - Medium

#### Agent B Tasks
- Status effects system (15+ types) - Complex
- Scenario objectives - Medium
- Loot distribution - Medium
- Experience system - Medium
- REST API endpoints (5) - Medium
- Elemental infusion logic - Medium
- Item refresh mechanics - Medium

#### Agent C Tasks
- Rate limiting - Medium
- Log aggregation - Medium
- CDN configuration - Simple
- Load testing scripts - Medium
- Connection optimization - Simple

### Week 9: Integration Checkpoint

**All Agents (Collaborative):**
- Merge feature branches - Medium
- Integration testing - Complex
- Bug fixes (10-20) - Simple-Medium
- Contract validation - Simple
- Full playthrough test - Medium

### Week 10-11: Polish & Optimization

#### Agent A Tasks
- Performance optimization (60 FPS) - Complex
- Responsive design - Medium
- Loading states (8) - Simple
- Tutorial flow - Medium
- Replay viewer - Complex

#### Agent B Tasks
- Algorithm optimization - Complex
- Error handling - Medium
- Action logging - Simple
- Admin APIs (3) - Medium
- Reconnection logic - Complex

#### Agent C Tasks
- Performance profiling - Complex
- Auto-scaling setup - Medium
- Alerting configuration - Medium
- Rollback procedures - Medium
- Query optimization - Medium

### Week 12-13: QA & Bug Fixing

**All Agents:**
- Comprehensive testing (20 scenarios) - Medium
- Bug triage and fixes (30-50) - Simple-Medium
- E2E tests with Playwright (10) - Medium
- Security audit - Complex
- Performance testing - Medium

### Week 14-15: Pre-Launch

#### Agent A Tasks
- Landing page - Medium
- Analytics tracking - Simple
- Feedback system - Simple
- UI polish (10 items) - Simple
- Documentation - Medium

#### Agent B Tasks
- Balance adjustments (5) - Medium
- Telemetry implementation - Medium
- Solo AI opponent - Complex
- Matchmaking algorithm - Medium
- Reporting system - Medium

#### Agent C Tasks
- Production database - Medium
- Deployment pipeline - Medium
- Runbooks (5) - Simple
- Monitoring dashboards - Medium
- Security review - Complex

### Week 16: Launch

**All Agents:**
- Production deployment - Medium
- Launch monitoring - Simple
- Hot-fixes - Variable
- Feedback collection - Simple

## Core Features

### Must-Have (MVP - Weeks 1-9)

#### Hex Grid System
- Display scenario maps with PNG/JPG backgrounds
- Pointy-top hexagon orientation
- Cube coordinate system (q, r, s)
- Click-to-hex detection
- Drag-and-drop placement
- Visual highlighting for selection/range

#### Background Image System (Issue #191)
- Upload PNG/JPG background images via Scenario Designer
- Auto-fit images to fixed 1024×1024 pixel world bounds
- Background renders behind hex grid (semi-transparent tiles)
- Server-side image storage with nginx static serving
- Adjustable opacity (0-100%)
- Gold world border indicates play area bounds
- Images persist across sessions via database URL storage
- SELinux-compatible file storage for production deployment

#### Entity Management
- Player character placement and movement
- Monster placement with standee numbers
- Obstacles and terrain effects
- Visual differentiation by type
- Remove/delete functionality

#### Monster AI (Basic)
- Focus target calculation (proximity → initiative)
- A* pathfinding to optimal position
- Attack execution
- Basic abilities (move, attack, range)
- Visual intent indicators

#### Combat Mechanics
- Line-of-sight (corner-to-corner method)
- Range calculation
- Attack validation
- Movement validation with obstacles
- Valid movement highlighting
- Basic trap and hazardous terrain damage

#### Multiplayer
- Room creation with 6-character alphanumeric codes
- Real-time synchronization with dual-event pattern
- Turn-based action locking
- Reconnection handling
- 2-4 player support
- Anonymous play (no account required)

#### Game State
- Initiative tracking
- Round management
- Health/condition tracking
- Basic status effects (5-10 types)
- Scenario selection (5 scenarios)
- State persistence with event sourcing

### Should-Have (Post-MVP - Weeks 10-16)

#### Advanced Combat
- Advanced status effects (15+ types)
- Elemental infusion system (6 elements)
- Push/pull/teleport forced movement
- Summon mechanics with ownership
- Curse and bless card management

#### Character Progression
- Experience and leveling system
- Perks system
- Battle goal cards
- Item refresh and consumables
- Card enhancement system (stickers)

#### Campaign Features
- Campaign progression tracking
- Character retirement system
- City and road events
- Legacy unlocks (classes, scenarios)
- Campaign context in games (Issue #318)
  - Games store `campaignId` for proper return navigation
  - Victory screen shows "Return to Campaign" button when in campaign
  - Deep-linking support for campaign flow
- **Campaign Invitation System** (feat/campaign-invite-system)
  - Direct username-based invitations (30-day TTL)
  - Shareable invite links with configurable usage limits (7-day TTL)
  - Pending invitations tab in campaigns hub
  - Public campaign preview for join links
  - Host controls: create, revoke invitations and tokens
  - Atomic token consumption with transaction-based auto-revoke (race-condition safe)
  - Rate limiting on invitation endpoints (5 invitations/tokens per minute)
  - Automated cleanup via scheduled cron job (daily at midnight)
  - Centralized rate limit constants for maintainability
  - DRY-compliant join flow with shared completion logic
  - Safe type validation for JSON database columns
  - Robust error handling for non-JSON responses
  - React component cleanup to prevent memory leaks

#### Advanced Features
- Advanced monster AI (flying, jumping, disadvantage)
- Attack modifier deck
- Custom scenario builder
- Replay system

### Nice-to-Have (Future Phases)

- Matchmaking system
- Ranked/competitive mode
- Mobile native apps
- Scenario marketplace
- Voice chat integration
- Monetization features

## Implementation Details

### Authentication Strategy: Hybrid Approach

**Phase 1: Anonymous Play (MVP)**
```typescript
interface AnonymousPlayer {
  sessionId: string;        // Generated client-side
  nickname: string;         // User-provided
  roomCode: string;         // 6-char game identifier
  expiresAt: Date;         // Session timeout
}
```

**Phase 2: Optional Registration (Post-MVP)**
```typescript
interface RegisteredPlayer extends AnonymousPlayer {
  userId?: string;          // UUID if registered
  email?: string;           // For account recovery
  savedProgress?: {
    completedScenarios: string[];
    characterLevel: number;
    unlocks: string[];
  };
}
```

Benefits:
- Zero friction for first-time players
- Optional accounts for progression tracking
- Simplified MVP development
- Future monetization path

### WebSocket Event Naming: Kebab-Case Convention

**Client → Server Events:**
```typescript
'join-game'           // Join a game room
'leave-game'          // Leave a game room
'player-action'       // Submit game action
'chat-message'        // Send chat message
'select-cards'        // Choose ability cards
```

**Server → Client Events:**
```typescript
'game-state'          // Full state update
'game-action'         // Animation event (optimistic)
'game-state-update'   // Validated state change
'action-applied'      // Action confirmation
'player-joined'       // New player notification
'player-left'         // Player departure
'turn-changed'        // Turn order update
'error'               // Error notification
```

### Hex Grid Mathematics

**Coordinate System:** Cube coordinates (q, r, s) where q + r + s = 0

**Key Functions:**
```typescript
interface HexCoordinate {
  q: number;
  r: number;
  s: number;
}

function hexDistance(a: HexCoordinate, b: HexCoordinate): number {
  return Math.max(
    Math.abs(a.q - b.q),
    Math.abs(a.r - b.r),
    Math.abs(a.s - b.s)
  );
}

function getNeighbors(hex: HexCoordinate): HexCoordinate[] {
  const directions = [
    { q: +1, r: -1, s: 0 }, { q: +1, r: 0, s: -1 },
    { q: 0, r: +1, s: -1 }, { q: -1, r: +1, s: 0 },
    { q: -1, r: 0, s: +1 }, { q: 0, r: -1, s: +1 }
  ];
  return directions.map(dir => ({
    q: hex.q + dir.q,
    r: hex.r + dir.r,
    s: hex.s + dir.s
  }));
}
```

### Pathfinding Algorithm

**A* Implementation Pattern:**
```typescript
function findPath(start: Hex, goal: Hex, obstacles: Set<Hex>): Hex[] {
  const openSet = new PriorityQueue<Hex>();
  const cameFrom = new Map<Hex, Hex>();
  const gScore = new Map<Hex, number>();
  const fScore = new Map<Hex, number>();
  
  openSet.push(start, 0);
  gScore.set(start, 0);
  fScore.set(start, hexDistance(start, goal));
  
  while (!openSet.isEmpty()) {
    const current = openSet.pop();
    
    if (current.equals(goal)) {
      return reconstructPath(cameFrom, current);
    }
    
    for (const neighbor of getNeighbors(current)) {
      if (obstacles.has(neighbor)) continue;
      
      const tentativeGScore = gScore.get(current)! + 1;
      
      if (tentativeGScore < (gScore.get(neighbor) ?? Infinity)) {
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeGScore);
        fScore.set(neighbor, tentativeGScore + hexDistance(neighbor, goal));
        openSet.push(neighbor, fScore.get(neighbor)!);
      }
    }
  }
  
  return []; // No path found
}
```

### Line-of-Sight Calculation

**Corner-to-Corner Method (Gloomhaven Official):**
1. Calculate 6 corners for each hex
2. Test all 36 lines between attacker and target corners
3. Check if any line is unobstructed by walls
4. Return true if ANY line is clear

### Server Validation Pattern

```typescript
async function validateAction(
  gameId: string,
  playerId: string,
  action: GameAction
): Promise<ValidationResult> {
  // 1. Authentication
  const player = await verifyPlayer(playerId, gameId);
  if (!player) return { valid: false, reason: 'Unauthorized' };
  
  // 2. Turn order
  const game = await loadGameState(gameId);
  if (game.currentPlayer !== playerId) {
    return { valid: false, reason: 'Not your turn' };
  }
  
  // 3. Action-specific validation
  switch (action.type) {
    case 'MOVE':
      return validateMove(game, action, playerId);
    case 'ATTACK':
      return validateAttack(game, action, playerId);
    // ... other action types
  }
}
```

### Event Sourcing Pattern: Progressive Implementation

**Week 2: Basic Event Logging**
```typescript
class GameEventStore {
  async appendEvent(gameId: string, event: GameEvent): Promise<void> {
    await db.game_events.create({
      game_id: gameId,
      sequence_num: await this.getNextSequence(gameId),
      event_type: event.type,
      event_data: event.data,
      player_id: event.playerId,
      created_at: new Date()
    });
  }
}
```

**Week 4: Add Snapshots (Every 20 Events)**
```typescript
async appendEvent(gameId: string, event: GameEvent): Promise<void> {
  // Persist event
  await db.game_events.create({...});
  
  // Check if snapshot needed
  const eventCount = await this.getEventCountSinceSnapshot(gameId);
  if (eventCount >= 20) {
    await this.createSnapshot(gameId);
  }
}
```

**Week 6: Optimize with In-Memory LRU Caching**
```typescript
import { LRUCache } from 'lru-cache';

// Initialize in-memory cache with 512MB limit, 5-minute TTL
const gameStateCache = new LRUCache<string, GameState>({
  max: 100, // Max 100 active games in cache
  ttl: 1000 * 60 * 5, // 5 minutes
  maxSize: 512 * 1024 * 1024, // 512MB
  sizeCalculation: (value) => JSON.stringify(value).length
});

async loadGameState(gameId: string): Promise<GameState> {
  // Check in-memory cache first
  const cached = gameStateCache.get(gameId);
  if (cached) return cached;

  // Load from snapshot + events
  const snapshot = await db.game_snapshots.findFirst({
    where: { game_id: gameId },
    orderBy: { sequence_num: 'desc' }
  });

  const events = await db.game_events.findMany({
    where: {
      game_id: gameId,
      sequence_num: { gt: snapshot?.sequence_num ?? 0 }
    },
    orderBy: { sequence_num: 'asc' }
  });

  const state = events.reduce(
    (state, event) => applyEvent(state, event),
    snapshot?.state_data ?? initialGameState()
  );

  // Cache in memory
  gameStateCache.set(gameId, state);

  return state;
}
```

### Game Mechanics Type Definitions

**Card Enhancement System:**
```typescript
interface CardEnhancement {
  cardId: string;
  slot: 'top' | 'bottom';
  enhancement: 'attack+1' | 'move+1' | 'jump' | 'element' | 'strengthen' | 'bless';
  cost: number;
  appliedAt: Date;
}
```

**Perks and Battle Goals:**
```typescript
interface Perk {
  id: string;
  description: string;
  modifierDeckChanges: Array<{
    action: 'add' | 'remove';
    card: ModifierCard;
  }>;
}

interface BattleGoal {
  id: string;
  title: string;
  condition: string;
  checkpoints: 1 | 2;
  reward: number; // Checkmarks earned
}
```

**Retirement and Legacy:**
```typescript
interface RetirementGoal {
  id: string;
  condition: string;
  progress: number;
  target: number;
  unlocksClass?: CharacterClass;
  unlocksScenario?: string;
  cityProsperityBonus?: number;
}
```

**Elemental Infusion:**
```typescript
interface ElementalState {
  fire: 'inert' | 'waning' | 'strong';
  ice: 'inert' | 'waning' | 'strong';
  air: 'inert' | 'waning' | 'strong';
  earth: 'inert' | 'waning' | 'strong';
  light: 'inert' | 'waning' | 'strong';
  dark: 'inert' | 'waning' | 'strong';
}

// Elements decay each round: strong → waning → inert
function decayElements(state: ElementalState): ElementalState {
  return Object.fromEntries(
    Object.entries(state).map(([element, level]) => [
      element,
      level === 'strong' ? 'waning' : 
      level === 'waning' ? 'inert' : 'inert'
    ])
  ) as ElementalState;
}
```

**Summon Mechanics:**
```typescript
interface Summon extends Entity {
  ownerId: string;              // Player who summoned
  baseStats: {
    move: number;
    attack: number;
    range: number;
    health: number;
  };
  inheritsAttackDeck: boolean;  // Use owner's modifier deck
  actsBefore: boolean;           // Acts before or after owner
}
```

**Curse/Bless Management:**
```typescript
interface ModifierDeck {
  standard: ModifierCard[];      // Base deck
  curses: number;                // Count, removed when drawn
  blesses: number;               // Count, removed when drawn
}

function drawModifier(deck: ModifierDeck): { card: ModifierCard; deck: ModifierDeck } {
  // Shuffle if reshuffle card drawn
  // Remove curses/blesses after drawing
  // Handle advantage/disadvantage
}
```

**Forced Movement:**
```typescript
interface ForcedMovement {
  type: 'push' | 'pull' | 'teleport';
  distance: number;
  source: HexCoordinate;
  target: Entity;
  canCauseTrapDamage: boolean;
  canCauseHazardDamage: boolean;
}

function applyForcedMovement(
  movement: ForcedMovement,
  terrain: TerrainMap
): MoveResult {
  // Calculate direction and path
  // Check for obstacles (stops early)
  // Apply trap/hazard damage if stepped on
  // Handle fall damage if applicable
}
```

**Terrain Effects:**
```typescript
interface TerrainEffect {
  type: 'trap' | 'hazard' | 'difficult' | 'icy';
  damage?: number;
  effect?: StatusEffect;
  triggerCondition: 'enter' | 'endTurn' | 'startTurn';
}

const TERRAIN_EFFECTS: Record<string, TerrainEffect> = {
  bear_trap: { type: 'trap', damage: 2, triggerCondition: 'enter' },
  poison_cloud: { type: 'hazard', damage: 1, effect: 'poison', triggerCondition: 'endTurn' },
  difficult_terrain: { type: 'difficult', triggerCondition: 'enter' },
  ice: { type: 'icy', triggerCondition: 'enter' }
};
```

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Server downtime | Game unavailable | Auto-restart, health checks, 15-min RTO |
| WebSocket instability | Disconnections | Robust reconnection, 10-min session persistence |
| Database cost overrun | Unexpected charges | Weekly monitoring, alerts at $5/$10/$15 |
| Event storage growth | Database limits | Periodic snapshots (every 20 events), 90-day archival |
| API contract drift | Integration breaks | Contract testing, versioning, TypeScript strict |
| Agent coordination | Merge conflicts | Monorepo structure, clear ownership, 4 checkpoints |
| Complex rule interactions | Game bugs | Automated rule testing suite, phased rollout |
| Monster AI performance | Server lag | Worker threads for AI calculations, <30ms target |

### Security Considerations

- **Server-side validation:** Every action validated on server
- **Rate limiting:** 200ms minimum between actions
- **Authentication:** JWT tokens with secure secrets (hybrid approach)
- **Input sanitization:** Zod validation on all inputs
- **CORS policies:** Restrict cross-origin requests
- **Secret management:** Environment variables, never in code

## Success Metrics

### Performance Targets (Tiered)

**MVP (Weeks 1-9):**
- Server response: <100ms (P95)
- WebSocket latency: <50ms
- Page load: <2 seconds
- Frame rate: 60 FPS
- Database queries: <50ms (p95)
- Concurrent users: 100

**V1.1 (Post-Launch):**
- Server response: <50ms (P95)
- Concurrent users: 500
- Database queries: <30ms (p95)

**V2.0 (Future):**
- Server response: <50ms (P95)
- Concurrent users: 1000
- Global CDN latency: <100ms

### Reliability Targets
- Uptime: 99%+ (MVP), 99.5% (Post-Launch)
- Reconnection success: >95%
- Action validation: >99%
- Data loss: 0%

### User Engagement (Post-Launch)
- Daily Active Users: 50-100 (Month 1)
- Session duration: 30+ minutes
- Return rate: 30% within 7 days
- Scenarios completed: 100+ (Month 1)

### Cost Efficiency
- Infrastructure: **$0/month** at 100-500 users (OCI Always Free Tier)
- Infrastructure: $0-50/month at 1000 users (may need upgraded instance)
- Per-user cost: **$0/month** (prototype phase)
- Database storage: <100MB at 1000 games (within 200GB free tier)
- **Total Savings:** ~$50-70/month vs. previous multi-vendor architecture

## Deployment Strategy

### Environments
1. **Development:** Local Docker Compose
2. **Staging/Production:** OCI Ampere A1 instance (single server)

### OCI Ampere Deployment Architecture
- **Always Free Tier:** 3 ARM OCPUs, 16GB RAM, 50GB storage
- **OS:** Ubuntu 22.04 LTS (ARM64)
- **Infrastructure:** Terraform-managed (1-click setup)
- **Components:**
  - Nginx (ports 80/443) → reverse proxy
  - Next.js (port 3000) → frontend SSR/static
  - Express (port 3001) → backend API + WebSocket + in-memory cache
  - PostgreSQL (port 5432) → database (4GB shared_buffers)
- **Deployment:** GitHub Actions on PR events → SSH → pull + build + restart
- **Process Management:** PM2 for Node.js apps, systemd for PostgreSQL
- **SSL/TLS:** Let's Encrypt via certbot (auto-renewal)
- **Environment:** Staging (PR-based), Production (to be implemented later)
- **Simplified Architecture:** Removed Redis, using in-memory LRU cache (YAGNI/KISS principles)

### Deployment Workflow (Staging)
1. **PR Opened/Updated** → GitHub Action triggered
2. **SSH Connection** → Connect to OCI staging instance
3. **Git Pull** → Update code from PR branch
4. **Install Dependencies** → `pnpm install`
5. **Build Frontend** → `pnpm build` (Next.js)
6. **Database Migration** → `prisma migrate deploy`
7. **Restart Services** → PM2 reload (zero-downtime)
8. **Health Check** → Verify all services running
9. **Rollback** → If health check fails, revert to previous version
10. **PR Comment** → Bot comments with deployment URL and status

### Release Process
1. Feature branches → PR opened
2. PR events (opened, synchronized, reopened) → Automatic staging deployment
3. Staging URL: `https://staging.hexhaven.game` (or configured domain)
4. Production deployment: To be implemented later
5. Rollback capability via PM2 (previous version cached)
6. Health checks confirm deployment success

### Monitoring Stack
- **Errors:** Sentry
- **Uptime:** Health checks every 60s
- **Metrics:** Custom game metrics + Prometheus (optional)
- **Logs:** Structured JSON logging → PM2 logs
- **Alerts:** Email + Discord notifications
- **System Monitoring:** htop, netdata (lightweight monitoring)

## API Contract Examples

### REST Endpoints (Standardized Format)

```yaml
# OpenAPI 3.0 Specification (excerpt)
paths:
  /api/games:
    post:
      summary: Create new game
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                scenarioId: 
                  type: string
                maxPlayers: 
                  type: integer
                  minimum: 2
                  maximum: 4
      responses:
        201:
          description: Game created
          content:
            application/json:
              schema:
                type: object
                properties:
                  gameId: 
                    type: string
                    format: uuid
                  roomCode: 
                    type: string
                    pattern: '^[A-Z0-9]{6}$'
                  shareUrl:
                    type: string
                    format: uri
                    example: 'https://gloomhaven.game/join/ABC123'
                  expiresAt:
                    type: string
                    format: date-time
```

### WebSocket Events (Kebab-Case Convention)

```typescript
// Client → Server
interface ClientEvents {
  'join-game': { gameId: string; playerId: string; nickname: string };
  'leave-game': { gameId: string };
  'player-action': { type: string; data: any };
  'select-cards': { topCard: string; bottomCard: string };
  'chat-message': { message: string };
}

// Server → Client
interface ServerEvents {
  'game-state': { state: GameState };
  'game-action': {                    // Animation event (immediate)
    source: { type: 'player' | 'monster'; id: string };
    action: { type: string; data: any };
  };
  'game-state-update': {              // State update (validated)
    path: string;
    value: any;
  };
  'action-applied': { actionId: string; success: boolean };
  'player-joined': { playerId: string; playerName: string };
  'player-left': { playerId: string };
  'turn-changed': { currentPlayer: string; initiative: number };
  'error': { message: string; code: string };
  // Campaign events (Issue #318)
  'game-started': { scenarioId: string; campaignId?: string; ... };  // Includes campaign context
  'campaign-scenario-completed': { campaignId: string; scenarioId: string; victory: boolean; ... };
  'campaign-completed': { campaignId: string; completedAt: string };
}
```

### Dual-Event Pattern Example

```typescript
// Example: Player moves from [3,5] to [4,6]

// 1. Client sends action
socket.emit('player-action', {
  type: 'move',
  from: { q: 3, r: 5, s: -8 },
  to: { q: 4, r: 6, s: -10 }
});

// 2. Server immediately broadcasts animation event
socket.broadcast.emit('game-action', {
  source: { type: 'player', id: 'player-123' },
  action: {
    type: 'move',
    from: { q: 3, r: 5, s: -8 },
    to: { q: 4, r: 6, s: -10 },
    path: [/* intermediate hexes */]
  }
});
// ↑ All clients start animation immediately

// 3. Server validates movement (pathfinding, obstacles, range)
const validation = await validateMovement(game, action);

// 4. If valid, server broadcasts authoritative state update
if (validation.valid) {
  socket.broadcast.emit('game-state-update', {
    path: 'entities.player-123.position',
    value: { q: 4, r: 6, s: -10 }
  });
  
  // Persist to event store
  await eventStore.appendEvent(gameId, {
    type: 'ENTITY_MOVED',
    data: { entityId: 'player-123', from: [3,5], to: [4,6] },
    playerId: 'player-123'
  });
}
```

## Refactor & Technical Debt

This section documents architectural concerns and potential refactoring opportunities identified during development. These are tracked for future evaluation and are not blockers for current functionality.

### R1: Single Source of Truth for Game State

**Status:** Identified 2025-12-08
**Priority:** Medium
**Complexity:** High

**Current Architecture Issue:**

The game maintains monster positions in two separate places:
1. **Game State** (`gameStateManager.state.gameData.monsters[]`) - The canonical game state
2. **Visual Sprites** (PIXI MonsterSprite instances) - The rendered representation

When a monster moves, both must be updated independently:
```typescript
// Current pattern (error-prone)
Backend Event → Game State Service
                ├─> Update Visual Callback (sprite.updatePosition)
                └─> Update Game State (monster.currentHex)
```

**Problem:**
- Dual-update pattern is error-prone (both must be kept in sync manually)
- State and visuals can desync, causing bugs like:
  - Monsters clickable at old position after moving
  - Attack range highlights appearing at stale locations
  - Hit detection using outdated coordinates

**Recommended Architecture:**

Implement unidirectional data flow where game state is the single source of truth:
```typescript
// Proposed pattern (robust)
Backend Event → Update Game State ONLY
                     ↓
                State Change → React/Observer → Update Visuals
```

**Implementation Approach:**

1. **Remove Direct Visual Callbacks**
   - Remove `visualCallbacks` from `game-state.service.ts`
   - State updates should only modify `gameStateManager.state`

2. **Observer Pattern for Visual Updates**
   - PIXI components subscribe to state changes
   - Visual layer derives entirely from state
   - Use React hooks (`useEffect`) or custom observers

3. **Animation Handling**
   - State changes include animation metadata (e.g., movement path)
   - Visual layer interprets animation data from state
   - Maintains fine-grained control over PIXI animations

**Benefits:**
- **Impossible to desync** - Visuals always derive from state
- **Easier debugging** - Single source of truth
- **Better testability** - State changes can be tested independently
- **Clearer architecture** - Unidirectional data flow is easier to reason about

**Trade-offs:**
- **Initial complexity** - Refactor requires touching many files
- **Performance considerations** - React re-renders vs direct PIXI updates
- **Animation control** - May need creative solutions for complex animations

**When to Implement:**
- When adding 3+ new entity types with similar patterns
- During a major refactor of the rendering system
- If sync bugs continue to appear despite manual fixes

**Related Files:**
- `frontend/src/services/game-state.service.ts` - State management
- `frontend/src/hooks/useHexGrid.ts` - Visual update callbacks
- `frontend/src/game/MonsterSprite.ts` - PIXI sprite management
- `frontend/src/game/HexGrid.ts` - Grid rendering

**References:**
- Issue #194: Monster location not updating for targeting purposes
- Fix commit: Added manual state sync as temporary solution

---

## Development Principles

### YAGNI (You Aren't Gonna Need It)
- No campaign system until users complete scenarios
- No custom scenario builder until JSON format proves insufficient
- No voice chat - users have Discord
- No blockchain/NFT integration
- No native mobile apps - PWA sufficient

### KISS (Keep It Simple, Stupid)
- Use proven libraries (honeycomb-grid, Socket.io)
- Simple room codes instead of complex matchmaking
- File-based scenarios, not database
- Dual-event pattern, not complex CRDT
- Progressive feature rollout

### DRY (Don't Repeat Yourself)
- Shared hex math utilities
- Single EntityToken component for all entities
- Generic validation framework
- Reusable status effect handlers
- Centralized TypeScript types

## Next Steps

1. **Week 1 Priority:** Define complete API contracts with standardized formats
2. **Repository Setup:** Create monorepo with Turborepo
3. **OCI Instance Setup:** Provision OCI Ampere A1 instance (Always Free Tier)
4. **Server Configuration:** Install Nginx, PostgreSQL, Redis, Node.js, PM2
5. **Deploy Skeleton:** Basic Next.js + Express to OCI via SSH
6. **CI/CD Pipeline:** Configure GitHub Actions for SSH deployment
7. **Begin Parallel Work:** Week 2 starts three agent tracks

## Contact & Resources

- **Repository:** [To be created]
- **Documentation:** [To be created]
- **Monitoring Dashboard:** [To be configured]
- **OCI Console:** Oracle Cloud Infrastructure Dashboard
- **Deployment:** Single OCI Ampere A1 instance (SSH deployment)

---

*This PRD represents a production-ready architecture for a Gloomhaven-style hex game supporting 100-500 concurrent users at **$0/month** infrastructure cost using OCI Ampere Always Free Tier. The 16-week timeline with 3 parallel AI agents provides clear ownership boundaries and minimal merge conflicts.

**Architecture Update:** Migrated from multi-vendor architecture (Vercel + Railway/Render + Neon + Upstash) to single OCI Ampere instance for simplified deployment and zero infrastructure costs. All services (frontend, backend, database) run on one server with SSH-based CI/CD deployment.

**Simplified Architecture (v2):** Removed Redis cache dependency following YAGNI and KISS principles. For <100 concurrent users, in-memory LRU caching in the Node.js process provides sufficient performance (<0.1ms latency) without the operational complexity of managing an external cache. This reduces moving parts, simplifies deployment, and maintains zero infrastructure cost.

Updated with discrepancy analysis recommendations for dual-event WebSocket pattern, hybrid authentication, progressive event sourcing, and comprehensive game mechanics.*
