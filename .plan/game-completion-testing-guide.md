# Game Completion System - Testing Guide

**Issue**: #186
**Feature**: Game Completion with Victory/Defeat Modal, Objective Tracking, and Player Statistics
**Date**: 2025-12-07
**Status**: Phase 8 - Testing Documentation

---

## Overview

This testing guide covers comprehensive manual and automated testing for the Game Completion system, which includes:
- Victory/Defeat modals
- Objective progress tracking
- Exhaustion visuals for defeated players
- Player statistics collection and display
- Database persistence of game results
- Player cleanup and room management

---

## Section 1: Pre-Test Setup

### Environment Requirements
- Node.js (latest LTS)
- PostgreSQL database running
- Two browser windows or profiles for multiplayer testing
- Developer console access

### Backend Setup
```bash
# Start backend server
npm run dev:backend

# Expected output:
# Backend server running on http://localhost:3000
# Database migrations completed
# Connected to PostgreSQL
```

### Frontend Setup
```bash
# In a new terminal, start frontend server
npm run dev

# Expected output:
# Frontend running on http://localhost:5173 (or similar)
# Hot module replacement enabled
```

### Database Preparation
```bash
# Connect to PostgreSQL
psql hexhaven

# Clear test data (optional, for fresh start)
DELETE FROM game_results WHERE created_at < NOW() - INTERVAL '1 hour';
DELETE FROM player_game_results WHERE created_at < NOW() - INTERVAL '1 hour';
DELETE FROM rooms WHERE status IN ('completed', 'defeated');

# Verify tables exist
\dt game_results
\dt player_game_results
\dt rooms
```

### Verification Checklist
- [ ] Backend running on port 3000
- [ ] Frontend accessible at localhost:5173
- [ ] Database connection successful
- [ ] Browser console shows no errors on load

---

## Section 2: Victory Scenarios

### Test 2.1: Kill All Monsters Victory

**Objective**: Verify victory triggers when all monsters are defeated

**Setup**:
1. Open two browser windows (Player A and Player B)
2. Both navigate to http://localhost:5173
3. Player A creates a new game (nickname "PlayerA")
4. Player B joins the game (nickname "PlayerB")
5. Both players see the game board loaded

**Test Steps**:
1. In Player A's browser, identify all monsters on the hex map
2. Have both players attack monsters until all are defeated
3. Attack the last monster to completion

**Expected Results**:
- [ ] "Victory!" modal appears within 500ms of last monster defeat
- [ ] Modal displays trophy emoji (🏆)
- [ ] "Victory!" title is clearly visible
- [ ] "All Enemies Defeated!" subtitle is shown
- [ ] Player statistics section displays:
  - [ ] Both player names (PlayerA, PlayerB)
  - [ ] Damage dealt by each player
  - [ ] Damage taken by each player
  - [ ] Monster kill count
  - [ ] Loot collected
- [ ] "Return to Lobby" button is visible and clickable
- [ ] Modal background is semi-transparent with dark overlay

**Verification**:
```javascript
// In browser console, verify modal state
document.querySelector('[data-testid="victory-modal"]')?.textContent
// Should contain: "Victory!" and "All Enemies Defeated!"
```

**Database Check** (in PostgreSQL):
```sql
SELECT * FROM game_results WHERE victory = true ORDER BY completed_at DESC LIMIT 1;
-- Should show: victory=true, primary_objective_completed=true
```

---

### Test 2.2: Custom Objective Victory

**Objective**: Verify victory triggers when custom objective is completed

**Setup**:
1. Create a game with specific objective (e.g., "Collect 5 loot tokens")
2. Two players join

**Test Steps**:
1. During game, collect loot tokens one by one
2. Watch progress bar update as tokens are collected
3. Collect the 5th and final token

**Expected Results**:
- [ ] Progress bar shows incremental updates (1/5, 2/5, 3/5, 4/5, 5/5)
- [ ] Milestone notifications appear at 50% and 100%
- [ ] "Victory!" modal appears automatically when objective completes
- [ ] Modal shows objective name and completion status
- [ ] Victory is recorded in database

