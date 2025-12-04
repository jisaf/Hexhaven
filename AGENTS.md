# Claude Code Agents & Tools

This document describes the custom agents and tools available in the Hexhaven project.

---

## 📸 Visual Testing Agent

**Location**: `frontend/.claude/commands/visual.md`

### Overview

An MCP-based visual testing system that uses Playwright browser automation to test the application on a real Chromium browser with Pixel 6 viewport (412×915px).

### Commands

```bash
# Smoke test (7 steps - definition of done)
/visual smoke

# Full test (13 steps - comprehensive)
/visual full

# Default: smoke test
/visual
```

### Features

- **Real Browser Testing**: Uses Playwright MCP tools (not scripts)
- **Chromium ARM64**: Native support on Oracle Linux 8 ARM64 architecture
- **Semantic Locators**: Accessibility tree-based element detection
- **Automatic Screenshots**: Captured for every step
- **5-Day Retention**: Auto-cleanup of screenshots older than 5 days
- **Bug Tracking**: Failures auto-appended to `tests/bugs.md`
- **Mobile Viewport**: Tests on Pixel 6 (412×915px)

### Test Modes

#### Smoke Test (7 Steps)

Quick validation for definition of done:

1. **Page Load** - Navigate and verify landing page
2. **Game Creation** - Click Create Game button
3. **Nickname Entry** - Fill nickname and submit
4. **Lobby Verification** - Verify room code displayed
5. **Game Start** - Click Start Game button
6. **Hex Map Verification** - Verify game board renders
7. **Card Verification** - Verify ability cards appear

**Duration**: ~2-3 minutes
**Use**: Before every commit/PR

#### Full Test (13 Steps)

Comprehensive game flow validation (all smoke test steps plus):

8. **Character Selection** - Select and verify characters
9. **Card Selection** - Pick ability cards for round
10. **Movement** - Move character on hex grid
11. **Combat** - Attack monster and verify damage
12. **Monster AI Turn** - Verify monster takes action
13. **Scenario Completion** - Complete objectives and verify results

**Duration**: ~8-10 minutes
**Use**: Before major releases, after significant refactoring

### Screenshot Management

#### Naming Convention

```
[branch]-[timestamp]-[mode]-[step]-[description].png
```

**Examples**:
- `002-postgres-user-db-20251204T105342Z-smoke-01-landing.png`
- `main-20251205T143022Z-full-08-character-selection.png`
- `feature-combat-20251206T091533Z-smoke-04-lobby.png`

#### Components

- **Branch**: Current git branch (`git rev-parse --abbrev-ref HEAD`)
- **Timestamp**: UTC time in ISO 8601 format (`YYYYMMDDTHHMMSSZ`)
- **Mode**: `smoke` or `full`
- **Step**: Two-digit step number (`01`, `02`, etc.)
- **Description**: Brief description (`landing`, `create-button`, `lobby`, etc.)

#### Retention

- **Expiration**: 5 days (120 hours)
- **Auto-cleanup**: `find frontend/public/test-videos -name "*.png" -mtime +5 -delete`
- **Location**: `frontend/public/test-videos/`
- **Gallery**: http://localhost:5173/test-videos

### MCP Browser Tools Used

The visual testing agent uses these Playwright MCP tools:

- `mcp__playwright__browser_navigate` - Navigate to URLs
- `mcp__playwright__browser_snapshot` - Get accessibility tree
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_type` - Type text
- `mcp__playwright__browser_take_screenshot` - Capture evidence
- `mcp__playwright__browser_evaluate` - Run JavaScript
- `mcp__playwright__browser_wait_for` - Wait for conditions

### Bug Reporting

When tests fail, bugs are automatically appended to `frontend/tests/bugs.md`:

```markdown
## - [ ] [Bug Title]

**Explanation:** [Error description from MCP tool]

**Steps to Recreate:**
1. [Step that failed]
2. [Actions taken]

**Expected Behavior:** [What should happen]

**Screenshot:** ../public/test-videos/[filename].png

**Branch:** [git branch name]

**Found:** [ISO 8601 timestamp]

