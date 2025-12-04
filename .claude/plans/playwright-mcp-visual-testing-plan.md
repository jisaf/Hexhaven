# Implementation Plan: Reliable Playwright MCP Visual Testing with Firefox

**Created:** December 4, 2025
**Status:** Draft - Awaiting User Approval
**Goal:** Create reliable visual testing system using Playwright MCP with Firefox headless that saves videos and generates bug reports

---

## Problem Analysis

### Current State
- ✅ Playwright MCP server is running (`@playwright/mcp@latest`)
- ✅ Test infrastructure exists (`/visual` command, bugs.md template, test-videos folder)
- ✅ Frontend (localhost:5173) and backend (localhost:3001) are running
- ✅ Playwright config is set for Firefox and Pixel 6
- ❌ **Blocking Issue**: Playwright's bundled Firefox requires GLIBCXX_3.4.26
- ❌ **Current System**: Oracle Linux 8 has GLIBCXX_3.4.25 (glibc 2.28)
- ❌ **System Firefox**: Missing libGL.so.1 for headless mode

### Root Cause
ARM64 Playwright binaries are compiled against newer glibc than available on Oracle Linux 8. System needs either:
1. Upgraded glibc/libstdc++ to support GLIBCXX_3.4.26
2. System Firefox with proper graphics libraries
3. Alternative browser approach (Chromium, WebKit)

---

## Proposed Solutions

### Option 1: Upgrade System Libraries (Recommended)

**What**: Upgrade libstdc++ to version supporting GLIBCXX_3.4.26

**Steps**:
1. Install Developer Toolset 11 (provides gcc 11 with newer libstdc++)
2. Update library path to use newer version
3. Test Playwright Firefox launch
4. Implement visual testing system

**Advantages**:
- ✅ Uses official Playwright Firefox binary
- ✅ Best compatibility with Playwright MCP
- ✅ No code changes needed
- ✅ Future-proof for Playwright updates

**Disadvantages**:
- ⚠️ Requires sudo access
- ⚠️ System-wide change
- ⚠️ ~200MB download

**Commands to run**:
```bash
# Install Developer Toolset 11
sudo dnf install -y gcc-toolset-11

# Enable it for current session
scl enable gcc-toolset-11 bash

# Or add to .bashrc for permanent
echo "source /opt/rh/gcc-toolset-11/enable" >> ~/.bashrc

# Test
strings /opt/rh/gcc-toolset-11/root/usr/lib64/libstdc++.so.6 | grep GLIBCXX_3.4.26

# Run Playwright with newer libraries
LD_LIBRARY_PATH=/opt/rh/gcc-toolset-11/root/usr/lib64:$LD_LIBRARY_PATH npx playwright test
```

**Estimated Time**: 30 minutes

---

### Option 2: Install Graphics Libraries for System Firefox

**What**: Install mesa-libGL and dependencies for system Firefox headless mode

**Steps**:
1. Install mesa-libGL package
2. Configure environment for headless rendering
3. Update Playwright to use system Firefox
4. Implement visual testing

**Advantages**:
- ✅ Uses system Firefox (already installed)
- ✅ Lighter weight solution
- ✅ No glibc upgrade needed

**Disadvantages**:
- ⚠️ System Firefox may have version compatibility issues
- ⚠️ May need virtual display (Xvfb)
- ⚠️ Not officially supported by Playwright

**Commands**:
```bash
# Install graphics libraries
sudo dnf install -y mesa-libGL mesa-dri-drivers xorg-x11-server-Xvfb

# Test with system Firefox
PLAYWRIGHT_FIREFOX_EXECUTABLE_PATH=/usr/bin/firefox \
LD_LIBRARY_PATH=/usr/lib64 \
npx playwright test --browser=firefox
```

**Estimated Time**: 20 minutes

---

### Option 3: Use Chromium Instead (Fallback)

**What**: Switch to Chromium which may have better ARM64 support

**Steps**:
1. Install Playwright Chromium
2. Update test configuration
3. Modify `/visual` command
4. Implement visual testing

**Advantages**:
- ✅ May work out of the box on ARM64
- ✅ Chrome DevTools Protocol well-supported
- ✅ Faster execution

**Disadvantages**:
- ❌ User specifically requested Firefox
- ⚠️ Different rendering engine
- ⚠️ May have same GLIBCXX issue

**Commands**:
```bash
# Try Chromium
npx playwright install chromium
npx playwright test --browser=chromium
```

**Estimated Time**: 15 minutes

---

## Recommended Implementation: Option 1

### Phase 1: Environment Setup (30 min)

