# Backend Build and Startup Reliability Plan

## Problem Statement

The backend server experiences flaky startup failures with the error:
```
Error: Cannot find module '/home/ubuntu/hexhaven/backend/dist/main'
```

This occurs because the compiled TypeScript output location is inconsistent with what NestJS expects during development mode.

## Root Cause Analysis

### Current Behavior

1. **TypeScript Compilation Output:**
   - Configured: `tsconfig.json` → `outDir: "./dist"`
   - Actual output: `backend/dist/backend/src/main.js`
   - Reason: Monorepo structure + `rootDirs: [".", "../shared"]` creates nested path

2. **NestJS Watch Mode Expectation:**
   - Command: `nest start --watch`
   - Expected path: `backend/dist/src/main.js` or `backend/dist/main.js`
   - Actual path: `backend/dist/backend/src/main.js` ❌

3. **Production Script:**
   - Command: `node dist/backend/src/main`
   - This works but is inconsistent with dev mode

### Why This is Flaky

- Initial `npm run dev` fails because no build exists
- Running `npm run build` manually works
- But `nest start --watch` still fails because it looks in wrong location
- Sometimes works if remnants from previous builds exist

## Solution Options

### Option 1: Fix Output Directory Structure (RECOMMENDED)

**Approach:** Update NestJS and TypeScript configuration to create flat, predictable output

**Changes:**
1. Update `backend/nest-cli.json`:
   ```json
   {
     "$schema": "https://json.schemastore.org/nest-cli",
     "collection": "@nestjs/schematics",
     "sourceRoot": "src",
     "entryFile": "main",
     "compilerOptions": {
       "deleteOutDir": true,
       "tsConfigPath": "tsconfig.json",
       "outDir": "../dist/backend",
       "assets": [
         {
           "include": "data/**/*",
           "watchAssets": true
         }
       ]
     }
   }
   ```

2. Update `backend/tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "outDir": "../dist/backend",
       // ... other options remain the same
     }
   }
   ```

3. Update `backend/package.json` scripts:
   ```json
   {
     "scripts": {
       "dev": "nest build && nest start --watch",
       "start:prod": "node ../dist/backend/src/main.js"
     }
   }
   ```

**Pros:**
- Centralized `dist/` at project root
- Consistent output location
- Easy to clean (`rm -rf dist/`)
- Aligns with monorepo best practices

**Cons:**
- Need to update multiple config files
- Requires testing to ensure shared types still work

---

### Option 2: Create Robust Dev Wrapper Script

**Approach:** Create a resilient development startup script that handles build lifecycle

**Implementation:** Create `backend/scripts/dev.sh`:
```bash
#!/bin/bash
# Robust Backend Development Server Script

set -e

echo "🔧 Backend Development Server"
echo "================================"

# Ensure we're in backend directory
cd "$(dirname "$0")/.."

# Function to check if dist exists and is valid
check_dist() {
  if [ -f "dist/backend/src/main.js" ]; then
    return 0
  fi
  return 1
}

# Build if dist doesn't exist or is stale
if ! check_dist; then
  echo "📦 Building backend (first run or stale build)..."
  npm run build
  echo "✅ Build complete"
fi

# Start in watch mode with proper path handling
echo "🚀 Starting backend server on http://localhost:3001"
echo ""

# Use nodemon to watch compiled output and restart
npx nodemon \
  --watch dist/backend \
  --exec "node dist/backend/src/main.js" \
  --ext js &

NODEMON_PID=$!

# Also watch source files and rebuild
npx nodemon \
  --watch src \
  --ext ts \
  --exec "npm run build" &

BUILD_WATCH_PID=$!

# Cleanup on exit
trap "kill $NODEMON_PID $BUILD_WATCH_PID 2>/dev/null" EXIT

# Wait for processes
wait
```

**Update `backend/package.json`:**
```json
{
  "scripts": {
    "dev": "./scripts/dev.sh",
    "dev:simple": "nest start --watch"
  }
}
```

**Pros:**
- Extremely resilient
- Handles edge cases gracefully
- No config changes needed
- Clear error messages

**Cons:**
- More complex script
- Slightly slower than native nest watch

