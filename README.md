# Hexhaven Multiplayer 🎲

> A mobile-first multiplayer tactical board game based on Gloomhaven, built with React, NestJS, and PixiJS.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18%2B-61DAFB)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10%2B-E0234E)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-UNLICENSED-red)]()

---

## 🎮 Features

- **🌐 Real-Time Multiplayer**: 2-4 players via WebSocket (Socket.io)
- **📱 Mobile-First PWA**: Offline-capable, installable, 60 FPS gameplay
- **🎯 Tactical Combat**: Turn-based hex grid battles with Gloomhaven rules
- **🤖 Smart Monster AI**: A* pathfinding, focus targeting, autonomous actions
- **👤 6 Character Classes**: Brute, Tinkerer, Spellweaver, Scoundrel, Cragheart, Mindthief
- **🗺️ 5 Scenarios**: Varied maps, difficulties, and objectives
- **🌍 Multi-Lingual**: English, Spanish, French, German, Chinese
- **📊 Progression System**: Account creation, XP tracking, perk unlocking
- **🔄 Reconnection**: Automatic reconnect with state restoration
- **✋ Touch Optimized**: Pinch-zoom, pan, swipe, long-press gestures
- **🧪 Visual Testing**: Playwright MCP integration with 5-day screenshot retention

---

## 🚀 Quick Start

**Prerequisites**: Node.js 18+, npm 9+, PostgreSQL 14+

```bash
# Clone repository
git clone https://github.com/jisaf/Hexhaven.git
cd hexhaven

# Install dependencies
npm install

# Setup database
createdb hexhaven_dev
cd backend && npx prisma migrate dev && npm run db:seed && cd ..

# Start development servers
npm run dev
```

**Access**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/api/health

**Full setup guide**: [specs/001-gloomhaven-multiplayer/quickstart.md](specs/001-gloomhaven-multiplayer/quickstart.md)

---

## 📁 Project Structure

```
hexhaven/
├── backend/               # NestJS backend (TypeScript)
│   ├── src/
│   │   ├── api/          # REST controllers
│   │   ├── websocket/    # Socket.io gateway
│   │   ├── services/     # Game logic (AI, combat, progression)
│   │   ├── models/       # Domain models
│   │   └── db/           # Prisma schema & migrations
│   └── tests/            # Unit, integration, contract tests
│
├── frontend/              # React PWA (Vite + TypeScript)
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── game/         # PixiJS rendering (hex grid, sprites)
│   │   ├── pages/        # Page components (Lobby, GameBoard)
│   │   ├── services/     # WebSocket client, API client
│   │   ├── hooks/        # React hooks (useGameState, useWebSocket)
│   │   └── i18n/         # Translations (5 languages)
│   └── tests/            # Unit & E2E tests (Jest, Playwright)
│
├── shared/                # Shared TypeScript types
│   └── types/            # Entities, events, game state
│
├── docs/                  # Documentation
│   └── ARCHITECTURE.md   # System architecture
│
└── specs/                 # Feature specifications
    └── 001-gloomhaven-multiplayer/
        ├── spec.md        # Requirements
        ├── plan.md        # Implementation plan
        ├── tasks.md       # Task breakdown
        └── quickstart.md  # Setup guide
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18+** - UI framework
- **Vite** - Build tool & dev server
- **PixiJS 7+** - Canvas/WebGL rendering (60 FPS hex grid)
- **Socket.io Client** - Real-time communication
- **react-i18next** - Internationalization
- **TypeScript** - Type safety
- **Playwright** - E2E testing

### Backend
- **NestJS 10+** - Enterprise Node.js framework
- **Socket.io** - WebSocket server
- **Prisma 5+** - Type-safe ORM
- **PostgreSQL 14+** - Primary database
- **TypeScript** - Type safety
- **Jest** - Unit & integration testing

### DevOps & Testing
- **Playwright MCP** - Visual testing with Chromium ARM64
- **ESLint & Prettier** - Code quality
- **GitHub Actions** - CI/CD (planned)
- **Docker** - Containerization (planned)

---

## 🎯 User Stories

### ✅ Implemented (P1 & P2 Priority)

1. **Join and Play a Quick Battle** (P1)
   - Create/join rooms with 6-char codes
   - Real-time player lobby
   - Character selection (6 classes)
   - Hex grid with movement and attacks

2. **Complete Full Scenario with Combat** (P1)
   - Ability card selection
   - Initiative-based turn order
   - Monster AI activation
   - Attack resolution with modifier decks
   - Elemental infusion
   - Loot collection
   - Scenario completion detection

3. **Mobile Touch Controls** (P1)
   - Pinch-zoom on hex grid
   - Pan with momentum scrolling
   - Long-press context menus
   - Swipeable card carousel
   - Portrait & landscape support

4. **Reconnect After Disconnection** (P2)
   - Automatic reconnection (10s)
   - Session restoration
   - 24-hour session persistence
   - Disconnect/reconnect notifications

5. **Choose Characters and Scenarios** (P2)
   - 6 character classes with descriptions
   - 5 scenarios with difficulties
   - Unique ability decks per class
   - Scenario-specific map layouts

6. **Multi-Lingual Support** (P2)
   - 5 languages (EN, ES, FR, DE, ZH)
   - Device language detection
   - Manual language selector
   - Layout-safe translations

7. **Optional Account Creation** (P3)
   - UUID-based anonymous play
   - Account upgrade with progress migration
   - XP tracking (Gloomhaven rules)
   - Perk unlocking
   - Scenario completion history

### 📋 Planned (Future)

8. **Campaign Mode** (P4)
9. **Item Shop & Unlockables** (P4)
10. **Achievements System** (P4)

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend unit tests
npm run test:backend

# Frontend unit tests
npm run test:frontend

# E2E tests
cd frontend && npm run test:e2e

# Test coverage
npm test -- --coverage
```

