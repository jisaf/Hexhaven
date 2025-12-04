# Hexhaven Visual Testing Report

**Test Date:** 12/4/2025, 1:53:09 AM
**Report Generated:** 12/4/2025, 1:53:09 AM

## Device Configuration

- **Device:** Google Pixel 6
- **Resolution:** 412x915
- **Browser:** Firefox (Headless)
- **User Agent:** Mozilla/5.0 (Android 12) AppleWebKit/537.36

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | 1 |
| Passed | 0 |
| Failed | 1 |
| Warnings | 0 |
| **Bugs Found** | **0** |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Test Duration:** 0.10 seconds

---

## Test Coverage

### User Story 1: Join and Play a Quick Battle (P1)
- ✓ Create game room with 6-character code
- ✓ Share room code display
- ✓ Join game with room code
- ✓ Verify real-time synchronization
- ✓ Mobile-friendly lobby interface

### User Story 2: Complete Full Scenario with Combat (P1)
- ✓ Hex grid display at mobile viewport
- ✓ Character placement on map
- ✓ Movement validation and visualization
- ✓ Attack mechanics functionality
- ✓ Monster AI responses
- ✓ Scenario completion detection
- ✓ Health/condition tracking

### User Story 3: Mobile Touch Controls (P1)
- ✓ Touch-optimized interface (Pixel 6)
- ✓ Pinch-zoom on hex grid
- ✓ Pan/scroll on mobile
- ✓ Long-press for context menus
- ✓ Swipe for card selection
- ✓ 44px minimum touch targets
- ✓ Responsive layout at 412px width
- ✓ Text readability on mobile

---

## Bugs Found


## Test Results

### ❌ Failed Tests (1)

- **Test execution** - browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/opc/.cache/ms-playwright/firefox-1497/firefox/firefox -no-remote -headless -profile /tmp/playwright_firefoxdev_profile-mdGw8p -juggler-pipe -silent
<launched> pid=411299
[pid=411299][err] XPCOMGlueLoad error for file /home/opc/.cache/ms-playwright/firefox-1497/firefox/libmozsandbox.so:
[pid=411299][err] /lib64/libstdc++.so.6: version `GLIBCXX_3.4.26' not found (required by /home/opc/.cache/ms-playwright/firefox-1497/firefox/libmozsandbox.so)
[pid=411299][err] Couldn't load XPCOM.
[pid=411299] <process did exit: exitCode=255, signal=null>
[pid=411299] starting temporary directories cleanup
Call log:
[2m  - <launching> /home/opc/.cache/ms-playwright/firefox-1497/firefox/firefox -no-remote -headless -profile /tmp/playwright_firefoxdev_profile-mdGw8p -juggler-pipe -silent[22m
[2m  - <launched> pid=411299[22m
[2m  - [pid=411299][err] XPCOMGlueLoad error for file /home/opc/.cache/ms-playwright/firefox-1497/firefox/libmozsandbox.so:[22m
[2m  - [pid=411299][err] /lib64/libstdc++.so.6: version `GLIBCXX_3.4.26' not found (required by /home/opc/.cache/ms-playwright/firefox-1497/firefox/libmozsandbox.so)[22m
[2m  - [pid=411299][err] Couldn't load XPCOM.[22m
[2m  - [pid=411299] <process did exit: exitCode=255, signal=null>[22m
[2m  - [pid=411299] starting temporary directories cleanup[22m
[2m  - [pid=411299] <gracefully close start>[22m
[2m  - [pid=411299] finished temporary directories cleanup[22m
[2m  - [pid=411299] <gracefully close end>[22m



---

**Test Framework:** Playwright (Firefox headless)
**Report Location:** undefined
**Screenshots Location:** /home/opc/hexhaven/frontend/tests/visual/results-pixel6
