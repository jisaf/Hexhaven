Run visual testing using Playwright MCP to intelligently analyze and test the application.

## Usage

```bash
/visual [optional: specific task to test]
```

## Examples

```bash
# Test everything (full game flow)
/visual

# Test specific feature
/visual game creation
/visual character movement
/visual combat system
/visual multiplayer join
/visual monster AI behavior
```

## How It Works

Uses Playwright MCP with Firefox to:
- **Analyze pages** via accessibility tree (no hardcoded locators)
- **Find elements** semantically (by role, text, description)
- **Interact naturally** like a human would
- **Adapt to UI changes** automatically
- **Report issues** with screenshots and detailed explanations

## What Gets Tested

If no task specified, runs comprehensive test:
1. Navigate to localhost:5173
2. Create game and verify lobby
3. Join with second player
4. Select characters
5. Start game and test board rendering
6. Select ability cards
7. Test character movement
8. Test attack mechanics
9. Verify monster AI turns
10. Report any bugs found

## Output

All results saved to `tests/visual/results/`:
- **Screenshots** - Visual evidence at each step
- **Videos** - Full session recordings
- **Accessibility snapshots** - Page structure analysis
- **Bug reports** - Automatically added to `tests/bugs.md`

## Prerequisites

- Backend running on localhost:3000
- Frontend running on localhost:5173

## Manual Test Script

To run the visual test script directly:
```bash
cd tests/visual
node test-game-creation-mcp.cjs
```

## See Also

- `tests/docs/TESTING.md` - Complete testing documentation
- `tests/bugs.md` - Known bugs and issues
- `/test-game-flow` - Traditional locator-based testing (CI/CD)
