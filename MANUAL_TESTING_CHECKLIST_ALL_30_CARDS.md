# Manual Testing Checklist - All 30 Hexhaven Cards

**Date**: 2026-01-03
**Duration**: ~60 minutes estimated (2 minutes per card)
**Browser**: http://localhost:5173

---

## Pre-Test Setup (5 minutes)

### Step 1: Start the Game
```
1. Open http://localhost:5173 in your browser
2. Login or Register if needed
3. Click "Create Game"
4. Select a character (e.g., "Brute")
5. Select "Sparring Arena" scenario
6. Click "Start Game"
7. Wait for the game board to load (hex grid should appear)
```

### Step 2: Verify Game is Ready
- You should see the game board with hexes
- On the right side, you should see tabs (Hand, Active, Discard, Lost)
- The "Hand" tab should be visible/clickable
- You're ready to start testing!

---

## Testing Each Card (2 minutes per card)

### For Each Card, Follow This Pattern:

```
1. Click "Hand" tab on the right panel
   └─ You should see cards displayed as buttons

2. Click the card name (e.g., "Basic Strike")
   └─ Card should be highlighted/selected

3. Click "Recovery" card as a pair
   └─ Now you have 2 cards selected

4. Click "Close" button
   └─ The Hand panel closes

5. Click "Confirm" button
   └─ Turn starts, cards are locked in

6. Click "Active" tab
   └─ You should see your 2 cards displayed
   └─ CRITICAL: Look for the TurnActionPanel with action buttons

7. Click a card action button
   └─ If targeting appears: click a target hex
   └─ Watch the game board for action results

8. Click "End Turn"
   └─ Turn completes, record results below
```

---

## Card-by-Card Test Checklist

### CARDS 1-10

#### Card 1: Basic Strike (Initiative 10)
**Actions**: Attack 3 | Move 3 | Modifiers: XP 1

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 2: Multi-Target (Initiative 12)
**Actions**: Attack 2 + Range 3 + Target 2 | Move 3 | Modifiers: range, target

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 3: Healing Touch (Initiative 15)
**Actions**: Heal 4 + Range 2 | Loot 2 | Modifiers: range

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 4: Recovery (Initiative 18)
**Actions**: Special + Recover 2 + Lost | Heal 3 | Modifiers: recover, lost

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 5: Fire Blast (Initiative 20)
**Actions**: Attack 3 + Range 3 + Generate Fire | Move 2 + Consume Fire | Modifiers: range, infuse, consume

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 6: Mind Control (Initiative 22)
**Actions**: Special + Range 3 + Lost + XP 2 | Move 3 | Modifiers: range, lost, xp

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 7: Ice Shield (Initiative 25)
**Actions**: Special + Generate Ice + Shield 2 | Attack 2 + Consume Ice | Modifiers: infuse, shield, consume

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 8: Augmented Power (Initiative 28)
**Actions**: Text "Add +2 Attack" + Persistent | Attack 2 | Modifiers: persistent

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 9: Wind Rush (Initiative 30)
**Actions**: Attack 2 + Generate Air + Push 2 | Move 4 + Jump | Modifiers: infuse, push, jump

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 10: Trap Setter (Initiative 32)
**Actions**: Attack 2 | Special + Range 2 | Modifiers: range

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

---

### CARDS 11-20

