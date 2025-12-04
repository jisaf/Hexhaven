# Known Bugs

This file tracks known bugs found during testing.

---

## - [ ] Dev site failed to load

**Explanation:** The development site at localhost:5173 failed to load. Error: Error: page.goto: NS_ERROR_CONNECTION_REFUSED
Call log:
[2m  - navigating to "http://localhost:5173/", waiting until "load"[22m


**Steps to Recreate:**
1. Navigate to http://localhost:5173
2. Wait for page to load

**Expected Behavior:** Home page should load with "Create Game" button visible

---

## - [ ] Failed to create multiple games

**Explanation:** Could not create 4 separate games. Error: Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("Create Game")')[22m
[2m    - waiting for navigation to finish...[22m
[2m    - navigated to "http://localhost:5173/"[22m


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

## - [ ] Failed to start games

**Explanation:** Could not start all 4 games. Error: Error: locator.click: Target page, context or browser has been closed

**Steps to Recreate:**
1. Create games
2. Select characters
3. Click "Start Game"

**Expected Behavior:** All games should transition to game board after starting

---

## - [ ] Card selection failed

**Explanation:** Could not complete card selection. Error: Error: expect.toBeVisible: Target page, context or browser has been closed

**Steps to Recreate:**
1. Start a game
2. Wait for card selection panel
3. Click two cards
4. Click confirm

**Expected Behavior:** Players should be able to select and confirm two cards

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

## - [ ] Page failed to load

**Explanation:** The application page did not load successfully. Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
[2m  - navigating to "http://localhost:5173/", waiting until "networkidle"[22m


**Steps to Recreate:**
1. Navigate to http://localhost:5173
2. Wait for page to load

**Expected Behavior:** Page should load with title and content visible

**Video:** ../public/test-videos/9a92752db00f36f59b7d8508a2c833bd.webm

**Found:** 2025-12-04T10:39:29.812Z

---


## - [ ] Game creation flow failed

**Explanation:** Could not create a game or reach game creation form. Error: Create Game button not found

**Steps to Recreate:**
1. Click "Create Game" button
2. Wait for nickname input

**Expected Behavior:** Nickname input should appear after clicking Create Game

**Video:** ../public/test-videos/9a92752db00f36f59b7d8508a2c833bd.webm

**Found:** 2025-12-04T10:39:29.910Z

---


## - [ ] Nickname submission failed

**Explanation:** Could not submit nickname and reach lobby. Error: locator.fill: Timeout 10000ms exceeded.
Call log:
[2m  - waiting for getByPlaceholder(/nickname|name/i).first()[22m


**Steps to Recreate:**
1. Enter nickname "Test Player"
2. Click submit button
3. Wait for lobby

**Expected Behavior:** Should reach lobby with room code displayed

**Video:** ../public/test-videos/9a92752db00f36f59b7d8508a2c833bd.webm

**Found:** 2025-12-04T10:39:40.012Z

---


## - [ ] Lobby not displayed correctly

**Explanation:** Lobby page did not render properly

**Steps to Recreate:**
1. Create game
2. Enter nickname
3. View lobby

**Expected Behavior:** Lobby should show room code and player list

**Video:** ../public/test-videos/9a92752db00f36f59b7d8508a2c833bd.webm

**Found:** 2025-12-04T10:39:42.115Z

---


## - [ ] Create Game button not clickable - Login link intercepts clicks

**Explanation:** The Create Game button cannot be clicked because the Login navigation link is intercepting pointer events. Error: TimeoutError: locator.click: Timeout 5000ms exceeded. Element is visible and stable, but Login link from navigation subtree intercepts pointer events.

**Steps to Recreate:**
1. Navigate to http://localhost:5173
2. Attempt to click the "Create Game" button (+ button in banner)
3. Click fails due to Login link overlay

**Expected Behavior:** Create Game button should be clickable and not have navigation links overlapping it

**Screenshot:** ../public/test-videos/002-postgres-user-db-20251204T105342Z-smoke-02-create-button.png

**Branch:** 002-postgres-user-db

**Found:** 2025-12-04T10:53:42.000Z

---

## - [ ] Backend API not responding - Connection refused

**Explanation:** Backend server at localhost:3001 is not responding to API requests. All API calls fail with ERR_CONNECTION_REFUSED. WebSocket connections also failing. Error: Failed to load resource: net::ERR_CONNECTION_REFUSED at http://localhost:3001/api/rooms

**Steps to Recreate:**
1. Start frontend at localhost:5173
2. Attempt to access backend API endpoints
3. Check browser console for connection errors

**Expected Behavior:** Backend should be running and responding to API requests on port 3001

**Screenshot:** ../public/test-videos/002-postgres-user-db-20251204T105342Z-smoke-01-landing.png

**Branch:** 002-postgres-user-db

**Found:** 2025-12-04T10:53:42.000Z

---

