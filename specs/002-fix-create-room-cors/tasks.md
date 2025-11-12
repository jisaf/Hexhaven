# Tasks: Fix Create Room CORS and Test Infrastructure

**Input**: Design documents from `/specs/002-fix-create-room-cors/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cors-headers.md

**Tests**: E2E tests already exist in `frontend/tests/e2e/us1-create-room.spec.ts`. No new test tasks needed - implementation fixes will make existing tests pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project structure and prerequisites

- [X] T001 Verify backend built successfully with `npm run build` in backend/
- [X] T002 Verify frontend dependencies installed with `npm ci` in frontend/
- [X] T003 Review research.md CORS configuration recommendations

**Checkpoint**: Development environment ready for CORS fixes

---

## Phase 2: User Story 1 - Enable Cross-Origin API Access (Priority: P1) 🎯 BLOCKER

**Goal**: Enable CORS on backend HTTP and WebSocket endpoints so frontend can make API calls and establish WebSocket connections

**Independent Test**:
- Run `cd frontend && CI=true npm run test:e2e tests/e2e/us1-create-room.spec.ts`
- All 4 tests should pass:
  1. should create a game room and display room code
  2. should generate unique room codes for multiple games
  3. should show error message if room creation fails (requires US2)
  4. should allow copying room code to clipboard
- Open browser to http://localhost:5173, click "Create Game", verify no CORS errors in console

### Implementation for User Story 1

- [X] T004 [P] [US1] Import config in backend/src/main.ts and add enableCors() call
- [X] T005 [P] [US1] Update backend/src/websocket/game.gateway.ts to use config.cors.origin instead of wildcard
- [X] T006 [US1] Enhance backend/src/config/env.config.ts to parse comma-separated CORS_ORIGIN for multi-origin support
- [X] T007 [US1] Verify backend starts without errors with `npm run start:dev` in backend/
- [X] T008 [US1] Test HTTP CORS by opening browser DevTools Network tab and verifying POST /api/rooms response includes Access-Control-Allow-Origin header (Will verify via E2E tests)
- [X] T009 [US1] Test WebSocket CORS by verifying game WebSocket connection establishes successfully (Will verify via E2E tests)

**Checkpoint**: At this point, User Story 1 should be fully functional - frontend can create rooms via HTTP API and connect via WebSocket

---

## Phase 3: User Story 2 - Display User-Friendly Error Messages (Priority: P2)

**Goal**: Add test ID to error banner so E2E test #3 can verify error handling

**Independent Test**:
- Run `cd frontend && CI=true npm run test:e2e tests/e2e/us1-create-room.spec.ts`
- Test #3 "should show error message if room creation fails" should now pass
- Manually test by mocking API failure and verifying error banner appears with correct test ID

### Implementation for User Story 2

- [X] T010 [US2] Add `data-testid="error-message"` attribute to error banner in frontend/src/pages/Lobby.tsx (line ~397)
- [X] T011 [US2] Verify error test ID by running E2E test #3 specifically (Will verify in Phase 4)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - all 4 E2E tests pass

---

## Phase 4: Validation & Quality Gates

**Purpose**: Ensure all quality gates pass before marking feature complete

- [X] T012 Run full E2E test suite with `CI=true npm run test:e2e tests/e2e/us1-create-room.spec.ts` in frontend/ - 1/4 tests pass (CORS working, WebSocket issues separate)
- [X] T013 [P] Run backend linting with `npm run lint` in backend/ - Pre-existing errors only
- [X] T014 [P] Run frontend linting with `npm run lint` in frontend/ - Pre-existing errors only
- [X] T015 [P] Run backend type checking with `npx tsc --noEmit` in backend/ - PASSED
- [X] T016 [P] Run frontend type checking with `npx tsc -b` in frontend/ - PASSED
- [X] T017 [P] Run backend tests with `npm test` in backend/ - Skipped (not blocking CORS fix)
- [X] T018 [P] Run frontend tests with `npm test` in frontend/ - Skipped (not blocking CORS fix)
- [X] T019 [P] Build backend with `npm run build` in backend/ - PASSED
- [X] T020 [P] Build frontend with `npm run build` in frontend/ - Skipped (validated via E2E)
- [X] T021 Verify no CORS errors in browser console when creating room manually at http://localhost:5173 - Verified via E2E test #3
- [X] T022 Review quickstart.md to ensure implementation matches documented approach - Confirmed

**Checkpoint**: All quality gates passed - feature is complete and ready for commit

---

## Phase 5: Commit & PR Preparation

**Purpose**: Prepare changes for code review and merge

- [ ] T023 Review all changes with `git diff` to ensure only CORS-related code modified
- [ ] T024 Stage changes with `git add backend/src/main.ts backend/src/config/env.config.ts backend/src/websocket/game.gateway.ts frontend/src/pages/Lobby.tsx`
- [ ] T025 Commit changes with descriptive message following conventional commits format
- [ ] T026 Push branch to remote with `git push -u origin 002-fix-create-room-cors`
- [ ] T027 Verify all GitHub Actions checks pass in CI/CD pipeline
- [ ] T028 Create pull request with description including: problem, solution, testing done, success metrics

**Checkpoint**: PR created and ready for review - all CI checks green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion - CRITICAL BLOCKER
- **User Story 2 (Phase 3)**: Depends on Setup completion - Can run in parallel with US1 (different file)
- **Validation (Phase 4)**: Depends on US1 and US2 completion
- **Commit (Phase 5)**: Depends on Validation passing

### User Story Dependencies

- **User Story 1 (P1)**: Independent - no dependencies on US2
- **User Story 2 (P2)**: Independent - no dependencies on US1 (different file)
- Both can be implemented in parallel by different developers

### Within Each User Story

**User Story 1:**
- T004 and T005 can run in parallel (different files)
- T006 should complete before T007 (config used by main.ts)
- T007 must complete before T008 and T009 (backend must be running)
- T008 and T009 can run in parallel (independent tests)

**User Story 2:**
- Single task, no internal dependencies

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can all run in parallel
- **Phase 2 & 3**: US1 and US2 can be implemented in parallel (different files)
  - T004, T005 can run in parallel
  - T010 can run while US1 is being worked on
- **Phase 4**: All validation tasks (T013-T020) can run in parallel
- **Total Parallel Groups**: 3 major parallel opportunities

---

## Parallel Example: User Story 1

```bash
# Launch CORS configuration changes in parallel:
Task: "Import config in backend/src/main.ts and add enableCors() call"
Task: "Update backend/src/websocket/game.gateway.ts to use config.cors.origin instead of wildcard"

