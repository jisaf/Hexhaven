# Implementation Plan: Fix Create Room CORS and Test Infrastructure

**Branch**: `002-fix-create-room-cors` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-fix-create-room-cors/spec.md`

## Summary

Fix critical CORS configuration issue preventing frontend from creating game rooms. Backend lacks `enableCors()` call, causing all E2E tests to fail with "Failed to fetch" errors. Solution: Enable environment-based CORS in NestJS main.ts, fix WebSocket gateway wildcard, and add missing test IDs.

**Impact**: BLOCKER - Create room feature completely non-functional without this fix.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20)
**Primary Dependencies**: NestJS 10.x, Socket.io (for WebSocket), Vite 5.x (frontend)
**Storage**: N/A (configuration-only change)
**Testing**: Playwright (E2E), Jest (unit)
**Target Platform**: Linux server (development + production)
**Project Type**: Web (backend + frontend monorepo)
**Performance Goals**: No impact (CORS adds <1ms overhead)
**Constraints**: Must support both HTTP and WebSocket CORS
**Scale/Scope**: Single backend service, single frontend application

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality & Maintainability ✅

- **Single Responsibility**: Each change has ONE purpose
  - main.ts: Enable HTTP CORS
  - game.gateway.ts: Enable WebSocket CORS
  - Lobby.tsx: Add test ID
- **DRY**: Reuse existing `config.cors` from env.config.ts ✅
- **YAGNI**: Only fixing what's broken (CORS), no speculative features ✅
- **KISS**: Simplest solution (add 3 lines of code) ✅
- **Readability**: Clear, self-documenting configuration ✅
- **Type Safety**: TypeScript enforced throughout ✅
- **Linting**: All changes must pass ESLint ✅

### II. Testing Standards (NON-NEGOTIABLE) ✅

- **TDD Approach**: Tests already exist (us1-create-room.spec.ts), fixing implementation to match ✅
- **Test Types**:
  - E2E Tests: 4 existing tests in us1-create-room.spec.ts ✅
  - Integration Tests: Covered by existing backend tests ✅
- **Test Quality**: Existing tests are deterministic and well-structured ✅
- **CI Integration**: GitHub Actions runs all tests ✅
- **Task Completion Gate**: Cannot mark complete until all 4 E2E tests pass ✅

### III. User Experience Consistency ✅

- **User Story Driven**: US1 (Enable CORS) and US2 (Error test ID) ✅
- **Error Handling**: Adding test ID improves error testing ✅
- **Cross-Platform**: No impact (backend configuration) ✅
- **i18n**: No user-facing text changes ✅
- **Feedback**: Room creation will work instantly after fix ✅

### IV. Performance Requirements ✅

- **No Performance Impact**: CORS validation adds <1ms per request ✅
- **Preflight Caching**: maxAge=3600 reduces repeated OPTIONS calls ✅

### V. Documentation & Communication ✅

- **AI-First Documentation**:
  - ✅ research.md explains CORS decision in scannable format
  - ✅ quickstart.md enables 5-minute implementation
  - ✅ data-model.md documents configuration structure
  - ✅ contracts/cors-headers.md specifies HTTP contract
- **Specification First**: spec.md → plan.md → tasks.md workflow ✅
- **Code Documentation**: CORS configuration self-documenting ✅

### VI. Security & Reliability ✅

- **Security Standards**:
  - ✅ No wildcard origins with credentials
  - ✅ Environment-based origin whitelisting
  - ✅ HTTPS required in production
  - ✅ Origin validation on every request
- **Reliability**: CORS failures fail fast with clear errors ✅
- **Observability**: CORS rejections logged ✅

### Quality Gates ✅

**TASK COMPLETION GATES**:
- ✅ All tests pass (4 E2E tests in us1-create-room.spec.ts)
- ✅ Code builds (backend + frontend)
- ✅ No linting errors
- ✅ TypeScript passes

**CODE MERGE GATES**:
- ✅ All task completion gates
- ✅ Code coverage maintained (no new logic)
- ✅ Security audit passes (no new dependencies)
- ✅ GitHub Actions all green

### CI/CD Pipeline Requirements ✅

**Backend**:
- ✅ `npm run lint` passes
- ✅ `npx tsc --noEmit` passes
- ✅ `npm test` passes
- ✅ `npm run build` succeeds

**Frontend**:
- ✅ `npm run lint` passes
- ✅ `npx tsc -b` passes
- ✅ `npm test` passes
- ✅ `npm run build` succeeds

**E2E Tests**:
- ✅ 4 tests in us1-create-room.spec.ts must pass
- ✅ Run with `CI=true` for headless mode

## Project Structure

### Documentation (this feature)

```text
specs/002-fix-create-room-cors/
├── spec.md              # Feature specification (user stories, requirements)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 output (CORS best practices research)
├── data-model.md        # Phase 1 output (configuration structure)
├── quickstart.md        # Phase 1 output (5-minute setup guide)
├── contracts/           # Phase 1 output (HTTP/WS CORS contracts)
│   └── cors-headers.md
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT YET CREATED)
```

### Source Code (repository root)

```text
# Web application structure (backend + frontend)
backend/
├── src/
│   ├── main.ts                    # [MODIFY] Add enableCors()
│   ├── config/
│   │   └── env.config.ts          # [MODIFY] Parse multi-origin CORS_ORIGIN
│   ├── websocket/
│   │   └── game.gateway.ts        # [MODIFY] Replace wildcard with config
│   └── api/
│       └── rooms.controller.ts    # [NO CHANGE] Already has CORS support
└── tests/
    └── [existing tests]           # [NO CHANGE] Tests remain valid

