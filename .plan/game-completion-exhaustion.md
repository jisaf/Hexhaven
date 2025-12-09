# Implementation Plan: Game Completion and Player Exhaustion (Issue #186)

## Overview
Implement comprehensive game completion mechanics including character exhaustion handling, monster death management, scenario objective checking at round boundaries, and victory/defeat UI with "Return to Lobby" functionality.

## Context Analysis

### Current State
- **Character Exhaustion**: Partially implemented
  - `Character.exhausted` property exists (character.model.ts:239-242)
  - Exhaustion triggered when health <= 0
  - Turn order service skips exhausted characters (turn-order.service.ts:80-105)
  - **Missing**: No explicit exhaustion from card depletion, no UI indication during gameplay

- **Monster Death**: Fully functional
  - `Monster.isDead` automatically set when health <= 0 (monster.model.ts:175-177)
  - Dead monsters filtered from turn order
  - Loot tokens spawn correctly (game.gateway.ts:1489-1539)
  - Dead monsters removed from state (game.gateway.ts:1542-1546)

- **Scenario Completion Detection**: Partially implemented
  - `ScenarioService.checkScenarioCompletion()` exists (scenario.service.ts:244-277)
  - Checks:
    - All players exhausted → Defeat
    - All monsters dead → Victory
    - Custom objectives marked TODO (line 270)
  - Called after monster deaths and turn advancement
  - **Missing**: Not checked at round boundaries, incomplete payload data

- **Frontend Completion UI**: Exists but not wired
  - `ScenarioCompleteModal` component fully built (ScenarioCompleteModal.tsx)
  - Accepts victory/defeat, loot, experience, player stats
  - Has "Return to Lobby" button handler
  - **Missing**: No WebSocket event listener in GameBoard, no player stat tracking

### Architecture Gaps
1. No round-end completion check (only after attacks/turns)
2. No player statistics tracking (damage dealt, damage taken, monsters killed)
3. Frontend doesn't listen to `scenario_completed` WebSocket event
4. No clear character exhaustion from card depletion mechanics
5. No "Return to Lobby" flow from game completion

## Implementation Strategy

### Phase 1: Backend - Round-End Completion Checks
**Goal**: Ensure game completion is evaluated at every round boundary, not just after attacks.

**Changes Required**:
1. **File**: `backend/src/websocket/game.gateway.ts`
   - **Location**: `advanceTurnAfterMonsterActivation()` method (around line 1856)
   - **Action**: Move `checkScenarioCompletion()` call to AFTER round boundary detection
   - **Logic**:
     ```
     if (isNewRound) {
       // Round completed - check game objectives
       this.checkScenarioCompletion(roomCode);
       // Then start new round
       this.startNewRound(roomCode);
     } else {
       // Continue turn order
       // ... existing logic
     }
     ```

2. **File**: `backend/src/services/turn-order.service.ts`
   - **Location**: Add new method `isRoundComplete()`
   - **Logic**: Returns `true` when `nextIndex === 0 && currentIndex !== 0`
   - **Rationale**: Centralize round boundary detection logic

### Phase 2: Backend - Enhanced Scenario Completion
**Goal**: Improve completion detection with better data and scenario objective support.

**Changes Required**:
1. **File**: `backend/src/websocket/game.gateway.ts`
   - **Location**: `checkScenarioCompletion()` method (line 2455)
   - **Enhancements**:
     - Store scenario reference in room state (add `roomScenarios: Map<string, Scenario>`)
     - Calculate actual loot collected from `roomLootTokens`
     - Track game start time for completion time calculation
     - Pass real scenario object to `scenarioService.checkScenarioCompletion()`

2. **File**: `backend/src/models/game-room.model.ts`
   - **Add fields**:
     - `startedAt: Date | null` - Game start timestamp
     - `scenarioId: string | null` - Reference to active scenario

3. **File**: `backend/src/services/scenario.service.ts`
   - **Location**: `checkScenarioCompletion()` method (line 244)
   - **Enhancement**: Add custom objective checking framework
   - **Logic**:
     ```typescript
     // After standard win/loss checks
     if (scenario.objectivePrimary) {
       const objectiveStatus = this.checkObjective(scenario.objectivePrimary, gameState);
       if (objectiveStatus.complete) {
         return { isComplete: true, victory: true, reason: objectiveStatus.reason };
       }
     }
     ```
   - **Add method**: `checkObjective(objective: string, gameState: any)` for extensibility

### Phase 3: Backend - Player Statistics Tracking
**Goal**: Track player combat statistics for end-game display.

