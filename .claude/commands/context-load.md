---
description: Load project context at session start using Haiku
model: haiku
thinking: false
---

## Goal

Load essential project context from key documentation files. This provides agents with the foundational knowledge needed to work effectively on the codebase. Runs with Haiku model for efficiency.

## Task

Read and process the following files in priority order to establish project context:

### Tier 1: Core Context (Always Read)

1. **`/home/ubuntu/hexhaven/README.md`** - Project overview, structure, tech stack, quick start
2. **`/home/ubuntu/hexhaven/docs/ARCHITECTURE.md`** - Complete system architecture, data flows, component relationships
3. **`/home/ubuntu/hexhaven/.specify/memory/constitution.md`** - Project principles, coding standards, quality gates

### Tier 2: Domain Knowledge (Read for Feature Work)

4. **`/home/ubuntu/hexhaven/docs/game-rules/index.md`** - Gloomhaven rules index with quick reference tables
5. **`/home/ubuntu/hexhaven/docs/action-system.md`** - Card actions, combat mechanics, element system (implementation details)
6. **`/home/ubuntu/hexhaven/docs/api-reference.md`** - REST and WebSocket API documentation
7. **`/home/ubuntu/hexhaven/PRD.md`** - Product requirements and user stories

### Tier 3: Specifications (Read if Needed)

8. **`/home/ubuntu/hexhaven/specs/001-gloomhaven-multiplayer/spec.md`** - Multiplayer feature spec
9. **`/home/ubuntu/hexhaven/specs/002-postgres-user-db/spec.md`** - Database spec

## What to Understand

- **Architecture**: Frontend (React/PixiJS), Backend (NestJS), Database (PostgreSQL/Prisma)
- **State Management**: Centralized managers (RoomSessionManager, GameStateManager), visual callback pattern
- **WebSocket Events**: Real-time game synchronization, event payloads in shared/types
- **Game Systems**: Turn order, monster AI, summons, narratives, campaigns
- **Quality Standards**: TDD mandatory, 80% coverage, CI gates must pass before task completion
- **Patterns**: Server-authoritative, type-safe shared types, facade coordinators

## Output

After loading context, provide a brief confirmation listing:
- Files successfully processed
- Key architectural patterns understood
- Ready to proceed with tasks
