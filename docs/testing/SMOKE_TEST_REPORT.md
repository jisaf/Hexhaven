# Hexhaven Smoke Test Report - MCP Visual Testing

**Test Date:** December 4, 2025
**Browser:** Chromium (ARM64) via Playwright MCP
**Viewport:** Pixel 6 (412×915px)
**Test Mode:** Smoke Test (7 steps)
**Status:** ❌ BLOCKED - Critical bugs prevent test completion

---

## Executive Summary

The smoke test was **blocked at Step 2** due to critical UI and infrastructure issues. Out of 7 planned steps, only 2 were attempted before encountering blocking bugs that prevent further testing.

### Test Results
- ✅ **Step 1 (Partial):** Page loads but with backend errors
- ❌ **Step 2:** Create Game button not clickable - BLOCKING BUG
- ⏸️ **Steps 3-7:** Not reached due to Step 2 failure

### Bugs Found
- 🔴 **Critical:** Create Game button blocked by Login link overlay
- 🔴 **Critical:** Backend API not responding (ERR_CONNECTION_REFUSED)

---

## Test Execution Details

### Step 1: Navigate and Verify Page Load

**Status:** ⚠️ Partial Success

**Actions Taken:**
1. Used `mcp__playwright__browser_navigate` to go to http://localhost:5173
2. Used `mcp__playwright__browser_take_screenshot` to capture landing page
3. Used `mcp__playwright__browser_snapshot` to get accessibility tree

**Results:**
- ✅ Page loaded successfully
- ✅ Page title "frontend" present
- ✅ "Hexhaven Multiplayer" heading visible
- ✅ Create Game button present in accessibility tree (ref=e13)
- ❌ Backend API calls failing (ERR_CONNECTION_REFUSED)
- ❌ WebSocket connections failing
- ❌ Active games list shows error: "Failed to fetch active rooms"

**Console Errors:**
```
[ERROR] Failed to load resource: net::ERR_CONNECTION_REFUSED @ http://localhost:3001/api/rooms
[ERROR] [API] Fetch active rooms error
[ERROR] [Lobby] Failed to fetch active rooms: Failed to fetch
[ERROR] WebSocket connection to 'ws://localhost:3001/socket.io/...' failed
```

**Screenshot:** `smoke-01-landing.png`

**Verdict:** Page loads but backend connectivity issues prevent full functionality

---

### Step 2: Click Create Game Button

**Status:** ❌ FAILED - BLOCKING BUG

**Actions Taken:**
1. Used `mcp__playwright__browser_snapshot` to locate Create Game button
2. Attempted `mcp__playwright__browser_click` on button ref=e13
3. Captured screenshot of failure state

**Error:**
```
TimeoutError: locator.click: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('aria-ref=e13')
  - locator resolved to <button data-testid="create-room-button">+</button>
  - attempting click action
  - element is visible, enabled and stable
  - scrolling into view if needed
  - <a href="/login">Login</a> from <nav class="auth-nav"> subtree intercepts pointer events
```

**Root Cause:**
The Login navigation link is overlapping the Create Game button and intercepting all click events. This is a **CSS z-index or positioning bug** that makes the primary CTA (Create Game) completely non-functional.

**Screenshot:** `smoke-02-create-button-blocked.png`

**Verdict:** Critical UI bug blocks all game creation functionality

---

### Steps 3-7: Not Executed

The following steps could not be tested due to Step 2 failure:

- **Step 3:** Enter Nickname - BLOCKED
- **Step 4:** Verify Lobby - BLOCKED
- **Step 5:** Start Game - BLOCKED
- **Step 6:** Verify Hex Map - BLOCKED
- **Step 7:** Verify Cards - BLOCKED

---

## Bugs Documented

All bugs have been appended to `/home/opc/hexhaven/frontend/tests/bugs.md`

### Bug #1: Create Game Button Not Clickable ⚠️ CRITICAL

**Priority:** P0 - Blocks all game creation

**Description:** Navigation Login link intercepts pointer events on Create Game button

**Impact:** Users cannot create games, completely blocking primary user flow

**Technical Details:**
- Element selector: `button[data-testid="create-room-button"]`
- Conflicting element: `<a href="/login">` from `<nav class="auth-nav">`
- Issue: CSS positioning/z-index causes nav link to overlay button

**Steps to Reproduce:**
1. Navigate to http://localhost:5173
2. Attempt to click Create Game button (+ button)
3. Click is intercepted by Login link

**Expected Behavior:** Create Game button should be in front of navigation and fully clickable

**Evidence:** `smoke-02-create-button-blocked.png`

---

### Bug #2: Backend API Not Responding ⚠️ CRITICAL

**Priority:** P0 - Blocks all backend functionality

**Description:** Backend server not running or not accessible on port 3001

**Impact:** No API calls work, no WebSocket connections, no multiplayer functionality

