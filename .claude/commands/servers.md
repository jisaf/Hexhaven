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

If any processes are found on ports 3000, 3001, or 5173:
```bash
# Kill processes on backend ports
pkill -f "npm run dev:backend" || true
pkill -f "nest start" || true
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || true

# Kill processes on frontend port
pkill -f "npm run dev:frontend" || true
pkill -f "vite" || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Wait for ports to be released
sleep 2
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
cd /home/opc/hexhaven/backend
if npx prisma migrate status 2>&1 | grep -q "pending\|not applied"; then
  echo "Database needs migrations - use start-dev.sh"
  USE_SCRIPT=true
else
  echo "Database is up to date - use npm run dev"
  USE_SCRIPT=false
fi
cd /home/opc/hexhaven
```

### Step 4: Start Servers

Based on the evaluation:

**If using npm run dev:**
```bash
cd /home/opc/hexhaven
npm run dev:backend > /tmp/hexhaven-backend.log 2>&1 &
npm run dev:frontend > /tmp/hexhaven-frontend.log 2>&1 &

# Wait for servers to be ready
sleep 5

# Verify servers are running
curl -s http://localhost:3001/health || curl -s http://localhost:3000/health
curl -s http://localhost:5173
```

**If using start-dev.sh:**
```bash
cd /home/opc/hexhaven
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
