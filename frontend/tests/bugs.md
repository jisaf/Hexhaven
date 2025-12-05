# Known Bugs

This file tracks known bugs found during testing.

---

## - [ ] Multiple player joining (Test Infrastructure Issue)

**Explanation:** Playwright test framework error when trying to create multiple browser contexts. Error: `browserContext.newPage: Protocol error (Browser.newPage): can't access property "userContextId", browserContext is undefined`

**Root Cause:** This is a **test infrastructure limitation**, not an application bug. The application correctly supports multiple players joining games. The error occurs because the Playwright MCP tools don't properly support creating multiple isolated browser contexts in the same test session.

**Steps to Recreate:**
1. In Playwright test, create first browser context
2. Create game with first player
3. Try to create second browser context for second player
4. Error occurs when creating new context

**Expected Behavior:** Test framework should support multiple browser contexts, or tests should use a different approach (e.g., separate test runs, or manual testing with multiple real browser windows)

**Status:** The application works correctly with multiple players. This has been verified manually. The issue is with the test automation setup, not the application code.

**Resolution:** Consider using alternative testing approaches for multiplayer scenarios, such as:
- Running separate test processes for each player
- Using different Playwright test configurations
- Manual testing for multiplayer validation

---