**Technical Details:**
- Target: http://localhost:3001
- Error: `net::ERR_CONNECTION_REFUSED`
- Affected endpoints:
  - `GET /api/rooms` (active rooms)
  - `GET /api/rooms/my-rooms/{uuid}` (user's rooms)
  - `WS /socket.io/...` (WebSocket connections)

**Root Cause Investigation:**
- Backend build succeeded (`npm run build`)
- Backend files generated at `/home/opc/hexhaven/backend/dist/backend/src/main.js`
- NestJS looking for `/home/opc/hexhaven/backend/dist/main` (wrong path)
- Configuration mismatch between TypeScript compilation and NestJS entry point

**Steps to Reproduce:**
1. Start frontend: `npm run dev` (works)
2. Start backend: `npm run dev:backend` (fails to find entry point)
3. Open http://localhost:5173
4. Check browser console for connection errors

**Expected Behavior:** Backend should start successfully and respond to API calls

**Evidence:** `smoke-01-landing.png` (shows API errors in console)

---

## MCP Testing Approach

This test successfully demonstrated **real visual testing using Playwright MCP browser tools**:

### MCP Tools Used

1. **`mcp__playwright__browser_navigate`** - Successfully navigated to localhost:5173
2. **`mcp__playwright__browser_snapshot`** - Captured accessibility tree for semantic element detection
3. **`mcp__playwright__browser_take_screenshot`** - Captured visual evidence of bugs
4. **`mcp__playwright__browser_click`** - Attempted interaction (revealed clickability bug)

### Advantages Demonstrated

- ✅ **Real browser testing** - Actual Chromium rendering, not mocks
- ✅ **Semantic locators** - Found elements by accessibility tree refs, not brittle CSS selectors
- ✅ **Visual evidence** - Screenshots prove bugs exist
- ✅ **Detailed error reporting** - MCP provides full Playwright error logs
- ✅ **Mobile viewport** - Tested on exact Pixel 6 dimensions (412×915)

### Key Findings

- MCP browser tools work excellently with Chromium on ARM64
- Accessibility tree analysis provides robust element location
- Screenshot capture provides clear bug evidence
- Error messages include detailed Playwright call logs

---

## Recommendations

### Immediate Actions (P0)

1. **Fix Create Game Button UI**
   - Adjust CSS z-index or positioning for auth navigation
   - Ensure Create Game button is always clickable
   - Test: Click Create Game button should work

2. **Fix Backend Startup**
   - Correct NestJS entry point configuration
   - Or adjust TypeScript output directory structure
   - Verify backend responds at http://localhost:3001

### Before Next Test Run

- ✅ Backend must be running and healthy
- ✅ Create Game button must be clickable
- ✅ API endpoints must be accessible
- ✅ WebSocket connections must succeed

### Testing Strategy

Once bugs are fixed, re-run smoke test to verify:
1. Page loads without errors
2. Create Game button works
3. Nickname entry flow completes
4. Lobby renders with room code
5. Game starts successfully
6. Hex map renders
7. Cards appear

---

## Test Environment

### System Information

- **OS:** Oracle Linux 8 (ARM64 / aarch64)
- **Node.js:** v20.19.2
- **Frontend:** Vite dev server on localhost:5173 ✅
- **Backend:** NestJS (failed to start) ❌
- **Browser:** Chromium 143.0 (Playwright build 1200)
- **MCP:** @playwright/mcp@latest ✅

### Frontend Status

```
✅ Running on localhost:5173
✅ Vite HMR working
✅ React components rendering
✅ i18n initialized
✅ Routing functional
❌ Backend API calls failing
❌ WebSocket connections failing
```

### Backend Status

```
❌ Not running on localhost:3001
✅ TypeScript compilation successful
❌ NestJS entry point not found
⚠️  Build output at wrong path (dist/backend/src/main.js vs dist/main)
```

---

## Next Steps

1. **Developer Action Required:**
   - Fix navigation overlay CSS issue
   - Fix backend build/startup configuration
   - Restart backend server

2. **Re-run Smoke Test:**
   - Use `/visual smoke` command
   - Verify all 7 steps complete
   - Confirm no new bugs introduced

3. **Full Test:**
   - Once smoke test passes
   - Run `/visual full` for comprehensive 10+ step test
   - Test character selection, combat, scenarios

---

## Conclusion

The MCP-based visual testing system is **working correctly** and successfully identified **2 critical blocking bugs** in the first 2 steps of the smoke test.

This validates the testing approach:
- ✅ Uses actual Playwright MCP browser tools (not scripts)
- ✅ Performs real visual testing (not unit tests)
- ✅ Captures evidence (screenshots)
- ✅ Documents bugs systematically
- ✅ Tests on mobile viewport (Pixel 6)

The application **cannot proceed to production** until both critical bugs are resolved and the full smoke test passes.

---

**Report Generated:** December 4, 2025
**Testing Framework:** Playwright MCP + Chromium ARM64
**Total Bugs Found:** 2 (both P0 critical)
**Test Coverage:** 2/7 steps (28%) before blocking issues
**Status:** 🔴 FAILED - Critical bugs require immediate attention
