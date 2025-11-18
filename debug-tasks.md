# Debug Tasks for Hexhaven

## Issue Analysis Summary

Debug logs from 2025-11-18 reveal **3 main issue categories**:

### 1. React setState Violations (Critical)
Multiple errors indicating state updates during render in:
- `Lobby` component
- `PlayerList` component
- `CharacterSelect` component
- `ScenarioSelectionPanel` and `ScenarioCard` components
- `GameBoard` component

**Root cause**: Calling `setState()` while rendering other components. This typically happens when state updates occur in useEffect without proper dependency arrays, or when parent components update shared state during render.

**Reference**: https://react.dev/link/setstate-in-render

### 2. Missing i18n Translations (High Priority)
Hundreds of missing translation keys across 4 sections:
- **Lobby keys** (title, welcome, createRoom, joinRoom, roomCode, copyRoomCode, youAreHost, startGame, playersNeedToSelect, players, connectionStatus, ready, waitingForPlayer, loadingRooms, noActiveGames, creating, or)
- **Character keys** (Brute, Tinkerer, Spellweaver, Scoundrel, Cragheart, Mindthief - both name and description)
- **Scenario keys** (selectScenario, difficulty, objective, selected, loading)
- **Game keys** (title, opponentTurn, connection.connected, leaveGame)

**Impact**: UI displays key names instead of actual translations.

### 3. WebSocket Race Conditions (Minor)
- "Cannot emit ws_connected: WebSocket not connected"
- "WebSocket already connected"

**Issue**: Connection state isn't properly synchronized across components.

---

## Tasks

### React setState Fixes
- [ ] Fix React setState errors in Lobby component
- [ ] Fix React setState errors in PlayerList component
- [ ] Fix React setState errors in CharacterSelect component
- [ ] Fix React setState errors in ScenarioSelectionPanel and ScenarioCard components
- [ ] Fix React setState errors in GameBoard component

### i18n Translation Fixes
- [ ] Add missing i18n translations for lobby section
- [ ] Add missing i18n translations for characters section
- [ ] Add missing i18n translations for scenario section
- [ ] Add missing i18n translations for game section

### WebSocket Fixes
- [ ] Fix WebSocket connection state management race conditions

---

## Next Steps
1. Investigate each component with setState violations to identify improper state updates
2. Populate translation files with missing keys
3. Review WebSocket connection lifecycle and state synchronization