**Database Check**:
```sql
SELECT * FROM game_results
WHERE primary_objective = 'collect_loot'
AND victory = true
ORDER BY completed_at DESC LIMIT 1;
```

---

### Test 2.3: Multiple Objectives with Bonus

**Objective**: Verify victory with both primary and secondary objectives

**Setup**:
1. Create game with primary objective: "Kill all enemies"
2. Add secondary objective: "Complete without losing health"

**Test Steps**:
1. Complete primary objective (kill all enemies)
2. Verify intermediate victory modal OR continue to secondary
3. Complete secondary objective without taking damage
4. Final victory modal appears

**Expected Results**:
- [ ] Game recognizes primary objective completion
- [ ] If secondary required, shows progress toward secondary
- [ ] Final victory shows both objectives completed
- [ ] Database shows `secondary_objectives_completed = true`

---

## Section 3: Defeat Scenarios

### Test 3.1: All Players Exhausted (Defeat)

**Objective**: Verify defeat modal appears when all players are exhausted

**Setup**:
1. Create 2-player game
2. Identify enemy damage amounts

**Test Steps**:
1. Have enemies attack players repeatedly
2. Reduce first player's health to 0 (exhausted state)
3. Player should appear grayscale with X overlay
4. "(Exhausted)" label appears in turn order
5. Reduce second player's health to 0

**Expected Results**:
- [ ] "Defeat!" modal appears when last player exhausted
- [ ] Modal displays skull emoji (💀)
- [ ] "Defeat!" title visible
- [ ] Defeat reason shown: "All heroes have fallen"
- [ ] Player statistics displayed for reference
- [ ] "Return to Lobby" button visible
- [ ] Exhausted players visible in game board before modal
- [ ] Both players appear grayscale with X overlay
- [ ] Both show "(Exhausted)" in turn order

**Visual Verification**:
1. Before defeat modal, check player avatars
2. Confirm grayscale filter applied
3. Confirm X symbol overlay visible
4. Check turn order text for "(Exhausted)"

**Database Check**:
```sql
SELECT * FROM game_results WHERE victory = false ORDER BY completed_at DESC LIMIT 1;
-- Should show: victory=false
```

---

### Test 3.2: Time Limit Exceeded (Failure Condition)

**Objective**: Verify defeat when round limit exceeded

**Setup**:
1. Create game with objective: "Complete within 5 rounds"

**Test Steps**:
1. Play through rounds normally
2. Progress through rounds 1, 2, 3, 4, 5
3. At start of round 6, failure condition should trigger

**Expected Results**:
- [ ] "Defeat!" modal appears at round 6
- [ ] Defeat reason: "Time limit exceeded" or similar
- [ ] Database shows `victory = false`
- [ ] Game results saved with failure reason

**Database Check**:
```sql
SELECT * FROM game_results
WHERE primary_objective LIKE '%round%' OR primary_objective LIKE '%time%'
ORDER BY completed_at DESC LIMIT 1;
```

---

## Section 4: Progress Tracking

### Test 4.1: Objective Progress Updates (Collect Loot)

**Objective**: Verify progress bar updates correctly as objective progresses

**Setup**:
1. Create game with "Collect 5 loot tokens" objective
2. Generate 5-10 loot tokens on the board

**Test Steps**:
1. At game start, verify objective panel shows "0/5"
2. Collect first loot token
3. Verify progress updates to "1/5" immediately
4. Collect tokens progressively
5. Watch progress bar fill at each step
6. Collect final 5th token

**Expected Results**:
- [ ] Progress text updates: 0/5 → 1/5 → 2/5 → 3/5 → 4/5 → 5/5
- [ ] Progress bar fills proportionally (each = 20% fill)
- [ ] No lag between token collection and display update
- [ ] Updates smooth and visible
- [ ] At 50% (2.5/5, so after 3rd token), milestone notification appears
- [ ] At 100% (5/5), victory modal triggers immediately

**Milestone Notifications**:
- [ ] 50% Milestone: "Halfway there!" or similar message
- [ ] 100% Complete: Victory modal

**Browser Console Check**:
```javascript
// Verify objective state in component
document.querySelector('[data-testid="objective-progress"]')?.textContent
// Should show: "5/5" or "Objective: Collect Loot (5/5)"
```

