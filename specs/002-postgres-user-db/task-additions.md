# Task Additions: Analysis Findings

**Generated**: 2025-12-01
**Source**: `/speckit.analyze` command findings
**Target**: `/home/opc/hexhaven/specs/002-postgres-user-db/tasks.md`

## Executive Summary

After analyzing spec.md, plan.md, and tasks.md against the constitution, I identified several findings that require task additions. This document provides specific, actionable tasks to address each finding.

### Findings Status

**CRITICAL (C) - 0 findings**
- ✅ C1: i18n implementation → RESOLVED (react-i18next with 5 languages: en, es, fr, de, zh)
- ✅ C3: CI/CD pipeline → RESOLVED (comprehensive GitHub Actions pipeline)
- ⬆️ C2: Cross-platform testing → DOWNGRADED TO HIGH (responsive design implemented, testing strategy needed)

**HIGH (H) - 8 findings requiring task additions**
- H1: Performance benchmarking and monitoring
- H2: Database index verification
- H3: Accessibility (WCAG 2.1 AA) compliance
- H4: Race condition testing for concurrent character updates
- H5: Password validation specification clarification
- H6: Input validation and XSS sanitization
- C2: Responsive design testing strategy (downgraded from CRITICAL)
- H8: Error handling standardization

---

## C2: Cross-Platform Testing (Downgraded from CRITICAL to HIGH)

### Assessment

**Codebase Review Findings:**
- ✅ Viewport meta tag configured: `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`
- ✅ 26 responsive CSS patterns across 13 files with @media queries
- ✅ Mobile-first design patterns in AbilityCard.css, ElementalStateDisplay.css, GameBoard.module.css
- ✅ Touch gesture detection system with comprehensive tests (gestures.test.ts: 483 lines)
- ✅ Touch-friendly target sizes (MIN_TOUCH_TARGET_SIZE constant)
- ✅ Mobile performance optimizations in PixiApp.tsx
- ✅ Orientation-specific media queries (landscape/portrait)
- ✅ Accessibility media queries (prefers-reduced-motion)

**Gap:** No explicit responsive testing strategy in tasks.md for different viewport sizes and devices.

**Recommendation:** Add responsive design testing tasks to ensure new components maintain cross-platform compatibility.

### Task Additions

**Insert into Phase 1: Database Setup & Configuration (after T013)**

```markdown
- [ ] [T013-R1] [P1] Add responsive design testing checklist to test documentation
  - **File**: `backend/tests/README.md`
  - **Actions**:
    - Document responsive testing requirements for all new frontend components
    - Specify viewport sizes to test: mobile (375px), tablet (768px), desktop (1920px)
    - List browser compatibility matrix: Chrome, Firefox, Safari, Edge (latest 2 versions)
  - **Acceptance**: Documentation includes responsive testing checklist

- [ ] [T013-R2] [P1] Configure viewport testing in Jest setup
  - **File**: `frontend/tests/setup.ts`
  - **Actions**:
    - Add `@testing-library/react` viewport helpers
    - Configure window.matchMedia mock for media query testing
    - Add viewport resize utility for tests
  - **Acceptance**: Tests can simulate different viewport sizes
```

**Insert into Phase 4: User Story 1 - Create Account (after T058)**

```markdown
- [ ] [T058-R1] [P1] [US1] Test: Login form responsive layout
  - **File**: `frontend/tests/unit/LoginForm.responsive.test.tsx`
  - **Actions**:
    - Test login form renders correctly at 375px (mobile)
    - Test login form renders correctly at 768px (tablet)
    - Test touch targets meet 44px minimum on mobile
    - Test no horizontal scrolling on any viewport
  - **Acceptance**: All viewport tests pass, touch targets accessible
```

**Insert into Phase 5: User Story 2 - Manage Multiple Characters (after T098)**

