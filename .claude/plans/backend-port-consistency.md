# Plan: Fix Backend Port Inconsistency (Development & Production)

## Problem Statement
The Hexhaven backend server port is inconsistent across environments, causing "flaky" behavior:
- **Frontend hardcodes port 3001** in `config/api.ts`
- **Backend defaults to port 3000** in `main.ts` and `env.config.ts`
- **.env.example has port 3000** (doesn't match actual `.env` which has 3001)
- **Documentation claims port 3000** (README, SETUP, start-dev.sh)
- **Production uses port 3000 via Nginx reverse proxy**

Result: Sometimes backend runs on 3000, sometimes 3001, causing connection failures.

## Root Causes
1. Inconsistent defaults in backend code (3000) vs actual development config (3001)
2. Frontend hardcodes port 3001 - cannot be overridden by environment variables
3. .env.example doesn't match actual .env file
4. Documentation is misleading and inconsistent
5. No validation that frontend and backend ports match

## Proposed Solution

### Strategy: Standardize on Port 3001 for Development, Ensure Consistency

**Why 3001?**
- Already used in actual development `.env` file
- Frontend already hardcoded to expect 3001
- Less disruption to current development setup
- Clear separation: Frontend (5173), Backend (3001), Production Nginx (80/443)

### Implementation Steps

#### 1. Align Backend Code Defaults to Port 3001
**Files to change:**
- `backend/src/main.ts` - Change default from 3000 → 3001
- `backend/src/config/env.config.ts` - Change default from 3000 → 3001
- `backend/.env.example` - Change from 3000 → 3001 (matches actual .env)

**Reasoning:** Backend should default to what frontend expects.

#### 2. Make Frontend Port Configurable (Optional but Recommended)
**Files to change:**
- `frontend/src/config/api.ts` - Read from environment variable if available
- Add `VITE_BACKEND_PORT` to frontend environment configuration
- Fallback to hardcoded 3001 if not set (for backward compatibility)

**Reasoning:** Allows frontend to be flexible without requiring code changes.

#### 3. Update Start Scripts & Documentation
**Files to change:**
- `start-dev.sh` - Update message from 3000 → 3001
- `README.md` - Update all references from 3000 → 3001
- `SETUP.md` - Update all references from 3000 → 3001
- `scripts/setup-server.sh` - Keep at 3000 (production uses Nginx proxy)

**Reasoning:** Documentation should match actual behavior.

#### 4. Add Port Validation & Debugging
**New file:** `backend/src/config/validate-ports.ts`
- Check if backend port matches frontend expectations
- Log warning during startup if mismatch detected
- Help developers catch configuration errors early

**Frontend change:** Add startup log showing expected backend URL

**Reasoning:** Prevent silent failures and help with debugging.

#### 5. Create Port Configuration Memory Document
**New file:** `.claude/memory/backend-port-configuration.md`
- Document the port strategy
- Explain why each port is chosen
- List all files that reference ports
- Quick reference for future developers/agents

**Files to reference in memory:**
- Development: Port 3001 (frontend, backend, .env)
- Production: Port 3000 via Nginx (internal, not exposed)
- Frontend tries to connect: localhost:3001 (development), /api path (production)

#### 6. Update AGENTS.md
**File:** `AGENTS.md`
**New section:** "Backend Server Port Configuration"
- Document the port strategy
- Explain development vs production
- List which files control ports
- Troubleshooting guide for "backend connection refused" errors

---

## Implementation Details

### A. Backend Code Changes (Steps 1)

**backend/src/main.ts** (Line 72)
```diff
- const port = process.env.PORT ?? 3000;
+ const port = process.env.PORT ?? 3001;
```

**backend/src/config/env.config.ts** (Line 52)
```diff
- port: parseInt(process.env.PORT || '3000', 10),
+ port: parseInt(process.env.PORT || '3001', 10),
```

**backend/.env.example** (Line 5)
```diff
- PORT=3000
+ PORT=3001
```

### B. Frontend Port Configurability (Step 2)

**frontend/src/config/api.ts** (Lines 29-33)
```typescript
export function getApiUrl(): string {
  // ... existing code ...
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const port = import.meta.env.VITE_BACKEND_PORT || '3001';
    return `${protocol}//localhost:${port}/api`;
  }
  // ... rest of function ...
}
```

**frontend/src/config/api.ts** (Lines 56-64)
```typescript
export function getWebSocketUrl(): string {
  // ... existing code ...
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const port = import.meta.env.VITE_BACKEND_PORT || '3001';
    return `http://localhost:${port}`;
  } else if (port === '5173' || port === '5174') {
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '3001';
    return `http://${hostname}:${backendPort}`;
  }
  // ... rest of function ...
}
```

**frontend/.env.example** (add if not exists)
```
# Backend server port (optional, defaults to 3001)
VITE_BACKEND_PORT=3001
```

### C. Documentation Updates (Step 3)

**start-dev.sh** (Line 56)
```diff
- echo "Backend will run on: http://localhost:3000"
+ echo "Backend will run on: http://localhost:3001"
```

**README.md** (multiple lines)
```diff
- Backend API: http://localhost:3000
+ Backend API: http://localhost:3001
- WebSocket: ws://localhost:3000
+ WebSocket: ws://localhost:3001
- PORT=3000
+ PORT=3001
```

Similar updates for SETUP.md

### D. Port Validation (Step 4)

**backend/src/config/validate-ports.ts** (new file)
```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('PortValidation');