**Test Types**:
- **Unit Tests**: Game logic, services, utilities
- **Integration Tests**: Database + service interaction
- **Contract Tests**: WebSocket event schemas
- **E2E Tests**: Full user story flows

**Coverage Target**: 80% for new code

---

## 📚 Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - System design, data flow, component architecture
- **[Quickstart Guide](specs/001-gloomhaven-multiplayer/quickstart.md)** - 5-minute setup
- **[Specification](specs/001-gloomhaven-multiplayer/spec.md)** - Feature requirements
- **[Implementation Plan](specs/001-gloomhaven-multiplayer/plan.md)** - Technical approach
- **[Tasks](specs/001-gloomhaven-multiplayer/tasks.md)** - Task breakdown
- **[API Contracts](specs/001-gloomhaven-multiplayer/contracts/)** - WebSocket & REST API specs

---

## 🎮 How to Play

### Create a Game

1. Open http://localhost:5173
2. Click **"Create Game"**
3. Enter your nickname
4. Share the **6-character room code** with friends

### Join a Game

1. Open http://localhost:5173
2. Click **"Join Game"**
3. Enter the room code
4. Enter your nickname

### Play

1. **Select Character**: Choose from 6 classes (Brute, Tinkerer, etc.)
2. **Start Game**: Host clicks "Start Game"
3. **Select Cards**: Choose 2 ability cards (top & bottom actions)
4. **Take Actions**: Move, attack, loot based on card actions
5. **Complete Scenario**: Defeat all monsters or fulfill objectives

---

## 🔧 Development

### Commands

```bash
# Development
npm run dev              # Start both frontend & backend
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only

# Building
npm run build            # Build both
npm run build:backend    # Build backend
npm run build:frontend   # Build frontend

# Testing
npm test                 # Run all tests
npm run lint             # Lint all code
npm run type-check       # TypeScript type checking

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio GUI
```

### Claude Code Slash Commands

This project includes custom slash commands for development automation:

#### Development & Testing Commands

- **`/servers`** - Start/restart development servers intelligently
  - Auto-detects if database migrations needed
  - Kills existing processes before restart
  - Uses npm or start-dev.sh based on state
  - Runs with Haiku (fast & efficient)

- **`/visual [smoke|full]`** - Run visual tests with Playwright MCP
  - `smoke` - 7-step definition of done (default)
  - `full` - 13-step comprehensive test suite
  - Auto-starts servers before testing
  - Screenshots saved with 5-day retention
  - Bugs logged to `frontend/tests/bugs.md`

- **`/min <command>`** - Execute commands with Haiku (fast mode)
  - Runs with Haiku model + thinking off
  - Auto-restores Sonnet + thinking on after
  - Use for quick, straightforward tasks

#### Feature Development Workflow (SpecKit)

Complete workflow from specification to implementation:

