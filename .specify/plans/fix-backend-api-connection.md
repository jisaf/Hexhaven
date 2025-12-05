# Implementation Plan: Fix Backend API Connection

## Problem Analysis

The backend API is not responding because of a **port mismatch**:

- **Backend server** is running on **port 3000** (as configured in `/home/opc/hexhaven/backend/.env:5`)
- **Frontend** is trying to connect to **port 3001** (hardcoded in `/home/opc/hexhaven/frontend/src/config/api.ts:33,60,64`)

Evidence:
- `ss -tulpn` shows backend listening on port 3000 (PID 324084)
- Bug report states: "Backend server at localhost:3001 is not responding"
- Frontend API config (`/home/opc/hexhaven/frontend/src/config/api.ts`) hardcodes port 3001 for localhost

## Root Cause

The frontend's `api.ts` configuration file has hardcoded port 3001 for local development, but the backend is actually running on port 3000 as configured in the `.env` file.

## Solution Options

### Option 1: Change Backend Port to 3001 (Recommended)
**Pros:**
- Minimal code changes
- Matches the frontend expectations and test expectations
- Aligns with documentation that references port 3001

**Cons:**
- Need to restart backend server
- Changes infrastructure expectation

### Option 2: Change Frontend to Use Port 3000
**Pros:**
- Matches current backend configuration

**Cons:**
- Multiple files need updating (api.ts, test setup, documentation)
- Would require updating all test files and documentation
- Breaks existing patterns in the codebase

## Recommended Approach: Option 1

Change the backend to run on port 3001 to match frontend expectations.

## Implementation Steps

### 1. Update Backend Configuration
**File:** `/home/opc/hexhaven/backend/.env`
- Change `PORT=3000` to `PORT=3001`

### 2. Restart Backend Server
- Kill existing backend process (PID 324084)
- Restart with `npm run dev:backend`
- Verify it's listening on port 3001

### 3. Verify Connection
- Check that port 3001 is listening: `ss -tulpn | grep 3001`
- Test API endpoint: `curl http://localhost:3001/api/rooms`
- Test WebSocket connection

### 4. Update Documentation (if needed)
- Check if any other documentation references port 3000 incorrectly
- Update to port 3001 for consistency

## Files to Modify

1. `/home/opc/hexhaven/backend/.env` - Line 5: `PORT=3000` → `PORT=3001`

## Testing Plan

1. Verify backend starts successfully on port 3001
2. Test API endpoints are accessible
3. Test WebSocket connections work
4. Run visual smoke tests to confirm frontend can connect
5. If tests pass, delete the bug entry from bugs.md

## Risks and Considerations

- **Low risk**: This is a simple configuration change
- Backend will bind to port 3001 instead of 3000
- All existing connections will work once restarted
- No code logic changes required
