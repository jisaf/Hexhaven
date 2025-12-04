Execute visual testing using Playwright MCP browser tools with Chromium on Pixel 6 viewport.

## IMPORTANT: This Uses Playwright MCP Tools

This command uses **actual MCP browser tools** (`mcp__playwright__browser_*` functions), NOT standard Playwright scripts. You must call MCP tools directly to interact with the browser.

## Usage

```bash
# Smoke test (7 steps - definition of done)
/visual smoke

# Full comprehensive test (10+ steps - on demand)
/visual full

# Default: smoke test
/visual
```

## Test Mode: {{arg1|smoke}}

You must execute the **{{arg1|smoke}}** test using Playwright MCP browser tools.

---

## Smoke Test (7 Steps)

**IMPORTANT: Before starting tests:**
1. Get current git branch: `git rev-parse --abbrev-ref HEAD`
2. Generate timestamp: `date -u +%Y%m%dT%H%M%SZ`
3. Clean up old screenshots (>5 days): `find frontend/public/test-videos -name "*.png" -mtime +5 -delete`
4. Use format: `[branch]-[timestamp]-smoke-[step]-[description].png`

Execute these steps using MCP browser tools:

### Step 1: Navigate and Verify Page Load
- Get git branch name and timestamp
- Use `mcp__playwright__browser_navigate` to go to http://localhost:5173
- Use `mcp__playwright__browser_snapshot` to get page structure
- Use `mcp__playwright__browser_take_screenshot` with filename: `[branch]-[timestamp]-smoke-01-landing.png`
- Verify: Page title exists and "Create Game" button is visible
- **On Failure**: Log bug "Page failed to load"

### Step 2: Click Create Game Button
- Use `mcp__playwright__browser_snapshot` to find "Create Game" button ref
- Use `mcp__playwright__browser_click` on the button ref
- Use `mcp__playwright__browser_take_screenshot` with filename: `[branch]-[timestamp]-smoke-02-create-button.png`
- Verify: Nickname input field appears
- **On Failure**: Log bug "Game creation button failed"

### Step 3: Enter Nickname
- Use `mcp__playwright__browser_snapshot` to find nickname input ref
- Use `mcp__playwright__browser_type` to enter "TestPlayer"
- Use `mcp__playwright__browser_take_screenshot` with filename: `[branch]-[timestamp]-smoke-03-nickname.png`
- Verify: Input contains text
- **On Failure**: Log bug "Nickname entry failed"

### Step 4: Submit and Verify Lobby
- Use `mcp__playwright__browser_snapshot` to find submit button ref
- Use `mcp__playwright__browser_click` on submit button
- Wait 2 seconds using `mcp__playwright__browser_wait_for`
- Use `mcp__playwright__browser_snapshot` to check for room code
- Use `mcp__playwright__browser_take_screenshot` with filename: `[branch]-[timestamp]-smoke-04-lobby.png`
- Verify: Room code pattern [A-Z0-9]{4,6} visible in page text
- **On Failure**: Log bug "Lobby not displayed"

### Step 5: Start Game
- Use `mcp__playwright__browser_snapshot` to find "Start Game" button ref
- Use `mcp__playwright__browser_click` on button
- Wait 3 seconds for game board to load
- Use `mcp__playwright__browser_take_screenshot` with filename: `[branch]-[timestamp]-smoke-05-game-start.png`
- Verify: Canvas element visible or game board rendered
- **On Failure**: Log bug "Game failed to start"

### Step 6: Verify Hex Map Loads
- Use `mcp__playwright__browser_snapshot` to inspect page structure
- Use `mcp__playwright__browser_evaluate` to check for canvas: `() => document.querySelector('canvas') !== null`
- Use `mcp__playwright__browser_take_screenshot` with filename: `[branch]-[timestamp]-smoke-06-hex-map.png`
- Verify: Canvas with game board hex grid is rendered
- **On Failure**: Log bug "Hex map failed to render"

