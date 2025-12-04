# Hexhaven Visual Testing Guide - MCP Edition

**Browser:** Chromium (ARM64 compatible) via Playwright MCP
**Framework:** Playwright MCP Browser Tools
**Last Updated:** December 4, 2025

---

## Quick Start

### Run Smoke Test (Definition of Done)
```bash
# Via slash command (recommended)
/visual smoke

# Or specify mode explicitly
/visual
```

### Run Full Test (On Demand)
```bash
/visual full
```

---

## What is MCP Visual Testing?

This is **not** standard Playwright test scripts. This uses **Playwright MCP (Model Context Protocol)** browser tools that Claude calls directly to perform real visual testing.

### How It Works

1. You run `/visual smoke` or `/visual full`
2. The command expands into detailed instructions
3. Claude executes each step using MCP browser tools:
   - `mcp__playwright__browser_navigate` - Navigate to pages
   - `mcp__playwright__browser_snapshot` - Get accessibility tree
   - `mcp__playwright__browser_click` - Click elements
   - `mcp__playwright__browser_type` - Type text
   - `mcp__playwright__browser_take_screenshot` - Capture evidence
   - `mcp__playwright__browser_evaluate` - Run JavaScript
4. Screenshots saved to `frontend/public/test-videos/`
5. Bugs appended to `frontend/tests/bugs.md`
6. Test report generated in `frontend/tests/docs/`

### Key Advantages

- ✅ **Real Browser Testing** - Actual Chromium rendering
- ✅ **Semantic Locators** - Uses accessibility tree, not brittle CSS selectors
- ✅ **Visual Evidence** - Screenshots prove bugs exist
- ✅ **No Test Scripts** - Claude orchestrates tests interactively
- ✅ **Intelligent Analysis** - Can reason about UI state and errors
- ✅ **Adaptive** - Adjusts to UI changes automatically

---

## Test Modes

### Smoke Test (7 Steps, ~2-3 Minutes)

**Purpose:** Quick validation for definition of done

**Steps:**
1. **Page Load** - Navigate and verify landing page
2. **Game Creation Button** - Click Create Game
3. **Nickname Entry** - Fill nickname and submit
4. **Lobby Verification** - Verify room code displayed
5. **Game Start** - Click Start Game button
6. **Hex Map Verification** - Verify game board renders
7. **Card Verification** - Verify ability cards appear

**When to Use:**
- Before every commit
- As part of pull request checks
- After fixing bugs
- During development iterations

**Definition of Done:** All 7 steps must pass

---

### Full Test (13 Steps, ~8-10 Minutes)

**Purpose:** Comprehensive game flow validation

**Steps:**
1-7: All smoke test steps, plus:
8. **Character Selection** - Select and verify characters
9. **Card Selection** - Pick ability cards for round
10. **Movement** - Move character on hex grid
11. **Combat** - Attack monster and verify damage
12. **Monster AI Turn** - Verify monster takes action
13. **Scenario Completion** - Complete objectives and verify results

**When to Use:**
- Before major releases
- After significant refactoring
- When testing complete user journeys
- During QA cycles

---

## MCP Browser Tools Reference

### Navigation
```javascript
mcp__playwright__browser_navigate(url: "http://localhost:5173")
```
Navigates to a URL and waits for page load.

### Accessibility Snapshot
```javascript
mcp__playwright__browser_snapshot()
```
Returns page structure as accessibility tree with element refs:
```yaml
- button "Create Game" [ref=e13] [cursor=pointer]
- link "Login" [ref=e6]
```

### Click Element
```javascript
mcp__playwright__browser_click(element: "Create Game button", ref: "e13")
```
Clicks element using ref from accessibility snapshot.

### Type Text
```javascript
mcp__playwright__browser_type(element: "nickname input", ref: "e24", text: "Player1")
```
Types text into input field.

### Take Screenshot
```javascript
mcp__playwright__browser_take_screenshot(filename: "smoke-01-landing.png")
```
Captures viewport screenshot to test-videos folder.

### Evaluate JavaScript
```javascript
mcp__playwright__browser_evaluate(function: "() => document.querySelector('canvas') !== null")
```
Runs JavaScript in page context and returns result.

### Wait
```javascript
mcp__playwright__browser_wait_for(time: 2)
```
Waits specified seconds before continuing.

---

## Bug Reporting

### Automatic Bug Documentation

When tests fail, bugs are automatically appended to `tests/bugs.md`:

```markdown
## - [ ] [Bug Title]

**Explanation:** [Detailed error from MCP tool]

**Steps to Recreate:**
1. [Step that failed]
2. [Actions taken]

**Expected Behavior:** [What should happen]

**Screenshot:** [Path to evidence]

**Found:** [ISO 8601 timestamp]

---
```

### Bug Report Location

- **File:** `/home/opc/hexhaven/frontend/tests/bugs.md`
- **Format:** GitHub-flavored markdown with checkboxes
- **Lifecycle:** Mark `- [x]` when fixed

---

## Screenshot Management

### Storage & Naming