```markdown
- [ ] [T098-R1] [P1] [US2] Test: Character list responsive layout
  - **File**: `frontend/tests/unit/CharacterList.responsive.test.tsx`
  - **Actions**:
    - Test character cards stack vertically on mobile (375px)
    - Test character cards use grid layout on tablet/desktop (768px+)
    - Test character selection works with touch gestures
    - Test no content overflow on any viewport
  - **Acceptance**: Character list adapts to all viewport sizes
```

**Insert into Phase 6: User Story 3 - Join Multiple Games (after T145)**

```markdown
- [ ] [T145-R1] [P1] [US3] Test: Game board responsive controls
  - **File**: `frontend/tests/unit/GameBoard.responsive.test.tsx`
  - **Actions**:
    - Test game controls accessible on mobile viewport
    - Test ability cards readable at 375px width
    - Test pinch-to-zoom works on mobile (using gestures.test.ts patterns)
    - Test turn order display wraps on narrow screens
  - **Acceptance**: Game board playable on mobile and desktop
```

---

## H1: Performance Benchmarking and Monitoring

### Gap Analysis

Constitution requires performance targets (authentication <50ms, game state <100ms), but tasks.md has no performance benchmarking or monitoring tasks.

### Task Additions

**Insert into Phase 1: Database Setup & Configuration (after T013)**

```markdown
- [ ] [T013-P1] [P2] Configure performance benchmarking infrastructure
  - **File**: `backend/tests/performance/setup.ts`
  - **Actions**:
    - Install benchmark.js or similar benchmarking library
    - Create benchmark runner with statistical analysis (P50, P95, P99)
    - Configure benchmark output format (console + JSON)
    - Set up baseline performance data storage
  - **Acceptance**: Benchmark infrastructure ready for use

- [ ] [T013-P2] [P2] Create database query performance logger
  - **File**: `backend/src/db/performance.ts`
  - **Actions**:
    - Create Prisma middleware to log slow queries (>100ms)
    - Collect query timing statistics (count, avg, P95, P99)
    - Add query plan logging for slow queries (EXPLAIN)
    - Create performance report generator
  - **Acceptance**: Slow queries logged with timing and execution plans
```

**Insert into Phase 3: Seed Data (after T040)**

```markdown
- [ ] [T040-P1] [P2] Benchmark: Character data retrieval
  - **File**: `backend/tests/performance/character.bench.ts`
  - **Actions**:
    - Benchmark character retrieval by ID (target: <50ms at P95)
    - Benchmark character list retrieval for user (target: <50ms)
    - Test with 10, 50, 100 characters per user
    - Generate performance report comparing to targets
  - **Acceptance**: Character queries meet <50ms P95 target
```

**Insert into Phase 4: User Story 1 - Create Account (after T072)**

```markdown
- [ ] [T072-P1] [P2] [US1] Benchmark: Authentication performance
  - **File**: `backend/tests/performance/auth.bench.ts`
  - **Actions**:
    - Benchmark user registration (bcrypt hashing, target: <200ms)
    - Benchmark user login (username lookup + bcrypt compare, target: <50ms)
    - Benchmark JWT generation and verification (target: <10ms)
    - Test with concurrent users (10, 50, 100 simultaneous logins)
  - **Acceptance**: Auth queries meet targets, bcrypt <200ms, lookup <50ms

- [ ] [T072-P2] [P2] [US1] Benchmark: Connection pool under load
  - **File**: `backend/tests/performance/pool.bench.ts`
  - **Actions**:
    - Simulate 100 concurrent users making auth requests
    - Monitor connection pool size and wait times
    - Measure connection acquisition time (target: <10ms)
    - Verify no connection pool exhaustion
  - **Acceptance**: Connection pool handles 100 concurrent users without exhaustion
```

**Insert into Phase 6: User Story 3 - Join Multiple Games (after T145)**

