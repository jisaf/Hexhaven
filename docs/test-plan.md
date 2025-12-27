# Hexhaven Manual Testing Plan

**Version:** 1.0
**Last Updated:** 2025-12-27
**Purpose:** Comprehensive manual testing guide for Hexhaven multiplayer tactical board game

## Table of Contents

1. [Testing Prerequisites](#testing-prerequisites)
2. [Anonymous User Testing](#anonymous-user-testing)
3. [Authenticated User Testing](#authenticated-user-testing)
4. [Single Game Flow](#single-game-flow)
5. [Campaign Mode](#campaign-mode)
6. [Shop & Inventory](#shop--inventory)
7. [Core Gameplay Mechanics](#core-gameplay-mechanics)
8. [Advanced Combat Actions](#advanced-combat-actions)
9. [Item Effects & Equipment](#item-effects--equipment)
10. [Edge Case Testing](#edge-case-testing)
11. [Usability & UX Testing](#usability--ux-testing)
12. [Performance & Stability](#performance--stability)
13. [Bug Reporting Template](#bug-reporting-template)

---

## Testing Prerequisites

### Environment Setup

**Before Testing:**
- [ ] Clear browser cache and cookies
- [ ] Open DevTools Console (F12) to monitor errors
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS, Android) and desktop
- [ ] Ensure stable internet connection
- [ ] Have two browser windows/devices ready for multiplayer testing

**Test Credentials:**
- Create test accounts: `testuser1@test.com`, `testuser2@test.com` (password: `TestPass123!`)
- Use different browsers/incognito windows for multiplayer tests

**Recording Tools (Optional):**
- Screen recording software for bug reproduction
- Screenshot tool for visual bugs
- Network tab open for WebSocket/API debugging

---

## Anonymous User Testing

### AU-1: First-Time User Experience

**Objective:** Test anonymous game creation without authentication

**Steps:**
1. Navigate to home page in incognito/private window
2. Click "Create Game" button
3. Enter nickname: "TestPlayer1"
4. Click "+ Add Character"
5. Select "Brute" character
6. Scroll through scenario list
7. Select "Forest Trail" scenario
8. Check "Solo Game" checkbox
9. Click "Create Game"

**Expected Results:**
- ✅ No login required to access Create Game
- ✅ Nickname field accepts 3-20 characters
- ✅ Character selection modal displays 6 classes with stats
- ✅ Scenario cards show difficulty, objective, description
- ✅ Solo Game checkbox enables immediate game start
- ✅ Room code (6 characters) is generated
- ✅ Game starts without authentication

**Edge Cases:**
- Try empty nickname (should show validation error)
- Try very long nickname (should truncate or validate)
- Try selecting 0 characters (Create button should be disabled)
- Try selecting 4+ characters (should work for multiplayer)

**Usability Checks:**
- [ ] Character cards are easy to read and distinguish
- [ ] Scenario scrolling is smooth
- [ ] Selected items are clearly highlighted
- [ ] "Create Game" button state changes (enabled/disabled/loading)
- [ ] No buttons are covered or unreachable

---

### AU-2: Joining Game as Anonymous User

**Objective:** Test joining existing game without authentication

**Steps:**
1. In first browser, create a game (get room code, e.g., "W69NPN")
2. In second browser (incognito), navigate to home page
3. Click "Join Game"
4. Enter room code: "W69NPN"
5. Enter nickname: "TestPlayer2"
6. Click "Join"

**Expected Results:**
- ✅ Room code input accepts 6 alphanumeric characters
- ✅ Invalid room code shows error message
- ✅ Valid room code navigates to lobby
- ✅ Both players see each other in lobby
- ✅ Player count updates (1/4 → 2/4)

**Edge Cases:**
- Try invalid room code: "ZZZZZ" (should show error)
- Try lowercase room code (should auto-uppercase or validate)
- Try room code with spaces (should trim or validate)
- Join when room is full (4/4 players)

---

### AU-3: Browser Navigation & Session Persistence

**Objective:** Test anonymous session handling across navigation

**Steps:**
1. Create game as anonymous user (room code: ABC123)
2. Note the URL (e.g., `/rooms/ABC123`)
3. Click browser back button
4. Observe "Return to Lobby ABC123" button on home page
5. Navigate to Campaigns page
6. Click back button to home
7. Verify "Return to Lobby" button still shows
8. Click "Return to Lobby ABC123"
9. Refresh the page (F5)
10. Close tab and reopen URL in new tab within 10 minutes

**Expected Results:**
- ✅ Back button returns to home page
- ✅ "Return to Lobby" button appears prominently
- ✅ Room code persists in session storage
- ✅ Rejoining room works without re-authentication
- ✅ Page refresh maintains lobby state
- ✅ Reopening within 10 minutes reconnects successfully
- ✅ After 10+ minutes, session expires gracefully

**Usability Issues to Check:**
- [ ] "Return to Lobby" button placement (should not obscure main actions)
- [ ] Button provides option to dismiss/close
- [ ] Clear messaging if reconnection fails
- [ ] No infinite "Rejoining room..." loop

---

## Authenticated User Testing

### AUTH-1: User Registration

**Objective:** Test account creation flow

**Steps:**
1. Navigate to home page
2. Click hamburger menu → "Register"
3. Fill in form:
   - Username: `testuser1`
   - Email: `testuser1@test.com`
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
4. Click "Register"

**Expected Results:**
- ✅ Form validates email format
- ✅ Password strength indicator shows
- ✅ Password match validation works
- ✅ Registration succeeds with valid data
- ✅ User is automatically logged in
- ✅ Redirect to home page or profile

**Validation Tests:**
- Try weak password (should show error)
- Try mismatched passwords (should prevent submit)
- Try duplicate email (should show "already exists" error)
- Try invalid email format (should validate)

---

### AUTH-2: Login Flow

**Objective:** Test authentication

**Steps:**
1. Navigate to home page
2. Click hamburger menu → "Login"
3. Enter credentials:
   - Username or Email: `testuser1@test.com`
   - Password: `TestPass123!`
4. Click "Login"
5. Verify logged-in state

**Expected Results:**
- ✅ Login succeeds with correct credentials
- ✅ Menu shows user profile instead of Login/Register
- ✅ Session persists on page refresh
- ✅ JWT token stored securely (HttpOnly cookie or secure storage)

**Error Cases:**
- Try wrong password (should show error)
- Try non-existent email (should show error)
- Leave fields blank (should validate)

---

### AUTH-3: Protected Routes

**Objective:** Verify authentication requirements

**Steps:**
1. While logged out, try to access:
   - `/history` (Match History)
   - `/campaigns` (Campaigns page)
   - `/characters/manage` (Manage Characters)
2. Note redirect behavior
3. Log in and retry access

**Expected Results:**
- ✅ Protected routes redirect to `/login` when not authenticated
- ✅ After login, user is redirected to originally requested page
- ✅ Logged-in users can access all protected pages
- ✅ Clear error messaging (not just blank page)

**Usability:**
- [ ] Redirect message explains why login is required
- [ ] "Not authenticated" errors are user-friendly
- [ ] Login page has "Back" or "Cancel" option

---

## Single Game Flow

### SG-1: Complete Single-Player Game

**Objective:** Play through entire game from creation to completion

**Steps:**

**1. Game Creation:**
- Create game with Brute character
- Select "Training Dummy - Part 1" scenario
- Enable "Solo Game" option
- Start game

**2. Game Setup Phase:**
- Observe initial board state
- Verify character placement on starting hex
- Verify monster placement matches scenario
- Check initiative order display
- Verify round counter shows "Round 1"

**3. Card Selection Phase:**
- Click on character token
- Card hand appears (10 cards for Brute)
- Select 2 cards (1 top action, 1 bottom action)
- Confirm selection
- Verify initiative is calculated and displayed

**4. Turn Execution:**
- Wait for turn (based on initiative)
- Execute top action (e.g., Move 3)
- Execute bottom action (e.g., Attack 4)
- End turn
- Observe monster AI turns

**5. Combat:**
- Move character adjacent to monster
- Select attack card
- Click "Attack" action
- Select target monster
- Draw attack modifier card
- Verify damage calculation
- Verify monster health decreases
- Defeat monster

**6. Looting:**
- Move to hex with loot token
- Loot automatically collected
- Verify gold/treasure added to character

**7. Scenario Completion:**
- Complete scenario objective (defeat all monsters)
- Victory screen appears
- Gold and XP awarded
- Click "Return to Lobby" or "Return Home"

**Expected Results:**
- ✅ All phases transition smoothly
- ✅ Game rules enforced (movement range, attack range, line of sight)
- ✅ Monster AI takes valid actions
- ✅ Damage calculations are correct
- ✅ Loot is awarded properly
- ✅ Victory conditions trigger correctly
- ✅ Post-game stats are accurate

**Timing Tests:**
- During game, refresh page → should reconnect
- During card selection, navigate away and back → should maintain state
- During combat, defocus window for 30 seconds → should remain active
- Wait 5 minutes idle → session should persist

---

### SG-2: Multiplayer 2-Player Game

**Objective:** Test real-time multiplayer synchronization

**Setup:**
- Use 2 browsers/devices
- Player 1: Brute
- Player 2: Spellweaver
- Scenario: Black Barrow

**Steps:**

**1. Lobby:**
- Player 1 creates game
- Player 2 joins with room code
- Both players select characters
- Host starts game

**2. Synchronization Tests:**
- Player 1 moves → Player 2 sees movement immediately
- Player 2 attacks → Player 1 sees attack animation
- Both players select cards → initiative order updates for both
- Player 1 opens character sheet → does not affect Player 2's view
- Player 1 disconnects briefly → Player 2 sees "Player disconnected" message
- Player 1 reconnects → game resumes

**3. Turn Order:**
- Verify initiative determines turn order
- Player with lower initiative goes first
- Monsters interleave correctly
- Round advances properly

**4. Shared Resources:**
- Both players loot from same pile
- Elemental infusions visible to both
- Monster health synced across clients
- Obstacle/terrain changes synced

**Expected Results:**
- ✅ Real-time synchronization (< 100ms latency)
- ✅ No desyncs or state conflicts
- ✅ Turn order enforced (can't act out of turn)
- ✅ Reconnection works seamlessly
- ✅ Chat messages delivered instantly

**Edge Cases:**
- Both players try to act simultaneously (one should be blocked)
- One player loses connection during their turn (timeout handling)
- Host leaves mid-game (host migration or game ends)

---

## Campaign Mode

### CP-1: Create New Campaign

**Objective:** Test campaign creation and setup

**Prerequisites:** Must be logged in

**Steps:**
1. Navigate to home page
2. Click "Campaigns" button
3. Click "Start New Campaign" or "Create Campaign"
4. Select campaign template (if available)
5. Enter campaign name: "Test Campaign 1"
6. Click "Create"

**Expected Results:**
- ✅ Campaign created successfully
- ✅ Campaign dashboard displays
- ✅ Starting scenario is unlocked
- ✅ Scenario tree/progression visible
- ✅ Party gold starts at 0 (or initial amount)
- ✅ No characters in party initially

**Validation:**
- Campaign name required (1-50 characters)
- Template selection works (if applicable)
- Cannot create duplicate campaign names (or allow with warning)

---

### CP-2: Add Characters to Campaign

**Objective:** Test character creation for campaign

**Steps:**
1. In campaign dashboard, navigate to "Party" tab
2. Click "Add Character"
3. Fill character details:
   - Name: "Grog the Mighty"
   - Class: Brute
   - Level: 1 (default)
4. Click "Create Character"
5. Repeat to add 2nd character (different class)

**Expected Results:**
- ✅ Character added to campaign party
- ✅ Character card shows in party list
- ✅ Starting gold, XP, items assigned correctly
- ✅ Character has starting hand of ability cards
- ✅ Character level, health, perks initialized

**Validation:**
- Name required (3-20 characters, no HTML)
- Cannot add duplicate character names in same campaign
- Maximum 4 characters per campaign
- Each character class can only be selected once

---

### CP-3: Play Campaign Scenario

**Objective:** Play scenario within campaign context

**Steps:**
1. From campaign dashboard, click unlocked scenario
2. Select characters from party (1-4)
3. Configure scenario difficulty (optional)
4. Click "Start Scenario"
5. Play through scenario
6. Complete scenario (victory or defeat)
7. Observe post-scenario results

**Expected Results:**

**On Start:**
- ✅ Game starts with selected campaign characters
- ✅ Characters have their saved items, gold, XP
- ✅ Campaign context is maintained (visible in UI)

**During Play:**
- ✅ Character stats match campaign progression
- ✅ Items equipped are available in-game
- ✅ No mixing of non-campaign characters

**On Victory:**
- ✅ Victory screen shows XP gained
- ✅ Gold looted is added to party gold
- ✅ Scenario marked as completed in campaign
- ✅ New scenarios unlocked (if applicable)
- ✅ "Return to Campaign" button visible
- ✅ Character progression saved (XP, gold, items)

**On Defeat:**
- ✅ Defeat screen shows
- ✅ Minimal gold penalty (if applicable)
- ✅ Scenario can be retried
- ✅ Character XP/items maintained

**Navigation:**
- Click "Return to Campaign" → redirects to campaign dashboard
- Verify scenario is marked complete
- Verify XP and gold updated in party stats

---

### CP-4: Campaign Progression & Unlocks

**Objective:** Test scenario unlocking and campaign flow

**Steps:**
1. Complete first scenario in campaign
2. Return to campaign dashboard
3. Observe scenario tree/map
4. Verify new scenarios are unlocked
5. Click newly unlocked scenario
6. Play and complete
7. Repeat for 3-5 scenarios

**Expected Results:**
- ✅ Scenario tree shows progression visually
- ✅ Locked scenarios are grayed out/disabled
- ✅ Unlocked scenarios are clickable
- ✅ Completion marks scenarios (checkmark, color change)
- ✅ Branching paths work correctly
- ✅ Required scenarios enforce prerequisites
- ✅ Global achievements/unlocks tracked

**Usability:**
- [ ] Scenario tree is easy to understand
- [ ] Clear visual indication of available scenarios
- [ ] Hover/click shows scenario details before starting
- [ ] Progress percentage or completion counter visible

---

### CP-5: Campaign Shop Access

**Objective:** Test shop integration with campaign

**Steps:**
1. In campaign dashboard, click "Shop" tab
2. Browse available items
3. Check party gold balance
4. Purchase an item
5. Assign item to character
6. Play scenario with equipped item

**Expected Results:**
- ✅ Shop displays available items filtered by prosperity level
- ✅ Item cards show name, cost, effects, slot
- ✅ Gold balance visible and updates after purchase
- ✅ Cannot purchase if insufficient gold
- ✅ Purchased items go to party inventory
- ✅ Items can be assigned to characters
- ✅ Equipped items function in-game

**Transactions:**
- Buy item → gold decreases, item added
- Sell item → gold increases, item removed (at reduced price)
- Transaction history visible
- Cannot sell equipped items (or auto-unequip)

---

### CP-6: Character Leveling & Perks

**Objective:** Test character progression mechanics

**Steps:**
1. Complete scenarios to gain XP
2. Reach XP threshold for level up (varies by class)
3. Level up character
4. Observe perk unlocks
5. Select perk to apply
6. Verify modifier deck changes

**Expected Results:**
- ✅ XP accumulates across scenarios
- ✅ Level-up notification appears at threshold
- ✅ Character level increases (max level 9)
- ✅ Health increases per level (varies by class)
- ✅ New ability cards unlocked at certain levels
- ✅ Perk selection screen appears
- ✅ Perk applied modifies attack modifier deck
- ✅ Character stats updated in campaign

**Perk Effects to Test:**
- Remove two -1 cards
- Add two +1 cards
- Add rolling modifiers
- Add element infusion to modifiers
- Add status effects (e.g., POISON, MUDDLE)

---

## Shop & Inventory

### SI-1: Browse Shop Catalog

**Objective:** Test shop UI and filtering

**Steps:**
1. Access shop (from campaign or standalone)
2. Scroll through item list
3. Use filters (if available):
   - By slot (Head, Body, Hands, Feet, Small Item)
   - By cost range
   - By effect type
4. Click item card to view details
5. Close detail modal

**Expected Results:**
- ✅ Items display with card layout
- ✅ Item name, cost, effects, slot visible
- ✅ Filters update list dynamically
- ✅ Detail modal shows full description
- ✅ Owned items marked or shown separately
- ✅ Items sorted by cost (low to high) by default

**Usability:**
- [ ] Item cards are easy to read
- [ ] Icons clearly represent effects
- [ ] Tooltips explain complex effects
- [ ] Filters are intuitive
- [ ] No horizontal scrolling required

---

### SI-2: Purchase Items

**Objective:** Test item purchasing flow

**Steps:**
1. Note current gold balance (e.g., 50 gold)
2. Select item costing 25 gold
3. Click "Purchase" or "Buy"
4. Confirm purchase (if confirmation modal appears)
5. Verify gold decreased to 25
6. Verify item added to inventory
7. Attempt to purchase item costing 100 gold (insufficient funds)

**Expected Results:**
- ✅ Purchase succeeds with sufficient gold
- ✅ Gold balance updates immediately
- ✅ Item appears in "My Items" or inventory
- ✅ Purchase button disabled if insufficient gold
- ✅ Error toast/message for insufficient funds
- ✅ Transaction logged in history

**Edge Cases:**
- Purchase exactly matching gold (balance → 0)
- Purchase multiple items in quick succession
- Refresh page mid-purchase (should rollback or complete)
- Try to purchase same item twice (if unique items)

---

### SI-3: Sell Items

**Objective:** Test item selling mechanics

**Steps:**
1. Navigate to inventory or "My Items"
2. Select owned item
3. Click "Sell"
4. Confirm sale
5. Verify gold increased (typically 50% of purchase price)
6. Verify item removed from inventory

**Expected Results:**
- ✅ Sell price displayed (e.g., "Sell for 10 gold")
- ✅ Confirmation modal prevents accidental sales
- ✅ Gold balance updates correctly
- ✅ Item removed from inventory immediately
- ✅ Cannot sell equipped items (error or auto-unequip)
- ✅ Transaction logged

**Validation:**
- Try to sell equipped item (should warn or prevent)
- Sell item, immediately refresh page (should persist)

---

### SI-4: Equip & Unequip Items

**Objective:** Test item management on characters

**Steps:**

**In Lobby (Pre-Game):**
1. Access character sheet or inventory
2. Select item (e.g., "Leather Armor" - Body slot)
3. Click "Equip" or drag to character
4. Assign to character
5. Verify item shown in equipped slots
6. Unequip item
7. Try to equip item in wrong slot (should fail)

**Expected Results:**
- ✅ Items can be equipped to correct slots
- ✅ Visual feedback (equipped items highlighted)
- ✅ Equipment limits enforced (1 per slot, 2 small items)
- ✅ Cannot equip incompatible items
- ✅ Unequipping returns item to inventory
- ✅ Tooltips show item effects

**In-Game:**
- Items are active and provide effects
- Item abilities appear as actions (if applicable)
- Consumable items can be used and removed

---

### SI-5: Item Effects in Combat

**Objective:** Verify item effects function correctly

**Test Items:**

**1. Leather Armor (Passive):**
- Equip armor that reduces damage by 1
- Take hit from monster
- Verify damage reduced by 1

**2. Minor Healing Potion (Consumable):**
- Equip potion
- Take damage (e.g., health 8/10)
- Use potion during turn
- Verify health increased by 3
- Verify potion removed from inventory

**3. Boots of Speed (Passive):**
- Equip boots (+1 Move)
- Play movement card (Move 3)
- Verify can move 4 hexes instead of 3

**4. Eagle-Eye Goggles (Passive):**
- Equip goggles (Advantage on attacks)
- Perform attack
- Verify draw 2 attack modifiers, take better one

**Expected Results:**
- ✅ Passive effects automatically apply
- ✅ Consumables can be activated during turn
- ✅ Effect values stack correctly with card values
- ✅ Items refresh between scenarios (if applicable)
- ✅ Single-use items removed after use
- ✅ Spent items marked as "Used" (if refresh mechanic exists)

---

### SI-6: Item Refresh Mechanics

**Objective:** Test item refresh between scenarios

**Steps:**
1. Equip multiple items (some consumable, some permanent)
2. Use consumable items during scenario
3. Complete scenario
4. Return to lobby
5. Observe item states

**Expected Results:**
- ✅ Permanent items remain equipped
- ✅ Consumable items refresh between scenarios
- ✅ Used items reset to available
- ✅ Spent items can be used again in next scenario
- ✅ Destroyed/lost items are actually removed (if mechanic exists)

---

## Core Gameplay Mechanics

### GM-1: Movement System

**Objective:** Test all movement mechanics

**Test Cases:**

**1. Basic Movement:**
- Play Move 3 card
- Click valid hexes (1, 2, 3 hexes away)
- Verify movement highlights (blue/green for valid)
- Verify character sprite moves smoothly
- Click outside range (should not move or show error)

**2. Obstacles & Terrain:**
- Move toward obstacle (wall, boulder)
- Verify cannot move through obstacle
- Move toward difficult terrain (rubble)
- Verify costs +1 movement per hex
- Move 2 hexes with 3 movement through 1 difficult (2+1 = 3, succeeds)

**3. Movement Path Highlighting:**
- Hover over destination hex
- Verify path is highlighted
- Verify invalid paths are grayed or not shown
- Verify shortest path is selected

**4. Jump Ability:**
- Play card with "Move 3, Jump"
- Move over obstacle or difficult terrain
- Verify jump ignores terrain/obstacles
- Verify cannot land on occupied hex

**5. Flying:**
- If available, test flying character/summon
- Verify can move over obstacles
- Verify can end turn on any hex (including obstacles if flying)

**Expected Results:**
- ✅ Movement range calculated correctly
- ✅ Pathfinding works (A* algorithm)
- ✅ Movement animations are smooth (60 FPS)
- ✅ Invalid moves prevented with clear feedback
- ✅ Terrain effects applied correctly
- ✅ Jump and Flying mechanics work as expected

---

### GM-2: Attack System

**Objective:** Test attack mechanics thoroughly

**Test Cases:**

**1. Melee Attack (Range 1):**
- Move adjacent to monster
- Play Attack 3 card
- Click "Attack" action
- Select target monster
- Draw attack modifier card
- Verify damage = Card Value + Modifier
- Verify monster health decreases

**2. Ranged Attack:**
- Position 3 hexes from monster
- Play Attack 2, Range 3 card
- Target monster
- Verify range calculated correctly (hex distance)
- Verify attack succeeds if in range
- Verify attack fails if out of range

**3. Line of Sight:**
- Position behind wall/obstacle
- Try to attack monster on other side
- Verify blocked (no line of sight)
- Move to position with clear LOS
- Verify attack allowed

**4. Multi-Target Attack:**
- Play card with "Attack 2, Target 2"
- Select first target
- Select second target (different monster)
- Verify both take damage
- Verify attack modifier drawn for each

**5. Area of Effect (AOE) Attack:**
- Play card with AOE pattern (e.g., "Attack all enemies within Range 2")
- Select center hex or confirm targets
- Verify all monsters in area take damage
- Verify friendly fire rules (if applicable)

**6. Attack Modifiers:**
- **Null (×0):** Attack deals 0 damage
- **2× Critical:** Attack deals double damage
- **Miss:** Attack deals 0 damage, trigger reshuffle
- **+1, +2, -1, -2:** Modify attack value
- **Rolling Modifiers (e.g., +1 ⭐):** Draw another card, add both
- **Status Effects (e.g., POISON, WOUND):** Apply to target

**7. Advantage/Disadvantage:**
- Attack with Advantage (e.g., from goggles or ally adjacency)
- Draw 2 attack modifiers, take better
- Attack with Disadvantage (e.g., from CURSE or monster ability)
- Draw 2 attack modifiers, take worse

**Expected Results:**
- ✅ Damage calculations accurate
- ✅ Range and LOS enforced
- ✅ Multi-target and AOE work correctly
- ✅ Attack modifier deck shuffles when reshuffle card drawn
- ✅ Status effects applied correctly
- ✅ Advantage/Disadvantage mechanics function
- ✅ Visual feedback for attacks (animations, damage numbers)

---

### GM-3: Ability Card Selection

**Objective:** Test card selection UI and mechanics

**Steps:**

**1. View Hand:**
- Start turn (or card selection phase)
- Character hand displays (10 cards for Brute, varies by class)
- Cards show top and bottom actions
- Cards show initiative value

**2. Select Cards:**
- Click first card (highlights)
- Click second card (highlights)
- Verify initiative calculated from 2 selected cards
- Confirm selection

**3. Invalid Selections:**
- Try to select only 1 card (should prevent or warn)
- Try to select same card twice (should prevent)
- Try to select 3+ cards (should prevent)

**4. Card Details:**
- Hover over card (or click for details)
- Zoom/modal shows:
  - Card name
  - Initiative
  - Top action (with icons for Move, Attack, etc.)
  - Bottom action
  - Elements consumed/infused
  - Enhancement slots (if available)

**5. Change Selection:**
- After selecting 2 cards, deselect one
- Select different card
- Verify initiative updates
- Confirm new selection

**6. Long Rest:**
- Select "Long Rest" action (if available)
- Verify initiative set to 99
- Verify 2 cards recovered from discard
- Verify 1 card lost (choice or random)
- Verify health recovered by 2

**Expected Results:**
- ✅ Card hand displays correctly
- ✅ Selection UI is intuitive (click, checkmark, highlight)
- ✅ Initiative updates in real-time
- ✅ Invalid selections prevented
- ✅ Card details are readable and accessible
- ✅ Long Rest mechanics work correctly

**Usability:**
- [ ] Cards are large enough to read details
- [ ] Mobile touch targets are adequate (48x48px minimum)
- [ ] Scrolling works if hand doesn't fit screen
- [ ] No cards covered by UI elements
- [ ] Confirm button is prominent

---

### GM-4: Elemental Infusion System

**Objective:** Test elemental mechanics

**Test Cases:**

**1. Infuse Element:**
- Play card that infuses Fire (e.g., top action: "Attack 3, Infuse Fire")
- Execute top action
- Verify Fire element changes from Inert → Strong
- Verify element icon updates in UI

**2. Consume Element:**
- With Fire at Strong, play card that consumes Fire
- Execute action (e.g., bottom action: "Move 4 if Fire consumed")
- Verify enhanced effect applies (Move 4 instead of Move 3)
- Verify Fire element decreases (Strong → Waning or Waning → Inert)

**3. Element Decay:**
- Infuse element to Strong
- End round (do not consume)
- Verify element decays: Strong → Waning
- End another round
- Verify element decays: Waning → Inert

**4. Multiple Elements:**
- Infuse Ice and Air in same round
- Verify both show as Strong
- Consume Ice (execute enhanced action)
- Verify Ice decreases, Air remains Strong
- End round, verify remaining elements decay

**5. Element Priority:**
- Test cards that consume ANY element
- Verify correct element is consumed (usually player's choice)

**Expected Results:**
- ✅ Elements tracked correctly (6 types: Fire, Ice, Air, Earth, Light, Dark)
- ✅ Infusion happens on action execution
- ✅ Consumption provides enhanced effects
- ✅ Decay happens at end of round
- ✅ Element UI is clear and visible
- ✅ Multiple elements can coexist

**Visual Checks:**
- [ ] Element icons are distinguishable
- [ ] State is clear (Inert = gray, Waning = faded, Strong = bright)
- [ ] Element panel doesn't obscure game board

---

### GM-5: Status Effects

**Objective:** Test all status effect mechanics

**Status Effects to Test:**

**1. POISON:**
- Apply POISON to monster (via attack modifier or card effect)
- Verify green token/icon appears on monster
- Monster takes turn
- Verify POISON deals 1 damage at end of turn
- Verify POISON persists (doesn't remove itself)

**2. WOUND:**
- Apply WOUND to monster
- Monster suffers any damage
- Verify damage increased by 1 (WOUND modifier)
- Verify WOUND persists multiple turns

**3. IMMOBILIZE:**
- Apply IMMOBILIZE to monster
- Monster's turn begins
- Verify monster cannot move (but can attack)
- End monster's turn
- Verify IMMOBILIZE removed at end of turn

**4. DISARM:**
- Apply DISARM to monster
- Monster's turn begins
- Verify monster cannot attack (but can move)
- End monster's turn
- Verify DISARM removed

**5. STUN:**
- Apply STUN to monster
- Monster's turn begins
- Verify monster loses entire turn (no action)
- End monster's turn
- Verify STUN removed

**6. MUDDLE:**
- Apply MUDDLE to monster
- Monster attacks player
- Verify monster has Disadvantage (draws 2 modifiers, takes worse)
- Verify MUDDLE persists multiple turns

**7. STRENGTHEN:**
- Apply STRENGTHEN to player character
- Character attacks monster
- Verify character has Advantage (draws 2 modifiers, takes better)
- End character's turn
- Verify STRENGTHEN removed

**8. INVISIBLE:**
- Apply INVISIBLE to character (via card)
- Monster AI targets player
- Verify monster ignores invisible character (cannot target)
- End character's turn
- Verify INVISIBLE removed

**9. CURSE:**
- Apply CURSE to monster (adds Curse card to modifier deck)
- Monster attacks
- Draw attack modifier
- If Curse drawn: attack deals 0 damage, Curse removed from deck
- Verify Curse doesn't persist (single-use)

**10. BLESS:**
- Apply BLESS to character (adds Bless card to modifier deck)
- Character attacks
- Draw attack modifier
- If Bless drawn: attack deals 2× damage, Bless removed from deck

**Expected Results:**
- ✅ Status effects apply correctly
- ✅ Effects function as described (damage, movement, attacks)
- ✅ Duration rules enforced (end of turn, persistent, single-turn)
- ✅ Visual indicators clear (tokens, icons, colors)
- ✅ Multiple effects can stack
- ✅ Effects removed at correct timing

**Visual Checks:**
- [ ] Status tokens/icons are visible on entities
- [ ] Effects are distinguishable (unique icons)
- [ ] Tooltips explain effect on hover

---

### GM-6: Looting & Treasure

**Objective:** Test loot collection mechanics

**Steps:**

**1. Automatic Loot:**
- Move character onto hex with loot token (gold coin icon)
- Verify loot automatically collected
- Verify token disappears
- Verify gold/treasure added to character

**2. Loot Distribution:**
- In multiplayer, have 2 players on adjacent hexes to loot
- One player moves onto loot
- Verify only that player receives loot
- Verify loot is NOT shared

**3. End-of-Scenario Loot:**
- Complete scenario
- Defeat all monsters (some drop loot)
- Collect loot tokens during play
- Reach victory screen
- Verify total gold looted displayed
- Verify gold added to character/party gold

**4. Random Item (Treasure):**
- Loot special treasure token (if scenario has one)
- Verify random item drawn from item deck
- Verify item added to inventory
- Verify item is usable immediately (or after scenario)

**Expected Results:**
- ✅ Loot collected on move (no extra action required)
- ✅ Gold value correct (typically 1-2 gold per token)
- ✅ Loot persists if not collected (until scenario ends)
- ✅ Random items drawn correctly
- ✅ Post-scenario summary accurate

**Edge Cases:**
- Multiple loot tokens on same hex (collect all)
- Moving over loot multiple times (only collect once)
- Loot on difficult terrain or trap hex (collect and trigger effect)

---

### GM-7: Monster AI Behavior

**Objective:** Test monster AI logic and pathfinding

**Test Scenarios:**

**1. Focus Target Selection:**
- Position 2 players at different distances from monster
- Monster's turn begins
- Verify monster focuses nearest player
- If tied distance, verify tiebreaker (lowest initiative)

**2. Movement AI:**
- Monster out of attack range
- Verify monster moves toward focus target
- Verify uses shortest path (A* pathfinding)
- Verify avoids obstacles
- Verify stops at optimal attack position

**3. Attack Priority:**
- Monster adjacent to player (in melee range)
- Verify monster attacks instead of moving
- Verify attacks focus target

**4. Ranged Monster:**
- Ranged monster (e.g., Archer)
- Player 3 hexes away (in range)
- Verify monster does not move (already in range)
- Verify monster attacks from distance

**5. Monster Abilities:**
- Monster with special ability (e.g., "Shield 1" or "Retaliate 2")
- Trigger ability condition
- Verify ability activates correctly

**6. Flying Monster:**
- Flying monster with obstacles between it and player
- Verify monster flies over obstacles
- Verify lands on valid hex

**7. Multi-Attack Monster:**
- Monster with "Attack 2, Target 2" ability
- Verify monster targets 2 different players (if available)
- Verify damage dealt to both

**Expected Results:**
- ✅ Focus calculation accurate
- ✅ Pathfinding optimal (shortest, valid path)
- ✅ Attack vs. move decision correct
- ✅ Range abilities used properly
- ✅ Special abilities activate
- ✅ No AI "stuck" in loops or invalid states

**Visual Checks:**
- [ ] Monster intent shown before turn (attack icon, movement range)
- [ ] Movement path previewed (optional)
- [ ] Target indicators clear

---

### GM-8: Obstacles & Terrain

**Objective:** Test environmental interactions

**Test Cases:**

**1. Impassable Obstacles:**
- Walls, boulders, chasms
- Try to move through/onto obstacle
- Verify movement blocked
- Verify line of sight blocked (for attacks)

**2. Difficult Terrain:**
- Rubble, water, brush
- Move onto difficult terrain hex
- Verify costs +1 movement
- Example: Move 3 → can only reach 2 hexes of difficult terrain

**3. Traps:**
- Move onto trap hex (bear trap icon)
- Verify trap triggers
- Verify damage dealt (e.g., 2 damage)
- Verify trap disappears after trigger (single-use)

**4. Hazardous Terrain:**
- Poison cloud, lava, spikes
- End turn on hazardous hex
- Verify damage dealt at end of turn (e.g., 1 damage)
- Verify hazard persists (doesn't disappear)

**5. Doors:**
- Move adjacent to closed door
- Interact with door (open)
- Verify door opens (becomes passable)
- Verify monsters on other side activate (if scenario rule)

**6. Interactive Objects:**
- Levers, pressure plates, chests
- Interact with object (may require specific action)
- Verify effect (e.g., lever opens door, chest drops loot)

**Expected Results:**
- ✅ Terrain rules enforced
- ✅ Damage dealt correctly
- ✅ Terrain visual states update (trap disappears, door opens)
- ✅ No movement exploits (e.g., jumping over walls without Jump ability)

---

### GM-9: Round & Turn Management

**Objective:** Test game flow and timing

**Steps:**

**1. Initiative Order:**
- All players select cards
- All monsters draw ability cards
- Verify turn order sorted by initiative (lowest to highest)
- Verify UI shows current turn (highlighted entity)

**2. Turn Execution:**
- Current entity takes actions (top, bottom, or both)
- Verify next entity's turn begins automatically
- Verify round counter increments after all entities act

**3. Simultaneous Initiatives:**
- Player and monster both have initiative 50
- Verify tiebreaker (players go before monsters)
- Or verify prompt for player to choose order (if rule variant)

**4. Round End:**
- All entities complete turns
- Verify round counter increments (Round 1 → Round 2)
- Verify elements decay (Strong → Waning → Inert)
- Verify end-of-round effects trigger (e.g., hazard damage)

**5. Scenario End Conditions:**
- All monsters defeated (victory)
- All players exhausted (defeat)
- Scenario objective met (e.g., "Survive 10 rounds")
- Verify game ends with appropriate screen

**Expected Results:**
- ✅ Turn order accurate
- ✅ Round progression smooth
- ✅ End-of-round cleanup happens
- ✅ Victory/defeat conditions detected
- ✅ No turns skipped or duplicated

---

## Advanced Combat Actions

### AC-1: Shield Ability

**Objective:** Test shield/defensive mechanics

**Test Cases:**

**1. Active Shield:**
- Play card with "Shield 2" (reduces damage by 2 this turn)
- Monster attacks character
- Verify damage reduced by 2
- End turn
- Verify Shield expires (only lasts this turn)

**2. Persistent Shield:**
- Some abilities grant shield for multiple turns
- Apply persistent shield
- Take damage on subsequent turns
- Verify shield reduces damage each time until duration ends

**3. Shield Stacking:**
- Apply Shield 2 from card
- Apply Shield 1 from item
- Verify total shield = 3
- Take 5 damage → reduced to 2 damage

**Expected Results:**
- ✅ Shield reduces incoming damage
- ✅ Shield does not prevent damage entirely (minimum 0)
- ✅ Shield stacks from multiple sources
- ✅ Shield duration tracked correctly

---

### AC-2: Retaliate Ability

**Objective:** Test retaliate/counter-attack mechanics

**Steps:**
1. Monster or character has "Retaliate 2" ability
2. Enemy attacks from adjacent hex
3. Verify retaliate triggers automatically
4. Verify attacker takes 2 damage
5. Verify retaliate does not trigger from ranged attacks (>1 range)

**Expected Results:**
- ✅ Retaliate triggers on melee attacks
- ✅ Retaliate damage dealt to attacker
- ✅ Retaliate does not trigger from ranged/AOE (unless specified)
- ✅ Retaliate can trigger multiple times in one turn
- ✅ Visual feedback (damage number, animation)

---

### AC-3: Pierce Ability

**Objective:** Test pierce/armor penetration

**Steps:**
1. Monster has Shield 2
2. Character plays "Attack 5, Pierce 3"
3. Verify shield reduced by Pierce value
4. Calculate damage: Attack - (Shield - Pierce) = 5 - (2 - 3) = 5 - 0 = 5 damage
5. Verify monster takes full 5 damage (shield negated by pierce)

**Expected Results:**
- ✅ Pierce reduces shield effectiveness
- ✅ Pierce > shield → shield ignored entirely
- ✅ Pierce < shield → partial shield reduction
- ✅ Calculations accurate

---

### AC-4: Push & Pull

**Objective:** Test forced movement mechanics

**Test Cases:**

**1. Push:**
- Character plays "Attack 3, Push 2"
- Attack hits monster
- Select push direction (away from attacker)
- Monster pushed 2 hexes
- Verify monster stops at obstacle (if encountered)
- If pushed into trap, verify trap triggers
- If pushed into hazard, verify hazard damage dealt

**2. Pull:**
- Character plays "Attack 2, Pull 3"
- Attack hits monster
- Monster pulled 3 hexes toward attacker
- Verify movement path is direct line
- Verify stops at obstacles

**3. Push into Another Entity:**
- Push monster into hex occupied by another monster
- Verify push stops 1 hex before occupied hex
- Or verify collision damage (if house rule)

**4. Push off Map:**
- Push monster to edge of map/board
- Verify push stops at boundary
- Or verify monster defeated (if scenario rule)

**Expected Results:**
- ✅ Forced movement works after successful attack
- ✅ Direction is selectable by attacker
- ✅ Stops at obstacles or entities
- ✅ Traps/hazards trigger if pushed through/onto
- ✅ Movement animation is smooth

---

### AC-5: Summon Mechanics

**Objective:** Test summon abilities

**Steps:**

**1. Summon Creation:**
- Play card with "Summon Wolf" ability
- Select unoccupied hex adjacent to character
- Place summon token/sprite
- Verify summon has stats (Move, Attack, Health)
- Verify summon is owned by player

**2. Summon Actions:**
- Summon acts on owner's initiative
- Verify summon can move and attack
- Summon attacks monster → verify attack uses owner's modifier deck
- Verify summon follows same rules as player (range, LOS, etc.)

**3. Summon Focus:**
- Monster AI calculates focus
- Verify summons are considered for focus (if nearer than owner)
- Monster attacks summon

**4. Summon Health:**
- Summon takes damage
- Verify health decreases
- Summon reaches 0 health
- Verify summon is removed from board

**5. Multiple Summons:**
- Player summons 2nd summon (if allowed)
- Verify first summon remains active
- Or verify first summon is removed (if limit is 1 per player)

**6. Summon Expiration:**
- Some summons have duration (e.g., "until end of next round")
- Verify summon removed at specified time

**Expected Results:**
- ✅ Summons placed correctly
- ✅ Summons act on owner's initiative
- ✅ Summons use owner's modifier deck
- ✅ Summons can be targeted and damaged
- ✅ Summon limits enforced
- ✅ Visual distinction from other entities

---

### AC-6: Heal Ability

**Objective:** Test healing mechanics

**Test Cases:**

**1. Self-Heal:**
- Character at 6/10 health
- Play card with "Heal 3"
- Verify health increases to 9/10
- Try to overheal (heal to 12/10)
- Verify capped at max health (10/10)

**2. Heal Ally:**
- Play card with "Heal 2, Range 3"
- Target ally within range
- Verify ally's health increases
- Verify cannot target enemies (healing is player-only)

**3. Heal Over Time:**
- Apply "Regenerate 2" (heal 2 at start of each turn)
- Start next turn
- Verify 2 health restored
- Verify effect persists or expires based on duration

**4. Area Heal:**
- Play "Heal all allies within Range 2"
- Verify all players in range healed
- Verify excludes enemies

**Expected Results:**
- ✅ Healing increases health correctly
- ✅ Cannot exceed max health
- ✅ Range and targeting enforced
- ✅ AOE heals affect all valid targets
- ✅ Visual feedback (heal numbers, health bar update)

---

### AC-7: Grant Experience (XP)

**Objective:** Test XP gain mechanics

**Steps:**

**1. XP from Cards:**
- Play card with XP icon (e.g., "Attack 3, XP: 1")
- Execute action
- Verify 1 XP awarded to character

**2. XP from Scenario:**
- Complete scenario
- Verify base XP awarded (e.g., 4 XP)
- Verify bonus XP from battle goals (if completed)
- Verify total XP added to character

**3. Battle Goal Completion:**
- Draw battle goal at start of scenario (e.g., "Kill 5 enemies")
- Complete goal during play
- End scenario
- Verify battle goal XP awarded (typically 1-2 checkmarks → XP)

**4. XP Display:**
- Check character sheet
- Verify XP bar or counter shows current/total
- Verify level-up notification at threshold

**Expected Results:**
- ✅ XP awarded from cards and scenarios
- ✅ XP accumulates correctly
- ✅ Battle goals tracked and rewarded
- ✅ XP UI is clear and visible

---

## Item Effects & Equipment

### IE-1: Passive Item Effects

**Objective:** Test items that provide constant bonuses

**Test Items:**

**1. +1 Attack (e.g., Battle Axe):**
- Equip item
- Play attack card (Attack 3)
- Verify attack value increases to 4

**2. +1 Move (e.g., Boots of Speed):**
- Equip boots
- Play move card (Move 2)
- Verify movement range increases to 3

**3. +1 Range (e.g., Eagle-Eye Goggles):**
- Equip goggles
- Play ranged attack (Range 2)
- Verify range increases to 3

**4. -1 Damage Reduction (e.g., Leather Armor):**
- Equip armor
- Take hit for 4 damage
- Verify only 3 damage dealt

**5. +1 Max Health (e.g., Chainmail):**
- Equip armor
- Verify max health increases (e.g., 10 → 11)
- Verify current health increases if at max

**Expected Results:**
- ✅ Passive effects automatically applied
- ✅ Bonuses stack with card values
- ✅ Effects clear in UI (tooltips, icons)

---

### IE-2: Active Item Abilities

**Objective:** Test items that require activation

**Test Items:**

**1. Minor Healing Potion:**
- Equip potion (small item slot)
- During turn, click item or use action
- Verify health increased by 3
- Verify item consumed or marked as "spent"

**2. Minor Stamina Potion:**
- Equip potion
- Activate item
- Recover 1 card from discard pile
- Verify potion spent

**3. Power Potion:**
- Equip potion
- Activate during attack
- Verify attack value doubled for this attack
- Verify potion spent

**4. Item with Refresh (e.g., Invisibility Cloak):**
- Equip cloak (refreshes on long rest)
- Activate → gain INVISIBLE status
- Take long rest
- Verify item refreshes (can use again)

**Expected Results:**
- ✅ Items can be activated during turn
- ✅ Effects applied correctly
- ✅ Consumed items removed or marked spent
- ✅ Refresh mechanics work
- ✅ UI shows item state (active, spent, available)

---

### IE-3: Equipment Slots & Limits

**Objective:** Test equipment restrictions

**Steps:**

**1. Slot Limits:**
- Try to equip 2 body armors → should fail (1 body slot)
- Equip head, body, legs, 2 small items → should succeed (all slots filled)
- Try to equip 3rd small item → should fail (limit 2)

**2. Item Requirements:**
- Try to equip high-level item on low-level character
- Verify level requirement enforced (if applicable)
- Level up character
- Verify can now equip item

**3. Item Sell/Unequip:**
- Equip item
- Try to sell equipped item → should warn or auto-unequip
- Unequip item
- Verify item moved to inventory
- Sell item successfully

**Expected Results:**
- ✅ Slot limits enforced (1 head, 1 body, 1 legs, 2 small, etc.)
- ✅ Cannot equip incompatible items
- ✅ Level requirements checked
- ✅ Equipped items cannot be sold without unequip
- ✅ Clear error messages for violations

---

## Edge Case Testing

### EC-1: Page Refresh Scenarios

**Objective:** Test state persistence across page refreshes

**Test Cases:**

**1. Refresh During Card Selection:**
- Start turn
- Select 1 of 2 cards
- Refresh page (F5)
- Verify:
  - Card selection state cleared or persisted
  - Can reselect cards
  - No duplicate selections

**2. Refresh During Movement:**
- Start movement action
- Click destination hex
- Refresh mid-animation
- Verify:
  - Movement completes or resets
  - Character position correct
  - No desyncs

**3. Refresh During Attack:**
- Initiate attack
- Refresh before damage resolved
- Verify:
  - Attack state recovered or reset
  - No damage dealt twice
  - Game state consistent

**4. Refresh in Lobby:**
- In game lobby with 2 players
- Refresh page
- Verify:
  - Reconnects to lobby
  - Player list accurate
  - Can still start game

**5. Refresh After Scenario:**
- Complete scenario
- Victory screen shows
- Refresh page
- Verify:
  - Redirects to appropriate page (campaign or home)
  - XP and gold persisted
  - No double-reward

**Expected Results:**
- ✅ Game state persists or recovers gracefully
- ✅ No state corruption or desyncs
- ✅ Reconnection happens automatically
- ✅ User sees loading state, not blank page
- ✅ No loss of progress

---

### EC-2: Browser Navigation (Back/Forward)

**Objective:** Test browser history navigation

**Test Cases:**

**1. Back from Game:**
- In active game
- Click browser back button
- Verify behavior:
  - Shows confirmation modal ("Leave game?")
  - Or returns to lobby
  - Game state preserved if rejoin

**2. Back from Lobby:**
- In game lobby
- Click back button
- Verify returns to home
- Verify "Return to Lobby" button shown

**3. Back from Campaign:**
- In campaign scenario
- Click back button
- Verify returns to campaign dashboard
- Verify progress saved

**4. Forward Navigation:**
- Navigate: Home → Game → Back → Home
- Click forward button
- Verify returns to game (if still active)
- Verify reconnects properly

**Expected Results:**
- ✅ Back button behavior is intuitive
- ✅ Confirmation prompts prevent accidental exits
- ✅ State persists for rejoin
- ✅ No broken states from forward/back

---

### EC-3: Window Defocus & Wait

**Objective:** Test session persistence when window loses focus

**Test Cases:**

**1. Short Defocus (< 1 minute):**
- In active game
- Switch to different tab/window (defocus)
- Wait 30 seconds
- Return to game tab (refocus)
- Verify:
  - Game still active
  - Reconnects automatically
  - Turn state preserved

**2. Medium Defocus (1-5 minutes):**
- In game
- Minimize window or switch apps
- Wait 3 minutes
- Return
- Verify:
  - Session active
  - May show "reconnecting" briefly
  - Game resumes

**3. Long Defocus (> 10 minutes):**
- In game
- Leave window idle for 15 minutes (close laptop, lock screen, etc.)
- Return
- Verify:
  - Session may expire
  - Shows reconnect prompt or timeout message
  - Can rejoin game with same character

**4. Network Interruption:**
- In game
- Disable network (airplane mode or unplug)
- Wait 10 seconds
- Re-enable network
- Verify:
  - Shows "Connection lost" message
  - Reconnects automatically when network returns
  - Game state syncs

**Expected Results:**
- ✅ Short defocus has no impact
- ✅ Medium defocus reconnects seamlessly
- ✅ Long defocus shows appropriate timeout
- ✅ Network interruption recovers gracefully
- ✅ Session timeout is 10 minutes (per PRD)

---

### EC-4: Multiple Tabs / Windows

**Objective:** Test multiple simultaneous connections

**Steps:**
1. Open game in Tab 1
2. Copy URL
3. Open same URL in Tab 2 (same browser)
4. Verify behavior:
   - Both tabs sync to same game state
   - Or one tab shows "Already connected" warning
   - Or second tab takes over, first tab disconnects

**Expected Results:**
- ✅ Defined behavior for multi-tab (no undefined state)
- ✅ If multi-tab allowed, both tabs sync correctly
- ✅ If disallowed, clear error message
- ✅ No data corruption from race conditions

---

### EC-5: Rapid Action Spam

**Objective:** Test rate limiting and action queuing

**Steps:**
1. In game, rapidly click movement hexes (10 clicks in 1 second)
2. Verify:
   - Only valid moves processed
   - No duplicate moves
   - No server crashes
3. Rapidly click attack button multiple times
4. Verify:
   - Only one attack processed per action
   - No duplicate attacks
5. Spam chat messages (if chat exists)
6. Verify:
   - Rate limiting kicks in (e.g., 1 message per second)
   - No server spam

**Expected Results:**
- ✅ Rate limiting enforced (200ms between actions per PRD)
- ✅ No duplicate actions processed
- ✅ UI provides feedback (e.g., button disabled during cooldown)
- ✅ Server remains stable

---

### EC-6: Concurrent Multiplayer Actions

**Objective:** Test simultaneous actions from multiple players

**Steps:**
1. In 2-player game, both players select cards simultaneously
2. Both click "Ready" at exact same time
3. Verify:
   - Both selections processed
   - Initiative calculated for both
   - Turn order determined correctly
4. During one player's turn, other player tries to move
5. Verify:
   - Out-of-turn action blocked
   - Error message shown ("Not your turn")

**Expected Results:**
- ✅ Server handles concurrent requests
- ✅ Turn order enforced (cannot act out of turn)
- ✅ No race conditions cause desyncs
- ✅ Clear error messages for violations

---

### EC-7: Invalid Game States

**Objective:** Test recovery from corrupted/invalid states

**Test Scenarios:**

**1. Invalid Coordinates:**
- Use browser console to send invalid move (e.g., hex [-999, -999])
- Verify server rejects action
- Verify no crash or state corruption

**2. Invalid Action Sequence:**
- Try to attack before selecting cards
- Try to loot during another player's turn
- Verify actions blocked with clear errors

**3. Desync Recovery:**
- Simulate desync (e.g., manually edit client state in console)
- Trigger state sync (move, attack, etc.)
- Verify server state overrides client
- Verify game continues correctly

**Expected Results:**
- ✅ Server validates all actions (server-authoritative)
- ✅ Invalid actions rejected with errors
- ✅ Client state corrected by server
- ✅ No exploits or cheats possible

---

## Usability & UX Testing

### UX-1: Button Accessibility

**Objective:** Ensure all buttons are reachable and usable

**Test Areas:**

**1. Mobile Touch Targets:**
- On mobile device (375x812 viewport)
- Verify all buttons are at least 48x48 pixels
- Tap each button (card selection, attack, move, etc.)
- Verify no accidental double-taps
- Verify buttons not covered by on-screen keyboard

**2. Desktop Click Targets:**
- On desktop (1280x720 or larger)
- Verify buttons have hover states
- Verify click areas are adequate
- Verify no buttons hidden by overlays or panels

**3. Covered Elements:**
- Check if any UI elements overlap:
  - Card hand covering action buttons
  - Chat panel covering game board
  - Modals blocking critical actions
- Verify scrolling or repositioning solves overlaps

**Expected Results:**
- ✅ All buttons reachable
- ✅ No accidental clicks due to proximity
- ✅ Touch targets meet WCAG guidelines (44x44 minimum)
- ✅ No permanent overlaps

---

### UX-2: Visual Clarity

**Objective:** Ensure game state is clear and readable

**Checks:**

**1. Health & Stats:**
- Character health bar visible and color-coded
- Monster health visible above token
- Initiative values clearly displayed
- XP and gold counters accessible

**2. Status Effects:**
- Status icons distinguishable (unique shapes/colors)
- Tooltips explain each effect on hover
- Icons don't obscure entity sprites

**3. Turn Indicators:**
- Current turn entity highlighted (border, glow, arrow)
- Turn order list visible (optional)
- Clear "Your Turn" notification

**4. Range & Targeting:**
- Valid movement hexes highlighted (distinct color)
- Invalid hexes grayed or not highlighted
- Attack range clearly shown
- Line of sight visualized (if possible)

**5. Element State:**
- Element icons visible at all times
- Colors distinguish Inert, Waning, Strong
- Elements don't blend into background

**Expected Results:**
- ✅ High contrast for text (4.5:1 minimum)
- ✅ Colorblind-friendly palette
- ✅ Icons have text labels (or tooltips)
- ✅ Critical info always visible (no scroll required)

---

### UX-3: Click Efficiency

**Objective:** Minimize clicks required for common actions

**Scenarios:**

**1. Attack Action:**
- Count clicks: Select card (1) → Confirm (1) → Click attack (1) → Click target (1) → Draw modifier (1) = 5 clicks
- Ideal: ≤ 5 clicks
- If > 5, identify unnecessary confirmations

**2. Move Action:**
- Count clicks: Select card → Confirm → Click move → Click destination = 4 clicks
- Ideal: ≤ 4 clicks

**3. Loot Collection:**
- Should be automatic (0 clicks)
- Verify no manual "Collect Loot" button needed

**4. Card Selection:**
- Count clicks: Click card 1 (1) → Click card 2 (1) → Confirm (1) = 3 clicks
- Check if confirmation can be auto (select 2 cards = auto-confirm)

**Expected Results:**
- ✅ Common actions ≤ 5 clicks
- ✅ No redundant confirmations
- ✅ Shortcuts available (keyboard hotkeys optional)
- ✅ Drag-and-drop supported where appropriate

---

### UX-4: Odd Layouts & Responsive Design

**Objective:** Test unusual screen sizes and orientations

**Test Viewports:**

**1. Mobile Portrait (375x812):**
- Verify all elements visible without horizontal scroll
- Verify card hand readable
- Verify game board fits or scrolls smoothly

**2. Mobile Landscape (812x375):**
- Verify layout adapts (horizontal card hand?)
- Verify critical buttons accessible
- Verify no UI cutoff

**3. Tablet (768x1024):**
- Verify mid-size layout works
- Verify touch targets adequate
- Verify no wasted space

**4. Desktop Large (1920x1080):**
- Verify UI scales appropriately
- Verify text not too small or too large
- Verify no excessive whitespace

**5. Ultrawide (2560x1440):**
- Verify UI centered or adapts
- Verify no horizontal stretching of game board

**6. Small Desktop (1024x768):**
- Verify all panels fit
- Verify no overlapping elements

**Expected Results:**
- ✅ Responsive layout works on all common sizes
- ✅ No horizontal scroll on mobile
- ✅ Text scales appropriately
- ✅ Touch/click targets adapt to screen size

---

### UX-5: Loading States & Feedback

**Objective:** Ensure user is informed during waits

**Checks:**

**1. Page Load:**
- Loading spinner visible on initial load
- Progress indicator (if assets loading)
- No blank white screen > 1 second

**2. Action Processing:**
- Button shows loading state (spinner, "Processing...")
- Disabled during network request
- Re-enables after response

**3. Reconnection:**
- "Reconnecting..." message visible
- Retry countdown (e.g., "Retrying in 3...")
- Clear error if reconnection fails

**4. Long Operations:**
- Scenario generation, campaign creation
- Progress bar or percentage
- Estimated time (optional)

**Expected Results:**
- ✅ User never unsure if app is working
- ✅ Feedback within 100ms of action
- ✅ Timeouts have clear errors
- ✅ Loading states accessible (screen readers)

---

### UX-6: Error Messaging

**Objective:** Ensure errors are clear and actionable

**Test Error Scenarios:**

**1. Network Error:**
- Disconnect network
- Trigger action
- Verify error: "Connection lost. Please check your internet."
- Verify retry button available

**2. Validation Error:**
- Submit invalid form (e.g., empty nickname)
- Verify error: "Nickname required (3-20 characters)"
- Verify error positioned near field

**3. Game Rule Violation:**
- Try invalid move (out of range)
- Verify error: "Cannot move there (out of range)"
- Verify error dismissible

**4. Server Error:**
- Simulate server error (500)
- Verify error: "Server error. Please try again later."
- Verify includes error code (for support)

**Expected Results:**
- ✅ Errors are user-friendly (no tech jargon)
- ✅ Errors explain what went wrong
- ✅ Errors suggest how to fix
- ✅ Errors are dismissible or auto-hide
- ✅ Critical errors don't block entire UI

---

### UX-7: Language & Localization

**Objective:** Test internationalization (i18n)

**Steps:**
1. Switch language to Spanish (Español)
2. Navigate through app (home, game, campaign, shop)
3. Verify translations:
   - Buttons
   - Labels
   - Error messages
   - Tooltips
   - Card text (if translated)
4. Switch to French (Français)
5. Repeat verification

**Expected Results:**
- ✅ All UI strings translated (no English fallback)
- ✅ Layout accommodates longer text (e.g., German)
- ✅ Date/number formats locale-appropriate
- ✅ Right-to-left languages supported (if applicable)
- ✅ Language persists on refresh

**Known Issues (from QA):**
- Partial Spanish translation (see Issue #358)
- Some strings remain in English

---

## Performance & Stability

### PERF-1: Frame Rate

**Objective:** Ensure smooth 60 FPS rendering

**Test Scenarios:**

**1. Idle Board:**
- Load game board with 10+ entities
- Open DevTools Performance tab
- Record for 10 seconds (no actions)
- Verify FPS ≥ 60 consistently

**2. Movement Animation:**
- Trigger 5+ movements in quick succession
- Record FPS during animation
- Verify FPS ≥ 55 (allow slight dip during transitions)

**3. Attack Animations:**
- Trigger multiple attacks with effects
- Verify FPS stable

**4. Large Board:**
- Load scenario with 20+ hexes, 15+ entities
- Verify no lag or stuttering

**Expected Results:**
- ✅ 60 FPS target met (per PRD)
- ✅ No dropped frames during animations
- ✅ WebGL rendering optimized
- ✅ Smooth on mid-range devices (not just high-end)

---

### PERF-2: Load Times

**Objective:** Ensure fast page loads

**Metrics:**

**1. Initial Load (Cold Start):**
- Clear cache
- Load home page
- Measure time to interactive (TTI)
- Target: < 2 seconds (per PRD)

**2. Game Board Load:**
- Navigate to game
- Measure time until board renders
- Target: < 1 second

**3. Asset Loading:**
- Monitor network tab
- Verify images/sprites load progressively
- No blocking on large assets

**Expected Results:**
- ✅ Home page TTI < 2s
- ✅ Subsequent pages < 1s
- ✅ Lazy loading for non-critical assets
- ✅ Caching used effectively (service worker)

---

### PERF-3: Network Latency

**Objective:** Test under various network conditions

**Test Conditions:**

**1. Fast 3G (Simulated):**
- Enable network throttling in DevTools (Fast 3G)
- Play through game
- Verify playable but slower
- Verify no timeouts

**2. Slow 3G:**
- Enable Slow 3G throttling
- Verify:
  - Game loads (may take longer)
  - Actions process (with delay)
  - Clear "Slow connection" warning shown

**3. Intermittent Connection:**
- Toggle network on/off every 10 seconds
- Verify:
  - Reconnection messages clear
  - State syncs after reconnect
  - No permanent desyncs

**Expected Results:**
- ✅ WebSocket latency < 50ms on good connection (per PRD)
- ✅ Playable on 3G (with warnings)
- ✅ Graceful degradation on poor networks
- ✅ Reconnection < 5 seconds

---

### PERF-4: Memory Usage

**Objective:** Ensure no memory leaks

**Steps:**
1. Open DevTools Memory tab
2. Take heap snapshot (baseline)
3. Play game for 10 minutes (complete 2 scenarios)
4. Take heap snapshot (after play)
5. Compare memory usage
6. Verify increase < 50 MB (acceptable growth)
7. Navigate away from game
8. Take snapshot (after cleanup)
9. Verify memory released

**Expected Results:**
- ✅ No continuous memory growth
- ✅ Memory released on navigation
- ✅ No detached DOM nodes accumulating
- ✅ Event listeners cleaned up

---

### PERF-5: Server Response Time

**Objective:** Ensure fast backend responses

**Metrics:**

**1. REST API:**
- Measure response time for:
  - GET /api/campaigns (< 50ms, per PRD)
  - POST /api/games (< 100ms)
  - GET /api/shop (< 50ms)
- Verify P95 latency meets targets

**2. WebSocket Events:**
- Measure round-trip time:
  - Send 'player-action' → Receive 'game-state-update'
  - Target: < 100ms (< 50ms per PRD for P95)

**3. Database Queries:**
- Monitor Prisma query logs
- Verify queries < 50ms (per PRD)
- Identify slow queries (> 100ms)

**Expected Results:**
- ✅ Server response < 100ms (P95)
- ✅ WebSocket latency < 50ms
- ✅ Database queries optimized
- ✅ No N+1 query problems

---

## Bug Reporting Template

When you find a bug, report it using this template:

```markdown
## Bug Report

**Title:** [Short, descriptive title]

**Severity:** [Critical / High / Medium / Low]

**Environment:**
- Browser: [Chrome 120, Firefox 121, Safari 17, etc.]
- OS: [Windows 11, macOS 14, iOS 17, Android 13]
- Device: [Desktop, iPhone 14, Samsung Galaxy S23]
- Viewport: [1920x1080, 375x812, etc.]

**Steps to Reproduce:**
1. Navigate to [page]
2. Click [button]
3. Enter [data]
4. Observe [result]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots/Video:**
[Attach screenshots or screen recording]

**Console Errors:**
```
[Paste any console errors here]
```

**Network Logs:**
[Include failed API calls, WebSocket errors if relevant]

**Additional Context:**
[Any other relevant information]
```

---

## Testing Checklist Summary

Use this checklist to track overall testing progress:

### Core Functionality
- [ ] Anonymous user can create and join games
- [ ] Authentication (register, login, logout) works
- [ ] Single-player game completes successfully
- [ ] Multiplayer 2-4 player game works
- [ ] Campaign creation and progression
- [ ] Shop purchase/sell transactions
- [ ] Character leveling and perks

### Gameplay Mechanics
- [ ] Movement (basic, difficult terrain, jump, flying)
- [ ] Attacks (melee, ranged, multi-target, AOE)
- [ ] Ability card selection and execution
- [ ] Elemental infusion and consumption
- [ ] Status effects (all 10+ types tested)
- [ ] Looting and treasure
- [ ] Monster AI and pathfinding

### Advanced Actions
- [ ] Shield, Retaliate, Pierce
- [ ] Push, Pull forced movement
- [ ] Summon mechanics
- [ ] Heal abilities
- [ ] Item effects (passive and active)

### Edge Cases
- [ ] Page refresh (all game states)
- [ ] Browser back/forward navigation
- [ ] Window defocus/refocus (1 min, 5 min, 10+ min)
- [ ] Network interruption and reconnection
- [ ] Multi-tab behavior
- [ ] Rapid action spam / rate limiting
- [ ] Concurrent multiplayer actions

### Usability
- [ ] Button accessibility (touch targets, coverage)
- [ ] Visual clarity (health, effects, turn order)
- [ ] Click efficiency (< 5 clicks for common actions)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading states and user feedback
- [ ] Error messaging (clear, actionable)
- [ ] Language switching (i18n)

### Performance
- [ ] Frame rate (60 FPS target)
- [ ] Page load times (< 2s home, < 1s game)
- [ ] Network latency (< 50ms WebSocket)
- [ ] Memory usage (no leaks)
- [ ] Server response times (< 100ms API, < 50ms WS)

---

## Notes for Testers

**Testing Mindset:**
- Think like a user, not a developer
- Try to break things (edge cases are where bugs hide)
- Test on devices you don't usually use
- Report even minor UX issues (they add up)
- Document everything (steps, screenshots, logs)

**Communication:**
- File bugs immediately (don't batch them)
- Use clear, concise titles
- Include reproduction steps (devs should replicate easily)
- Attach screenshots/videos (a picture is worth 1000 words)
- Follow up on bugs (verify fixes)

**Focus Areas (Based on Recent QA):**
- WebSocket connectivity (critical issue #356)
- Translation completeness (issue #358)
- Session state management (issue #359)
- Campaign flow and navigation (issue #318)
- Shop transactions and gold updates

---

**Version History:**
- v1.0 (2025-12-27): Initial comprehensive test plan

**Maintainer:** Testing Team
**Review Frequency:** Update after each major feature release
