**Traditional Playwright Test** (locator-based, automated CI/CD testing)

Run the comprehensive game flow test in headless Firefox using hardcoded locators. This is the traditional approach for automated regression testing.

**⚠️ Note**: For AI-powered visual testing that adapts to UI changes, use `/visual [task]` instead.

## Prerequisites
- Backend server running on localhost:3000
- Frontend server running on localhost:5173

## What This Tests
1. Load dev site (localhost:5173)
2. Create 4 separate games
3. Add 2 players to first game
4. Start all games
5. Select cards for players
6. Move and attack with characters
7. Verify monster AI behavior
8. Report bugs to bugs.md

## Run Command
```bash
npx playwright test tests/e2e/comprehensive-game-flow.spec.ts --config=tests/configs/playwright-firefox.config.ts
```

## Artifacts
- Videos: `test-results/*/video.webm`
- Screenshots: `test-results/*/test-failed-*.png`
- Traces: `test-results/*/trace.zip`

## When to Use
- ✅ CI/CD pipelines
- ✅ Automated regression testing
- ✅ Performance benchmarks
- ❌ Exploratory testing (use `/visual` instead)
- ❌ UI frequently changes (use `/visual` instead)

See `tests/docs/TESTING.md` for full comparison of testing approaches.