```markdown
- [ ] [T145-P1] [P2] [US3] Benchmark: Game state queries
  - **File**: `backend/tests/performance/game.bench.ts`
  - **Actions**:
    - Benchmark game state retrieval (4 players + 20 monsters, target: <100ms)
    - Benchmark game event insertion (target: <50ms)
    - Benchmark game state snapshot creation (target: <200ms)
    - Test JSONB query performance with varying state sizes (1MB, 5MB, 10MB)
  - **Acceptance**: Game state queries meet <100ms P95 target for typical games
```

**Insert into Phase 8: User Story 5 - Campaign Support (after T213)**

```markdown
- [ ] [T213-P1] [P2] [US5] Performance regression report
  - **File**: `backend/tests/performance/regression-report.md`
  - **Actions**:
    - Run all performance benchmarks
    - Compare results to constitution targets
    - Document any regressions or performance concerns
    - Generate recommendations for optimization if targets not met
  - **Acceptance**: Performance report generated, all targets met or exceptions documented
```

---

## H2: Database Index Verification

### Gap Analysis

FR-013 requires indexes on frequently queried fields, but no task validates index creation or measures index effectiveness.

### Task Additions

**Insert into Phase 2: Database Schema (after T024)**

```markdown
- [ ] [T024-I1] [P1] Verify database indexes created
  - **File**: `backend/tests/integration/indexes.test.ts`
  - **Actions**:
    - Query PostgreSQL pg_indexes table to verify index existence
    - Verify index on User.username (unique)
    - Verify index on RefreshToken.userId
    - Verify index on Character.userId
    - Verify index on Character.currentGameId
    - Verify index on Game.roomCode (unique)
    - Verify index on GameEvent.gameId + sequenceNumber
    - Generate missing indexes report if any not found
  - **Acceptance**: All required indexes exist, test passes

- [ ] [T024-I2] [P2] Benchmark index effectiveness
  - **File**: `backend/tests/performance/index-effectiveness.bench.ts`
  - **Actions**:
    - Seed database with 1000 users, 5000 characters, 500 games
    - Benchmark user lookup by username (should use index)
    - Benchmark character lookup by userId (should use index)
    - Benchmark game lookup by roomCode (should use index)
    - Use EXPLAIN ANALYZE to verify index scans (not sequential scans)
    - Document any sequential scans that should be index scans
  - **Acceptance**: All lookups use index scans, query times <50ms
```

---

## H3: Accessibility (WCAG 2.1 AA) Compliance

### Gap Analysis

Constitution requires WCAG 2.1 AA compliance, but tasks.md has no accessibility testing or requirements.

### Task Additions

**Insert into Phase 1: Database Setup & Configuration (after T013)**

```markdown
- [ ] [T013-A1] [P2] Configure accessibility testing tools
  - **File**: `frontend/tests/setup.ts`
  - **Actions**:
    - Install jest-axe for automated accessibility testing
    - Configure axe-core with WCAG 2.1 AA ruleset
    - Add toHaveNoViolations matcher to Jest
    - Document accessibility testing checklist
  - **Acceptance**: jest-axe configured, accessible in all tests

- [ ] [T013-A2] [P2] Add accessibility testing documentation
  - **File**: `frontend/tests/README.md`
  - **Actions**:
    - Document WCAG 2.1 AA requirements for all components
    - List keyboard navigation requirements (Tab, Enter, Esc, Arrow keys)
    - Specify ARIA label requirements for interactive elements
    - Define color contrast requirements (4.5:1 for text, 3:1 for UI)
    - Document screen reader testing checklist
  - **Acceptance**: Accessibility requirements documented
```

**Insert into Phase 4: User Story 1 - Create Account (after T058)**

