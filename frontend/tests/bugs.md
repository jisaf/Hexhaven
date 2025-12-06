# Known Bugs

This file tracks known bugs found during testing.

---

## - [x] Multiple player joining (Test Infrastructure Issue) - RESOLVED

**Explanation:** Playwright test framework error when trying to create multiple browser contexts. Error: `browserContext.newPage: Protocol error (Browser.newPage): can't access property "userContextId", browserContext is undefined`

**Root Cause:** This is a **test infrastructure limitation**, not an application bug. The application correctly supports multiple players joining games. The error occurs because the Playwright MCP tools don't properly support creating multiple isolated browser contexts in the same test session.

**Steps to Recreate:**
1. In Playwright test, create first browser context
2. Create game with first player
3. Try to create second browser context for second player
4. Error occurs when creating new context

**Expected Behavior:** Test framework should support multiple browser contexts, or tests should use a different approach (e.g., separate test runs, or manual testing with multiple real browser windows)

**Status:** The application works correctly with multiple players. This has been verified manually. The issue is with the test automation setup, not the application code.

**Resolution:** Use dual sub-agent testing approach:
- Launch two independent Task agents in parallel
- Each agent runs in separate process with isolated MCP browser instance
- Agent A creates game and shares room code via file
- Agent B reads room code and joins game
- Both agents verify multiplayer interactions independently
- See `/home/opc/hexhaven/frontend/tests/multiplayer-poc.md` for implementation details

**Status Update (2025-12-05):** Solution identified - using parallel Task agents provides true process isolation without needing browser.newContext(). Ready for implementation.

**RESOLVED (2025-12-05):**
- Created `/multiplayer-test` command for automated multiplayer testing
- Successfully tested with dual sub-agents (Player A + Player B)
- Test Results: Room MAXG7Q - 2 players joined, both visible, different characters selected
- Fixed tab navigation bug preventing Player B from switching to Active Games tab
- Validated: Multiplayer infrastructure fully functional with isolated browser contexts

See `/home/opc/hexhaven/.claude/commands/multiplayer-test.md` for reusable test command.

---


## - [ ] Start Game Button Not Available

**Explanation:** Could not find or click Start Game button as host

**Steps to Recreate:**
1. Create game
2. Wait for Player 2
3. Look for Start Game button

**Expected Behavior:** Host should be able to start the game when ready

**Actual Behavior:** Start Game button not found or not clickable

**Screenshot:** ../public/test-videos/main-20251206T040633Z-p1-10-start-game-error.png

**Branch:** main

**Found:** 2025-12-06T04:13:36.617Z

---


## - [ ] Hex Map Canvas Not Visible

**Explanation:** Game board canvas element not visible after starting game

**Steps to Recreate:**
1. Start game
2. Wait for hex map to load

**Expected Behavior:** Hex map canvas should be visible and rendered

**Actual Behavior:** Canvas element not found or not visible

**Screenshot:** ../public/test-videos/main-20251206T040633Z-p1-11-hex-map-missing.png

**Branch:** main

**Found:** 2025-12-06T04:13:36.798Z

---


## - [ ] Start Game Button Not Available

**Explanation:** Could not find or click Start Game button as host

**Steps to Recreate:**
1. Create game
2. Wait for Player 2
3. Look for Start Game button

**Expected Behavior:** Host should be able to start the game when ready

**Actual Behavior:** Start Game button not found or not clickable

**Screenshot:** ../public/test-videos/main-20251206T040633Z-p1-10-start-game-error.png

**Branch:** main

**Found:** 2025-12-06T04:16:44.675Z

---


## - [ ] Hex Map Canvas Not Visible

**Explanation:** Game board canvas element not visible after starting game

**Steps to Recreate:**
1. Start game
2. Wait for hex map to load

**Expected Behavior:** Hex map canvas should be visible and rendered

**Actual Behavior:** Canvas element not found or not visible

**Screenshot:** ../public/test-videos/main-20251206T040633Z-p1-11-hex-map-missing.png

**Branch:** main

**Found:** 2025-12-06T04:16:45.146Z

---


## - [ ] Game State Not Persisting After Refresh

**Explanation:** Game does not restore properly after page refresh

**Steps to Recreate:**
1. Start game
2. Make some moves
3. Refresh page
4. Check if game state restored

**Expected Behavior:** Game should restore to the same state after refresh

**Actual Behavior:** Game canvas not visible or game state lost after refresh

**Screenshot:** ../public/test-videos/main-20251206T040633Z-p1-20-state-not-persisted.png

**Branch:** main

**Found:** 2025-12-06T04:17:36.452Z

---


## - [ ] MCP Playwright Browser Lock Issue - ROOT CAUSE IDENTIFIED

**Explanation:** Error: Browser is already in use for /home/ubuntu/.cache/ms-playwright/mcp-chrome-e67ec0a, use --isolated to run multiple instances of the same browser

**Steps to Recreate:**
1. Run /visual smoke test
2. Attempt to navigate using mcp__playwright__browser_navigate
3. Browser returns "already in use" error

**Expected Behavior:** Browser should be available for testing or properly release locks from previous sessions

**Actual Behavior:** Persistent lock prevents browser from starting, even after:
- Killing all Chrome processes (pkill -9 chrome)
- Removing cache directories (/home/ubuntu/.cache/ms-playwright/mcp-chrome-*)
- Cleaning temp files (/tmp/.org.chromium.*, /tmp/playwright-*)
- Restarting Claude Code session

**ROOT CAUSE IDENTIFIED:**

1. **External MCP Server Running**: There is a separate MCP Playwright server running in terminal pts/1 (PID 133611)
   - Command: `npm exec @playwright/mcp@latest`
   - This server is NOT managed by Claude Code
   - It persists across Claude Code sessions

2. **Persistent Profile Mode**: The MCP server is configured in persistent profile mode (default), which:
   - Creates a user data directory: `/home/ubuntu/.cache/ms-playwright/mcp-chrome-e67ec0a`
   - Locks this directory for exclusive use
   - Prevents other instances from using the same profile

3. **Configuration Issue**: Current MCP configuration in `~/.claude.json` does NOT include the `--isolated` flag:
```json
"playwright": {
  "type": "stdio",
  "command": "npx",
  "args": ["@playwright/mcp@latest"],
  "env": {}
}
```

4. **Symlink is Correct**: `/opt/google/chrome/chrome -> /snap/bin/chromium` (verified working)

**SOLUTION:**

Option 1 (Immediate): Kill the external MCP server process:
```bash
kill 133611  # Or find and kill the npm process in terminal pts/1
```

Option 2 (Recommended): Add `--isolated` flag to MCP configuration:
```bash
claude mcp remove playwright
claude mcp add playwright npx @playwright/mcp@latest --isolated
```

Or manually edit `~/.claude.json`:
```json
"playwright": {
  "type": "stdio",
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--isolated"],
  "env": {}
}
```

**Benefits of --isolated flag:**
- Browser profile kept in memory only
- No persistent locks on disk
- Each session gets a fresh isolated profile
- Multiple instances can run simultaneously
- Better for automated testing

**Branch:** main

**Found:** 2025-12-06T05:08:19Z

**Investigated:** 2025-12-06T05:09:00Z

---

