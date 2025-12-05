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