```markdown
- [ ] [T058-A1] [P1] [US1] Test: Login form accessibility
  - **File**: `frontend/tests/unit/LoginForm.a11y.test.tsx`
  - **Actions**:
    - Test login form has no axe violations
    - Test all form inputs have associated labels
    - Test error messages announced to screen readers (aria-live)
    - Test keyboard navigation (Tab order, Enter to submit)
    - Test focus management (error fields receive focus)
  - **Acceptance**: Login form passes WCAG 2.1 AA, no axe violations

- [ ] [T058-A2] [P1] [US1] Test: Registration form accessibility
  - **File**: `frontend/tests/unit/RegisterForm.a11y.test.tsx`
  - **Actions**:
    - Test registration form has no axe violations
    - Test password requirements announced to screen readers
    - Test username availability feedback accessible
    - Test rate limiting error accessible to screen readers
    - Test all error states have aria-describedby
  - **Acceptance**: Registration form passes WCAG 2.1 AA
```

**Insert into Phase 5: User Story 2 - Manage Multiple Characters (after T098)**

```markdown
- [ ] [T098-A1] [P1] [US2] Test: Character list accessibility
  - **File**: `frontend/tests/unit/CharacterList.a11y.test.tsx`
  - **Actions**:
    - Test character list has no axe violations
    - Test character cards have semantic HTML (article, heading)
    - Test character selection keyboard accessible (Arrow keys, Enter)
    - Test character details announced to screen readers
    - Test delete/edit buttons have accessible labels
  - **Acceptance**: Character list passes WCAG 2.1 AA

- [ ] [T098-A2] [P1] [US2] Test: Character creation form accessibility
  - **File**: `frontend/tests/unit/CharacterCreate.a11y.test.tsx`
  - **Actions**:
    - Test character creation form has no axe violations
    - Test class selection keyboard accessible (radio group)
    - Test class descriptions announced to screen readers
    - Test form validation errors accessible
  - **Acceptance**: Character creation passes WCAG 2.1 AA
```

**Insert into Phase 6: User Story 3 - Join Multiple Games (after T145)**

```markdown
- [ ] [T145-A1] [P1] [US3] Test: Game board accessibility
  - **File**: `frontend/tests/unit/GameBoard.a11y.test.tsx`
  - **Actions**:
    - Test game board has no axe violations
    - Test ability card selection keyboard accessible
    - Test hex grid navigation keyboard accessible (Arrow keys)
    - Test turn order announced to screen readers
    - Test game state changes announced (aria-live regions)
  - **Acceptance**: Game board passes WCAG 2.1 AA

- [ ] [T145-A2] [P2] [US3] Test: Color contrast compliance
  - **File**: `frontend/tests/unit/GameBoard.contrast.test.tsx`
  - **Actions**:
    - Test all text meets 4.5:1 contrast ratio
    - Test UI elements (borders, icons) meet 3:1 contrast ratio
    - Test elemental infusion colors distinguishable
    - Test enemy health bars have sufficient contrast
  - **Acceptance**: All colors meet WCAG 2.1 AA contrast requirements
```

**Insert into Phase 9: Polish & Documentation (after T232)**

```markdown
- [ ] [T232-A1] [P2] Accessibility audit report
  - **File**: `docs/accessibility-audit.md`
  - **Actions**:
    - Run axe DevTools on all pages
    - Test keyboard navigation on all user flows
    - Test screen reader compatibility (NVDA, JAWS, VoiceOver)
    - Document any WCAG 2.1 AA violations found
    - Create remediation plan for any violations
  - **Acceptance**: Accessibility audit complete, report generated
```

---

## H4: Race Condition Testing

### Gap Analysis

FR-011 mentions concurrent character updates, but no specific task tests race conditions or optimistic locking.

### Task Additions

**Insert into Phase 5: User Story 2 - Manage Multiple Characters (after T098)**

```markdown
- [ ] [T098-C1] [P1] [US2] Test: Concurrent character XP updates
  - **File**: `backend/tests/integration/character-concurrency.test.ts`
  - **Actions**:
    - Create scenario: Two requests update same character XP simultaneously
    - Test Prisma transaction isolation prevents lost updates
    - Verify both XP increments are applied (not just one)
    - Test error handling if optimistic locking fails
    - Document expected behavior: last-write-wins or error?
  - **Acceptance**: Concurrent updates don't cause data corruption

- [ ] [T098-C2] [P1] [US2] Test: Character inventory race conditions
  - **File**: `backend/tests/integration/character-inventory-race.test.ts`
  - **Actions**:
    - Create scenario: Two requests add items to character simultaneously
    - Verify both items are added (no lost updates)
    - Test item removal race conditions
    - Test equipped item conflicts (two requests equip same slot)
  - **Acceptance**: Inventory updates are atomic, no data loss
```