frontend/
├── src/
│   └── pages/
│       └── Lobby.tsx              # [MODIFY] Add data-testid="error-message"
└── tests/
    └── e2e/
        └── us1-create-room.spec.ts # [NO CHANGE] Tests will pass after fix
```

**Structure Decision**: Web application with existing backend/frontend separation. No structural changes needed - only configuration updates to existing files.

## Implementation Phases

### Phase 0: Research ✅ COMPLETE

**Output**: `research.md` - NestJS CORS best practices

**Findings**:
- **Decision**: Use environment-based CORS with existing config module
- **Rationale**: Security-first, leverages existing infrastructure, production-ready
- **Alternatives Considered**: Wildcard (insecure), direct config (inflexible), custom middleware (unnecessary)
- **Code Examples**: Complete NestJS + Socket.io configuration

### Phase 1: Design & Contracts ✅ COMPLETE

**Output**: `data-model.md`, `contracts/cors-headers.md`, `quickstart.md`

**Key Decisions**:
- No new data models (configuration only)
- CORS headers contract defined
- Environment variables structure unchanged
- Multi-origin support via comma-separated CORS_ORIGIN

### Phase 2: Task Breakdown (Next Step)

**Command**: `/speckit.tasks`

**Expected Tasks** (will be generated):
1. [P1] Update backend main.ts to enable CORS
2. [P1] Update env.config.ts to parse multi-origin CORS_ORIGIN
3. [P1] Update game.gateway.ts to use config instead of wildcard
4. [P2] Add data-testid="error-message" to Lobby.tsx
5. [P1] Run E2E tests to verify fix
6. [P1] Commit changes and verify CI passes

## Complexity Tracking

> **No violations requiring justification.**

This is a straightforward configuration fix with no added complexity. All changes follow KISS principle.

## Dependencies

### Feature Dependencies
- **Blocks**: All room creation functionality (BLOCKER)
- **Blocked By**: None (can implement immediately)

### External Dependencies
- NestJS 10.x (already installed)
- Socket.io (already installed)
- Existing env.config.ts infrastructure (already implemented)

## Risk Assessment

### Low Risk ✅
- **Change Scope**: 3 file modifications, ~20 lines of code
- **Testing**: 4 existing E2E tests validate the fix
- **Rollback**: Simple revert if issues arise
- **No Database Changes**: Zero data migration risk
- **No Breaking Changes**: Purely additive configuration

### Mitigation
- Test locally before committing
- Verify CI passes before merging
- Monitor production logs for CORS rejections (if any)

## Success Criteria

**All must be met before marking feature complete**:

1. ✅ Backend enables CORS in main.ts
2. ✅ WebSocket gateway uses config instead of wildcard
3. ✅ Error banner has data-testid attribute
4. ✅ All 4 E2E tests pass:
   - should create a game room and display room code
   - should generate unique room codes for multiple games
   - should show error message if room creation fails
   - should allow copying room code to clipboard
5. ✅ No CORS errors in browser console
6. ✅ CI/CD pipeline all green
7. ✅ Room creation works end-to-end from UI

## Next Steps

1. Run `/speckit.tasks` to generate task breakdown
2. Implement tasks in priority order (P1 first)
3. Test locally with `CI=true npm run test:e2e`
4. Commit changes with proper message
5. Create PR and verify GitHub Actions pass
6. Merge when all checks green

---

**Plan Status**: ✅ COMPLETE (Phases 0-1 done)
**Next Command**: `/speckit.tasks` to generate task breakdown
**Estimated Implementation Time**: < 30 minutes