---

### Option 3: Use ts-node-dev (Alternative Development Approach)

**Approach:** Skip TypeScript compilation entirely in development

**Changes:**
```json
{
  "dependencies": {
    "ts-node-dev": "^2.0.0"
  },
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/main.ts",
    "dev:watch": "nest start --watch",
    "build": "nest build",
    "start:prod": "node dist/backend/src/main.js"
  }
}
```

**Pros:**
- Fast restarts
- No build artifacts to manage
- Simple setup

**Cons:**
- Different execution mode than production
- Slightly different behavior
- Requires additional dependency

## Recommended Solution: Hybrid Approach

Combine **Option 1** (fix configs) with **Option 2** (robust script) for maximum reliability:

### Implementation Steps

#### Step 1: Update Configuration Files

1. **Update `backend/nest-cli.json`:**
   - Set explicit `outDir: "../dist/backend"`

2. **Update `backend/tsconfig.json`:**
   - Set `outDir: "../dist/backend"`
   - Verify `rootDirs` and path resolution still work for shared types

3. **Update `backend/package.json` scripts:**
   ```json
   {
     "scripts": {
       "prebuild": "prisma generate",
       "build": "nest build",
       "dev": "npm run build && nest start --watch",
       "dev:safe": "./scripts/dev-safe.sh",
       "start:prod": "node ../dist/backend/src/main.js"
     }
   }
   ```

#### Step 2: Create Safe Development Script

Create `backend/scripts/dev-safe.sh`:
```bash
#!/bin/bash
# Safe development server with automatic recovery
# This script ensures the backend always starts successfully

set -e

cd "$(dirname "$0")/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🎮 Hexhaven Backend Development Server"
echo "========================================"

# Check if Prisma client is generated
if [ ! -d "../node_modules/@prisma/client" ]; then
  echo -e "${YELLOW}⚠️  Prisma client not found, generating...${NC}"
  npm run prisma:generate
fi

# Check for valid build
DIST_PATH="../dist/backend/src/main.js"
if [ ! -f "$DIST_PATH" ]; then
  echo -e "${YELLOW}📦 No build found, building now...${NC}"
  npm run build

  if [ ! -f "$DIST_PATH" ]; then
    echo -e "${RED}❌ Build failed! Check for TypeScript errors.${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Build successful${NC}"
fi

# Verify database connection
echo "🔍 Checking database connection..."
if command -v pg_isready &> /dev/null; then
  if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connected${NC}"
  else
    echo -e "${YELLOW}⚠️  PostgreSQL not responding on localhost:5432${NC}"
    echo "   Continuing anyway (server will fail if DB is required)"
  fi
fi

# Start the development server
echo ""
echo -e "${GREEN}🚀 Starting backend on http://localhost:3001${NC}"
echo "   - API Health: http://localhost:3001/api/health"
echo "   - Press Ctrl+C to stop"
echo ""

# Use nest CLI for hot reloading
npm run start:dev
```

#### Step 3: Update Root Package.json

Update the root-level dev commands to use safe scripts:
```json
{
  "scripts": {
    "dev": "npm run dev:backend & npm run dev:frontend",
    "dev:backend": "cd backend && npm run dev:safe",
    "dev:frontend": "npm run dev -w frontend"
  }
}
```

#### Step 4: Create Documentation

Create `backend/README_DEV.md`:
```markdown
# Backend Development Guide

## Quick Start

From project root:
```bash
npm run dev
```

From backend directory:
```bash
npm run dev:safe
```

## How Development Server Works

### Architecture

**Build Output:**
- Source: `backend/src/**/*.ts`
- Compiled: `dist/backend/src/**/*.js`
- Entry point: `dist/backend/src/main.js`

**Server Ports:**
- Backend API: `http://localhost:3001`
- Frontend: `http://localhost:5173` (connects to backend on 3001)

### Development Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm run dev:safe` | Full rebuild + watch mode | First time, after git pull |
| `npm run dev` | Quick start (requires build) | Normal development |
| `npm run build` | Build without starting | CI, testing build |
| `npm run start:prod` | Run built output | Production testing |

