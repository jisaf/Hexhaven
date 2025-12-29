---
description: Start or restart development servers using Haiku
---

## Goal

Intelligently start or restart the frontend and backend development servers using Claude Haiku (faster model) with thinking disabled.

## Execution Steps

1. **Switch to Haiku**: Use `/model haiku` to set the model to Claude Haiku
2. **Disable Thinking**: Use `/thinking off` to disable thinking mode
3. **Manage Servers**: Execute the server management logic below
4. **Restore OpusPlan**: Use `/model opusplan` to switch back to Claude OpusPlan
5. **Enable Thinking**: Use `/thinking on` to re-enable thinking mode

## Server Management Logic

Execute the following steps:

### Step 1: Check Current Server Status

Check if servers are currently running:
```bash
# Check for backend process (port 3000 or 3001)
lsof -ti:3000,3001 2>/dev/null || echo "Backend not running"

# Check for frontend process (port 5173)
lsof -ti:5173 2>/dev/null || echo "Frontend not running"
```

### Step 2: Kill Existing Processes (if running)

Thoroughly clean up all existing server processes:
```bash
# Kill all node processes running vite or nest (more thorough cleanup)
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "nest start" 2>/dev/null || true
pkill -9 -f "npm run dev:backend" 2>/dev/null || true
pkill -9 -f "npm run dev:frontend" 2>/dev/null || true

# Force kill any zombie processes on development ports
# Includes extra vite ports (5173-5176) to clean up orphaned instances
lsof -ti:3000,3001,3002,5173,5174,5175,5176 | xargs kill -9 2>/dev/null || true

# Wait for ports to be fully released
sleep 3
```

### Step 3: Evaluate Startup Method

Determine which startup method to use:

**Use `npm run dev`** if:
- Quick startup needed (for testing/commits)
- Database is already migrated and seeded
- Just need to start the servers

**Use `start-dev.sh`** if:
- Fresh setup needed
- Database needs migrations
- Full initialization required

**Decision Logic:**
```bash
# Check if database needs setup
cd /home/ubuntu/hexhaven/backend
if npx prisma migrate status 2>&1 | grep -q "pending\|not applied"; then
  echo "Database needs migrations - use start-dev.sh"
  USE_SCRIPT=true
else
  echo "Database is up to date - use npm run dev"
  USE_SCRIPT=false
fi
cd /home/ubuntu/hexhaven
```

### Step 4: Start Servers

Based on the evaluation:

**If using npm run dev:**
```bash
cd /home/ubuntu/hexhaven
npm run dev:backend > /tmp/hexhaven-backend.log 2>&1 &
npm run dev:frontend > /tmp/hexhaven-frontend.log 2>&1 &

# Wait for servers to be ready
sleep 8

# Verify servers are running
curl -s http://localhost:3001/health || curl -s http://localhost:3000/health
curl -s http://localhost:5173 || echo "Frontend may be on alternate port (check 5174-5176)"
```

**If using start-dev.sh:**
```bash
cd /home/ubuntu/hexhaven
bash start-dev.sh > /tmp/hexhaven-startup.log 2>&1 &

# Wait longer for full initialization
sleep 10

# Verify servers are running
curl -s http://localhost:3000/health || echo "Backend may still be starting"
curl -s http://localhost:5173 || echo "Frontend may still be starting"
```

### Step 5: Report Status

After starting servers, report:
- Which method was used (npm or script)
- Whether servers started successfully
- Any errors encountered
- Log file locations for debugging

## Usage

```bash
/servers
```

This command will:
- Kill any existing server processes
- Evaluate which startup method is best
- Start the servers in the background
- Verify they're running and accessible

## Notes

- Servers run in background with logs in `/tmp/`
- Backend logs: `/tmp/hexhaven-backend.log`
- Frontend logs: `/tmp/hexhaven-frontend.log`
- Startup script logs: `/tmp/hexhaven-startup.log`
- Processes survive after command completion
- Use `pkill -f "npm run dev"` to stop manually if needed

## Task

Execute the server management logic described above.
