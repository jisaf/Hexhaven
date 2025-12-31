---
description: Load context, create feature branch, plan and implement with Opus
model: opus
thinking: true
---

## Goal

Start a new feature with fresh context by clearing previous conversation history, loading project context, creating a feature branch from main, planning the implementation with Opus, and implementing with Opus.

## Execution Steps

1. **Switch to Main and Pull**:
   - Checkout main branch: `git checkout main`
   - Pull latest changes: `git pull origin main`

2. **Clear Context**: Execute `/clear` to remove all previous conversation history and start fresh

3. **Load Essential Context**: Read these critical documents to understand the project:

   **Core Context (Always Read)**:
   - `/home/ubuntu/hexhaven/README.md` - Project overview, structure, tech stack
   - `/home/ubuntu/hexhaven/docs/ARCHITECTURE.md` - System architecture, data flows, patterns
   - `/home/ubuntu/hexhaven/.specify/memory/constitution.md` - Coding standards, quality gates

   **Domain Knowledge (For Feature Work)**:
   - `/home/ubuntu/hexhaven/docs/game-rules/index.md` - Gloomhaven rules quick reference
   - `/home/ubuntu/hexhaven/docs/action-system.md` - Card actions, combat implementation
   - `/home/ubuntu/hexhaven/docs/api-reference.md` - REST and WebSocket APIs

4. **Parse Task**: Extract the feature description from the prompt to generate a branch name

5. **Create Branch**:
   - Create descriptive branch name from the task (e.g., "add-user-auth" or "fix-login-bug")
   - Prefix with `feat/` for features, `fix/` for bugs, `refactor/` for refactoring
   - Create and checkout new branch: `git checkout -b <prefix>/<branch-name>`

6. **Plan with Opus**: Use Opus model to create a detailed implementation plan by entering plan mode and analyzing the codebase to design the implementation approach

7. **Implement with Opus**: Continue with Opus to implement the planned changes

## Key Patterns to Follow

- **Server-Authoritative**: All game logic runs on backend, client displays state
- **State Management**: Use RoomSessionManager, GameStateManager, visual callbacks
- **WebSocket Events**: Define in `shared/types/events.ts`, handle in game.gateway.ts
- **TDD Mandatory**: Write tests before implementation, all tests must pass
- **Quality Gates**: No task completion until tests pass, code builds, no lint errors

## Branch Naming Convention

- Use lowercase with hyphens
- Prefix with type: `feat/`, `fix/`, `refactor/`, `docs/`
- Be descriptive but concise
- Examples:
  - "add user authentication" → `feat/add-user-auth`
  - "fix login redirect bug" → `fix/login-redirect`
  - "refactor database layer" → `refactor/db-layer`

## Task

{PROMPT}