**Task 1.1: Install Developer Toolset 11**
```bash
sudo dnf install -y gcc-toolset-11
```

**Task 1.2: Configure Environment**
- Add to ~/.bashrc: `source /opt/rh/gcc-toolset-11/enable`
- Or create wrapper script for Playwright commands

**Task 1.3: Verify Firefox Launch**
```bash
source /opt/rh/gcc-toolset-11/enable
node -e "const { firefox } = require('@playwright/test'); \
firefox.launch({headless: true}).then(b => { \
  console.log('✓ Firefox works!'); return b.close(); \
});"
```

---

### Phase 2: Create Visual Testing Skill (45 min)

**Task 2.1: Create `/visual` Slash Command Handler**

Location: `/home/opc/hexhaven/frontend/.claude/skills/visual-testing.md`

Purpose:
- Executes actual Playwright MCP visual tests
- Uses accessibility tree analysis (no hardcoded locators)
- Records videos to `/frontend/public/test-videos/`
- Generates bug reports in `/frontend/tests/bugs.md`

Implementation:
- Launch Firefox headless with Playwright
- Navigate to localhost:5173
- Use semantic locators (getByRole, getByText)
- Record all interactions
- Capture screenshots on each major action
- Save video with timestamp
- Parse errors and format as bugs

**Task 2.2: Create Bug Report Generator**

Purpose:
- Parses test failures
- Formats according to bugs.md template
- Appends to existing bugs.md
- Links to video evidence

Template Format (from existing bugs.md):
```markdown
## - [ ] [Bug Title]

**Explanation:** [Error description]

**Steps to Recreate:**
1. [Step 1]
2. [Step 2]

**Expected Behavior:** [What should happen]

**Video:** [Link to test-videos/filename.webm]
```

**Task 2.3: Create Video Management**

- Save videos to `/frontend/public/test-videos/`
- Naming: `{test-name}_{timestamp}.webm`
- Auto-cleanup videos older than 7 days
- Generate video index page

---

### Phase 3: Implement Testing Flow (60 min)

**Task 3.1: Create Comprehensive Test Journey**

Test Sequence (matching existing test structure):
1. **Page Load** - Navigate and verify landing page
2. **Game Creation** - Click create, enter nickname, verify lobby
3. **Multiplayer Join** - Open second context, join game, verify both players
4. **Character Selection** - Select characters, verify ready states
5. **Game Start** - Start game, verify hex grid renders
6. **Card Selection** - Select ability cards, verify initiative order
7. **Movement** - Move character, verify position updates
8. **Combat** - Attack monster, verify damage dealt
9. **Monster AI** - End turn, verify monster takes action
10. **Scenario Complete** - Verify win/loss conditions

Each step:
- Take screenshot
- Verify expected elements present
- Log to video
- On failure: capture detailed state and append to bugs.md

**Task 3.2: Implement Pixel 6 Testing**

- Viewport: 412×915px
- Touch simulation
- Mobile user agent
- Orientation testing (portrait/landscape)

**Task 3.3: Error Handling**

- Graceful failure on timeout
- Screenshot on every error
- Detailed error logging
- Video always saved even on crash

---

### Phase 4: Integration (30 min)

**Task 4.1: Update `/visual` Command**

Current: Stub description
New: Fully functional execution

Behavior:
```bash
# Run full test suite
/visual

# Test specific feature
/visual game creation
/visual combat system
```

Execution:
1. Source gcc-toolset-11 environment
2. Launch Playwright with Firefox
3. Run test journey
4. Save video to public/test-videos/
5. Generate bug report
6. Return summary with links

**Task 4.2: Update TESTING.md**

Document:
- Environment requirements (gcc-toolset-11)
- How to run /visual command
- Where videos are saved
- Bug report format
- Troubleshooting steps

**Task 4.3: Create Helper Scripts**

`test-visual.sh`:
```bash
#!/bin/bash
source /opt/rh/gcc-toolset-11/enable
cd /home/opc/hexhaven/frontend
node tests/visual/hexhaven-visual-test.cjs "$@"
```

---

## Deliverables

### Files to Create

1. **Skill File**: `.claude/skills/visual-testing.md`
   - Comprehensive visual testing logic
   - Bug report generation
   - Video management

2. **Test Script**: `frontend/tests/visual/run-visual-test.cjs`
   - Main test execution
   - Uses Playwright Firefox
   - Records video
   - Generates bugs.md entries

3. **Helper Script**: `frontend/test-visual.sh`
   - Environment wrapper
   - Single command execution

