# Quickstart Guide: Hexhaven Multiplayer

**Goal**: Get a local development environment running with a working multiplayer game session in **< 5 minutes**.

**Feature**: 001-hexhaven-multiplayer
**Last Updated**: 2025-11-07

---

## Prerequisites

Before starting, ensure you have:

- **Node.js**: v18+ (check with `node --version`)
- **npm**: v9+ (check with `npm --version`)
- **PostgreSQL**: v14+ (check with `psql --version`)
- **Git**: v2.30+ (check with `git --version`)

---

## Quick Start (< 5 minutes)

### 1. Clone & Install (1 minute)

```bash
# Clone the repository
git clone <repository-url> hexhaven
cd hexhaven

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 2. Database Setup (1 minute)

```bash
# Create PostgreSQL database
createdb hexhaven_dev

# Run migrations (from backend directory)
cd backend
npx prisma migrate dev --name init

# Seed initial data (5 scenarios, character classes)
npm run db:seed

cd ..
```

**Database Connection**: The default configuration expects PostgreSQL on `localhost:5432` with your system user. To override, create `backend/.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/hexhaven_dev"
```

### 3. Start Backend (30 seconds)

```bash
cd backend
npm run dev
```

Backend will start on **http://localhost:3000**

**Expected Output**:
```
[NestJS] Nest application successfully started
[WebSocket] Socket.io server listening on port 3000
[Database] Connected to PostgreSQL
```

### 4. Start Frontend (30 seconds)

Open a **new terminal**:

```bash
cd frontend
npm run dev
```

Frontend will start on **http://localhost:5173** (Vite default)

**Expected Output**:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 5. Test Multiplayer (2 minutes)

#### Create a Game Room

1. Open **http://localhost:5173** in your browser
2. Click **"Create Game"**
3. Enter your nickname (e.g., "PlayerOne")
4. You'll see a **6-character room code** (e.g., "A3X9K2")

#### Join as Second Player

1. Open **http://localhost:5173** in a **private/incognito window** (or different browser)
2. Click **"Join Game"**
3. Enter the room code from step 4
4. Enter a different nickname (e.g., "PlayerTwo")

#### Start the Game

1. In the **first browser** (host), select a character class (e.g., "Brute")
2. In the **second browser**, select a different character (e.g., "Tinkerer")
3. Host clicks **"Start Game"**
4. You should see the **hex grid battle map** with both characters placed

#### Play a Turn

1. Host selects **two ability cards** (top and bottom actions)
2. Second player selects **two ability cards**
3. Turn order is displayed based on initiative
4. Click your character, then click a valid hex to **move**
5. Click an enemy monster to **attack**
6. Click **"End Turn"** to advance

**Success!** You now have a working multiplayer Hexhaven game.

---

## Project Structure Overview

```
hexhaven/
├── backend/                  # NestJS backend
│   ├── src/
│   │   ├── models/          # Game entities (Player, GameRoom, Character)
│   │   ├── services/        # Game logic (MonsterAI, TurnOrder, Damage)
│   │   ├── websocket/       # Socket.io event handlers
│   │   ├── api/             # REST endpoints (room creation, scenarios)
│   │   └── db/              # Prisma schema, migrations, seed data
│   ├── tests/               # Unit, integration, contract tests
│   └── package.json
│
├── frontend/                 # React PWA
│   ├── src/
│   │   ├── components/      # UI components (HexGrid, AbilityCard, etc.)
│   │   ├── game/            # PixiJS rendering layer
│   │   ├── services/        # WebSocket client, state management
│   │   ├── hooks/           # React hooks (useGameState, useWebSocket)
│   │   ├── pages/           # Page components (Lobby, GameBoard)
│   │   └── i18n/            # Translations (react-i18next)
│   ├── tests/               # Unit and E2E tests
│   └── package.json
│
├── shared/                   # Shared TypeScript types
│   └── types/               # Entities, events, game state
│
└── specs/                    # Feature specifications
    └── 001-hexhaven-multiplayer/
        ├── spec.md          # Feature requirements
        ├── plan.md          # Implementation plan
        ├── research.md      # Technical research
        ├── data-model.md    # Entity definitions
        ├── contracts/       # API contracts (WebSocket, REST)
        └── quickstart.md    # This file