**Insert into Phase 6: User Story 3 - Join Multiple Games (after T145)**

```markdown
- [ ] [T145-C1] [P1] [US3] Test: Character already in game validation
  - **File**: `backend/tests/integration/character-one-game.test.ts`
  - **Actions**:
    - Create scenario: Two game join requests with same character simultaneously
    - Test database constraint prevents character in multiple games
    - Verify clear error message for second request
    - Test Character.currentGameId uniqueness constraint
  - **Acceptance**: Character can only be in one active game, constraint enforced

- [ ] [T145-C2] [P2] [US3] Test: Game state concurrent event inserts
  - **File**: `backend/tests/integration/game-event-concurrency.test.ts`
  - **Actions**:
    - Create scenario: Multiple players submit events simultaneously
    - Test GameEvent.sequenceNumber increments correctly
    - Verify no duplicate sequence numbers
    - Test event ordering matches submission order
  - **Acceptance**: Game events ordered correctly, no sequence conflicts
```

---

## H5: Password Validation Specification Clarification

### Gap Analysis

Spec states "12-char minimum, no complexity requirements" but doesn't specify max length, allowed characters, or unicode handling.

### Specification Updates (Not Tasks)

**Action Required:** Update `/home/opc/hexhaven/specs/002-postgres-user-db/spec.md` to clarify:

1. **Maximum password length**: Recommend 128 characters (bcrypt limit is 72 bytes, but allow 128 chars for unicode)
2. **Allowed characters**: All printable characters including unicode
3. **Disallowed passwords**: No common passwords check (zxcvbn) or just length validation?
4. **Leading/trailing whitespace**: Trimmed or preserved?

**Recommendation**: Add to spec.md Clarifications section:

```markdown
- Q: Password validation rules beyond 12-char minimum? → A: Maximum 128 characters, all printable characters allowed including unicode, leading/trailing whitespace trimmed, no common password checks (rely on 12-char minimum + bcrypt)
```

### Task Additions

**Insert into Phase 4: User Story 1 - Create Account (after T072)**

```markdown
- [ ] [T072-V1] [P1] [US1] Test: Password validation edge cases
  - **File**: `backend/tests/unit/auth.validation.test.ts`
  - **Actions**:
    - Test 11-char password rejected
    - Test 12-char password accepted
    - Test 128-char password accepted
    - Test 129-char password rejected
    - Test unicode passwords accepted (emoji, non-Latin scripts)
    - Test leading/trailing whitespace trimmed
    - Test passwords with spaces accepted
  - **Acceptance**: Password validation handles all edge cases correctly
```

---

## H6: Input Validation and XSS Sanitization

### Gap Analysis

Tasks.md has no input validation or XSS sanitization tasks. API routes need validation middleware and JSONB fields need sanitization.

### Task Additions

**Insert into Phase 1: Database Setup & Configuration (after T013)**

```markdown
- [ ] [T013-V1] [P1] Install input validation libraries
  - **File**: `backend/package.json`
  - **Actions**:
    - Install zod for schema validation
    - Install express-validator or similar
    - Install dompurify for XSS sanitization (if storing HTML)
    - Install validator.js for common validations
  - **Acceptance**: Validation libraries installed and importable

- [ ] [T013-V2] [P1] Create validation schemas
  - **File**: `backend/src/validation/schemas.ts`
  - **Actions**:
    - Create Zod schema for user registration (username, password)
    - Create Zod schema for character creation (name, classId)
    - Create Zod schema for game creation (scenarioId, settings)
    - Create Zod schema for game events (eventType, eventData)
    - Export all validation schemas
  - **Acceptance**: All API input schemas defined with Zod
```