4. **Documentation Update**: `frontend/tests/docs/TESTING.md`
   - Setup instructions
   - Usage guide
   - Troubleshooting

### Configuration Updates

1. **Playwright Config**: Add video recording settings
2. **Package.json**: Add npm script for visual testing
3. **README**: Link to visual testing docs

---

## Testing Strategy

### Test the Solution

After implementation:

```bash
# 1. Test environment
source /opt/rh/gcc-toolset-11/enable
npx playwright --version

# 2. Test Firefox launch
node -e "require('@playwright/test').firefox.launch({headless:true}).then(b=>b.close())"

# 3. Run visual test
/visual

# 4. Verify outputs
ls -lh frontend/public/test-videos/*.webm
cat frontend/tests/bugs.md
```

Expected Results:
- ✅ Video file created in test-videos/
- ✅ Bugs.md updated with any issues found
- ✅ Screenshots in results directory
- ✅ Test completes without crashes

---

## Alternatives Considered

### Why Not Puppeteer?
- ❌ Less robust than Playwright
- ❌ No built-in video recording
- ❌ Weaker mobile emulation

### Why Not Selenium?
- ❌ Slower execution
- ❌ More complex setup
- ❌ Less modern API

### Why Not WebDriver?
- ❌ Requires separate driver binaries
- ❌ More configuration overhead

### Why Not Jest + JSDOM?
- ❌ Not real browser testing
- ❌ No visual verification
- ❌ Can't test actual rendering

---

## Risk Mitigation

### Risk 1: gcc-toolset-11 conflicts with system packages
- **Mitigation**: Use scl enable (Software Collections) for isolated environment
- **Fallback**: Use LD_LIBRARY_PATH for specific commands only

### Risk 2: Firefox still won't launch after upgrade
- **Mitigation**: Option 2 (system Firefox) or Option 3 (Chromium)
- **Fallback**: Manual testing with screenshots

### Risk 3: Video recording fails
- **Mitigation**: Screenshots still captured
- **Fallback**: Trace recording as alternative

### Risk 4: Test flakiness
- **Mitigation**: Retry logic with exponential backoff
- **Fallback**: Manual test script execution

---

## Success Criteria

### Must Have
- ✅ Firefox launches successfully with Playwright
- ✅ Videos saved to frontend/public/test-videos/
- ✅ Bugs appended to frontend/tests/bugs.md
- ✅ `/visual` command works reliably
- ✅ No fake unit tests - actual browser testing

### Should Have
- ✅ Test runs on Pixel 6 viewport (412×915)
- ✅ Screenshots captured at each step
- ✅ Accessibility tree analysis
- ✅ Semantic locators (no hardcoded IDs)
- ✅ Video auto-cleanup after 7 days

### Nice to Have
- ⚪ Parallel test execution
- ⚪ Visual diff comparison
- ⚪ Performance metrics
- ⚪ CI/CD integration

---

## Timeline

**Option 1 (Recommended)**: 2-3 hours total
- Phase 1 (Environment): 30 minutes
- Phase 2 (Skill Creation): 45 minutes
- Phase 3 (Testing Flow): 60 minutes
- Phase 4 (Integration): 30 minutes
- Testing & Fixes: 15 minutes

**Option 2 (System Firefox)**: 1.5-2 hours
**Option 3 (Chromium)**: 1-1.5 hours

---

## Questions for User

Before proceeding, please confirm:

1. **Can I install gcc-toolset-11?** (Requires sudo)
   - [ ] Yes, proceed with Option 1
   - [ ] No, try Option 2 or 3

2. **Test scope preferences:**
   - [ ] Full game flow (10 steps, ~5 min test)
   - [ ] Quick smoke test (4 steps, ~1 min test)
   - [ ] Custom (specify steps)

3. **Video retention:**
   - [ ] Keep all videos
   - [ ] Auto-cleanup after 7 days
   - [ ] Keep only failed test videos

4. **Bug report format:**
   - [ ] Use existing bugs.md template
   - [ ] Create new format
   - [ ] Markdown report only (no bugs.md)

---

## Implementation Notes

### Why This Approach?

1. **Real Browser Testing**: Not unit tests or mocks
2. **Reliable**: Uses official Playwright APIs
3. **Maintainable**: Semantic locators adapt to UI changes
4. **Evidence-based**: Videos prove bugs exist
5. **Template-driven**: Consistent bug reports

### Future Enhancements

- Visual regression testing (Percy/Chromatic)
- CI/CD integration (GitHub Actions)
- Cross-browser testing (WebKit)
- Performance profiling
- Accessibility auditing

---

**Ready to proceed?** Choose an option and I'll implement it.
