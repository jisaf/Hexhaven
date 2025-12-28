---
description: Execute visual testing with Playwright MCP using Haiku (efficient testing) and log issues to GitHub
---

Execute visual testing using Playwright MCP browser tools with Chromium on Pixel 6 viewport. Automatically creates GitHub issues for usability and logic problems found during testing.

## Execution Steps

1. **Ensure Servers Running**: Use `/servers` to start or restart development servers
2. **Switch to Haiku**: Use `/model haiku` to set the model to Claude Haiku for efficient testing
3. **Disable Thinking**: Use `/thinking off` to disable thinking mode
4. **Execute Visual Test**: Perform the visual test specified below
5. **Restore OpusPlan**: Use `/model opusplan` to switch back to Claude OpusPlan
6. **Enable Thinking**: Use `/thinking on` to re-enable thinking mode

## IMPORTANT: This Uses Playwright MCP Tools

This command uses **actual MCP browser tools** (`mcp__playwright__browser_*` functions), NOT standard Playwright scripts. You must call MCP tools directly to interact with the browser.

**Browser Interaction Constraints:**
- Use ONLY methods available to a real user in a browser (clicks, typing, navigation)
- Never use programmatic DOM manipulation, JavaScript injection, or other non-user-accessible methods
- All actions must be performed through the MCP browser tools that simulate real user interactions

**Test Plan Reference:**
- For detailed test scenarios and comprehensive testing guidelines, refer to `/docs/test-plan.md`
- The smoke test below is a quick validation based on the manual testing plan

**Testing Focus:**
- **Usability Issues**: UI/UX problems such as buttons being covered by modals, unreachable elements, poor touch targets, confusing layouts, unclear error messages
- **Logic Issues**: Gameplay bugs, incorrect game state, broken mechanics, synchronization problems, rule violations
- **Goal**: Identify real-world issues that impact user experience and game functionality

**Multiplayer Testing:**
- **You CAN use multiple sub-agents** to test multiplayer functionality
- Each agent runs in an independent browser context, simulating separate players
- Spawn agents in parallel using the Task tool with `run_in_background: true`
- Use this for testing: room joining, real-time synchronization, turn order, shared game state
- Example: Agent 1 creates game, Agent 2 joins with room code, both play simultaneously

## Usage

```bash
# Smoke test (7 steps - definition of done)
/visual smoke

# Full comprehensive test (10+ steps - on demand)
/visual full

# Default: smoke test
/visual
```

**Note:** For **any test mode**, you can spawn multiple sub-agents to test multiplayer functionality. See the "Multiplayer Testing with Multiple Agents" section below.

## Test Mode: {{arg1|smoke}}

You must execute the **{{arg1|smoke}}** test using Playwright MCP browser tools.

**For multiplayer testing:** You can spawn additional agents at any point to simulate multiple players joining and playing together. Each agent runs independently in its own browser context.

---

## Smoke Test (7 Steps)

**IMPORTANT: Before starting tests:**
1. Determine test URL based on current hostname:
   - Get hostname: `hostname`
   - If hostname is `qa` → use `http://qa.hexhaven.net`
   - If hostname is `test` → use `http://test.hexhaven.net`
   - Default: `http://test.hexhaven.net`
2. Get current git branch: `git rev-parse --abbrev-ref HEAD`
3. Generate timestamp: `date -u +%Y%m%dT%H%M%SZ`
4. Generate unique run label: `visual-test-[timestamp]` (e.g., "visual-test-20251227T123456Z")
5. Create the unique run label if it doesn't exist: `gh label create "visual-test-[timestamp]" --color "0E8A16" --description "Visual test run from [timestamp]" 2>/dev/null || true`
6. Ensure required labels exist:
   - `gh label create "visual-test" --color "1D76DB" --description "Issues found during visual testing" 2>/dev/null || true`
   - `gh label create "usability" --color "D93F0B" --description "UI/UX usability issues" 2>/dev/null || true`
   - `gh label create "logic" --color "B60205" --description "Game logic and gameplay bugs" 2>/dev/null || true`
7. Clean up old screenshots (>5 days): `find frontend/public/test-videos -name "*.png" -mtime +5 -delete 2>/dev/null || true`
8. Use screenshot format: `[branch]-[timestamp]-smoke-[step]-[description].png`