**Insert into Phase 4: User Story 1 - Create Account (after T063)**

```markdown
- [ ] [T063-V1] [P1] [US1] Implement: Input validation middleware
  - **File**: `backend/src/middleware/validation.middleware.ts`
  - **Actions**:
    - Create Express middleware to validate request body with Zod
    - Return 400 Bad Request with validation errors
    - Sanitize error messages (don't leak internal details)
    - Log validation failures for security monitoring
  - **Acceptance**: Middleware validates all inputs, returns clear errors

- [ ] [T063-V2] [P1] [US1] Test: Username validation
  - **File**: `backend/tests/unit/validation.test.ts`
  - **Actions**:
    - Test username length limits (min 3, max 20 chars?)
    - Test username allowed characters (alphanumeric + underscore?)
    - Test username SQL injection attempts rejected
    - Test username XSS attempts rejected
    - Test reserved usernames blocked (admin, system, deleted_user_*)
  - **Acceptance**: Username validation prevents injection attacks

- [ ] [T063-V3] [P1] [US1] Apply validation to auth routes
  - **File**: `backend/src/routes/auth.routes.ts`
  - **Actions**:
    - Add validation middleware to POST /auth/register
    - Add validation middleware to POST /auth/login
    - Add validation middleware to POST /auth/refresh
    - Validate all request bodies before processing
  - **Acceptance**: All auth routes validate inputs
```

**Insert into Phase 5: User Story 2 - Manage Multiple Characters (after T092)**

```markdown
- [ ] [T092-V1] [P1] [US2] Implement: Character name sanitization
  - **File**: `backend/src/services/character.service.ts`
  - **Actions**:
    - Validate character name length (min 1, max 30 chars?)
    - Sanitize character name for XSS (no HTML tags)
    - Test character name with SQL injection attempts
    - Trim whitespace from character names
  - **Acceptance**: Character names sanitized, no XSS or SQL injection

- [ ] [T092-V2] [P1] [US2] Apply validation to character routes
  - **File**: `backend/src/routes/character.routes.ts`
  - **Actions**:
    - Add validation middleware to POST /characters
    - Add validation middleware to PATCH /characters/:id
    - Validate classId exists in database
    - Validate userId matches authenticated user
  - **Acceptance**: All character routes validate inputs
```

**Insert into Phase 6: User Story 3 - Join Multiple Games (after T125)**

```markdown
- [ ] [T125-V1] [P1] [US3] Implement: Game event validation
  - **File**: `backend/src/services/game.service.ts`
  - **Actions**:
    - Validate game event structure matches schema
    - Sanitize JSONB event data (no code execution)
    - Validate event size <1MB to prevent DoS
    - Test malicious JSONB payloads rejected
    - Validate eventType is whitelisted value
  - **Acceptance**: Game events validated, malicious data rejected

- [ ] [T125-V2] [P1] [US3] Test: JSONB injection attempts
  - **File**: `backend/tests/integration/jsonb-security.test.ts`
  - **Actions**:
    - Test JSONB with SQL injection attempts
    - Test JSONB with extremely large payloads (>10MB)
    - Test JSONB with deeply nested objects (DoS attack)
    - Test JSONB with circular references
    - Verify all malicious inputs rejected with 400 error
  - **Acceptance**: JSONB validation prevents injection and DoS attacks

- [ ] [T125-V3] [P1] [US3] Apply validation to game routes
  - **File**: `backend/src/routes/game.routes.ts`
  - **Actions**:
    - Add validation middleware to POST /games
    - Add validation middleware to POST /games/:id/events
    - Add validation middleware to PATCH /games/:id
    - Validate all JSONB fields before database insert
  - **Acceptance**: All game routes validate inputs
```

---

## H8: Error Handling Standardization

### Gap Analysis

Tasks.md doesn't specify error handling patterns, HTTP status codes, or error response format.

### Task Additions

