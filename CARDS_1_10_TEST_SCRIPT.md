# Cards 1-10 Systematic Testing Script

**Tester**: Manual Browser Testing
**Date**: 2026-01-03
**Cards**: Basic Strike (1) through Trap Setter (10)
**Expected Duration**: 15-20 minutes

---

## Pre-Test Checklist

Before starting, verify:
- [ ] Backend running on port 3001: `curl http://localhost:3001/health`
- [ ] Frontend running on port 5173: `curl http://localhost:5173`
- [ ] Browser window open to http://localhost:5173
- [ ] Logged in or can login
- [ ] Can create character (TestIconClass)
- [ ] TurnActionPanel fix is deployed (visible when cards selected)

---

## Game Setup (One Time)

```
1. Navigate to: http://localhost:5173
2. Click "Login" or "Register"
3. Create account if needed
4. Create character:
   - Name: "CardTester-[timestamp]"
   - Class: TestIconClass (or Brute if TestIconClass unavailable)
5. Click "Create Game"
6. Select Scenario: "Sparring Arena"
7. Add your character to the game
8. Click "Start Game"
9. Verify hex grid loads and game board appears
10. Your ready to test cards!
```

---

## Testing Pattern (For Each Card)

```
REPEAT FOR EACH CARD:

Step 1: Open Hand Tab
  └─ Click "Hand" tab on right panel
     Expected: See all 30 cards in list

Step 2: Select First Card (The card to test)
  └─ Click on the card button
  └─ Card should highlight/show "✓" mark
     Expected: Card appears selected

Step 3: Select Second Card (Safe fallback)
  └─ Click "Recovery" card (initiative 18)
     Expected: Second card selected

Step 4: Close Hand and Confirm
  └─ Click "Close" button on Hand panel
  └─ Panel closes, back to game board
  └─ Verify two cards selected shows somewhere

Step 5: Confirm Selection (Start Turn)
  └─ Look for "Confirm" button or similar
  └─ Click it to start the turn
     Expected: Combat screen appears

Step 6: Verify TurnActionPanel
  └─ Look for "Active" tab on right side
  └─ Click "Active" tab
  └─ Should see both selected cards displayed
     Expected: TurnActionPanel shows:
     - Card 1 (the test card) with action buttons
     - Card 2 (Recovery) with action buttons
     - Visual cards side-by-side
     ✅ This confirms the TurnActionPanel fix is working!

Step 7: Execute First Card Action
  └─ Identify the first card in TurnActionPanel
  └─ Click on its action button (top or bottom action)
  └─ If targeting required (range, enemy selection):
     - Click on target hex or enemy
     - Confirm selection
     Expected: Action executes, modifiers apply

Step 8: Verify Action Results
  └─ Check game log on left side for messages
  └─ Look for damage dealt, healing applied, conditions added
  └─ Verify game state changed correctly
     Expected: See confirmation of action

Step 9: Document Results
  └─ Note what happened vs expected
  └─ Record success/failure in CARD_TEST_RESULTS.txt

Step 10: End Turn
  └─ Click "End Turn" button
  └─ Monster takes action
  └─ Return to card selection
     Expected: Ready for next card test
```

---

## Card-Specific Test Cases

### CARD 1: Basic Strike (Initiative 10)
**Top Action**: attack 3
**Bottom Action**: move 3
**Modifiers**: xp 1

**Test Steps**:
1. Select Basic Strike as first card
2. Select Recovery as second card
3. Confirm turn
4. Click Basic Strike top action (attack 3)
5. Click on monster to target
6. Verify:
   - [ ] Monster takes 3 damage
   - [ ] Player gains 1 XP (check character panel)
   - [ ] Damage appears in combat log
   - [ ] Damage number shows on monster
7. (Optional) Test bottom action: move 3
   - Click Basic Strike bottom action
   - Click on a destination hex
   - Verify player moves 3 hexes toward target

**Expected Result**: ✅ PASS - Attack deals 3 damage, player moves 3, gains 1 XP

---