---

### Test 4.2: Progress With Simultaneous Players

**Objective**: Verify progress updates correctly when multiple players contribute

**Setup**:
1. Create game with "Kill 10 monsters" objective
2. Two players in game

**Test Steps**:
1. Player A kills 3 monsters
2. Verify progress shows 3/10
3. Player B kills 4 monsters (without waiting for Player A)
4. Verify progress shows 7/10 (3+4)
5. Player A kills remaining 3
6. Victory when 10th monster defeated

**Expected Results**:
- [ ] Progress updates from both players' actions
- [ ] Counter is accurate across simultaneous plays
- [ ] Victory triggers when combined progress reaches target
- [ ] Both players see same progress value

---

### Test 4.3: Multiple Objectives Tracking

**Objective**: Verify simultaneous tracking of primary and secondary objectives

**Setup**:
1. Primary objective: "Defeat all enemies"
2. Secondary objective: "Collect 3 key artifacts"

**Test Steps**:
1. Start game, see both objectives in sidebar
2. Defeat enemies (primary progress 1/10, 2/10, etc.)
3. Collect artifacts simultaneously (secondary 1/3, 2/3, 3/3)
4. Complete primary objective first

**Expected Results**:
- [ ] Both objectives visible in objectives panel
- [ ] Both show separate progress bars
- [ ] Primary objective: "1/10 enemies defeated" updates
- [ ] Secondary objective: "1/3 artifacts collected" updates
- [ ] Primary completion triggers victory
- [ ] Secondary completion noted in victory modal

**Modal Verification**:
- [ ] Victory modal shows: "Primary Objective: Complete ✓"
- [ ] Victory modal shows: "Secondary Objective: Complete ✓"

---

## Section 5: Player Statistics

### Test 5.1: Damage Dealt Tracking

**Objective**: Verify damage dealt is accurately tracked and displayed

**Setup**:
1. Create 2-player game
2. Start game

**Test Steps**:
1. Player A attacks monster for 5 damage
2. Note in stats panel (if visible during game)
3. Player A attacks again for 7 damage
4. Player B attacks for 4 damage
5. Continue playing until game ends

**Expected Results**:
- [ ] Damage dealt accumulates correctly
- [ ] Player A total: 5 + 7 + (any other attacks)
- [ ] Player B total: 4 + (any other attacks)
- [ ] Totals appear in completion modal
- [ ] Stats format: "Damage Dealt: 27" or similar

**Database Verification**:
```sql
SELECT player_name, damage_dealt, damage_taken
FROM player_game_results
WHERE game_id = (SELECT id FROM game_results ORDER BY created_at DESC LIMIT 1)
ORDER BY player_name;
```

---

### Test 5.2: Damage Taken Tracking

**Objective**: Verify damage taken by players is tracked

**Setup**:
1. Start 2-player game
2. Ensure enemies can attack players

**Test Steps**:
1. Let enemies attack Player A 2-3 times (total 12 damage)
2. Let enemies attack Player B 1-2 times (total 6 damage)
3. Continue game to completion

**Expected Results**:
- [ ] Player A damage taken: 12 (or expected amount)
- [ ] Player B damage taken: 6 (or expected amount)
- [ ] Both visible in completion modal
- [ ] Matches attack log from gameplay

---

### Test 5.3: Monsters Killed Count

**Objective**: Verify kill count is accurately recorded

**Setup**:
1. Start game with 10 monsters

**Test Steps**:
1. Player A kills monster #1
2. Kill count should be 1
3. Player B kills monster #2
4. Kill count should be 2
5. Continue until all monsters defeated

**Expected Results**:
- [ ] Kill count increments correctly
- [ ] Each unique monster death increments by 1
- [ ] Multiple attacks on same monster don't double-count
- [ ] Final kill count: 10
- [ ] Appears in stats as "Monsters Killed: 10"

---

### Test 5.4: Loot Collected Tracking

**Objective**: Verify loot collection is tracked

**Setup**:
1. Game with 8 loot tokens on board
2. Both players can collect