Execute these steps using MCP browser tools:

**IMPORTANT: Throughout ALL steps, actively look for:**
- Buttons covered by modals, overlays, or other UI elements
- Elements positioned outside viewport or unreachable
- Poor touch targets (< 48x48px buttons on mobile)
- Unclear or confusing UI layouts
- Missing or unclear labels/instructions
- Error messages that are unclear or unhelpful
- Loading states that hang or provide no feedback
- Any other usability issues that would frustrate users

**Create GitHub issues for ANY usability or logic problems found, not just test failures!**

### Step 1: Navigate and Register
**CRITICAL: Authentication is REQUIRED for all multiplayer functionality (#373)**
- Get git branch name and timestamp
- Determine test URL from hostname (qa → qa.hexhaven.net, test → test.hexhaven.net)
- Use `mcp__playwright__browser_navigate` to go to the test URL
- Use `mcp__playwright__browser_snapshot` to get page structure
- Click "Login" or open menu and click "Login"
- Click "Register here" link
- Fill registration form:
  - Username: "VisualTest[timestamp]" (e.g., "VisualTest20251227T123456Z")
  - Password: "TestPass123456!"
  - Confirm Password: "TestPass123456!"
- Click "Register" button
- Verify: Successful registration and automatic login
- **On Failure**: Take screenshot (filename: `frontend/public/test-videos/[branch]-[timestamp]-smoke-01-auth.png`) and create GitHub issue

### Step 2: Create Character
**REQUIRED: Characters must be created before game creation**
- Navigate to Create Character page (via menu or direct link)
- Enter character name: "TestChar[timestamp]"
- Select character class: "Brute" (or any available class)
- Click "Create Character" button
- Verify: Character created successfully
- **On Failure**: Take screenshot (filename: `frontend/public/test-videos/[branch]-[timestamp]-smoke-02-character.png`) and create GitHub issue

### Step 3: Create Game and Enter Lobby
- Navigate to home page
- Click "Create Game" button
- Click "Add Character" button
- Select the character created in Step 2
- Select a scenario (e.g., "Training Dummy - Part 1")
- Click "Create Game" button
- Wait 2 seconds using `mcp__playwright__browser_wait_for`
- Use `mcp__playwright__browser_snapshot` to check for lobby
- Verify: Room code pattern [A-Z0-9]{4,6} visible in page text
- Verify: WebSocket connection established (no timeout errors)
- **On Failure**: Take screenshot (filename: `frontend/public/test-videos/[branch]-[timestamp]-smoke-03-lobby.png`) and create GitHub issue

### Step 4: Add Character to Lobby
- Use `mcp__playwright__browser_snapshot` to verify character is in lobby
- If character not added, click "Add Character" and select it
- Verify: Character appears in lobby with "Ready" status
- Verify: "Start Game" button is visible/enabled
- **On Failure**: Take screenshot (filename: `frontend/public/test-videos/[branch]-[timestamp]-smoke-04-character-ready.png`) and create GitHub issue

### Step 5: Start Game
- Use `mcp__playwright__browser_snapshot` to find "Start Game" button ref
- Use `mcp__playwright__browser_click` on button
- Wait 3 seconds for game board to load
- Verify: Canvas element visible or game board rendered
- **On Failure**: Take screenshot with `mcp__playwright__browser_take_screenshot` (filename: `frontend/public/test-videos/[branch]-[timestamp]-smoke-05-game-start.png`) and create GitHub issue (see Bug Reporting section)

### Step 6: Verify Hex Map Loads
- Use `mcp__playwright__browser_snapshot` to inspect page structure
- Use `mcp__playwright__browser_evaluate` to check for canvas: `() => document.querySelector('canvas') !== null`
- Verify: Canvas with game board hex grid is rendered
- **On Failure**: Take screenshot with `mcp__playwright__browser_take_screenshot` (filename: `frontend/public/test-videos/[branch]-[timestamp]-smoke-06-hex-map.png`) and create GitHub issue (see Bug Reporting section)

### Step 7: Verify Cards Appear
- Use `mcp__playwright__browser_snapshot` to find card UI elements
- Look for card selection panel or ability cards in accessibility tree
- Verify: Card elements visible in page (button roles with card names or card container)
- **On Failure**: Take screenshot with `mcp__playwright__browser_take_screenshot` (filename: `frontend/public/test-videos/[branch]-[timestamp]-smoke-07-cards.png`) and create GitHub issue (see Bug Reporting section)

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

## Multiplayer Testing with Multiple Agents

You can spawn multiple independent agents to test multiplayer functionality. Each agent runs in a separate browser context, simulating different players.

### How to Use Multiple Agents

**1. Launch Agents in Background:**
```
Use Task tool with run_in_background: true to spawn multiple agents
Each agent gets its own browser context and can act independently
Use TaskOutput to retrieve results from background agents
```

**2. Coordination Pattern:**
```
Step 1: Launch Agent 1 (Player 1) in background - creates game, gets room code
Step 2: Use TaskOutput to get room code from Agent 1
Step 3: Launch Agent 2 (Player 2) in background - joins game with room code
Step 4: Monitor both agents as they interact
Step 5: Retrieve final results from both agents
```

### Multiplayer Test Scenarios

**Scenario 1: Two-Player Game Creation and Joining**
```
Agent 1 (Player 1):
1. Navigate to qa.hexhaven.net
2. Create game
3. Enter nickname "Player1"
4. Copy room code from lobby
5. Wait for Player 2 to join

Agent 2 (Player 2):
1. Navigate to qa.hexhaven.net
2. Click "Join Game"
3. Enter room code from Agent 1
4. Enter nickname "Player2"
5. Verify both players visible in lobby
```

**Scenario 2: Real-Time Synchronization Testing**
```
Agent 1 & Agent 2 (both in game):
- Agent 1 selects cards → Agent 2 verifies initiative updates
- Agent 2 moves character → Agent 1 sees movement synchronized
- Agent 1 attacks monster → Agent 2 sees monster health decrease
- Test for desyncs, race conditions, state conflicts
```

**Scenario 3: Turn Order and Game Flow**
```
Test initiative-based turn order:
- Both players select cards with different initiatives
- Verify turn order displayed correctly on both screens
- Verify out-of-turn actions are blocked
- Verify round counter increments for both players
```

### Example: Spawn Two Agents for Multiplayer Test

```markdown
I'll spawn two agents to test multiplayer functionality:

**Agent 1 - Player 1 (Host):**
Task: Create game and get room code
Run in background: true
Prompt: "Navigate to qa.hexhaven.net, create a game with nickname 'TestPlayer1',
        select Brute character, and return the room code from the lobby."

**Agent 2 - Player 2 (Joiner):**
Task: Join game with room code
Run in background: true
Prompt: "Navigate to qa.hexhaven.net, join game with room code [CODE],
        enter nickname 'TestPlayer2', verify lobby shows 2 players."
```

### Issues to Look For in Multiplayer

**Synchronization Issues (Logic):**
- Players see different game states
- Actions not reflected on other player's screen
- Monster health desynced between players
- Turn order incorrect or skipped

**Multiplayer UX Issues (Usability):**
- No indication when other player is acting
- Unclear whose turn it is
- Room code hard to read or copy
- No "waiting for players" feedback
- Confusing lobby UI with multiple players

**Create GitHub issues for any multiplayer-specific problems found!**

---

## Bug Reporting Format

### GitHub Issue Creation

When a failure or usability issue is detected, create a GitHub issue using the `gh` CLI:

```bash
gh issue create \
  --title "[Visual Test] [Brief description of issue]" \
  --body "$(cat <<'EOF'
## Issue Description

[Detailed description of the usability or logic issue found]

## Issue Type

- [ ] **Usability Issue**: UI/UX problem (button covered, unreachable element, poor layout, confusing UI)
- [ ] **Logic Issue**: Gameplay bug (incorrect state, broken mechanic, synchronization problem)

## Steps to Reproduce

1. [Step that failed or where issue was found]
2. [Actions taken]
3. [What happened]

## Expected Behavior

[What should happen instead]

## Actual Behavior

[What actually happened - be specific about usability problems]

## Visual Evidence

![Screenshot](https://qa.hexhaven.net/test-videos/[branch]-[timestamp]-[step]-[description].png)

**Screenshot file:** `frontend/public/test-videos/[branch]-[timestamp]-[step]-[description].png`

## Environment

- **Test URL:** [qa.hexhaven.net or test.hexhaven.net]
- **Branch:** [git branch name]
- **Test Run:** [timestamp]
- **Step:** [smoke-01, smoke-02, etc.]

## Found

[ISO 8601 timestamp]
EOF
)" \
  --label "bug" \
  --label "visual-test" \
  --label "[usability or logic]" \
  --label "visual-test-[timestamp]"
```

### Issue Labels

Each GitHub issue should have these labels:
1. **bug** - Standard bug label
2. **visual-test** - Indicates issue found during visual testing
3. **usability** OR **logic** - Type of issue:
   - `usability`: UI/UX problems (covered buttons, poor touch targets, confusing layouts, modal issues)
   - `logic`: Gameplay bugs (incorrect state, broken mechanics, rule violations)
4. **visual-test-[timestamp]** - Unique label for this test run (e.g., "visual-test-20251227T123456Z")

### Screenshot Naming Examples

```
feat-setup-qa-20251227T105342Z-smoke-01-landing.png
feat-setup-qa-20251227T105342Z-smoke-02-create-button.png
main-20251205T143022Z-full-08-character-selection.png
feature-combat-20251206T091533Z-smoke-04-lobby.png
```

### Usability Issue Examples

When creating issues for usability problems, be specific about the UX issue:

**Example 1: Modal Covering Button**
```
Title: [Visual Test] Start Game button covered by character selection modal
Type: Usability Issue
Description: The "Start Game" button is completely obscured by the character
selection modal on mobile viewport (412x915). Users cannot proceed with game
creation because the button is unreachable.
```

**Example 2: Poor Touch Target**
```
Title: [Visual Test] Card selection buttons too small for mobile touch
Type: Usability Issue
Description: Ability card buttons are only 32x32px, below the recommended 48x48px
minimum for touch targets. Users may have difficulty selecting cards on mobile devices.
```

**Example 3: Confusing Layout**
```
Title: [Visual Test] Room code not visible in lobby
Type: Usability Issue
Description: Room code is displayed in very light gray text on white background,
making it nearly impossible to read. Users cannot share the code to invite others.
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

The following will be automatically handled:
1. ✅ Frontend and backend servers (automatically started via `/servers` command)

Manual prerequisites:
1. ✅ Chromium symlinked at /opt/google/chrome/chrome
2. ✅ MCP browser tools configured for Pixel 6 (412×915px)

## Execution Instructions

You must:
1. **Use only MCP browser tools** - Never use standard Playwright scripts
2. **Call tools sequentially** - Wait for each step to complete before next
3. **Capture screenshots** - After every major action AND for any usability issues found
4. **Check accessibility tree** - Use snapshots to verify UI state and identify UX problems
5. **Create GitHub issues** - For test failures AND any usability/logic issues discovered
6. **Be proactive** - Look for UX problems throughout the entire test, not just at verification points
7. **Report results** - Summarize passed/failed steps and count of issues created at end
8. **Spawn multiple agents for multiplayer** - Use Task tool with `subagent_type: "general-purpose"` and `run_in_background: true` to simulate multiple players

## Example MCP Tool Sequence

```
1. mcp__playwright__browser_navigate(url: "http://qa.hexhaven.net")  # or test.hexhaven.net based on hostname
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

## Final Test Report

After completing all test steps, provide a summary report:

```markdown
## Visual Test Summary - [Test Mode] - [Timestamp]

**Test Run Label:** visual-test-[timestamp]
**Branch:** [branch name]
**Test URL:** [qa.hexhaven.net or test.hexhaven.net]

### Test Results
- ✅ Passed: X/7 steps
- ❌ Failed: Y/7 steps

### GitHub Issues Created
Total: [N] issues

[For each issue created, list:]
- #[issue-number]: [Issue title] ([usability/logic]) - [URL]

### Screenshots Captured
- [List all screenshot files created with their paths]

### Notable Findings
[Brief summary of most critical usability or logic issues found]

### View All Issues
Filter issues by run label: `label:visual-test-[timestamp]`
```

---

**Now execute the {{arg1|smoke}} test using MCP browser tools as described above.**
