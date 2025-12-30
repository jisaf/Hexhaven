# E2E Test Improvements - Initial Analysis

**Date:** 2025-12-06
**Branch:** main
**Status:** In Progress - Comprehensive visual testing underway

## Executive Summary

Initial code review reveals mixed test ID coverage across components. Some components have proper `data-testid` attributes while others may be missing them, leading to unreliable locators in e2e tests.

## Current State Analysis

### Components WITH Test IDs ✓
- `NicknameInput.tsx` - Has `data-testid="nickname-input"` and `data-testid="nickname-submit"`
- `RoomCodeInput.tsx` - Has `data-testid="room-code-input"` and `data-testid="join-room-button"`
- `PlayerList.tsx` - Has `data-testid="player-list"` and `data-testid="player-item"`

### Test Infrastructure
- **Backend Tests:** Contract, integration, and unit tests exist
  - Contract tests use WebSocket testing with socket.io-client
  - Integration tests cover full game flow
  - Tests are well-structured with proper setup/teardown

### Known Issues (Pre-Test)
1. **No Playwright e2e tests found** - Only backend tests exist
2. **Inconsistent test ID usage** - Some components have them, others may not
3. **No centralized e2e test suite** - Missing frontend e2e directory

## Recommended Improvements

### 1. Test ID Strategy
- **Action:** Audit all interactive components for test IDs
- **Priority:** HIGH
- **Components to check:**
  - Character selection components
  - Game board/canvas elements
  - Card selection UI
  - Start game button
  - Join game button
  - Lobby screens

### 2. Locator Patterns
Instead of fragile selectors like:
```typescript
// ❌ BAD - Fragile
await page.click('button:has-text("Create Game")')
await page.fill('input[type="text"]', 'TestPlayer')
```

Use stable test IDs:
```typescript
// ✓ GOOD - Stable
await page.click('[data-testid="create-game-button"]')
await page.fill('[data-testid="nickname-input"]', 'TestPlayer')
```

### 3. Playwright Test Structure
Create a proper e2e test suite:
```
frontend/
  tests/
    e2e/
      fixtures/
        test-users.ts
      helpers/
        game-actions.ts
        lobby-actions.ts
      specs/
        game-creation.spec.ts
        multiplayer-join.spec.ts
        session-persistence.spec.ts
        reconnection.spec.ts
```

### 4. Page Object Model
Implement POM pattern for better maintainability:
```typescript
class LobbyPage {
  constructor(private page: Page) {}

  async enterNickname(nickname: string) {
    await this.page.fill('[data-testid="nickname-input"]', nickname)
    await this.page.click('[data-testid="nickname-submit"]')
  }

  async createGame() {
    await this.page.click('[data-testid="create-game-button"]')
  }

  async joinGame(roomCode: string) {
    await this.page.fill('[data-testid="room-code-input"]', roomCode)
    await this.page.click('[data-testid="join-room-button"]')
  }

  async waitForPlayers(count: number) {
    await this.page.waitForSelector(`[data-testid="player-item"]:nth-child(${count})`)
  }
}
```

### 5. Retry Logic & Waits
Replace arbitrary timeouts with smart waits:
```typescript
// ❌ BAD
await page.waitForTimeout(5000)

// ✓ GOOD
await page.waitForSelector('[data-testid="game-board"]', { state: 'visible' })
await page.waitForLoadState('networkidle')
```

### 6. Error Handling
Add proper error context:
```typescript
try {
  await page.click('[data-testid="start-game"]', { timeout: 10000 })
} catch (error) {
  await page.screenshot({
    path: `test-videos/error-${Date.now()}.png`
  })
  throw new Error(`Failed to start game: ${error.message}`)
}
```

## Testing Strategy

### Canvas/PixiJS Testing
For game board (canvas-based):
- Use canvas screenshot comparison
- Add data attributes to canvas containers
- Test via game state API calls
- Use accessibility tree when available

### WebSocket Testing
- Maintain existing contract tests
- Add e2e tests that verify WebSocket events
- Test reconnection scenarios
- Verify multiplayer synchronization

## Next Steps (Awaiting Agent Results)

1. ⏳ **Agent Testing in Progress**
   - Player 1 agent: Comprehensive game flow testing
   - Player 2 agent: Multiplayer join and sync testing

2. 📊 **Post-Test Analysis**
   - Review agent findings
   - Categorize bugs by severity
   - Identify locator patterns that failed
   - Document flaky test scenarios

3. 🔧 **Implementation**
   - Add missing test IDs
   - Create Playwright test suite
   - Implement Page Object Models
   - Add CI/CD integration

## Test Coverage Goals

- [ ] Landing page → Create game flow
- [ ] Landing page → Join game flow
- [ ] Character selection
- [ ] Lobby with multiple players
- [ ] Game start
- [ ] Hex map rendering
- [ ] Card selection
- [ ] Movement actions
- [ ] Attack actions
- [ ] Turn completion
- [ ] Session persistence (refresh)
- [ ] Reconnection after disconnect
- [ ] Game completion
- [ ] Character progression

---

**Note:** This document will be updated with detailed findings once the comprehensive visual tests complete.