---
```

### Prerequisites

Before running visual tests:

1. ✅ Frontend running on `localhost:5173`
2. ✅ Backend running on `localhost:3001`
3. ✅ Chromium symlinked at `/opt/google/chrome/chrome`
4. ✅ MCP browser tools configured

### Documentation

- **Full Guide**: `frontend/tests/docs/VISUAL-TESTING-GUIDE.md`
- **Latest Report**: `frontend/tests/docs/SMOKE_TEST_REPORT.md`
- **Bug Tracker**: `frontend/tests/bugs.md`
- **Command Source**: `frontend/.claude/commands/visual.md`

### Architecture

#### Technology Stack

- **Browser**: Chromium 143.0 (Playwright build 1200)
- **Headless**: Yes (no display required)
- **Viewport**: 412×915 (Google Pixel 6)
- **Platform**: ARM64 Linux (Oracle Linux 8 / aarch64)
- **MCP Version**: @playwright/mcp@latest

#### Why Chromium?

- ✅ **ARM64 Native Support** - Works on aarch64 without GLIBCXX issues
- ✅ **Fast Execution** - Faster than Firefox on ARM64
- ✅ **Reliable Headless** - Stable without graphics dependencies
- ✅ **MCP Compatible** - Works with Playwright MCP browser tools
- ✅ **Modern DevTools** - Latest Chrome DevTools Protocol

#### Locator Strategy

Uses **semantic locators via accessibility tree**:

```javascript
// ✅ Good: Semantic ref from accessibility tree
page.getByTestId('create-room-button')  // ref=e13 from snapshot
page.getByRole('button', { name: /create/i })

// ❌ Avoid: Brittle CSS selectors
page.locator('.css-class-xyz')
page.locator('#btn-123')
```

### Example Usage

#### Run Smoke Test

```bash
/visual smoke
```

**What happens**:
1. Git branch and timestamp captured
2. Old screenshots (>5 days) deleted
3. Frontend/backend connectivity verified
4. 7-step test executed with MCP tools
5. Screenshots saved with branch+timestamp
6. Bugs documented if failures occur
7. Summary report generated

#### View Results

- **Screenshots**: http://localhost:5173/test-videos
- **Bug Report**: `frontend/tests/bugs.md`
- **Test Report**: `frontend/tests/docs/SMOKE_TEST_REPORT.md`

### Best Practices

1. **Always Start With Smoke Test**
   ```bash
   git add .
   /visual smoke
   # Fix any bugs found
   git commit -m "feat: add feature"
   ```

2. **Run Full Test Before PRs**
   ```bash
   /visual full
   # Fix all bugs
   # Re-run until all steps pass
   ```

3. **Review Bug Reports**
   - Open `frontend/tests/bugs.md`
   - View screenshot evidence
   - Fix the bug
   - Mark checkbox: `- [x]`
   - Re-run test to verify

4. **Keep Environment Healthy**
   ```bash
   pgrep -f "vite"      # Frontend should be running
   pgrep -f "nest"      # Backend should be running
   curl -s http://localhost:5173 > /dev/null && echo "Frontend OK"
   curl -s http://localhost:3001/health && echo "Backend OK"
   ```

5. **Iterative Testing**
   - Run smoke test frequently (it's fast)
   - Fix bugs immediately when found
   - Don't accumulate technical debt
   - Full test before major milestones

---

## 🚀 Future Agents

### Planned

- **Database Migration Agent** - Automate Prisma schema changes
- **Performance Testing Agent** - Load testing with k6
- **Accessibility Audit Agent** - WCAG 2.1 compliance checking
- **Security Scanning Agent** - OWASP Top 10 vulnerability scanning

### Under Consideration

- **Code Review Agent** - Automated PR review suggestions
- **Documentation Agent** - Auto-generate API docs from code
- **Deployment Agent** - CI/CD pipeline automation
- **Monitoring Agent** - Real-time error detection and alerting

---

## 📚 Resources

### Documentation

- **Visual Testing Guide**: `frontend/tests/docs/VISUAL-TESTING-GUIDE.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Feature Specs**: `specs/001-gloomhaven-multiplayer/spec.md`
- **README**: `README.md`

### External Links

- **Playwright MCP**: https://github.com/microsoft/playwright-mcp
- **Playwright Docs**: https://playwright.dev/
- **Claude Code**: https://claude.com/claude-code

---

**Last Updated**: 2025-12-04
**Version**: 1.0.0
**Status**: Production-Ready