export function validatePortConfiguration(port: number): void {
  // Development mode validation
  if (process.env.NODE_ENV !== 'production') {
    const expectedDevPort = 3001;
    if (port !== expectedDevPort) {
      logger.warn(
        `⚠️  Backend running on port ${port}, but frontend expects port ${expectedDevPort}. ` +
        `If you get "connection refused" errors, set PORT=3001 in .env`
      );
    }
    logger.log(`✅ Backend running on http://localhost:${port}`);
  }
}
```

**backend/src/main.ts** (in bootstrap function)
```typescript
import { validatePortConfiguration } from './config/validate-ports';

async function bootstrap() {
  // ... existing code ...
  validatePortConfiguration(port);
}
```

### E. Memory Document (Step 5)

**New file:** `.claude/memory/backend-port-configuration.md`
```markdown
# Backend Port Configuration Reference

## Quick Summary
- **Development:** Port 3001 (Frontend: 5173, Backend: 3001)
- **Production:** Port 3000 (behind Nginx reverse proxy)

## Development Environment
- Frontend URL: http://localhost:5173
- Backend API: http://localhost:3001/api
- WebSocket: ws://localhost:3001/socket.io

## Production Environment
- Frontend URL: https://hexhaven.game
- Backend API: https://hexhaven.game/api (proxied to localhost:3000)
- WebSocket: https://hexhaven.game/socket.io (proxied to localhost:3000)

## Files Controlling Port Configuration
### Development (Port 3001)
- `backend/.env` - PORT=3001
- `backend/src/main.ts` - Default to 3001
- `backend/src/config/env.config.ts` - Default to 3001
- `frontend/src/config/api.ts` - Hardcoded to 3001 (with VITE_BACKEND_PORT fallback)

### Production (Port 3000)
- `scripts/setup-server.sh` - BACKEND_PORT="3000"
- Nginx config - upstream backend { server localhost:3000; }

## Troubleshooting

### "Backend connection refused" errors?
1. Check backend is running: `ps aux | grep nest`
2. Check backend port: `lsof -i :3001` (development) or `:3000` (production)
3. Check .env has `PORT=3001` (development)
4. Check frontend config/api.ts points to correct port

### How to change development port?
1. Set `PORT=3002` in `backend/.env`
2. Set `VITE_BACKEND_PORT=3002` in `frontend/.env`
3. Restart both frontend and backend
```

### F. AGENTS.md Addition (Step 6)

**New section in AGENTS.md**
```markdown
## Backend Server Port Configuration

### Overview
The Hexhaven project uses different ports for development and production:
- **Development:** Port 3001 (direct connection)
- **Production:** Port 3000 (behind Nginx reverse proxy)

### Why Two Different Ports?
- Development needs direct access to backend for debugging
- Production uses Nginx reverse proxy to hide internal ports and serve all traffic on 80/443
- Frontend automatically detects environment and uses appropriate configuration

### Development Port Strategy
When running `npm run dev` or using `start-dev.sh`:
1. Frontend runs on port 5173 (Vite dev server)
2. Backend runs on port 3001
3. Frontend connects to `http://localhost:3001` via WebSocket for real-time updates

### Production Port Strategy
When deployed to OCI instance:
1. Frontend served as static files via Nginx (port 80/443)
2. Backend runs on port 3000 (internal, not exposed)
3. Nginx reverse proxy routes `/api/*` and `/socket.io/*` requests to backend
4. Frontend connects to `/api` path (no explicit port needed)