### Step 7: Verify Cards Appear
- Use `mcp__playwright__browser_snapshot` to find card UI elements
- Look for card selection panel or ability cards in accessibility tree
- Use `mcp__playwright__browser_take_screenshot` with filename: `[branch]-[timestamp]-smoke-07-cards.png`
- Verify: Card elements visible in page (button roles with card names or card container)
- **On Failure**: Log bug "Ability cards not displayed"

---

## Full Test (10+ Steps)

Includes all smoke test steps plus:

### Step 8: Character Selection
- Find and click character selection buttons
- Verify character appears selected

### Step 9: Card Selection
- Click 2 ability cards
- Verify cards highlighted

### Step 10: Movement
- Click hex tile for movement
- Verify character moves

### Step 11: Combat
- Initiate attack action
- Verify damage dealt

### Step 12: Monster AI Turn
- End player turn
- Verify monster takes action

### Step 13: Scenario Completion
- Complete scenario objectives
- Verify win/loss screen

---

## Bug Reporting Format

After each failure, append to `/home/opc/hexhaven/frontend/tests/bugs.md`:

```markdown
## - [ ] [Bug Title]

**Explanation:** [Error description from MCP tool]

**Steps to Recreate:**
1. [Step that failed]
2. [Actions taken]

**Expected Behavior:** [What should happen]

**Screenshot:** ../public/test-videos/[branch]-[timestamp]-[step]-[description].png

**Branch:** [git branch name]

**Found:** [ISO 8601 timestamp]

---

```

### Screenshot Naming Examples

```
002-postgres-user-db-20251204T105342Z-smoke-01-landing.png
002-postgres-user-db-20251204T105342Z-smoke-02-create-button.png
main-20251205T143022Z-full-08-character-selection.png
feature-combat-20251206T091533Z-smoke-04-lobby.png
```

## Screenshot Management

MCP browser tools capture screenshots with automatic expiration:
- **Location:** `frontend/public/test-videos/`
- **Naming:** `[branch]-[timestamp]-[step]-[description].png`
  - Example: `002-postgres-user-db-20251204T105342Z-smoke-01-landing.png`
- **Expiration:** 5 days - automatically delete screenshots older than 5 days
- **Latest Display:** Always shows most recent test run screenshots

### Automatic Cleanup

Before each test run:
1. Delete screenshots older than 5 days (120 hours)
2. Keep current test screenshots
3. Log cleanup activity

## Prerequisites

Before running:
1. ✅ Frontend must be running on localhost:5173
2. ✅ Backend must be running on localhost:3001
3. ✅ Chromium symlinked at /opt/google/chrome/chrome
4. ✅ MCP browser tools configured for Pixel 6 (412×915px)

## Execution Instructions

You must:
1. **Use only MCP browser tools** - Never use standard Playwright scripts
2. **Call tools sequentially** - Wait for each step to complete before next
3. **Capture screenshots** - After every major action
4. **Check accessibility tree** - Use snapshots to verify UI state
5. **Generate bug reports** - Append failures to bugs.md immediately
6. **Report results** - Summarize passed/failed steps at end

## Example MCP Tool Sequence

```
1. mcp__playwright__browser_navigate(url: "http://localhost:5173")
2. mcp__playwright__browser_take_screenshot(filename: "smoke-01-landing.png")
3. mcp__playwright__browser_snapshot()
4. mcp__playwright__browser_click(element: "Create Game button", ref: "e13")
5. mcp__playwright__browser_wait_for(time: 1)
6. mcp__playwright__browser_snapshot()
... continue for all 7 steps
```

## Important Notes

- **This is NOT a script** - You execute each MCP tool call directly
- **Semantic locators only** - Use accessibility tree refs from snapshots
- **Real browser testing** - Actual Chromium rendering on ARM64
- **Pixel 6 viewport** - Already configured (412×915px)
- **No mocks or unit tests** - Real visual testing only

---

**Now execute the {{arg1|smoke}} test using MCP browser tools as described above.**