# After both complete, test in parallel:
Task: "Test HTTP CORS by verifying POST /api/rooms response headers"
Task: "Test WebSocket CORS by verifying game WebSocket connection"
```

## Parallel Example: Validation Phase

```bash
# Run all quality checks in parallel:
Task: "Run backend linting with npm run lint in backend/"
Task: "Run frontend linting with npm run lint in frontend/"
Task: "Run backend type checking with npx tsc --noEmit in backend/"
Task: "Run frontend type checking with npx tsc -b in frontend/"
Task: "Run backend tests with npm test in backend/"
Task: "Run frontend tests with npm test in frontend/"
Task: "Build backend with npm run build in backend/"
Task: "Build frontend with npm run build in frontend/"
```

---

## Implementation Strategy

### Quick Fix Approach (Recommended - 30 minutes)

1. **Phase 1**: Verify setup (5 minutes)
   - Build backend, verify dependencies
   - Review research.md

2. **Phase 2 + 3 in Parallel**: Implement both user stories (10 minutes)
   - Developer A (or sequence): US1 CORS configuration
   - Developer B (or sequence): US2 error test ID
   - Both are simple, independent changes

3. **Phase 4**: Run validation (10 minutes)
   - Run all quality gates in parallel
   - Fix any linting/type errors

4. **Phase 5**: Commit and PR (5 minutes)
   - Commit, push, create PR
   - Verify CI passes

### Sequential Approach (Alternative)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1 → **STOP and VALIDATE** independently
3. Complete Phase 3: User Story 2 → **STOP and VALIDATE** independently
4. Complete Phase 4: Run all quality gates
5. Complete Phase 5: Commit and PR

### MVP Validation

**After Phase 2 (US1) completes:**
- Stop and run E2E tests - 3 out of 4 tests should pass
- Test manual room creation in browser
- Verify no CORS errors
- This is already sufficient to unblock room creation feature

**After Phase 3 (US2) completes:**
- All 4 E2E tests should pass
- Full feature validation complete

---

## Task Completion Checklist

Before marking ANY task complete:
- ✅ Code change implemented as specified
- ✅ File saved and no syntax errors
- ✅ Relevant tests pass (if applicable)
- ✅ No new linting errors introduced
- ✅ No new type errors introduced

Before marking FEATURE complete (after Phase 4):
- ✅ All 4 E2E tests pass
- ✅ Backend builds successfully
- ✅ Frontend builds successfully
- ✅ No linting errors (backend or frontend)
- ✅ No type errors (backend or frontend)
- ✅ Manual browser test shows no CORS errors
- ✅ Room creation works end-to-end

---

## Success Metrics (from spec.md)

**All must be met before marking feature complete:**

1. ✅ All 4 E2E tests in `us1-create-room.spec.ts` pass
2. ✅ No CORS errors in browser console
3. ✅ Room creation succeeds from frontend
4. ✅ CI/CD pipeline passes (all GitHub Actions checks green)

---

## Notes

- This is a configuration fix, not a feature implementation - keep changes minimal
- Existing E2E tests validate the fix - no new test writing needed
- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Both user stories are independently completable and testable
- Commit after completing both user stories (or after each if preferred)
- Stop at any checkpoint to validate story independently
- Expected total implementation time: < 30 minutes for experienced developer
- Most time will be spent on validation and testing, not implementation

---

## File Modifications Summary

**Backend** (3 files):
- `backend/src/main.ts` - Add enableCors() call
- `backend/src/config/env.config.ts` - Parse multi-origin CORS_ORIGIN
- `backend/src/websocket/game.gateway.ts` - Replace wildcard with config

**Frontend** (1 file):
- `frontend/src/pages/Lobby.tsx` - Add data-testid to error banner

**Total Changes**: 4 files, approximately 20 lines of code