### Files Controlling Ports
- `backend/.env` - Sets PORT=3001 (development)
- `backend/src/main.ts` - Default fallback to 3001
- `frontend/src/config/api.ts` - Detects environment and uses correct URL
- `scripts/setup-server.sh` - Production Nginx and backend configuration

### Troubleshooting

#### "Failed to fetch" or "Connection refused" errors?
**Root cause:** Backend and frontend ports don't match

**Check backend port:**
```bash
# See what port backend is running on
lsof -i :3001  # Development
lsof -i :3000  # Production

# Or check the logs
npm run dev:backend 2>&1 | grep -i port
```

**Check environment variables:**
```bash
# Ensure PORT is set correctly
cat backend/.env | grep PORT

# For custom port, set and restart:
export PORT=3001
npm run dev:backend
```

#### Backend running on wrong port?
**If backend is on 3000 but should be 3001:**
1. Check `backend/.env` has `PORT=3001`
2. Check you didn't copy `.env.example` (which has 3000)
3. Verify environment variable: `echo $PORT`
4. Restart backend: `npm run dev:backend`

#### Need to use different port?
1. Set `PORT=3002` in `backend/.env`
2. Set `VITE_BACKEND_PORT=3002` in `frontend/.env`
3. Restart both servers

### Port Reference Table
| Component | Development | Production | Type |
|-----------|-------------|------------|------|
| Frontend | 5173 | 443 (Nginx) | HTTP/HTTPS |
| Backend | 3001 | 3000 | Internal only |
| API Path | /api | /api | Via Nginx proxy |
| WebSocket | :3001 | /socket.io | Via Nginx proxy |

### Key Files Reference
- Backend port defaults: `backend/src/main.ts`, `backend/src/config/env.config.ts`
- Environment file: `backend/.env`, `backend/.env.example`
- Frontend port config: `frontend/src/config/api.ts`
- Production setup: `scripts/setup-server.sh`
- Nginx proxy: `/etc/nginx/sites-available/hexhaven` (on production server)
```

---

## Testing & Validation

### Test Development Setup
1. Run `npm run dev` from root
2. Frontend should load on http://localhost:5173
3. Backend should log: "Server running on http://localhost:3001"
4. Frontend should successfully connect to backend (no console errors)
5. Games should be createable and joinable

### Test Production Setup
1. Run `scripts/setup-server.sh` on OCI instance
2. Backend should run on port 3000 (internal)
3. Nginx should proxy correctly
4. Frontend should load and connect without errors
5. Verify no 3001 attempts in production logs

### Validation Checks
- ✅ `backend/.env` has PORT=3001
- ✅ `backend/.env.example` has PORT=3001 (matches .env)
- ✅ `backend/src/main.ts` defaults to 3001
- ✅ `frontend/src/config/api.ts` uses correct port
- ✅ All documentation updated
- ✅ Start scripts output correct port
- ✅ Port validation logs on startup

---

## Summary of Changes

### Backend Code (3 files)
- `backend/src/main.ts` - Default 3000 → 3001
- `backend/src/config/env.config.ts` - Default 3000 → 3001
- `backend/.env.example` - 3000 → 3001

### Frontend Code (1 file)
- `frontend/src/config/api.ts` - Add VITE_BACKEND_PORT support

### Documentation (3 files)
- `README.md` - Update port references
- `SETUP.md` - Update port references
- `start-dev.sh` - Update output message

### New Files (2 files)
- `.claude/memory/backend-port-configuration.md` - Reference guide
- `backend/src/config/validate-ports.ts` - Runtime validation

### Updated Files (1 file)
- `AGENTS.md` - Add Backend Port Configuration section

---

## Benefits

1. **Consistency:** Frontend and backend always use the same port
2. **Clarity:** Documentation matches actual behavior
3. **Robustness:** Port validation catches misconfigurations early
4. **Flexibility:** VITE_BACKEND_PORT allows port overrides without code changes
5. **Maintainability:** Memory and AGENTS docs help future developers

---

## Rollout Plan

1. Update backend code defaults (3 files) - ✅ Minimal risk
2. Update .env.example to match .env - ✅ No impact on running systems
3. Update documentation - ✅ Informational
4. Add frontend environment support - ✅ Backward compatible
5. Add port validation - ✅ Logging/warning only, no breaking changes
6. Create memory and AGENTS documentation - ✅ Reference only

All changes are non-breaking and can be deployed incrementally.