**Insert into Phase 1: Database Setup & Configuration (after T013)**

```markdown
- [ ] [T013-E1] [P1] Define error handling standards
  - **File**: `backend/src/types/errors.ts`
  - **Actions**:
    - Define custom error classes (ValidationError, AuthError, NotFoundError, ConflictError)
    - Define standard error response format { error: string, code: string, details?: object }
    - Document HTTP status code usage (400, 401, 403, 404, 409, 429, 500)
    - Create error code constants (AUTH_INVALID_CREDENTIALS, CHAR_ALREADY_IN_GAME, etc.)
  - **Acceptance**: Error types and response format standardized

- [ ] [T013-E2] [P1] Implement global error handler
  - **File**: `backend/src/middleware/error.middleware.ts`
  - **Actions**:
    - Create Express error handling middleware
    - Map custom errors to HTTP status codes
    - Format all errors with standard response structure
    - Log errors with stack traces (production: no stack in response)
    - Handle Prisma errors (unique constraint, foreign key, etc.)
  - **Acceptance**: All errors return consistent format

- [ ] [T013-E3] [P1] Test: Error handler middleware
  - **File**: `backend/tests/unit/error-handler.test.ts`
  - **Actions**:
    - Test ValidationError returns 400 with error details
    - Test AuthError returns 401 with generic message
    - Test NotFoundError returns 404
    - Test ConflictError returns 409
    - Test Prisma unique constraint returns 409
    - Test unknown errors return 500 without stack trace
  - **Acceptance**: Error handler maps all error types correctly
```

**Insert into Phase 4: User Story 1 - Create Account (after T063)**

```markdown
- [ ] [T063-E1] [P1] [US1] Standardize auth error responses
  - **File**: `backend/src/routes/auth.routes.ts`
  - **Actions**:
    - Use error handler for all auth errors
    - Return 401 for invalid credentials (same message for user not found vs wrong password)
    - Return 409 for duplicate username
    - Return 429 for rate limit exceeded (include lockedUntil in response)
    - Return 400 for validation errors
    - Document all error codes in OpenAPI schema
  - **Acceptance**: Auth routes return standardized error responses

- [ ] [T063-E2] [P1] [US1] Test: Auth error scenarios
  - **File**: `backend/tests/integration/auth-errors.test.ts`
  - **Actions**:
    - Test registration with existing username returns 409 CONFLICT
    - Test login with invalid username returns 401 UNAUTHORIZED
    - Test login with invalid password returns 401 UNAUTHORIZED
    - Test login rate limited returns 429 TOO_MANY_REQUESTS
    - Test malformed request body returns 400 BAD_REQUEST
  - **Acceptance**: All auth error scenarios return correct status codes
```

**Insert into Phase 5: User Story 2 - Manage Multiple Characters (after T092)**

```markdown
- [ ] [T092-E1] [P1] [US2] Standardize character error responses
  - **File**: `backend/src/routes/character.routes.ts`
  - **Actions**:
    - Return 404 for character not found
    - Return 403 for unauthorized character access (wrong user)
    - Return 400 for invalid classId
    - Return 409 for character already in game (can't delete)
    - Document all character error codes
  - **Acceptance**: Character routes return standardized error responses
```

**Insert into Phase 6: User Story 3 - Join Multiple Games (after T125)**

```markdown
- [ ] [T125-E1] [P1] [US3] Standardize game error responses
  - **File**: `backend/src/routes/game.routes.ts`
  - **Actions**:
    - Return 404 for game not found
    - Return 409 for character already in game (CHAR_ALREADY_IN_GAME)
    - Return 403 for unauthorized game access
    - Return 400 for invalid game state transitions
    - Return 409 for duplicate room code
    - Document all game error codes
  - **Acceptance**: Game routes return standardized error responses

- [ ] [T125-E2] [P1] [US3] Test: Game error scenarios
  - **File**: `backend/tests/integration/game-errors.test.ts`
  - **Actions**:
    - Test join game with character already in game returns 409
    - Test join game with invalid characterId returns 400
    - Test join non-existent game returns 404
    - Test submit event to game user is not in returns 403
    - Test all error responses include error code and message
  - **Acceptance**: All game error scenarios return correct status codes
```