- **Location:** `frontend/public/test-videos/`
- **Format:** PNG images
- **Naming Convention:** `[branch]-[timestamp]-[mode]-[step]-[description].png`

### Filename Format

```
[branch-name]-[ISO8601-timestamp]-[test-mode]-[step-number]-[description].png

Examples:
002-postgres-user-db-20251204T105342Z-smoke-01-landing.png
main-20251205T143022Z-full-08-character-selection.png
feature-combat-20251206T091533Z-smoke-04-lobby.png
```

### Components

- **Branch:** Current git branch (`git rev-parse --abbrev-ref HEAD`)
- **Timestamp:** UTC time in ISO 8601 format (`YYYYMMDDTHHMMSSZ`)
- **Mode:** `smoke` or `full`
- **Step:** Two-digit step number (`01`, `02`, etc.)
- **Description:** Brief description (`landing`, `create-button`, `lobby`, etc.)

### Retention Policy

- **Expiration:** 5 days (120 hours)
- **Auto-cleanup:** Runs before each test execution
- **Command:** `find frontend/public/test-videos -name "*.png" -mtime +5 -delete`
- **Latest display:** Most recent screenshots always shown

### Benefits

✅ **Branch tracking** - Know which branch generated each screenshot
✅ **Time tracking** - Exact timestamp of when test ran
✅ **Test identification** - Easy to identify smoke vs full tests
✅ **Automatic cleanup** - No manual maintenance needed
✅ **Audit trail** - 5-day history of all test runs

### Manual Cleanup

```bash
# Remove all test screenshots
rm frontend/public/test-videos/*.png

# View screenshots with details
ls -lht frontend/public/test-videos/

# Remove screenshots older than 5 days
find frontend/public/test-videos -name "*.png" -mtime +5 -delete

# Count current screenshots
ls frontend/public/test-videos/*.png 2>/dev/null | wc -l
```

---

## Test Reports

### Smoke Test Report

Generated at: `frontend/tests/docs/SMOKE_TEST_REPORT.md`

Contains:
- Executive summary with pass/fail status
- Detailed step-by-step results
- Bug descriptions with evidence
- MCP tool usage demonstration
- Environment information
- Recommendations for fixes

### Example Report Structure

```markdown
# Hexhaven Smoke Test Report

**Status:** ❌ BLOCKED or ✅ PASSED

## Test Results
- ✅ Step 1: Page loads
- ❌ Step 2: Create button blocked (BUG #1)
- ⏸️ Step 3-7: Not reached

## Bugs Found
- 🔴 Critical: [Bug description]
- 🟡 Medium: [Bug description]

## Recommendations
[Actions needed]
```

---

## Prerequisites

### System Requirements

✅ **Required:**
- Frontend running on `localhost:5173`
- Backend running on `localhost:3001`
- Chromium installed and symlinked
- MCP browser tools configured

❌ **Not Required:**
- Installing Playwright test dependencies
- Writing test scripts
- Configuring playwright.config.ts

### Verify Setup

```bash
# Check frontend
curl http://localhost:5173

# Check backend
curl http://localhost:3001/health

# Check Chromium symlink
ls -la /opt/google/chrome/chrome
```

---

## Troubleshooting

### Frontend Not Running

**Error:** `net::ERR_CONNECTION_REFUSED at http://localhost:5173/`

**Solution:**
```bash
cd frontend
npm run dev
```

### Backend Not Running

**Error:** API calls fail, WebSocket refused

**Solution:**
```bash
cd backend
npm run build
cd ..
npm run dev:backend
```

### Chromium Not Found

**Error:** `Chromium distribution 'chrome' is not found at /opt/google/chrome/chrome`

**Solution:**
```bash
# Install Chromium via Playwright
npx playwright install chromium

# Create symlink
sudo mkdir -p /opt/google/chrome
sudo ln -sf ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome /opt/google/chrome/chrome
```

### Element Not Clickable

**Error:** `Login link intercepts pointer events`

**Cause:** CSS z-index or positioning bug

**Solution:** Fix CSS to ensure clickable elements are not overlapped

### Backend Build Issues

**Error:** `Cannot find module '/home/opc/hexhaven/backend/dist/main'`

**Cause:** NestJS entry point configuration mismatch

**Investigation:**
```bash
# Check where TypeScript outputs files
find backend/dist -name "main.js"

# Check NestJS configuration
cat backend/nest-cli.json
```

---

## Architecture

### Technology Stack

- **Browser:** Chromium 143.0 (Playwright build 1200)
- **Headless:** Yes (no display required)
- **Viewport:** 412×915 (Google Pixel 6)
- **Platform:** ARM64 Linux (Oracle Linux 8 / aarch64)
- **MCP Version:** @playwright/mcp@latest

### Why Chromium?

- ✅ **ARM64 Native Support** - Works on aarch64 without GLIBCXX issues
- ✅ **Fast Execution** - Faster than Firefox on ARM64
- ✅ **Reliable Headless** - Stable without graphics dependencies
- ✅ **MCP Compatible** - Works with Playwright MCP browser tools
- ✅ **Modern DevTools** - Latest Chrome DevTools Protocol

