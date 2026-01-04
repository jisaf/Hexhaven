# Card Testing Guide - Systematic Verification of All 30 Cards

## Testing Objectives

Verify that all 30 IconTestClass cards function correctly with the TurnActionPanel fix deployed. Test each card's:
1. **Top action** - executes correctly
2. **Bottom action** - executes correctly
3. **All modifiers** - apply their effects as intended
4. **Initiative** - affects turn order correctly

## Game Setup Instructions

### Step 1: Create Fresh Game
```
1. Navigate to: http://localhost:5173
2. Login/Register if needed
3. Create new character: "CardTester-[timestamp]"
4. Select class: TestIconClass (or Brute as fallback)
5. Create new game in Sparring Arena scenario
6. Verify TurnActionPanel appears when cards selected
```

### Step 2: Card Selection Pattern
```
For each card to test:
  1. Open Hand tab
  2. Select the specific card as first card (top)
  3. Select Recovery or another safe card as second card (bottom)
  4. Close Hand panel
  5. Click "Confirm" to start turn
  6. Verify TurnActionPanel appears in Active tab
  7. Execute the card action
  8. Document results
  9. Click "End Turn" to proceed to next round
  10. Repeat for next card
```

---

## Detailed Card Test Cases

### Cards 1-5: Basic Actions & Elements

#### 1. Basic Strike (Initiative 10)
- **Top Action**: attack 3 + xp 1
- **Bottom Action**: move 3
- **Test**: Deal 3 damage to monster, gain 1 XP, move 3 hexes
- **Expected**: Monster health -3, player moves 3 hexes

#### 2. Multi-Target (Initiative 12)
- **Top Action**: attack 2 + range 3 + target 2 enemies
- **Bottom Action**: move 3
- **Test**: Attack 2 enemies within range 3, each taking 2 damage
- **Expected**: Both enemies visible and hittable, both take 2 damage

#### 3. Healing Touch (Initiative 15)
- **Top Action**: heal 4 + range 2
- **Bottom Action**: loot 2
- **Test**: Heal 4 HP to an ally within range 2, gain 2 loot
- **Expected**: Healing action available (self-heal if solo), gain 2 gold

#### 4. Recovery (Initiative 18)
- **Top Action**: special + recover 2 + lost
- **Bottom Action**: heal 3
- **Test**: Recover 2 cards from discard, card goes to lost, heal 3 HP
- **Expected**: 2 cards moved from discard to hand, Recovery card disappears (lost), heal 3 HP

#### 5. Fire Blast (Initiative 20)
- **Top Action**: attack 3 + range 3 + generate fire
- **Bottom Action**: move 2 + consume fire (bonus: move +2 = total move 4)
- **Test**: Attack with fire element, next action consumes fire for bonus movement
- **Verify**:
  - Fire generated on first action
  - Fire available for consumption on bottom action
  - Movement increases from 2 to 4 when fire consumed

---

### Cards 6-10: Range & Position Modifiers

#### 6. Mind Control (Initiative 22)
- **Top Action**: special + range 3 + lost + xp 2
- **Bottom Action**: move 3
- **Test**: Control enemy action (if implemented), get 2 XP, card is lost
- **Expected**: Card disappears after use, gain 2 XP

#### 7. Ice Shield (Initiative 25)
- **Top Action**: special + generate ice + shield 2
- **Bottom Action**: attack 2 + consume ice (bonus: damage +2 = total 4)
- **Test**: Generate ice shield (blocks 2 damage), consume for attack bonus
- **Expected**:
  - Shield indicator shows after top action
  - Shield reduces incoming damage by 2
  - Attack increases from 2 to 4 when ice consumed

#### 8. Augmented Power (Initiative 28)
- **Top Action**: text "Add +2 Attack to all your attacks this round" + persistent
- **Bottom Action**: attack 2
- **Test**: Apply persistent buff that adds +2 damage to all attacks
- **Expected**:
  - Buff text displays clearly
  - Subsequent attacks in round deal +2 bonus
  - Buff persists through round

#### 9. Wind Rush (Initiative 30)
- **Top Action**: attack 2 + generate air + push 2
- **Bottom Action**: move 4 + jump
- **Test**: Attack with push (move monster 2 hexes), move with jump (can cross obstacles)
- **Expected**:
  - Monster pushed 2 hexes away
  - Character can jump over obstacles/walls
  - Air element available after top action

#### 10. Trap Setter (Initiative 32)
- **Top Action**: attack 2
- **Bottom Action**: special + create trap + range 2
- **Test**: Set trap on ground within range 2
- **Expected**: Trap visible on hex, monsters trigger it on movement

---

### Cards 11-15: AOE & Conditions

#### 11. Earth Tremor (Initiative 35)
- **Top Action**: attack 2 + generate earth + AOE burst 1 + immobilize enemy
- **Bottom Action**: special (create obstacle)
- **Test**: Attack in burst pattern affecting nearby enemies, apply immobilize condition
- **Expected**:
  - Multiple enemies hit in burst pattern
  - Immobilize condition applied (enemy cannot move next turn)
  - Obstacle created on selected hex