#### Card 11: Earth Tremor (Initiative 35)
**Actions**: Attack 2 + Generate Earth + AOE Burst 1 + Immobilize | Special | Modifiers: infuse, aoe, condition

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 12: Phase Walk (Initiative 38)
**Actions**: Attack 3 | Move 4 + Jump | Modifiers: jump

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 13: Radiant Blessing (Initiative 40)
**Actions**: Heal 3 + Generate Light + Range 3 | Special + Bless | Modifiers: infuse, range, condition

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 14: Ally Support (Initiative 42)
**Actions**: Heal 3 + Range 3 | Move 3 | Modifiers: range

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 15: Shadow Strike (Initiative 45)
**Actions**: Attack 4 + Generate Dark + Curse | Special + Invisible | Modifiers: infuse, condition

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 16: Self Heal (Initiative 48)
**Actions**: Heal 5 | Attack 2 | Modifiers: none

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 17: Stunning Blow (Initiative 50)
**Actions**: Attack 3 + Stun + Lost + XP 2 | Move 3 | Modifiers: condition, lost, xp

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 18: Teleport Strike (Initiative 52)
**Actions**: Attack 4 + Lost | Move 3 + Teleport 3 | Modifiers: lost, teleport

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 19: Toxic Blade (Initiative 55)
**Actions**: Attack 2 + Poison + Wound | Move 4 | Modifiers: condition

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 20: Line Attack (Initiative 58)
**Actions**: Attack 2 + AOE Line 3 | Move 3 | Modifiers: aoe

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

---

### CARDS 21-30

#### Card 21: Confusing Strike (Initiative 60)
**Actions**: Attack 2 + Muddle + Disarm | Move 3 | Modifiers: condition

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 22: Cone Blast (Initiative 62)
**Actions**: Attack 2 + AOE Cone 2 | Move 2 | Modifiers: aoe

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 23: Magnetic Pull (Initiative 65)
**Actions**: Attack 2 + Range 4 + Pull 3 | Move 2 + Push 1 | Modifiers: range, pull, push

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 24: Discard Recovery (Initiative 68)
**Actions**: Attack 3 | Special + Discard 1 + Recover 1 | Modifiers: discard, recover

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 25: Empowering Aura (Initiative 70)
**Actions**: Special + Strengthen + Range 2 | Heal 2 | Modifiers: condition, range

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 26: Round Bonus (Initiative 72)
**Actions**: Special + Shield 2 + Round | Move 3 | Modifiers: shield, round

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 27: Piercing Strike (Initiative 75)
**Actions**: Attack 3 + Pierce 2 | Move 3 | Modifiers: pierce

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 28: Mystic Ally (Initiative 80)
**Actions**: Summon Spirit Guardian + Lost + XP 2 | Move 3 | Modifiers: summon, lost, xp

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 29: Persistent Shield (Initiative 85)
**Actions**: Special + Shield 1 + Persistent | Special + Retaliate 2 + Persistent | Modifiers: shield, persistent, retaliate

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

#### Card 30: Sweeping Attack (Initiative 90)
**Actions**: Attack 2 + Target 3 | Move 2 | Modifiers: target

```
⬜ Hand Tab Opens: Y / N
⬜ Card Found: Y / N
⬜ TurnActionPanel Visible: Y / N
⬜ Action Executed: Y / N
⬜ Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
📝 Notes: _______________________________
```

---

## Final Summary (After Testing)

### Overall Results

```
Total Cards Tested: ____ / 30

✅ Passed (All features working):           ____ / 30
⚠️  Partial (Some issues):                  ____ / 30
❌ Failed (Couldn't complete):             ____ / 30

Success Rate: ____%
```

### Critical Finding: TurnActionPanel

**TurnActionPanel Appeared for: _____ cards**

- If TurnActionPanel appeared for most cards → Bug fix is ✅ WORKING
- If TurnActionPanel rarely appeared → Bug fix may have issues
- If TurnActionPanel never appeared → Bug fix not deployed

### Known Issues Found

Card #: ________________
Issue: ________________________________________________

Card #: ________________
Issue: ________________________________________________

Card #: ________________
Issue: ________________________________________________

---

## How to Submit Results

Once you've completed testing, you can:

1. **Take screenshots** of failed cards for documentation
2. **Note any errors** in the browser console (F12 → Console tab)
3. **Create GitHub issues** for any bugs found:
   ```
   Title: [Card Testing] Card X - [Issue Description]
   Labels: bug, testing, card-mechanic
   ```

---

**Estimated Total Time**: 60-90 minutes for all 30 cards
**Key Metric**: TurnActionPanel visibility (confirms bug fix is working)