### CARD 2: Multi-Target (Initiative 12)
**Top Action**: attack 2 + range 3 + target 2 (hit 2 enemies)
**Bottom Action**: move 3
**Modifiers**: range 3, target 2

**Test Steps**:
1. Select Multi-Target
2. Select Recovery
3. Confirm turn
4. Click Multi-Target top action (attack 2)
5. If there's only 1 monster (Sparring Dummy):
   - Attack that monster for 2 damage
   - Verify it only takes 2 damage (not doubled)
6. Verify:
   - [ ] Range 3 action selection allows attacking from distance
   - [ ] Damage dealt is 2 per target
   - [ ] Action displays "target 2 enemies" text
7. Test bottom action: move 3

**Expected Result**: ✅ PASS - Attack 2 damage to monster, can attack from range 3, modifiers display correctly

---

### CARD 3: Healing Touch (Initiative 15)
**Top Action**: heal 4 + range 2
**Bottom Action**: loot 2
**Modifiers**: range 2

**Test Steps**:
1. Select Healing Touch
2. Select Recovery
3. Confirm turn
4. Click Healing Touch top action (heal 4)
5. Since solo, should heal yourself
6. Verify:
   - [ ] Your health increases by 4 (check character panel)
   - [ ] Healing number shows on your character
   - [ ] Range 2 modifier allows healing at distance
   - [ ] Log shows "healed 4 HP"
7. Test bottom action: loot 2
   - Click loot action
   - Verify you gain 2 gold/loot (check inventory)

**Expected Result**: ✅ PASS - Heal 4 HP to self, gain 2 loot, range displays correctly

---

### CARD 4: Recovery (Initiative 18)
**Top Action**: special + recover 2 cards + lost
**Bottom Action**: heal 3
**Modifiers**: recover, lost

**Test Steps**:
1. This card will go to your discard pile when used (lost modifier)
2. Select Recovery as first card
3. Select another card as second card (so you can test bottom action later if needed)
4. Confirm turn
5. Click Recovery top action (recover 2)
6. Verify:
   - [ ] A dialog appears to select 2 cards from discard pile
   - [ ] Cards from discard move to your hand
   - [ ] Recovery card itself moves to "Lost" pile (not hand/discard anymore)
   - [ ] Log shows "Recovered 2 cards"
7. Test bottom action: heal 3
   - Click heal action
   - Verify you heal 3 HP

**Expected Result**: ✅ PASS - Recover 2 cards from discard, recovery card goes to lost pile, heal 3 HP

---

### CARD 5: Fire Blast (Initiative 20)
**Top Action**: attack 3 + range 3 + generate fire
**Bottom Action**: move 2 + consume fire (bonus: move +2 = move 4)
**Modifiers**: range 3, infuse fire, consume fire

**Test Steps**:
1. Select Fire Blast as first card
2. Select Recovery as second card
3. Confirm turn
4. Click Fire Blast top action (attack 3)
5. Verify:
   - [ ] Fire icon/indicator appears (showing fire element generated)
   - [ ] Attack deals 3 damage
   - [ ] Range 3 allows attacking from distance
   - [ ] Log shows attack with fire generated
6. Click Fire Blast bottom action (move 2)
7. Verify:
   - [ ] Fire element available for consumption
   - [ ] Movement increases from 2 to 4 (shows "+2 bonus")
   - [ ] Player moves 4 hexes total
   - [ ] Log shows "consumed fire" and "movement +2"

**Expected Result**: ✅ PASS - Fire generated on attack, consumed on move for movement bonus

---

### CARD 6: Mind Control (Initiative 22)
**Top Action**: special + range 3 + lost + xp 2
**Bottom Action**: move 3
**Modifiers**: range 3, lost, xp 2

**Test Steps**:
1. Select Mind Control
2. Select another card as second
3. Confirm turn
4. Click Mind Control top action (special)
5. Verify:
   - [ ] "Lost" indicator shows (card will go to lost pile)
   - [ ] XP +2 indicator shows
   - [ ] Range 3 allows selecting from distance
   - [ ] If "control enemy" mechanic exists, verify it's available
   - [ ] Gain 2 XP (check character panel)