#### 12. Phase Walk (Initiative 38)
- **Top Action**: attack 3
- **Bottom Action**: move 4 + jump
- **Test**: Attack normally, move 4 with ability to jump/teleport
- **Expected**: Can move through walls/obstacles, move 4 total

#### 13. Radiant Blessing (Initiative 40)
- **Top Action**: heal 3 + generate light + range 3 (all-allies)
- **Bottom Action**: special + bless condition
- **Test**: Heal all allies within range, apply bless buff
- **Expected**:
  - All allies healed 3 HP each
  - Bless condition shows on allies
  - Light element generated

#### 14. Ally Support (Initiative 42)
- **Top Action**: heal 3 + range 3 (target ally)
- **Bottom Action**: move 3
- **Test**: Heal specific ally within range 3
- **Expected**: Can target allies (or self if solo), heal 3 HP

#### 15. Shadow Strike (Initiative 45)
- **Top Action**: attack 4 + generate dark + curse enemy
- **Bottom Action**: special + invisible condition
- **Test**: Attack dealing 4 damage with curse, apply invisibility buff
- **Expected**:
  - Attack deals 4 damage
  - Curse condition on monster
  - Invisibility makes character invisible (if visible mechanic exists)

---

### Cards 16-20: Healing & Special Effects

#### 16. Self Heal (Initiative 48)
- **Top Action**: heal 5
- **Bottom Action**: attack 2
- **Test**: Heal self for 5 HP, attack for 2 damage
- **Expected**: Health increases by 5, attack deals 2 damage

#### 17. Stunning Blow (Initiative 50)
- **Top Action**: attack 3 + stun + lost + xp 2
- **Bottom Action**: move 3
- **Test**: Stun enemy (cannot take action next turn), card is lost, gain 2 XP
- **Expected**:
  - Stun condition applied to monster
  - Card moves to lost pile
  - Gain 2 XP

#### 18. Teleport Strike (Initiative 52)
- **Top Action**: attack 4 + lost
- **Bottom Action**: move 3 + teleport (range 3)
- **Test**: Deal 4 damage, move 3 with teleport ability
- **Expected**:
  - Attack deals 4 damage
  - Teleport allows jumping to any hex within range 3
  - Card is lost after use

#### 19. Toxic Blade (Initiative 55)
- **Top Action**: attack 2 + poison + wound
- **Bottom Action**: move 4
- **Test**: Apply poison and wound conditions, move 4
- **Expected**:
  - Poison condition reduces health each turn
  - Wound condition reduces damage output
  - Both conditions appear on monster

#### 20. Line Attack (Initiative 58)
- **Top Action**: attack 2 + AOE line 3
- **Bottom Action**: move 3
- **Test**: Attack in line pattern hitting enemies in a line
- **Expected**: All enemies in 3-hex line take 2 damage each

---

### Cards 21-25: Movement & Recovery

#### 21. Confusing Strike (Initiative 60)
- **Top Action**: attack 2 + muddle + disarm
- **Bottom Action**: move 3
- **Test**: Apply muddle (random action) and disarm (lose attack bonus) conditions
- **Expected**:
  - Muddle shown on monster
  - Disarm shown on monster
  - Monster's next action affected

#### 22. Cone Blast (Initiative 62)
- **Top Action**: attack 2 + AOE cone 2
- **Bottom Action**: move 2
- **Test**: Attack in cone pattern (2-hex radius), move 2
- **Expected**: All enemies in cone pattern take 2 damage

#### 23. Magnetic Pull (Initiative 65)
- **Top Action**: attack 2 + range 4 + pull 3
- **Bottom Action**: move 2 + push 1
- **Test**: Attack from range 4 with pull 3 (enemy moves 3 toward player), push 1
- **Expected**:
  - Can attack enemy 4 hexes away
  - Enemy pulled 3 hexes closer
  - Push 1 hex away on bottom action

#### 24. Discard Recovery (Initiative 68)
- **Top Action**: attack 3
- **Bottom Action**: special + discard 1 + recover 1
- **Test**: Attack for 3 damage, discard 1 card from hand and recover 1 from discard
- **Expected**:
  - Attack deals 3 damage
  - Choose 1 card to discard
  - Choose 1 card from discard to recover

#### 25. Empowering Aura (Initiative 70)
- **Top Action**: special + strengthen + range 2
- **Bottom Action**: heal 2
- **Test**: Apply strengthen buff to allies within range 2, heal self 2
- **Expected**:
  - Strengthen condition on nearby allies
  - Self healed 2 HP
  - Allies gain +1 damage bonus

---

### Cards 26-30: Advanced Effects

#### 26. Round Bonus (Initiative 72)
- **Top Action**: special + shield 2 + round
- **Bottom Action**: move 3
- **Test**: Apply round-based shield (2 damage block, resets each round)
- **Expected**:
  - Shield 2 indicator appears
  - Shield resets at start of next round
  - Move 3 hexes on bottom action

