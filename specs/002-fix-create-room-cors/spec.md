# Feature Specification: Fix Create Room CORS and Test Infrastructure

**Branch**: `002-fix-create-room-cors` | **Date**: 2025-11-11 | **Priority**: P1 (Blocker)

## Problem Statement

The create room feature (from feature 001-gloomhaven-multiplayer) is failing E2E tests due to missing CORS configuration in the backend. All 4 E2E tests in `us1-create-room.spec.ts` fail because the frontend cannot make API calls to the backend.

### Root Causes Identified

1. **Missing CORS Configuration (CRITICAL)**: Backend `main.ts` does not call `app.enableCors()`, preventing cross-origin requests from frontend (port 5173) to backend (port 3000)
2. **Missing Test Attribute**: Error message banner lacks `data-testid="error-message"` required by one test

### Evidence

- **Test Output**: "Failed to fetch" error displayed on landing page
- **Location**: `backend/src/main.ts:1-9` - no `enableCors()` call
- **Screenshot**: Shows frontend displays fetch error instead of room code
- **Backend Config**: CORS settings exist in `config/env.config.ts` but are never applied

## User Stories

### US1: Enable Cross-Origin API Access (P1 - BLOCKER)

**As a** frontend application
**I want** to make API calls to the backend
**So that** users can create and join game rooms

**Acceptance Criteria**:
- Given the frontend is running on `http://localhost:5173`
- When it makes a POST request to `http://localhost:3000/api/rooms`
- Then the backend accepts the request and returns room data
- And no CORS errors appear in browser console

**Test Scenario**:
```gherkin
Given backend is running on port 3000
And frontend is running on port 5173
When frontend calls POST /api/rooms with {uuid, nickname}
Then response has status 201
And response contains {room, player} data
And browser console has no CORS errors
```

### US2: Display User-Friendly Error Messages (P2)

**As a** QA tester
**I want** error messages to have test IDs
**So that** E2E tests can verify error handling

**Acceptance Criteria**:
- Given an API call fails
- When error message is displayed to user
- Then error banner has `data-testid="error-message"` attribute
- And E2E test can locate and verify error text

**Test Scenario**:
```gherkin
Given backend is configured to return 500 error
When user clicks "Create Game"
Then error banner appears with data-testid="error-message"
And error banner displays "Failed to create room"
```

## Non-Functional Requirements

### Performance
- No performance impact from CORS configuration
- CORS preflight requests cached appropriately

### Security
- CORS origin should be configurable via environment variable
- Production: Only allow specific frontend domains
- Development: Allow localhost with different ports

### Compatibility
- CORS configuration must work with both HTTP and WebSocket connections
- Support credentials (cookies) if needed in future

## Out of Scope

- Authentication/authorization (separate feature)
- CORS configuration for production deployments (use environment variables)
- Other E2E test fixes unrelated to CORS

## Dependencies

- Existing backend running on NestJS
- Existing frontend running on Vite
- Existing E2E tests in Playwright

## Success Metrics

- ✅ All 4 E2E tests in `us1-create-room.spec.ts` pass
- ✅ No CORS errors in browser console
- ✅ Room creation succeeds from frontend
- ✅ CI/CD pipeline passes (all GitHub Actions checks green)

## References

- **E2E Test File**: `frontend/tests/e2e/us1-create-room.spec.ts`
- **Backend Entry**: `backend/src/main.ts`
- **Frontend Lobby**: `frontend/src/pages/Lobby.tsx`
- **CORS Config**: `backend/src/config/env.config.ts`
- **Constitution**: `.specify/memory/constitution.md` (v1.4.0)