6. Check Hand tab:
   - [ ] Mind Control is NO LONGER in hand (it's in Lost pile)
   - [ ] Lost pile count increased by 1
7. Test bottom action: move 3

**Expected Result**: ✅ PASS - Card goes to lost, gain 2 XP, can use mind control (if implemented)

---

### CARD 7: Ice Shield (Initiative 25)
**Top Action**: special + generate ice + shield 2
**Bottom Action**: attack 2 + consume ice (bonus: damage +2 = damage 4)
**Modifiers**: infuse ice, shield, consume ice

**Test Steps**:
1. Select Ice Shield
2. Select Recovery
3. Confirm turn
4. Click Ice Shield top action (special)
5. Verify:
   - [ ] Ice element indicator appears
   - [ ] Shield 2 indicator shows (damage reduction)
   - [ ] Next 2 damage you take is blocked
   - [ ] Log shows "Ice shield generated"
6. Simulate taking damage (monster attacks you):
   - End turn, let monster attack
   - Verify shield blocks 2 damage (monster deals less damage than usual)
7. Next turn, select Ice Shield again
8. Click Ice Shield bottom action (attack 2)
9. Verify:
   - [ ] Ice element consumed (indicator disappears)
   - [ ] Attack damage increases from 2 to 4 (shows "+2 bonus")
   - [ ] Monster takes 4 damage
   - [ ] Log shows "consumed ice" and "damage +2"

**Expected Result**: ✅ PASS - Ice generated, shield blocks 2 damage, consumed for attack bonus

---

### CARD 8: Augmented Power (Initiative 28)
**Top Action**: text "Add +2 Attack to all your attacks this round." + persistent
**Bottom Action**: attack 2
**Modifiers**: persistent

**Test Steps**:
1. Select Augmented Power
2. Select another card
3. Confirm turn
4. Click Augmented Power top action (text/special)
5. Verify:
   - [ ] Text displays: "AUGMENT - Add +2 Attack to all your attacks this round."
   - [ ] Quote shows: "Channel the power within."
   - [ ] Persistent indicator shows (buff lasts through round)
   - [ ] Buff indicator appears on character
6. Click another attack card (or come back to this one)
7. Verify:
   - [ ] All attacks deal +2 bonus damage
   - [ ] Bonus persists through the round
   - [ ] Buff resets after round ends

**Expected Result**: ✅ PASS - Buff text displays, +2 bonus applies to all attacks

---

### CARD 9: Wind Rush (Initiative 30)
**Top Action**: attack 2 + generate air + push 2
**Bottom Action**: move 4 + jump
**Modifiers**: infuse air, push, jump

**Test Steps**:
1. Select Wind Rush
2. Select Recovery
3. Confirm turn
4. Click Wind Rush top action (attack 2)
5. Click on monster to target
6. Verify:
   - [ ] Attack deals 2 damage
   - [ ] Monster pushed 2 hexes away from you
   - [ ] Air element indicator appears
   - [ ] Log shows "attacked 2, pushed 2 hexes"
   - [ ] Monster visibly moves on map
7. Click Wind Rush bottom action (move 4 + jump)
8. Verify:
   - [ ] Can move 4 hexes total
   - [ ] Jump modifier allows moving through obstacles/walls
   - [ ] Character moves to destination
   - [ ] Air element still visible (or consumed if mechanic requires)

**Expected Result**: ✅ PASS - Attack with push effect, move 4 with jump (through obstacles)

---

### CARD 10: Trap Setter (Initiative 32)
**Top Action**: attack 2
**Bottom Action**: special + create trap + range 2
**Modifiers**: range 2

**Test Steps**:
1. Select Trap Setter
2. Select Recovery
3. Confirm turn
4. Click Trap Setter top action (attack 2)
5. Verify:
   - [ ] Attack deals 2 damage to monster
   - [ ] No special modifiers on this action
6. Click Trap Setter bottom action (create trap)
7. Verify:
   - [ ] Range 2 allows selecting hex from distance
   - [ ] Select a hex on the map
   - [ ] Trap appears on that hex (visual indicator like spikes/fire)
   - [ ] Log shows "trap created at [location]"
8. (If game continues) Verify:
   - [ ] Monster or future enemies trigger trap when walking on it
   - [ ] Trap deals damage or applies condition

**Expected Result**: ✅ PASS - Attack 2 damage, trap created with range 2

---

## Results Recording

For each card tested, record in this format:

```
CARD [#]: [Name] (Initiative [#])
Status: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

Top Action: [type] [value] [modifiers]
- Expected: [what should happen]
- Actual: [what happened]
- Result: [✅ works / ❌ failed / ⚠️ partial]

Bottom Action: [type] [value] [modifiers]
- Expected: [what should happen]
- Actual: [what happened]
- Result: [✅ works / ❌ failed / ⚠️ partial]

Modifiers:
- [modifier name]: [✅ works / ❌ failed / ⚠️ partial]
- [modifier name]: [✅ works / ❌ failed / ⚠️ partial]

Notes: [Any additional observations, edge cases, or issues]

Game State: [Correctly updated / Issue / Other note]
```

---

## Critical Observations During Testing

**Watch for**:
- [ ] TurnActionPanel appears when cards selected (confirms fix works)
- [ ] All modifiers display with correct values
- [ ] Damage/healing numbers appear on screen
- [ ] Game log shows all actions taken
- [ ] Monster health updates correctly
- [ ] Player stats update correctly
- [ ] Card piles (hand/discard/lost) update when cards used
- [ ] No console errors (F12 developer tools)

**Red Flags**:
- ❌ TurnActionPanel doesn't appear (bug not fixed)
- ❌ Modifiers don't apply (element not generated, condition not applied)
- ❌ Wrong target affected (range/aoe issue)
- ❌ Game state inconsistent (damage dealt but monster health same)
- ❌ Console errors
- ❌ Action button unresponsive

---

## Testing Success Criteria

✅ **PASS**:
- Action executes without errors
- All modifiers apply to correct targets
- Game state updates properly
- No console errors

❌ **FAIL**:
- Action doesn't execute
- Modifier doesn't apply
- Wrong targets affected
- Game state not updated
- Console shows errors

⚠️ **PARTIAL**:
- Some modifiers work, some don't
- Action partially executes
- Some targets affected correctly

---

## Estimated Timeline

- Game Setup: 2-3 minutes
- Cards 1-10: 15-20 minutes total
  - ~1.5-2 minutes per card
  - 8-10 actions per card (top + bottom + verification)
- Documentation: 5 minutes

**Total**: 20-30 minutes for cards 1-10

---

## Troubleshooting

**TurnActionPanel not appearing**:
- Reload page: F5
- Check browser console: F12 → Console tab
- Verify backend running: `curl http://localhost:3001/health`

**Cards not showing in Hand**:
- Might be loading, wait 2-3 seconds
- Click Hand tab again
- Check console for errors

**Actions not executing**:
- Try clicking button again
- Make sure you're clicking the action button, not the card name
- Check if targeting is required (click target, then confirm)

**Monster not taking damage**:
- Check game log on left side for error message
- Verify attack action was selected
- Check monster health bar on monster sprite

---

## Next Steps After Cards 1-10

1. Document all results in CARD_TEST_STATUS.md
2. If all pass: Continue to cards 11-20
3. If failures found:
   - Note the card name and issue
   - Create GitHub issue
   - Continue with other cards (can fix failures after all tested)

---

## Files to Update After Testing

After completing cards 1-10, update:
- `/home/ubuntu/hexhaven/CARD_TEST_STATUS.md` - Mark cards 1-10 with results
- Create `/home/ubuntu/hexhaven/CARDS_1_10_RESULTS.txt` - Detailed results

---

Ready to begin testing! 🎮

Start by navigating to http://localhost:5173 and following the Game Setup section above.