#### 27. Piercing Strike (Initiative 75)
- **Top Action**: attack 3 + pierce 2
- **Bottom Action**: move 3
- **Test**: Attack that ignores 2 points of enemy armor
- **Expected**:
  - Attack deals 3 + pierces 2 armor (total 5 effective)
  - Monster shows reduced armor
  - Move 3 hexes

#### 28. Mystic Ally (Initiative 80)
- **Top Action**: summon Spirit Guardian (HP 5, ATK 2, MOV 3, RNG 2) + lost + xp 2
- **Bottom Action**: move 3
- **Test**: Summon ally creature, card goes to lost, gain 2 XP
- **Expected**:
  - Spirit Guardian appears on board
  - Ally has correct stats (HP 5, ATK 2, MOV 3, RNG 2)
  - Can control ally's actions
  - Card moves to lost pile
  - Gain 2 XP

#### 29. Persistent Shield (Initiative 85)
- **Top Action**: special + shield 1 + persistent (lasts multiple rounds)
- **Bottom Action**: special + retaliate 2 + persistent
- **Test**: Both actions apply persistent effects lasting multiple rounds
- **Expected**:
  - Shield 1 persists beyond current round
  - Retaliate 2 (counter-attack) persists
  - Both effects continue until card lost/rest

#### 30. Sweeping Attack (Initiative 90)
- **Top Action**: attack 2 + target 3 (hit 3 enemies)
- **Bottom Action**: move 2
- **Test**: Hit 3 separate enemies each dealing 2 damage
- **Expected**:
  - Can select up to 3 enemies
  - Each takes 2 damage
  - Highest initiative (90) executes last in turn order

---

## Modifier Testing Checklist

### Element Modifiers (Infuse/Consume)
- [ ] Fire element: generate and consume for move bonus
- [ ] Ice element: generate and consume for damage bonus
- [ ] Air element: generate (Wind Rush)
- [ ] Earth element: generate (Earth Tremor)
- [ ] Light element: generate (Radiant Blessing)
- [ ] Dark element: generate (Shadow Strike)

### Position Modifiers (Range/AOE/Movement)
- [ ] Range: attack/action from distance (Healing Touch range 2, Multi-Target range 3, etc.)
- [ ] AOE: affect multiple targets (Earth Tremor burst, Line Attack, Cone Blast)
- [ ] Push: move enemy away (Wind Rush, Magnetic Pull)
- [ ] Pull: move enemy toward player (Magnetic Pull)
- [ ] Jump: move through obstacles (Wind Rush, Phase Walk)
- [ ] Teleport: jump to specific hex (Teleport Strike)

### Condition Modifiers
- [ ] Stun: prevent enemy action (Stunning Blow)
- [ ] Poison: damage over time (Toxic Blade)
- [ ] Wound: reduce damage output (Toxic Blade)
- [ ] Muddle: random actions (Confusing Strike)
- [ ] Disarm: reduce attack power (Confusing Strike)
- [ ] Immobilize: prevent movement (Earth Tremor)
- [ ] Curse: negative effect (Shadow Strike)
- [ ] Invisible: stealth (Shadow Strike)
- [ ] Bless: positive effect (Radiant Blessing)
- [ ] Strengthen: increased damage (Empowering Aura)

### Card Management Modifiers
- [ ] Lost: card goes to lost pile (Recovery, Stunning Blow, Teleport Strike, Mystic Ally)
- [ ] Recover: bring cards back from discard (Recovery, Discard Recovery)
- [ ] Discard: move cards to discard (Discard Recovery)
- [ ] Persistent: effect lasts multiple rounds (Augmented Power, Persistent Shield x2, Round Bonus)

### Other Modifiers
- [ ] Shield: damage reduction (Ice Shield, Persistent Shield, Round Bonus)
- [ ] Retaliate: counter-attack (Persistent Shield)
- [ ] XP: experience points (Basic Strike, Mind Control, Stunning Blow, Mystic Ally)
- [ ] Target: hit multiple enemies (Multi-Target, Sweeping Attack)
- [ ] Pierce: ignore armor (Piercing Strike)
- [ ] Range: attack/action distance (various)
- [ ] Round: effect tied to round cycle (Round Bonus)

---

## Success Criteria

✅ **Test Pass** if:
- Card action executes without errors
- All modifiers apply their intended effects
- Effects apply to correct targets
- No duplicate or missing effects
- Game state updates correctly
- No console errors

❌ **Test Fail** if:
- Card action doesn't execute
- Modifier doesn't apply
- Wrong effect applied
- Wrong targets affected
- Game state not updated
- Console shows errors

---

## Bug Documentation Template

When a bug is found, document:
```
## Issue: [Card Name] - [Action Type] - [Problem Description]

Card: [Name] (Initiative [#])
Action: [top/bottom]
Expected: [What should happen]
Actual: [What happened instead]
Modifiers Affected: [List]
Severity: [critical/high/medium/low]
Reproducibility: [Always/Sometimes/Rarely]

Steps to Reproduce:
1. ...
2. ...
3. ...

Screenshots/Logs: [If applicable]
```

---

## Session Recording

All testing should be recorded to: `frontend/public/test-videos/card-test-[timestamp].mp4`

This allows reviewing complex interactions and debugging modifier applications.