### Troubleshooting

**Error: "Cannot find module '/home/ubuntu/hexhaven/backend/dist/main'"**

**Solution:**
```bash
cd backend
npm run build
npm run dev
```

**Root Cause:** Build output not generated or in wrong location

**Permanent Fix:** Always use `npm run dev:safe` which auto-builds

---

**Error: "Prisma Client not generated"**

**Solution:**
```bash
cd backend
npx prisma generate
```

---

**Error: "Port 3001 already in use"**

**Solution:**
```bash
# Find process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 npm run dev
```

### Build System Architecture

```
┌─────────────────────────────────────────────┐
│  TypeScript Source (backend/src/)          │
│  - main.ts (entry point)                    │
│  - **/*.ts (application code)               │
└────────────────┬────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  nest build   │
         │  (tsc)        │
         └───────┬───────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  Compiled Output (dist/backend/)            │
│  - src/main.js                              │
│  - src/**/*.js                              │
│  - **/*.d.ts (type definitions)             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  node         │
         │  main.js      │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  NestJS App   │
         │  Port: 3001   │
         └───────────────┘
```

### Frontend-Backend Connection

The frontend (Vite dev server on 5173) connects to backend on port 3001:

**Frontend Configuration (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

**Backend Configuration (`backend/.env`):**
```env
PORT=3001
```

### Common Development Workflows

**Starting fresh:**
```bash
# Clean install
npm run clean
npm install
cd backend && npm run build
cd .. && npm run dev
```

**After pulling changes:**
```bash
cd backend
npm install           # If package.json changed
npm run prisma:generate  # If schema.prisma changed
npm run prisma:migrate   # If new migrations
npm run build         # Rebuild
npm run dev
```

**Running tests:**
```bash
cd backend
npm test              # Unit tests
npm run test:e2e      # E2E tests
```
```

#### Step 5: Update start-dev.sh

Update the root-level `start-dev.sh` to use the safe script:
```bash
# Line 72-73 change from:
npm run start:prod &

# To:
npm run dev:safe &
```

## Testing Plan

### Test Scenarios

1. **Clean start (no dist/):**
   ```bash
   rm -rf dist backend/dist
   npm run dev
   ```
   Expected: Builds automatically, starts successfully

2. **Start after git pull:**
   ```bash
   git pull
   npm run dev
   ```
   Expected: Uses existing build, starts immediately

3. **Start with stale build:**
   ```bash
   touch backend/src/main.ts
   npm run dev
   ```
   Expected: Rebuilds and starts

4. **Database down:**
   ```bash
   sudo systemctl stop postgresql
   npm run dev
   ```
   Expected: Warning but continues (fails when DB needed)

5. **Port conflict:**
   ```bash
   # In terminal 1
   npm run dev
   # In terminal 2
   npm run dev
   ```
   Expected: Clear error message about port 3001

### Success Criteria

- ✅ Backend starts on first run without manual build
- ✅ Backend starts consistently after git pull
- ✅ Clear error messages for common failures
- ✅ Documentation explains all workflows
- ✅ Works for all team members on different environments

## Rollout Plan

1. **Create feature branch:** `fix-backend-build-reliability`
2. **Implement changes** per steps 1-5 above
3. **Test all scenarios** from testing plan
4. **Update team documentation**
5. **Merge to main**
6. **Announce to team** with migration guide

## Migration Guide for Team

For developers with existing checkouts:

```bash
# 1. Pull latest changes
git checkout main
git pull

# 2. Clean old builds
npm run clean
rm -rf dist backend/dist

# 3. Fresh install
npm install

# 4. Use new dev command
npm run dev
```

## Future Improvements

1. **Add health check endpoint** that backend calls on startup
2. **Create VS Code launch configurations** for debugging
3. **Add npm pre-commit hook** to verify builds
4. **Consider Docker** for even more consistent environments
5. **Add Makefile** with common commands

## References

- NestJS Build Configuration: https://docs.nestjs.com/cli/overview
- TypeScript Compiler Options: https://www.typescriptlang.org/tsconfig
- Monorepo Best Practices: https://monorepo.tools/