### Why Not Firefox?

- ❌ Requires GLIBCXX_3.4.26 (Oracle Linux 8 has 3.4.25)
- ❌ Additional system library dependencies
- ❌ Heavier resource usage on ARM64

### Locator Strategy

MCP uses **semantic locators via accessibility tree**:

```javascript
// ✅ Good: Semantic ref from accessibility tree
page.getByTestId('create-room-button')  // ref=e13 from snapshot
page.getByRole('button', { name: /create/i })

// ❌ Avoid: Brittle CSS selectors
page.locator('.css-class-xyz')
page.locator('#btn-123')
```

---

## Best Practices

### 1. Always Start With Smoke Test

```bash
# Before committing
git add .
/visual smoke
# Fix any bugs found
git commit -m "feat: add feature"
```

### 2. Run Full Test Before PRs

```bash
# Before opening PR
/visual full
# Fix all bugs
# Re-run until all steps pass
```

### 3. Review Bug Reports

When bugs are found:
1. Open `frontend/tests/bugs.md`
2. Find the bug entry
3. View screenshot evidence
4. Fix the bug
5. Mark checkbox: `- [x]`
6. Re-run test to verify

### 4. Keep Environment Healthy

```bash
# Check services before testing
pgrep -f "vite"      # Frontend should be running
pgrep -f "nest"      # Backend should be running

# Check connectivity
curl -s http://localhost:5173 > /dev/null && echo "Frontend OK"
curl -s http://localhost:3001/health && echo "Backend OK"
```

### 5. Iterative Testing

- Run smoke test frequently (it's fast)
- Fix bugs immediately when found
- Don't accumulate technical debt
- Full test before major milestones

---

## FAQ

### Q: How is this different from standard Playwright tests?

**A:** Standard Playwright uses test scripts (.spec.ts files). MCP visual testing uses Claude calling browser tools interactively - no scripts needed.

### Q: Do I need to write test code?

**A:** No. The `/visual` command orchestrates everything. Claude uses MCP browser tools to perform tests.

### Q: Can I run tests in CI/CD?

**A:** Currently designed for interactive use. For CI/CD, use the standard Playwright tests in `tests/e2e/`.

### Q: Why use MCP instead of scripts?

**A:**
- Intelligent adaptation to UI changes
- Natural language test descriptions
- Automatic bug documentation
- No test maintenance burden
- Claude can reason about failures

### Q: What if a step fails midway?

**A:** The test stops, documents the bug with screenshot, and reports what was tested vs. what couldn't be reached.

### Q: Can I customize the test steps?

**A:** Yes! Edit `.claude/commands/visual.md` to add/modify steps. The command is just a prompt template.

### Q: Do tests run in parallel?

**A:** No, tests run sequentially step-by-step. This ensures clear causation when bugs occur.

### Q: Can I test on different screen sizes?

**A:** Currently configured for Pixel 6 (412×915). To change, modify MCP browser context viewport settings.

---

## Performance Benchmarks

### Smoke Test (7 Steps)
- **Duration:** 2-3 minutes (when no bugs)
- **Duration with bugs:** Depends on failure point
- **Screenshots:** 7-10 PNG files (~500KB total)
- **Memory:** ~150MB Chromium process

### Full Test (13 Steps)
- **Duration:** 8-10 minutes (when no bugs)
- **Screenshots:** 13-20 PNG files (~1MB total)
- **Memory:** ~200MB Chromium process

---

## Integration with Development Workflow

### Definition of Done Checklist

Before marking a feature "done":

- [ ] Code review passed
- [ ] Unit tests passing
- [ ] Smoke test passing (`/visual smoke`)
- [ ] No critical bugs in bugs.md
- [ ] Screenshots show expected UI
- [ ] Backend API responding
- [ ] Frontend rendering correctly

### Pull Request Requirements

Before opening PR:

```bash
# 1. Run full test
/visual full

# 2. Check for bugs
cat frontend/tests/bugs.md | grep "- \[ \]"

# 3. If bugs found, fix and re-run
# 4. Only open PR when test passes clean
```

---

## Support & Resources

- **Bug Reports:** `frontend/tests/bugs.md`
- **Test Reports:** `frontend/tests/docs/SMOKE_TEST_REPORT.md`
- **Slash Command:** `.claude/commands/visual.md`
- **Playwright MCP:** https://github.com/microsoft/playwright-mcp
- **Playwright Docs:** https://playwright.dev/

---

## Recent Test Results

### December 4, 2025 - Initial MCP Smoke Test

**Status:** ❌ BLOCKED at Step 2

**Bugs Found:**
1. 🔴 P0: Create Game button not clickable (Login link overlay)
2. 🔴 P0: Backend API not responding (ERR_CONNECTION_REFUSED)

**Recommendation:** Fix critical bugs and re-run smoke test

**Full Report:** `SMOKE_TEST_REPORT.md`

---

**Created:** December 4, 2025
**Version:** 2.0 (MCP Edition)
**Maintained By:** Hexhaven Team