**Changes Required**:
1. **File**: `backend/src/websocket/game.gateway.ts`
   - **Add Map**: `roomPlayerStats: Map<string, Map<string, PlayerStats>>`
   - **Interface**:
     ```typescript
     interface PlayerStats {
       damageDealt: number;
       damageTaken: number;
       monstersKilled: number;
       cardsLost: number;
       // Future: healingDone, lootCollected, etc.
     }
     ```

2. **Tracking Points**:
   - **Damage Dealt**: `handleAttackTarget()` - increment when attack resolves
   - **Damage Taken**: `handleAttackTarget()` - increment for character targets
   - **Monsters Killed**: `handleAttackTarget()` - increment when `targetDead && isMonsterTarget`
   - **Cards Lost**: Track in card selection/rest mechanics (future)

3. **Payload Enhancement**: Update `ScenarioCompletedPayload` to include player stats
   - **File**: `shared/types/events.ts`
   - **Add field**: `playerStats: Array<{ playerId, damageDealt, damageTaken, monstersKilled, cardsLost }>`

### Phase 4: Backend - Exhaustion Improvements
**Goal**: Handle exhaustion gracefully and skip turns properly.

**Changes Required**:
1. **File**: `backend/src/services/turn-order.service.ts`
   - **Enhancement**: `getNextLivingEntityIndex()` already skips exhausted characters (line 91)
   - **Verify**: Ensure exhausted characters don't block turn advancement

2. **File**: `backend/src/websocket/game.gateway.ts`
   - **Add**: Broadcast `character_exhausted` event when exhaustion occurs
   - **Event Payload**:
     ```typescript
     interface CharacterExhaustedPayload {
       characterId: string;
       characterName: string;
       reason: 'health' | 'cards' | 'manual';
     }
     ```
   - **Trigger Points**:
     - After `takeDamage()` when `isDead` becomes true
     - After card depletion (future mechanic)

### Phase 5: Frontend - Scenario Completion UI Integration
**Goal**: Wire `scenario_completed` event to display victory/defeat modal.

**Changes Required**:
1. **File**: `frontend/src/pages/GameBoard.tsx`
   - **Add State**: `const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);`
   - **Add Effect**: Listen for `scenario_completed` WebSocket event
   ```typescript
   useEffect(() => {
     const handleScenarioComplete = (payload: ScenarioCompletedPayload) => {
       const result: ScenarioResult = {
         victory: payload.victory,
         scenarioName: gameState.scenario?.name || 'Unknown Scenario',
         roundsCompleted: gameState.currentRound || 0,
         lootCollected: payload.loot.reduce((sum, p) => sum + p.gold, 0),
         experienceGained: payload.experience,
         goldEarned: payload.loot.reduce((sum, p) => sum + p.gold, 0),
         objectivesCompleted: payload.victory ? [gameState.scenario?.objectivePrimary] : [],
         playerStats: payload.playerStats.map(mapPlayerStats)
       };
       setScenarioResult(result);
     };

     websocketService.on('scenario_completed', handleScenarioComplete);
     return () => websocketService.off('scenario_completed', handleScenarioComplete);
   }, [gameState]);
   ```

2. **File**: `frontend/src/pages/GameBoard.tsx`
   - **Add Modal Render**:
   ```tsx
   {scenarioResult && (
     <ScenarioCompleteModal
       result={scenarioResult}
       onClose={() => setScenarioResult(null)}
       onReturnToLobby={handleReturnToLobby}
       onPlayAgain={handlePlayAgain}
     />
   )}
   ```

3. **Add Handlers**:
   - `handleReturnToLobby()`: Navigate to '/', clean up game session
   - `handlePlayAgain()`: Emit `restart_scenario` event (future feature)

### Phase 6: Frontend - Exhaustion Visual Feedback
**Goal**: Show clear visual indication when characters are exhausted.

**Changes Required**:
1. **File**: `frontend/src/game/CharacterSprite.ts`
   - **Enhancement**: Add visual indicator for exhausted state
   - **Options**:
     - Grayscale filter on sprite
     - "X" overlay or skull icon
     - Reduced opacity (50%)

2. **File**: `frontend/src/components/game/TurnStatus.tsx`
   - **Enhancement**: Show "(Exhausted)" next to character name in turn order
   - **Skip Display**: Visually indicate skipped turns

### Phase 7: Testing & Edge Cases
**Goal**: Ensure robust handling of all game-ending scenarios.

**Test Scenarios**:
1. **All Monsters Defeated**: Victory modal appears with correct stats
2. **All Players Exhausted**: Defeat modal appears with correct stats
3. **Mixed Exhaustion**: Game continues with only living characters
4. **Last Player Exhausts Mid-Round**: Defeat triggers immediately
5. **Last Monster Dies Mid-Round**: Victory triggers immediately
6. **Round Boundary**: Completion check happens before new round starts
7. **Reconnection After Completion**: Modal reappears for late joiners
8. **Return to Lobby**: Proper cleanup, no memory leaks

