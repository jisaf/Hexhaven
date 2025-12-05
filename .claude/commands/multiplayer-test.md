---
description: Test multiplayer functionality using dual independent agents with isolated browser contexts
---

Execute multiplayer testing by launching two independent Task agents, each with isolated browser contexts and processes.

## Overview

This command validates that multiple players can:
1. Join the same game room
2. See each other in the lobby
3. Select different characters
4. Start the game together

## Architecture

- **Agent A (Host)**: Creates game, shares room code, waits for Player B
- **Agent B (Guest)**: Joins game using room code, verifies Player A visible
- **Coordination**: Room code shared via temporary file
- **Isolation**: Each agent has independent MCP browser instance

## Execution Steps

### Step 1: Prepare Environment

1. Ensure servers are running (backend + frontend)
2. Get test URL from ENVIRONMENT variable (dev.hexhaven.net or test.hexhaven.net)
3. Clean up previous test artifacts: `rm -f /tmp/hexhaven-multiplayer-*.txt`
4. Generate timestamp for file coordination: `date -u +%Y%m%dT%H%M%SZ`

### Step 2: Launch Agent A (Host)

Launch a Task agent with `subagent_type: "general-purpose"` and the following prompt:

```
You are Player A (Host) testing multiplayer game creation.

Environment:
- Frontend URL: [URL from ENVIRONMENT variable]
- Room code file: /tmp/hexhaven-multiplayer-roomcode-[TIMESTAMP].txt
- Player A status file: /tmp/hexhaven-multiplayer-playerA-status-[TIMESTAMP].txt

Tasks:
1. Navigate to the frontend URL
2. Take snapshot to verify lobby loaded
3. Click "Create Game" button
4. Enter nickname "PlayerA_Host"
5. Submit and wait for lobby room view (2 seconds)
6. Extract room code from page using snapshot
7. **CRITICAL**: Write room code to the room code file using Bash tool
8. Write "READY" to player A status file
9. Select character "Brute"
10. Wait for Player B to appear in player list (poll snapshot every 2 seconds, max 30 seconds)
11. Verify Player B's nickname is visible: "PlayerB_Guest"
12. Take final screenshot showing both players
13. Write "SUCCESS" to player A status file

Return: Room code and final status (SUCCESS/FAILED with reason)

IMPORTANT: You must write the room code to the file so Agent B can read it.
```

### Step 3: Launch Agent B (Guest) - Parallel Execution

Launch a second Task agent with `subagent_type: "general-purpose"` and the following prompt:

```
You are Player B (Guest) testing multiplayer game joining.

Environment:
- Frontend URL: [URL from ENVIRONMENT variable]
- Room code file: /tmp/hexhaven-multiplayer-roomcode-[TIMESTAMP].txt
- Player A status file: /tmp/hexhaven-multiplayer-playerA-status-[TIMESTAMP].txt
- Player B status file: /tmp/hexhaven-multiplayer-playerB-status-[TIMESTAMP].txt

Tasks:
1. Wait for room code file to exist (poll every 2 seconds, max 30 seconds)
2. Read room code from file using Bash tool: cat [room code file]
3. Navigate to the frontend URL
4. Take snapshot to verify lobby loaded
5. Click "Join Game" button
6. Enter room code from file
7. Enter nickname "PlayerB_Guest"
8. Submit join form
9. Wait for lobby room view (2 seconds)
10. Verify Player A is visible in player list: "PlayerA_Host"
11. Select character "Tinkerer" (different from Player A)
12. Take final screenshot showing both players
13. Write "SUCCESS" to player B status file

Return: Join status (SUCCESS/FAILED with reason) and observations about Player A

IMPORTANT: You must wait for the room code file before proceeding.
```

### Step 4: Verify Results

After both agents complete:

1. Read Agent A status file: `cat /tmp/hexhaven-multiplayer-playerA-status-[TIMESTAMP].txt`
2. Read Agent B status file: `cat /tmp/hexhaven-multiplayer-playerB-status-[TIMESTAMP].txt`
3. Check both agents reported SUCCESS
4. Review agent responses for any errors or warnings
5. Clean up test artifacts: `rm -f /tmp/hexhaven-multiplayer-*.txt`

### Step 5: Report Results

Generate test report:

```markdown
## Multiplayer Test Results

**Date**: [ISO 8601 timestamp]
**Test URL**: [URL used]
**Branch**: [git branch]

### Agent A (Host)
- Status: [SUCCESS/FAILED]
- Room Code: [extracted code]
- Notes: [observations]

### Agent B (Guest)
- Status: [SUCCESS/FAILED]
- Join Result: [joined/failed]
- Notes: [observations]

### Verification
- ✅/❌ Both players visible to each other
- ✅/❌ Different characters selected
- ✅/❌ Room remains stable with 2 players

### Conclusion
[PASS/FAIL] - [summary of test outcome]
```

## Usage

```bash
# Run multiplayer test
/multiplayer-test
```

## Important Notes

1. **Process Isolation**: Each agent runs in separate process with independent MCP browser instance
2. **File Coordination**: Room code shared via `/tmp/hexhaven-multiplayer-roomcode-[TIMESTAMP].txt`
3. **Parallel Execution**: Launch both agents in single message for true concurrency
4. **Timeout Handling**: Agent B has retry logic if room code file not ready
5. **Clean Architecture**: Tests real multiplayer flow without mocking

## Troubleshooting

If test fails:
- Check that both agents completed (look for "FAILED" in status files)
- Verify room code was written correctly
- Check WebSocket connection logs
- Ensure backend supports multiple connections to same room

## Prerequisites

- ✅ Backend server running (WebSocket support)
- ✅ Frontend server running
- ✅ MCP browser tools configured
- ✅ Write permissions to `/tmp/` directory

---

**Now execute the multiplayer test by launching both agents as described above.**