- **`/speckit.specify <description>`** - Create feature specification
  - Generates spec.md from natural language
  - Creates numbered feature branch (e.g., 003-feature-name)
  - Validates requirements & success criteria
  - Max 3 clarification questions if needed

- **`/speckit.clarify`** - Refine underspecified areas
  - Identifies gaps in current spec
  - Asks targeted clarification questions
  - Updates spec with answers

- **`/speckit.plan`** - Generate implementation plan
  - Creates plan.md with tech stack & approach
  - Generates data-model.md (entities & relationships)
  - Creates API contracts in contracts/ directory
  - Produces quickstart.md for setup

- **`/speckit.tasks`** - Generate actionable task list
  - Creates tasks.md from plan & spec
  - Organizes by user story with priorities
  - Shows dependencies & parallel opportunities
  - Includes file paths for each task

- **`/speckit.implement`** - Execute implementation
  - Processes tasks from tasks.md
  - Executes in dependency order
  - Updates task status as work progresses

- **`/speckit.analyze`** - Cross-artifact consistency check
  - Validates spec.md, plan.md, tasks.md alignment
  - Non-destructive analysis
  - Reports inconsistencies and gaps

- **`/speckit.checklist`** - Generate custom feature checklist
  - Creates validation checklist for current feature
  - Based on requirements from spec

- **`/speckit.constitution`** - Manage project principles
  - Create/update project constitution
  - Defines coding standards & architecture principles
  - Keeps dependent templates in sync

#### Internal Commands

- **`/context-load`** - Load project context (auto-runs at session start)
  - Reads README.md, PRD.md, and all spec.md files
  - Uses Haiku with thinking off
  - Restores Sonnet with thinking on after

For detailed documentation on agents and command usage, see [AGENTS.md](AGENTS.md)

### Environment Variables

```env
# Backend (.env in backend/)
DATABASE_URL=postgresql://user:pass@localhost:5432/hexhaven_dev
PORT=3001
FRONTEND_URL=http://localhost:5173

# Frontend (.env in frontend/)
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

---

## 🧪 Visual Testing

Hexhaven includes an MCP-based visual testing system for real browser testing.

### Quick Commands

```bash
# Run smoke test (7 steps - definition of done)
/visual smoke

# Run full test (13 steps - comprehensive)
/visual full
```

### Features

- **Real Browser Testing**: Uses Playwright MCP with Chromium on ARM64
- **Semantic Locators**: Accessibility tree-based element detection
- **Automatic Screenshots**: Branch + timestamp naming convention
- **5-Day Retention**: Auto-cleanup of old screenshots
- **Bug Tracking**: Auto-appends failures to `tests/bugs.md`
- **Mobile Viewport**: Tests on Pixel 6 (412×915px)

### Screenshot Gallery

View test screenshots at: http://localhost:5173/test-videos

Screenshots are named: `[branch]-[timestamp]-[mode]-[step]-[description].png`

Example: `002-postgres-user-db-20251204T105342Z-smoke-01-landing.png`

### Documentation

- **Guide**: `frontend/tests/docs/VISUAL-TESTING-GUIDE.md`
- **Reports**: `frontend/tests/docs/SMOKE_TEST_REPORT.md`
- **Bugs**: `frontend/tests/bugs.md`
- **Command**: `frontend/.claude/commands/visual.md`

---

## 🤝 Contributing

**This is a private project.** External contributions are not accepted at this time.

For internal development:
1. Create feature branch from `main`
2. Follow `.specify` workflow (spec → plan → tasks → implement)
3. Ensure all tests pass (`npm test`)
4. Submit pull request with description

**Code Standards**:
- TypeScript strict mode
- ESLint + Prettier formatting
- 80%+ test coverage
- TDD approach (tests before implementation)
- YAGNI, KISS, DRY principles

---

## 📄 License

**UNLICENSED** - Private project. All rights reserved.

---

## 🙏 Acknowledgments

- **Gloomhaven** by Isaac Childres (Cephalofair Games)
- **Red Blob Games** for hex grid algorithms
- Open-source community for amazing tools (React, NestJS, PixiJS, etc.)

---

## 📞 Support

For issues or questions:
- Check [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Review [specs/001-gloomhaven-multiplayer/quickstart.md](specs/001-gloomhaven-multiplayer/quickstart.md)
- Contact the development team

---

**Built with ❤️ using TypeScript, React, and NestJS**

**Version**: 1.0.0 (MVP)
**Status**: Production-Ready
**Last Updated**: 2025-11-14