**Edge Cases to Handle**:
- Simultaneous character death and monster death (who wins?)
  - **Solution**: Check player exhaustion first (defeat priority)
- Custom objectives not met but all monsters dead
  - **Solution**: Victory if monsters dead OR objective met
- Player disconnects during completion modal
  - **Solution**: Store completion state, reshowmodal on reconnect

## File Modification Summary

### Backend Files
1. `backend/src/websocket/game.gateway.ts` - **MAJOR CHANGES**
   - Add round-end completion check
   - Add player stats tracking
   - Enhance completion payload
   - Store scenario references
   - Emit exhaustion events

2. `backend/src/services/scenario.service.ts` - **MINOR CHANGES**
   - Add custom objective checking framework
   - Enhance completion logic

3. `backend/src/models/game-room.model.ts` - **MINOR CHANGES**
   - Add `startedAt`, `scenarioId` fields

4. `backend/src/services/turn-order.service.ts` - **MINOR CHANGES**
   - Add `isRoundComplete()` helper method

5. `shared/types/events.ts` - **MINOR CHANGES**
   - Enhance `ScenarioCompletedPayload` interface
   - Add `CharacterExhaustedPayload` interface

### Frontend Files
1. `frontend/src/pages/GameBoard.tsx` - **MAJOR CHANGES**
   - Add WebSocket listener for `scenario_completed`
   - Add state for scenario result
   - Render ScenarioCompleteModal
   - Add return to lobby handler

2. `frontend/src/game/CharacterSprite.ts` - **MINOR CHANGES**
   - Add exhausted visual state

3. `frontend/src/components/game/TurnStatus.tsx` - **MINOR CHANGES**
   - Display exhausted indicators

## Implementation Order (Recommended)

### Sprint 1: Core Backend Logic (High Priority)
1. ✅ Round-end completion checks (Phase 1)
2. ✅ Enhanced scenario completion (Phase 2)
3. ✅ Exhaustion improvements (Phase 4)

### Sprint 2: Statistics & Tracking (Medium Priority)
4. ✅ Player stats tracking (Phase 3)
5. ✅ Enhanced completion payload (Phase 3)

### Sprint 3: Frontend Integration (High Priority)
6. ✅ Scenario completion UI wiring (Phase 5)
7. ✅ Return to lobby flow (Phase 5)

### Sprint 4: Polish & Visuals (Medium Priority)
8. ✅ Exhaustion visual feedback (Phase 6)
9. ✅ Testing & edge cases (Phase 7)

## Success Criteria
- [x] Games end when all monsters are defeated (victory)
- [x] Games end when all players are exhausted (defeat)
- [x] Character turns are skipped when exhausted
- [x] Monster turns are skipped when dead
- [x] Completion check occurs at end of every round
- [x] Victory/defeat modal displays with correct data
- [x] "Return to Lobby" button works without errors
- [x] Player statistics are accurately tracked and displayed
- [x] Exhausted characters have clear visual indication
- [x] Custom objectives framework is extensible for future scenarios

## Future Enhancements (Out of Scope)
- Campaign completion tracking
- Character retirement on successful scenarios
- Unlocking new scenarios/characters
- Scenario replay functionality
- Advanced objectives (collect items, protect NPCs, reach location)
- Card exhaustion mechanics (long rest, card loss)
- Victory/defeat animations and sound effects

## Risk Mitigation
- **Risk**: Completion check triggers multiple times
  - **Mitigation**: Add completion flag to room state, check before broadcasting
- **Risk**: Player stats don't persist after game end
  - **Mitigation**: Store in database with game result (future enhancement)
- **Risk**: Frontend modal doesn't close properly
  - **Mitigation**: Add cleanup in modal's onClose handler
- **Risk**: Exhausted characters can still take actions
  - **Mitigation**: Add exhaustion validation in all action handlers

## Dependencies
- Existing character exhaustion logic (character.model.ts)
- Existing monster death logic (monster.model.ts)
- Existing scenario service (scenario.service.ts)
- Existing ScenarioCompleteModal component (ScenarioCompleteModal.tsx)
- WebSocket event infrastructure (websocket.service.ts)

## Notes
- This implementation builds on solid existing foundations
- Most core mechanics already work, just need wiring and enhancement
- ScenarioCompleteModal is already fully built and styled
- Player stats tracking is the most complex new feature
- Custom objectives framework enables future scenario complexity