```

---

## Common Commands

### Backend

```bash
cd backend

# Development server (hot reload)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Type check
npm run type-check

# Database migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed database
npm run db:seed
```

### Frontend

```bash
cd frontend

# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint

# Type check
npm run type-check
```

---

## Troubleshooting

### Backend won't start

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**: PostgreSQL is not running. Start it:
```bash
# macOS (Homebrew)
brew services start postgresql

# Linux (systemd)
sudo systemctl start postgresql

# Windows
net start postgresql-x64-14
```

---

### Frontend can't connect to backend

**Error**: `WebSocket connection failed`

**Solution**: Ensure backend is running on port 3000:
```bash
cd backend
npm run dev
```

Check backend health: http://localhost:3000/api/health

---

### Database migration fails

**Error**: `Migration failed: relation "game_rooms" already exists`

**Solution**: Reset the database:
```bash
cd backend
npx prisma migrate reset   # WARNING: Deletes all data
npm run db:seed             # Re-seed initial data
```

---

### Port already in use

**Error**: `Port 3000 is already in use`

**Solution**: Kill the process using the port:
```bash
# Find process
lsof -i :3000

# Kill process (replace PID)
kill -9 <PID>
```

Or change the port in `backend/.env`:
```env
PORT=3001
```

---

### Tests failing

**Error**: Tests fail with database errors

**Solution**: Create a test database:
```bash
createdb hexhaven_test

# Set test database URL in backend/.env.test
DATABASE_URL="postgresql://localhost:5432/hexhaven_test"
```

---

## Next Steps

### For Frontend Development

1. **Learn the rendering layer**: Check `frontend/src/game/` for PixiJS hex grid rendering
2. **Understand state management**: Review `frontend/src/hooks/useGameState.ts`
3. **Add UI components**: See `frontend/src/components/` for existing patterns
4. **Test on mobile**: Use Chrome DevTools device emulation (iPhone SE, iPad)

### For Backend Development

1. **Understand game logic**: Review `backend/src/services/` for turn order, AI, damage calc
2. **Add WebSocket events**: See `backend/src/websocket/game.gateway.ts`
3. **Extend data model**: Update `backend/src/db/schema.prisma` and run migrations
4. **Write tests**: Follow TDD with `backend/tests/unit/` examples

### For Full-Stack Development

1. **Shared types**: Add new types to `shared/types/` for type-safe WebSocket events
2. **API contracts**: Update `specs/001-hexhaven-multiplayer/contracts/` when adding endpoints
3. **Integration testing**: Write E2E tests for new user stories in `frontend/tests/e2e/`

---

## Key Technologies

| Layer | Technology | Why Chosen |
|-------|-----------|------------|
| **Backend** | NestJS (TypeScript) | Enterprise DI, built-in WebSocket support, modular architecture |
| **Frontend** | React + PixiJS | React for UI, PixiJS for 60 FPS hex grid rendering |
| **Real-time** | Socket.io | Automatic reconnection, room support, mobile reliability |
| **Database** | PostgreSQL + Prisma | Type-safe queries, JSONB for flexible game state |
| **Testing** | Jest + Playwright | Unit tests (Jest), E2E with mobile browser support (Playwright) |
| **i18n** | react-i18next | Lightweight, React hooks integration |
| **PWA** | Workbox 7 | Offline support, service worker generation |

---

## Getting Help

- **Architecture docs**: See `docs/ARCHITECTURE.md` (created during implementation)
- **API reference**: See `specs/001-hexhaven-multiplayer/contracts/`
- **Data model**: See `specs/001-hexhaven-multiplayer/data-model.md`
- **Technical research**: See `specs/001-hexhaven-multiplayer/research.md`

---

**Ready to implement?** Run `/speckit.tasks` to generate the task breakdown by user story priority!