**Test Steps**:
1. Player A collects token (value 100 gold)
2. Player B collects token (value 50 gold)
3. Player A collects another (value 75 gold)
4. Continue until all collected

**Expected Results**:
- [ ] Total loot shown: 100 + 50 + 75 + ... = total
- [ ] Both direct collection and auto-collection counted
- [ ] Stats show "Loot Collected: [total amount]"
- [ ] Breakdown by player available if applicable

---

### Test 5.5: Complete Stats Modal Display

**Objective**: Verify all stats appear correctly in victory/defeat modal

**Setup**:
1. Complete any game to victory or defeat

**Test Steps**:
1. Modal appears at game end
2. Check all stat rows

**Expected Results** - Modal should display:
- [ ] **Header**: Victory/Defeat title with emoji
- [ ] **Subtitle**: Reason (e.g., "All Enemies Defeated!")
- [ ] **Section 1 - Player Stats**:
  - [ ] Column headers: "Player", "Damage", "Taken", "Killed", "Loot"
  - [ ] PlayerA row with all stats
  - [ ] PlayerB row with all stats
- [ ] **Section 2 - Objectives** (if applicable):
  - [ ] Primary objective name and completion status
  - [ ] Secondary objectives list and status
- [ ] **Button**: "Return to Lobby" button at bottom
- [ ] **Spacing**: All elements properly aligned and readable
- [ ] **Colors**: Victory (green tones) vs Defeat (red tones)

---

## Section 6: Game Cleanup

### Test 6.1: Single Player Leaves During Game

**Objective**: Verify proper state management when one player leaves

**Setup**:
1. Create game with Player A and Player B
2. Both in game board (not lobby)
3. Game in progress

**Test Steps**:
1. Player B closes browser or navigates away
2. Observe Player A's screen