---

## Summary of Task Additions

| Finding | Phase | Task Count | Priority |
|---------|-------|------------|----------|
| C2: Responsive Testing | 1, 4, 5, 6 | 5 tasks | P1 |
| H1: Performance Benchmarking | 1, 3, 4, 6, 8 | 8 tasks | P2 |
| H2: Index Verification | 2 | 2 tasks | P1-P2 |
| H3: Accessibility (WCAG 2.1 AA) | 1, 4, 5, 6, 9 | 12 tasks | P1-P2 |
| H4: Race Condition Testing | 5, 6 | 4 tasks | P1-P2 |
| H5: Password Validation | 4 | 1 task + spec update | P1 |
| H6: Input Validation/Sanitization | 1, 4, 5, 6 | 11 tasks | P1 |
| H8: Error Handling | 1, 4, 5, 6 | 8 tasks | P1 |
| **TOTAL** | | **51 tasks** | |

---

## Implementation Recommendations

### Priority Order

1. **Immediate (before implementation starts):**
   - H8: Error handling standards (Phase 1, tasks T013-E1 to T013-E3)
   - H6: Input validation setup (Phase 1, tasks T013-V1 to T013-V2)
   - C2: Responsive testing setup (Phase 1, tasks T013-R1 to T013-R2)
   - H3: Accessibility testing setup (Phase 1, tasks T013-A1 to T013-A2)
   - H1: Performance benchmarking setup (Phase 1, tasks T013-P1 to T013-P2)

2. **During implementation (per user story):**
   - Apply validation to each route as implemented (H6)
   - Apply error handling to each route as implemented (H8)
   - Add accessibility tests for each component (H3)
   - Add responsive tests for each UI component (C2)

3. **After implementation (verification):**
   - H2: Index verification (Phase 2, after schema complete)
   - H4: Race condition tests (Phase 5-6, after services complete)
   - H1: Performance benchmarks (Phase 3-8, after each phase)

### Integration into tasks.md

**Option 1 (Recommended): Insert tasks inline**
- Insert tasks at specified locations in existing phases
- Update task IDs to maintain sequence (T013-R1, T013-R2, etc.)
- Preserves context and logical flow

**Option 2: Append as new phase**
- Create "Phase 10: Analysis Findings"
- Add all 51 tasks in new phase
- Easier to implement but loses context

**Option 3: Separate tracking**
- Keep task-additions.md as separate checklist
- Reference from tasks.md with link
- Allows parallel tracking but may cause duplication

---

## Updated Analysis Status

After codebase review and task additions:

**CRITICAL (C) - 0 findings** ✅ All resolved
- C1: i18n implementation → RESOLVED
- C2: Cross-platform testing → DOWNGRADED TO HIGH (responsive design exists, testing strategy now added)
- C3: CI/CD pipeline → RESOLVED

**HIGH (H) - 8 findings** → Task additions provided for all
- H1: Performance benchmarking → 8 tasks added
- H2: Index verification → 2 tasks added
- H3: Accessibility (WCAG 2.1 AA) → 12 tasks added
- H4: Race condition testing → 4 tasks added
- H5: Password validation → 1 task + spec clarification
- H6: Input validation/sanitization → 11 tasks added
- H8: Error handling → 8 tasks added
- C2: Responsive testing (downgraded) → 5 tasks added

**Total task additions: 51 tasks**

---

**Next Steps:**

1. Review task additions with team
2. Update `/home/opc/hexhaven/specs/002-postgres-user-db/spec.md` with H5 password validation clarification
3. Integrate task additions into `/home/opc/hexhaven/specs/002-postgres-user-db/tasks.md`
4. Begin implementation with Phase 1 setup tasks
