# Known Bugs

This file tracks known bugs found during testing.

---

## - [ ] Failed to create multiple games

**Explanation:** Could not create 4 separate games. Error: Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("Create Game")')[22m
[2m    - waiting for navigation to finish...[22m
[2m    - navigated to "http://localhost:5173/"[22m


**Steps to Recreate:**
1. Open dev site
2. Click "Create Game"
3. Fill nickname
4. Repeat in multiple tabs

**Expected Behavior:** Should be able to create multiple independent games

---

## - [ ] Failed to add second player to game

**Explanation:** Could not join second player to first game. Error: Error: browserContext.newPage: Protocol error (Browser.newPage): can't access property "userContextId", browserContext is undefined

**Steps to Recreate:**
1. Create a game
2. Note the room code
3. Open new tab and click "Join Game"
4. Enter room code and nickname
5. Click Join

**Expected Behavior:** Second player should successfully join the lobby

---

## - [ ] Character movement failed

**Explanation:** Error during character movement attempt. Error: Error: expect.toBeVisible: Target page, context or browser has been closed

**Steps to Recreate:**
1. Start game
2. Select character
3. Click movement hex

**Expected Behavior:** Character should move smoothly to selected hex

---

## - [ ] Attack execution failed

**Explanation:** Error during attack execution. Error: Error: locator.isVisible: Target page, context or browser has been closed

**Steps to Recreate:**
1. Start game
2. Initiate attack action
3. Target monster

**Expected Behavior:** Attack should execute and deal damage to target

---

## - [ ] Monster AI turn failed

**Explanation:** Error during monster turn. Error: Error: locator.isVisible: Target page, context or browser has been closed

**Steps to Recreate:**
1. Start game
2. End player turn
3. Wait for monster turn

**Expected Behavior:** Monster should take turn automatically with movement and/or attack

---