**Expected Results**:
- [ ] Player A receives notification: "Player B has left the game"
- [ ] Notification appears as toast/alert message
- [ ] Player A can still play (game doesn't end)
- [ ] B's character might be marked as inactive
- [ ] Game continues normally for Player A
- [ ] UI shows "Waiting for Player B..." or similar

**Alternative Flows**:
- If game requires 2 players: Game ends with message
- If game supports single-player continuation: Allows play

---

### Test 6.2: Both Players Leave After Victory

**Objective**: Verify game cleanup and database save after completion

**Setup**:
1. Both players reach victory
2. Victory modal displayed for both

**Test Steps**:
1. Player A clicks "Return to Lobby" button
2. Player A returns to lobby/home page
3. Player B clicks "Return to Lobby" button
4. Player B returns to lobby/home page
5. Wait 2-3 seconds

**Expected Results**:
- [ ] Player A successfully returns to lobby
- [ ] Game room no longer appears in "Active Games" for Player A
- [ ] Player B successfully returns to lobby
- [ ] Game no longer visible to Player B
- [ ] Game result saved to database
- [ ] Game room removed from memory on backend
- [ ] No error messages in console

**Database Verification** (immediately after return):
```sql
-- Check game result was saved
SELECT id, victory, completed_at FROM game_results
ORDER BY completed_at DESC LIMIT 1;
-- Should show recent entry with victory=true

-- Check player results
SELECT player_name, game_id FROM player_game_results
ORDER BY created_at DESC LIMIT 2;
-- Should show both players' records
```

---

### Test 6.3: Last Player Leaves (Game Abandonment)

**Objective**: Verify cleanup when game abandoned mid-play

**Setup**:
1. Two players in game
2. Game still in progress

**Test Steps**:
1. Player A closes browser
2. Player B immediately closes browser
3. Backend should detect both disconnects

**Expected Results**:
- [ ] Room removed from active games
- [ ] No orphaned sockets remain
- [ ] Database shows no crash logs
- [ ] Backend logs indicate cleanup completion

**Backend Log Check** (in backend console):
```
[cleanup] Game room XYZ cleaned up
[cleanup] 2 players removed from memory
[success] Game data would be lost (not in completion state)
```

---

## Section 7: Database Verification

### Test 7.1: Game Results Table

**Objective**: Verify game results are properly persisted

**SQL Query**:
```sql
SELECT
  id,
  room_id,
  victory,
  primary_objective,
  primary_objective_completed,
  secondary_objectives_completed,
  completed_at,
  created_at
FROM game_results
ORDER BY completed_at DESC
LIMIT 5;
```

**Verification Checklist**:
- [ ] `id`: UUID generated for each game
- [ ] `room_id`: Matches the game room
- [ ] `victory`: TRUE for victories, FALSE for defeats
- [ ] `primary_objective`: Name of objective (e.g., "Defeat All Enemies")
- [ ] `primary_objective_completed`: TRUE/FALSE
- [ ] `secondary_objectives_completed`: TRUE/FALSE (null if none)
- [ ] `completed_at`: Timestamp accurate to completion time
- [ ] `created_at`: Timestamp of game start

---

### Test 7.2: Player Game Results Table

**Objective**: Verify individual player stats are recorded

**SQL Query**:
```sql
SELECT
  id,
  game_id,
  player_name,
  damage_dealt,
  damage_taken,
  monsters_killed,
  loot_collected,
  created_at
FROM player_game_results
WHERE game_id = (SELECT id FROM game_results ORDER BY created_at DESC LIMIT 1)
ORDER BY player_name;
```

**Verification Checklist**:
- [ ] `id`: Unique ID for each player record
- [ ] `game_id`: Foreign key to game_results
- [ ] `player_name`: Matches player who played
- [ ] `damage_dealt`: Numeric value, >= 0
- [ ] `damage_taken`: Numeric value, >= 0
- [ ] `monsters_killed`: Integer count >= 0
- [ ] `loot_collected`: Numeric value (gold/loot amount)
- [ ] One record per player who participated
- [ ] `created_at`: Timestamp of record creation

---

### Test 7.3: Objective Completion Verification

**Objective**: Verify objectives are properly recorded

**SQL Query**:
```sql
SELECT
  id,
  victory,
  primary_objective,
  primary_objective_completed,
  secondary_objectives_completed,
  completed_at
FROM game_results
WHERE primary_objective IS NOT NULL
ORDER BY completed_at DESC
LIMIT 10;
```

**Verification Checklist**:
- [ ] `primary_objective` populated with objective text
- [ ] `primary_objective_completed` matches actual completion
- [ ] Victory correlated with objective completion
- [ ] Secondary objectives tracked separately
- [ ] No NULL values where objective was active

---

### Test 7.4: Time Series Analysis

**Objective**: Verify data consistency over time

**SQL Query**:
```sql
SELECT
  DATE(completed_at) as game_date,
  COUNT(*) as games_played,
  SUM(CASE WHEN victory THEN 1 ELSE 0 END) as victories,
  SUM(CASE WHEN NOT victory THEN 1 ELSE 0 END) as defeats
FROM game_results
GROUP BY DATE(completed_at)
ORDER BY game_date DESC
LIMIT 7;
```

**Verification Checklist**:
- [ ] Victory + Defeat count = Total games
- [ ] Win rate reasonable (0-100%)
- [ ] Games tracked across days
- [ ] No data gaps

---

## Section 8: Edge Cases

### Test 8.1: Simultaneous Monster Death & Player Exhaustion

**Objective**: Verify correct outcome when last monster dies and last player exhausted simultaneously

**Setup**:
1. 2-player game
2. 1 monster remaining with 3 HP
3. Player A has 3 HP
4. Player B has 10 HP

**Test Steps**:
1. Monster attacks Player A for 3 damage (Player A exhausted)
2. Player A attacks monster for 3 damage (Monster dies)
3. Both events occur in same round

**Expected Results**:
- [ ] Victory modal appears (objectives met takes precedence)
- OR Defeat modal appears (defeat checked first)
- [ ] Behavior is consistent and deterministic
- [ ] No modal duplication or flickering
- [ ] Database shows clear result (victory or defeat)

**Recommended**: Victory should take precedence if objective complete

---

### Test 8.2: Player Disconnects During Victory Modal

**Objective**: Verify game data saved even if player disconnects during modal

**Setup**:
1. Complete game to victory
2. Victory modal displayed for both players

**Test Steps**:
1. Victory modal shows for both players
2. Player A closes browser immediately
3. Player B closes browser 5 seconds later

**Expected Results**:
- [ ] Game result saved to database before disconnect
- [ ] Both player stats recorded
- [ ] No errors in backend logs
- [ ] Subsequent loads show game in history

**Database Check**:
```sql
SELECT * FROM game_results WHERE completed_at > NOW() - INTERVAL '5 minutes';
-- Should show saved result even if players disconnected during modal
```

---

### Test 8.3: Objective Progress During Round Transition

**Objective**: Verify progress correctly updated if objective completes during round change

**Setup**:
1. Collect loot objective: 5 tokens needed
2. 4 tokens already collected
3. New round about to start

**Test Steps**:
1. In last action of round, player collects 5th token
2. Round ends
3. New round begins

**Expected Results**:
- [ ] Victory modal appears immediately (doesn't wait for new round)
- [ ] Progress shown as 5/5 before round transition
- [ ] Game doesn't enter new round state
- [ ] Result properly saved

---

### Test 8.4: Custom Objective Function Error

**Objective**: Verify graceful handling if objective evaluation function errors

**Setup**:
1. Objective with complex condition (if backend injectable)
2. Condition has potential to throw error

**Test Steps**:
1. Play game
2. Trigger condition that causes error (if reproducible)
3. Observe error handling

**Expected Results**:
- [ ] Game doesn't crash
- [ ] Error logged to console/backend
- [ ] Victory modal doesn't appear
- [ ] Game continues playable
- [ ] Objective considered incomplete on error

**Backend Log Check**:
```
[error] Objective evaluation failed for game XYZ
[error] Error: [error message]
[info] Game continued without objective update
```

---

### Test 8.5: Rapid Objective Progress Updates

**Objective**: Verify progress correctly handles multiple updates per second

**Setup**:
1. Loot collection objective (15 total tokens)
2. Configure to allow rapid collection

**Test Steps**:
1. Rapidly collect 5 tokens in succession (within 2 seconds)
2. Verify each update registered
3. UI should show final state correctly

**Expected Results**:
- [ ] All 5 collections registered (not skipped)
- [ ] Progress shows: 1/15, 2/15, 3/15, 4/15, 5/15
- [ ] Progress bar smooth (no jumping)
- [ ] No lag or UI freeze

---

## Section 9: Performance Checks

### Test 9.1: Modal Appearance Time

**Objective**: Verify completion modal appears quickly after victory/defeat

**Measurement Method**:
```javascript
// In browser console, record time from last action to modal
const startTime = performance.now();
// [Perform final action that triggers victory]
// When modal appears:
const endTime = performance.now();
console.log(`Modal appeared in ${endTime - startTime}ms`);
```

**Expected Performance**:
- [ ] Modal appears within 500ms of game completion
- [ ] No visible lag or delay
- [ ] Immediate upon final action (e.g., last monster defeated)

**Test Multiple Times**:
- [ ] Test 1: 234ms
- [ ] Test 2: 189ms
- [ ] Test 3: 412ms
- [ ] Average should be <500ms

---

### Test 9.2: Progress Bar Animation Smoothness

**Objective**: Verify progress bar updates are smooth without stuttering

**Test Steps**:
1. Start objective with visual progress bar
2. Update progress 5-10 times
3. Watch for animation smoothness

**Expected Performance**:
- [ ] Progress bar fills smoothly
- [ ] No sudden jumps or stutters
- [ ] Animation duration: ~300-500ms per update
- [ ] 60 FPS animation (no jank)

**Browser DevTools Check**:
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Record during progress updates
4. Check frame rate graph
5. Should maintain 60 FPS

---

### Test 9.3: Database Save Performance

**Objective**: Verify game results save to database quickly

**Measurement Method**:
```javascript
// Backend logs should show timing
[database] Saving game result...
[database] Game result saved in 245ms
[database] Player stats saved in 187ms
```

**Expected Performance**:
- [ ] Game result save: <1000ms
- [ ] Player stats save: <1000ms
- [ ] Combined total: <2000ms
- [ ] No blocking of UI

**Test Multiple Games**:
- [ ] Game 1: 245ms
- [ ] Game 2: 189ms
- [ ] Game 3: 301ms

---

### Test 9.4: Room Cleanup Performance

**Objective**: Verify room cleanup completes efficiently

**Setup**:
1. Complete game
2. Both players return to lobby
3. Monitor backend

**Backend Log Check**:
```
[cleanup] Starting cleanup for room ABC123
[cleanup] Removed 2 players from memory in 45ms
[cleanup] Cleared game state in 12ms
[cleanup] Updated database in 234ms
[cleanup] Room cleanup completed in 291ms
```

**Expected Performance**:
- [ ] Total cleanup: <500ms
- [ ] No hanging processes
- [ ] Backend memory freed
- [ ] Ready for new games immediately

---

## Section 10: Visual Verification Checklist

### Victory Modal Visual Elements

**Emoji & Title**:
- [ ] Trophy emoji (🏆) displayed prominently
- [ ] "Victory!" title in large, bold font
- [ ] "All Enemies Defeated!" subtitle below

**Modal Container**:
- [ ] Dark semi-transparent overlay covering background
- [ ] White/light modal box centered on screen
- [ ] Adequate padding inside modal
- [ ] Clear visual hierarchy

**Player Statistics Table**:
- [ ] Column headers visible: "Player", "Damage", "Taken", "Killed", "Loot"
- [ ] Player A data row
- [ ] Player B data row
- [ ] All numbers right-aligned for easy reading
- [ ] Grid lines or spacing between rows

**Objectives Section** (if applicable):
- [ ] "Primary Objective" label
- [ ] Objective name and completion status
- [ ] Green checkmark (✓) for completed
- [ ] Secondary objectives listed if applicable

**Button**:
- [ ] "Return to Lobby" button visible
- [ ] Button has hover effect
- [ ] Button is clearly clickable
- [ ] Button properly centered

---

### Defeat Modal Visual Elements

**Emoji & Title**:
- [ ] Skull emoji (💀) displayed prominently
- [ ] "Defeat!" title in large, bold font
- [ ] "All heroes have fallen" subtitle below

**Modal Container**:
- [ ] Dark semi-transparent overlay
- [ ] Modal box with red or dark color scheme
- [ ] Appropriate padding and spacing
- [ ] Clear visual distinction from victory

**Statistics & Objectives**:
- [ ] Same layout as victory modal
- [ ] All stats displayed for reference
- [ ] Defeat reason clearly stated

**Button**:
- [ ] "Return to Lobby" button prominent
- [ ] Clickable and responsive

---

### Exhaustion Visual Elements

**Exhausted Character Appearance**:
- [ ] Grayscale filter applied to character avatar
- [ ] X symbol overlaid on character image
- [ ] Clear visual indication of defeat
- [ ] Distinguishable from active characters

**Turn Order Display**:
- [ ] Exhausted characters shown in turn order
- [ ] "(Exhausted)" label displayed next to name
- [ ] Different color or styling (e.g., grayed out)
- [ ] Still visible in turn order (not hidden)

**Multiple Exhausted Players**:
- [ ] All exhausted players show visual effects
- [ ] Effects consistent across all players
- [ ] Clear which players are exhausted vs. active

---

### Objective Progress Display

**Progress Bar**:
- [ ] Visible on game screen
- [ ] Starts at 0%
- [ ] Fills proportionally with progress
- [ ] Color changes from gray → blue → green (or similar)
- [ ] Smooth animation when updating

**Progress Text**:
- [ ] Shows current/total (e.g., "3/5")
- [ ] Updates immediately with progress
- [ ] Large enough to read clearly
- [ ] Positioned above or inside progress bar

**Objective Name**:
- [ ] Objective description visible
- [ ] Clear what needs to be accomplished
- [ ] Example: "Collect 5 Loot Tokens"

**Milestone Notifications**:
- [ ] Notification appears at 50% (toast/banner)
- [ ] Notification appears at 100% (victory trigger)
- [ ] Notifications slide in smoothly
- [ ] Disappear after 3-5 seconds

---

### Game Board States

**Before Completion**:
- [ ] All players visible and active
- [ ] Turn order shows active players
- [ ] Objective progress visible
- [ ] No exhaustion indicators

**During Defeat Sequence**:
- [ ] First player exhausted: Shows grayscale + X
- [ ] Shows "(Exhausted)" in turn order
- [ ] Other players still active
- [ ] Objective still visible

**All Players Exhausted**:
- [ ] All players show exhaustion visuals
- [ ] Turn order shows all as "(Exhausted)"
- [ ] Defeat modal appears immediately
- [ ] Game board remains visible behind modal

**Victory State**:
- [ ] All monsters defeated (none visible on board)
- [ ] Players remain active (no exhaustion)
- [ ] Objective shows 100% complete
- [ ] Victory modal appears

---

## Testing Timeline & Sign-Off

### Quick Smoke Test (15-20 minutes)
- [ ] Test 2.1: Kill All Monsters Victory
- [ ] Test 3.1: All Players Exhausted
- [ ] Test 6.2: Both Players Leave After Victory
- [ ] Test 10: Visual Verification (critical items only)

### Full Test Run (2-3 hours)
- [ ] All Victory scenarios (Section 2)
- [ ] All Defeat scenarios (Section 3)
- [ ] Progress tracking (Section 4)
- [ ] Player statistics (Section 5)
- [ ] Game cleanup (Section 6)
- [ ] Database verification (Section 7)
- [ ] Edge cases (Section 8)
- [ ] Performance checks (Section 9)
- [ ] Complete visual verification (Section 10)

### Sign-Off Checklist
- [ ] All test cases passed
- [ ] No console errors
- [ ] Database queries verified
- [ ] Performance within targets
- [ ] Visual elements confirmed
- [ ] Edge cases handled gracefully
- [ ] Documentation complete

**Tested By**: _________________
**Date**: _________________
**Status**: ☐ PASS ☐ FAIL ☐ PARTIAL

---

## Known Limitations & Future Improvements

### Current Limitations
1. Tests assume 2-player games (1v1)
2. Custom objectives must be pre-defined
3. No automated testing framework included
4. Manual verification required for visuals

### Future Improvements
1. Add Playwright/Cypress automated tests
2. Support variable player counts (1, 2, 3+)
3. Dynamic objective creation
4. Performance benchmarking script
5. Database migration rollback tests
6. Visual regression testing

---

## Support & Troubleshooting

### Common Issues & Solutions

**Issue**: Modal doesn't appear after victory
- Check browser console for JavaScript errors
- Verify backend is sending completion event
- Check WebSocket connection is active

**Issue**: Progress bar not updating
- Refresh browser
- Check network tab for API calls
- Verify objective data in component props

**Issue**: Exhaustion visuals not showing
- Verify CSS classes applied to player elements
- Check browser inspector for grayscale filter
- Confirm X overlay image loaded

**Issue**: Database queries fail
- Verify PostgreSQL is running
- Check database credentials
- Run migrations: `npm run migrate`

**Issue**: Performance tests timeout
- Check browser/backend resource usage
- Look for memory leaks in DevTools
- Restart services if needed

---

## Appendix: Quick Command Reference

### Backend Commands
```bash
# Start development server
npm run dev:backend

# Run migrations
npm run migrate

# Connect to database
psql hexhaven

# Check server logs
npm run dev:backend 2>&1 | tee backend.log
```

### Frontend Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Check console
F12 in browser → Console tab
```

### Useful SQL Queries

**Last 5 games**:
```sql
SELECT id, victory, completed_at FROM game_results ORDER BY completed_at DESC LIMIT 5;
```

**Win rate**:
```sql
SELECT
  COUNT(*) as total_games,
  SUM(CASE WHEN victory THEN 1 ELSE 0 END) as wins,
  ROUND(100.0 * SUM(CASE WHEN victory THEN 1 ELSE 0 END) / COUNT(*), 1) as win_rate
FROM game_results;
```

**Clear test data**:
```sql
DELETE FROM game_results WHERE created_at < NOW() - INTERVAL '1 hour';
DELETE FROM player_game_results WHERE created_at < NOW() - INTERVAL '1 hour';
```

---

## Document Info
- **Created**: 2025-12-07
- **Issue**: #186
- **Status**: Phase 8 - Testing Documentation Complete
- **Version**: 1.0
