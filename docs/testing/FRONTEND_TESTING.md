# Testing Guide

This project uses two complementary testing approaches:

## 1. Playwright MCP (Interactive AI Testing) ✨ **Recommended**

Playwright MCP uses AI to analyze pages via accessibility trees and interact with them intelligently, without hardcoded locators.

### How It Works
- **Accessibility-based**: Uses Playwright's accessibility tree, not pixel matching
- **LLM-friendly**: Works with structured data, no vision models needed
- **Adaptive**: Finds elements by description, not brittle selectors
- **Interactive**: Test through natural language conversation

### Setup

Playwright MCP is already configured! Check status:
```bash
claude mcp list
```

You should see:
```
playwright: npx -y @playwright/mcp@latest - ✓ Connected
```

### Using Playwright MCP Interactively

Simply ask Claude Code to test your application:

**Example 1: Basic Flow Test**
```
"Use Playwright MCP to test the game creation flow:
1. Navigate to localhost:5173
2. Look at the page and click the create game button
3. Fill in a nickname
4. Verify the lobby appears
5. Report what you see"
```

**Example 2: Multiplayer Test**
```
"Use Playwright MCP with Firefox to:
1. Open localhost:5173
2. Create a game in one tab
3. Open a second tab and join the same game
4. Select different characters for each player
5. Start the game and verify both see the board
6. Report any issues"
```

**Example 3: Combat Flow**
```
"Test the combat system with Playwright MCP:
1. Start a game with monsters
2. Select attack cards
3. Click on a monster to attack
4. Verify damage is dealt
5. End turn and observe monster behavior
6. Document what happens"
```

### Advantages
- ✅ **No brittle selectors** - finds elements by description
- ✅ **Adaptive to UI changes** - doesn't break when IDs change
- ✅ **Natural language** - describe what you want to test
- ✅ **Visual analysis** - understands page layout
- ✅ **Interactive** - can ask questions and explore
- ✅ **Debugging** - can take screenshots and explain what it sees

### Use Cases
- Exploratory testing
- UI/UX verification
- Regression testing
- Bug reproduction
- User flow validation

---

## 2. Traditional Playwright Tests (Automated CI/CD)

Locator-based tests for automated regression testing in CI/CD pipelines.

### Files
- `comprehensive-game-flow.spec.ts` - Full game flow test
- `playwright.config.ts` - Main config (Pixel 6 mobile)
- `playwright-firefox.config.ts` - Firefox headless config

### Running Tests

```bash
# Run comprehensive test suite
npx playwright test comprehensive-game-flow.spec.ts --config=playwright-firefox.config.ts

# Run specific project
npx playwright test --project=firefox

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

### Slash Commands

```bash
# Traditional locator-based test
/test-game-flow

# Interactive MCP testing (ask Claude directly)
/test-game-flow-mcp
```

### Advantages
- ✅ **Fast execution** - no AI inference needed
- ✅ **Deterministic** - same results every run
- ✅ **CI/CD friendly** - integrates with pipelines
- ✅ **Parallel execution** - run many tests at once
- ✅ **Automated** - no human interaction needed

### Use Cases
- Continuous Integration
- Nightly regression tests
- Performance testing
- Load testing

---

## When to Use Which?

| Scenario | Use MCP | Use Traditional |
|----------|---------|-----------------|
| Exploring new features | ✅ | ❌ |
| Reproducing user bugs | ✅ | ❌ |
| UI changes frequently | ✅ | ❌ |
| Need exact reproducibility | ❌ | ✅ |
| CI/CD pipeline | ❌ | ✅ |
| Parallel test execution | ❌ | ✅ |
| Testing without test IDs | ✅ | ❌ |
| Performance benchmarks | ❌ | ✅ |

---

## Test Coverage

Both approaches test:
- ✅ Game creation and joining
- ✅ Multi-player scenarios (up to 4 players)
- ✅ Character selection
- ✅ Card selection phase
- ✅ Character movement
- ✅ Attack mechanics
- ✅ Monster AI behavior
- ✅ Turn management

---

## Bug Reporting

All bugs found are automatically tracked in `bugs.md` with:
- [ ] Checkbox format for tracking
- Detailed explanation
- Steps to reproduce
- Expected behavior

---

## Artifacts

Test artifacts are saved to `test-results/`:
- **Screenshots**: Captured on failures
- **Videos**: Full test recordings
- **Traces**: Playwright trace files (view with `npx playwright show-trace trace.zip`)

---

## Examples

### Interactive MCP Testing Session

```
You: "Test the character movement using Playwright MCP"

Claude: "I'll test character movement using Playwright MCP. Let me start by navigating to the game..."

[Uses mcp_playwright_navigate tool]
[Takes screenshot and analyzes page]
[Clicks create game button by finding it in accessibility tree]
[Fills nickname]
[Selects character]
[Starts game]
[Analyzes board and clicks character]
[Clicks highlighted hex]
[Verifies movement]

Claude: "I tested character movement and found:
- ✅ Character highlights on click
- ✅ Movement range displays correctly
- ✅ Character moves to clicked hex
- ❌ Bug: Movement animation stutters on Firefox
- ❌ Bug: Other player sees teleport instead of smooth movement"
```

### Traditional Test Output

```bash
$ npx playwright test comprehensive-game-flow.spec.ts

Running 1 test using 1 worker

Phase 1: Loading dev site... ✓
Phase 2: Creating 4 games... ✓
Phase 3: Adding 2 players to first game... ✓
Phase 4: Starting all 4 games... ✓
Phase 5: Selecting cards... ✓
Phase 6: Moving character... ✓
Phase 7: Attacking with character... ✓
Phase 8: Ending turn and checking monster AI... ✓

Test Complete! Found 0 bugs
```

---

## Configuration

### Playwright MCP Server Config

Located in Claude Code's MCP settings:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

### Available MCP Options

```bash
# Start with Firefox
npx @playwright/mcp --browser firefox

# Headed mode (see the browser)
npx @playwright/mcp --browser firefox --headless=false

# Save traces
npx @playwright/mcp --save-trace --output-dir ./test-results

# Save video
npx @playwright/mcp --save-video 1280x720 --output-dir ./test-results
```

---

## Tips

### For MCP Testing
- Be specific about what you want to test
- Ask Claude to describe what it sees
- Request screenshots when debugging
- Have Claude explain its actions
- Use it for exploratory testing

### For Traditional Tests
- Add `data-testid` attributes for stable selectors
- Keep tests focused and fast
- Use page objects for reusability
- Run in CI/CD for regression detection
- Update locators when UI changes

---

## Resources

- [Playwright MCP Documentation](https://github.com/microsoft/playwright-mcp)
- [Playwright Documentation](https://playwright.dev)
- [MCP Protocol](https://modelcontextprotocol.io)
