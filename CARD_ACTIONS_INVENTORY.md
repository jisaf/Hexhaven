# Complete Hexhaven Card Actions Inventory

## Executive Summary

**Total IconTestClass Cards**: 30
**Total Action Slots**: 60 (30 cards × 2 actions each)
**Unique Action Types**: 7
**Unique Modifier Types**: 20
**Total Distinct Action/Modifier Combinations**: 44+

This document provides the complete inventory of all card actions and modifiers in the Hexhaven IconTestClass, organized by type and function.

---

## Action Type Inventory (7 Types)

### 1. ATTACK Actions (18 cards)
Direct damage to enemies. Can include modifiers for range, target count, piercing, and element generation.

**Cards**:
1. Basic Strike (3 damage)
2. Fire Blast (3 damage + range 3 + generate fire)
3. Wind Rush (2 damage + generate air + push 2)
4. Earth Tremor (2 damage + generate earth + AOE burst 1 + immobilize)
5. Shadow Strike (4 damage + generate dark + curse)
6. Stunning Blow (3 damage + stun + lost + xp)
7. Toxic Blade (2 damage + poison + wound)
8. Confusing Strike (2 damage + muddle + disarm)
9. Trap Setter (2 damage top action)
10. Phase Walk (3 damage)
11. Self Heal (2 damage bottom action)
12. Teleport Strike (4 damage + lost)
13. Line Attack (2 damage + AOE line 3)
14. Cone Blast (2 damage + AOE cone 2)
15. Magnetic Pull (2 damage + range 4 + pull 3)
16. Discard Recovery (3 damage)
17. Piercing Strike (3 damage + pierce 2)
18. Sweeping Attack (2 damage + target 3)

**Modifiers Often Combined**:
- range (distance to target)
- target (number of enemies)
- pierce (armor penetration)
- condition (status effects)
- element generation (fire, ice, air, earth, light, dark)

---

### 2. MOVE Actions (20 cards)
Character movement on hex grid. Can include jump (over obstacles) and special movement types.

**Cards with MOVE**:
1. Basic Strike (3 movement)
2. Multi-Target (3 movement)
3. Healing Touch (loot 2 bottom, not move)
4. Fire Blast (2 movement + consume fire bonus)
5. Ice Shield (attack 2 bottom, not move)
6. Wind Rush (4 movement + jump)
7. Earth Tremor (special bottom, not move)
8. Phase Walk (4 movement + jump)
9. Radiant Blessing (special + bless bottom)
10. Ally Support (3 movement)
11. Shadow Strike (special + invisible bottom)
12. Stunning Blow (3 movement)
13. Teleport Strike (3 movement + teleport range 3)
14. Toxic Blade (4 movement)
15. Line Attack (3 movement)
16. Cone Blast (2 movement)
17. Magnetic Pull (2 movement + push 1)
18. Discard Recovery (special bottom, not move)
19. Round Bonus (3 movement)
20. Piercing Strike (3 movement)

**Special Movement Modifiers**:
- jump: move through obstacles (Wind Rush, Phase Walk)
- teleport: move to specific hex within range (Teleport Strike)
- push: move enemy away (Wind Rush, Magnetic Pull)
- pull: move enemy toward you (Magnetic Pull)

---

### 3. HEAL Actions (7 cards)
Restore health to character or allies.

**Cards**:
1. Healing Touch (4 heal + range 2)
2. Recovery (3 heal + recover 2 + lost)
3. Radiant Blessing (3 heal + generate light + range 3 to all-allies)
4. Ally Support (3 heal + range 3 to target ally)
5. Self Heal (5 heal to self)
6. Empowering Aura (2 heal to self)
7. (Healing Touch has loot 2 bottom action)

**Modifiers on Heals**:
- range (distance to heal target)
- target type (self, allies, all-allies)
- elements (light element from Radiant Blessing)

---

### 4. LOOT Actions (1 card)
Gain gold/resources.

**Cards**:
1. Healing Touch (2 loot on bottom action)

**Modifiers**: None specific to loot in seed data

---

### 5. SPECIAL Actions (11 cards)
Unique effects not covered by standard action types.

**Cards and Effects**:
1. Recovery - recover 2 cards from discard
2. Mind Control - control enemy action (range 3, lost, xp 2)
3. Ice Shield - generate ice + shield 2
4. Augmented Power - text "Add +2 Attack" + persistent buff
5. Trap Setter - create trap on hex (range 2)
6. Earth Tremor - create obstacle on hex
7. Radiant Blessing - apply bless condition (range 3)
8. Shadow Strike - apply invisible condition
9. Persistent Shield - apply shield 1 + persistent AND retaliate 2 + persistent
10. Empowering Aura - apply strengthen to allies (range 2)
11. Round Bonus - apply shield 2 for current round
12. Discard Recovery - discard 1 card + recover 1 card

**Modifiers on Specials**:
- conditions (bless, strengthen, invisible, shield, retaliate)
- lost (card goes to lost pile)
- persistent (effect lasts multiple rounds)
- range (for area specials)

---

### 6. SUMMON Actions (1 card)
Summon ally creatures to help in battle.

**Cards**:
1. Mystic Ally - summons "Spirit Guardian"
   - HP: 5
   - ATK: 2
   - MOV: 3
   - RNG: 2
   - Icon: 👻 (ghost)
   - Modifiers: lost (card disappears), xp 2 (gain XP)

---

### 7. TEXT Actions (1 card)
Descriptive text actions that provide unique effects or explain card mechanics.

**Cards**:
1. Augmented Power
   - Title: "AUGMENT"
   - Description: "Add +2 Attack to all your attacks this round."
   - Quote: "Channel the power within."
   - Modifier: persistent (lasts whole round)

---

## Modifier Type Inventory (20 Types)

### Range Modifiers (8 cards)
Extend action reach beyond adjacent hexes.

**Cards**: Multi-Target, Healing Touch, Fire Blast, Trap Setter, Radiant Blessing, Ally Support, Empowering Aura, Magnetic Pull

**Values**: distance 2, 3, or 4 hexes

---

### Target Modifiers (2 cards)
Allow attacking multiple enemies in single action.

**Cards**: Multi-Target (target 2), Sweeping Attack (target 3)

**Effect**: Distribute damage across multiple enemies

---

### Pierce Modifiers (1 card)
Ignore armor/defense of enemies.

**Cards**: Piercing Strike (pierce 2 = ignore 2 armor)

**Effect**: Damage bypasses enemy defenses

---

### AOE Modifiers (3 cards)
Area-of-effect patterns that hit multiple enemies.

**Cards**:
- Earth Tremor (burst pattern, size 1)
- Line Attack (line pattern, size 3)
- Cone Blast (cone pattern, size 2)

**Patterns**: burst (circular), line (straight), cone (wedge)

---

### Jump Modifier (2 cards)
Allow movement through obstacles and walls.

**Cards**: Wind Rush, Phase Walk

**Effect**: Character can traverse normally-blocked terrain

---

### Teleport Modifier (1 card)
Allow moving to specific hex within range.

**Cards**: Teleport Strike (range 3)

**Effect**: Jump to exact position up to 3 hexes away

---

### Push Modifier (2 cards)
Force enemy away from player.

**Cards**: Wind Rush (distance 2), Magnetic Pull (distance 1 on bottom action)

**Effect**: Enemy moves away involuntarily

---

### Pull Modifier (1 card)
Force enemy toward player.

**Cards**: Magnetic Pull (distance 3)

**Effect**: Enemy moves closer involuntarily

---

### Infuse Modifiers (6 cards)
Introduce elemental effects that persist for consumption.

**Cards and Elements**:
- Fire Blast: fire element
- Ice Shield: ice element
- Wind Rush: air element
- Earth Tremor: earth element
- Radiant Blessing: light element
- Shadow Strike: dark element

**Elements Available**: fire, ice, air, earth, light, dark

**Usage**: Elements can be consumed by other actions for bonuses

---

### Consume Modifiers (2 cards)
Use previously-generated elements for bonuses.

**Cards**:
- Fire Blast bottom: consume fire → move +2 bonus
- Ice Shield bottom: consume ice → damage +2 bonus

**Effect**: Conditional bonus if element is available

---

### Condition Modifiers (7 cards, 10 unique conditions)
Apply status effects to enemies or allies.

**Cards and Conditions**:
1. Earth Tremor: immobilize (enemy cannot move)
2. Radiant Blessing: bless (positive buff to allies)
3. Shadow Strike: curse (negative effect) + invisible (stealth)
4. Stunning Blow: stun (enemy loses turn) + lost (card disappears)
5. Toxic Blade: poison (damage over time) + wound (reduced damage)
6. Confusing Strike: muddle (random actions) + disarm (lose attack bonus)
7. Empowering Aura: strengthen (increased damage to allies)

**Conditions**: stun, poison, wound, muddle, disarm, immobilize, curse, invisible, bless, strengthen

**Duration Types**:
- round: effect lasts 1 round
- until-consumed: effect lasts until another card consumes it
- (various other durations based on game mechanics)

---

### Round Modifier (1 card)
Effect tied to round cycle.

**Cards**: Round Bonus (shield 2 lasts current round, resets next round)

**Effect**: Temporary protection that refreshes each round

---

### Persistent Modifier (3 cards)
Effects that last multiple rounds until card is lost/consumed.

**Cards**:
- Augmented Power (persistent buff lasts whole round and beyond)
- Persistent Shield (both actions have persistent)

**Effect**: Bonuses continue until explicitly removed

---

### Lost Modifier (5 cards)
Card goes to "lost" pile after use (stronger effect, use once per rest).

**Cards**:
1. Recovery
2. Mind Control
3. Stunning Blow
4. Teleport Strike
5. Mystic Ally

**Effect**: Card unavailable for 1-2 rounds until character rests

---

### Recover Modifier (2 cards)
Bring cards back from discard pile.

**Cards**:
- Recovery (recover 2 cards)
- Discard Recovery (recover 1 card)

**Effect**: Reuse cards from discard by spending an action

---

### Discard Modifier (1 card)
Move card from hand to discard.

**Cards**: Discard Recovery (discard 1 card)

**Effect**: Voluntary card discard for action economy trade-off

---

### Shield Modifiers (3 cards)
Damage reduction effect.

**Cards**:
- Ice Shield (shield 2, round duration)
- Persistent Shield (shield 1, persistent)
- Round Bonus (shield 2, round duration)

**Values**: 2 damage block or 1 damage block

**Duration**: round (refresh each turn) or persistent (multi-round)

---

### Retaliate Modifier (1 card)
Counter-attack when taking damage.

**Cards**: Persistent Shield (retaliate 2, persistent)

**Effect**: Deal 2 damage back to attacker automatically

---

### XP Modifier (4 cards)
Gain experience points.

**Cards**:
- Basic Strike (xp 1)
- Mind Control (xp 2)
- Stunning Blow (xp 2)
- Mystic Ally (xp 2)

**Values**: 1 or 2 XP per use

---

## Action/Modifier Combinations Summary

### Most Complex Cards (Multiple Modifiers)

**Earth Tremor** (5 modifiers):
- infuse (earth)
- aoe (burst, size 1)
- condition (immobilize)
- range (implied area)
- create obstacle effect

**Fire Blast** (5 modifiers including consume):
- range (3)
- infuse (fire)
- consume (fire → bonus movement)
- range (bottom action)
- movement bonus

**Magnetic Pull** (4 modifiers):
- range (4)
- pull (3)
- push (1)
- movement (2)

**Persistent Shield** (4 modifiers on 2 actions):
- shield (1) + persistent
- retaliate (2) + persistent

**Shadow Strike** (4 modifiers):
- infuse (dark)
- condition (curse)
- condition (invisible)
- movement implications

### Simplest Cards (Minimal Modifiers)

**Basic Strike**: attack + move (no modifiers)
**Self Heal**: heal + attack (no modifiers)
**Phase Walk**: attack + move + jump (1 modifier)

---

## Strategic Card Grouping

### Offensive Cards (Heavy Damage Dealers)
- Teleport Strike (attack 4)
- Shadow Strike (attack 4)
- Piercing Strike (attack 3 + pierce)
- Stunning Blow (attack 3 + stun)

### Defensive Cards (Protection/Healing)
- Self Heal (heal 5)
- Healing Touch (heal 4)
- Persistent Shield (shield 1 + retaliate)
- Round Bonus (shield 2)

### Element Cards (Generate/Consume Synergies)
- Fire Blast (generate fire + consume fire)
- Ice Shield (generate ice + consume ice)
- Wind Rush (generate air)
- Earth Tremor (generate earth)
- Radiant Blessing (generate light)
- Shadow Strike (generate dark)

### Condition Cards (Status Effects)
- Stunning Blow (stun)
- Toxic Blade (poison + wound)
- Confusing Strike (muddle + disarm)
- Earth Tremor (immobilize)
- Radiant Blessing (bless allies)
- Empowering Aura (strengthen allies)

### Movement Cards (Repositioning)
- Wind Rush (push 2)
- Magnetic Pull (pull 3 + push 1)
- Teleport Strike (teleport 3)
- Phase Walk (jump)

### Card Economy (Discard/Recover/Lost)
- Recovery (recover 2)
- Discard Recovery (discard 1 + recover 1)
- Mind Control (lost)
- Stunning Blow (lost)
- Teleport Strike (lost)
- Mystic Ally (lost)

---

## Element System

### Elements: fire, ice, air, earth, light, dark

**Fire**: Wind Rush, Fire Blast bottom consumes for movement bonus
**Ice**: Ice Shield, Ice Shield bottom consumes for damage bonus
**Air**: Wind Rush (generated)
**Earth**: Earth Tremor (generated)
**Light**: Radiant Blessing (generated)
**Dark**: Shadow Strike (generated)

### Consumption Bonuses
- Fire → movement +2
- Ice → damage +2
- Others: consumable for condition removal or game effects

---

## Condition System

### Enemy Conditions (Negative)
- **stun**: enemy loses next action
- **poison**: damage over time (each turn)
- **wound**: reduced damage output
- **muddle**: random/confused actions
- **disarm**: no attack bonus
- **immobilize**: cannot move
- **curse**: general negative effect

### Ally Conditions (Positive)
- **bless**: positive buff
- **strengthen**: increased damage
- **invisible**: stealth effect

---

## Initiative System

Cards execute in order of initiative (lowest to highest):
1. Basic Strike (10)
2. Multi-Target (12)
3. Healing Touch (15)
4. Recovery (18)
5. Fire Blast (20)
6. Mind Control (22)
7. Ice Shield (25)
8. Augmented Power (28)
9. Wind Rush (30)
10. Trap Setter (32)
11. Earth Tremor (35)
12. Phase Walk (38)
13. Radiant Blessing (40)
14. Ally Support (42)
15. Shadow Strike (45)
16. Self Heal (48)
17. Stunning Blow (50)
18. Teleport Strike (52)
19. Toxic Blade (55)
20. Line Attack (58)
21. Confusing Strike (60)
22. Cone Blast (62)
23. Magnetic Pull (65)
24. Discard Recovery (68)
25. Empowering Aura (70)
26. Round Bonus (72)
27. Piercing Strike (75)
28. Mystic Ally (80)
29. Persistent Shield (85)
30. Sweeping Attack (90)

---

## Testing Priorities

### High Priority (Complex Mechanics)
1. **Mystic Ally**: Summon mechanic - critical for game flow
2. **Fire Blast/Ice Shield**: Element generation/consumption synergy
3. **Persistent Shield**: Both actions persistent - verify both work
4. **Augmented Power**: Text action + persistent buff
5. **Earth Tremor**: AOE + condition combination

### Medium Priority (Condition Application)
- All condition cards (Stunning Blow, Toxic Blade, etc.)
- Range modifiers with targeting
- AOE patterns (burst, line, cone)

### Low Priority (Basic Mechanics)
- Simple attack/move cards
- Single-modifier cards
- Basic heal actions

---

## Known Issues / Verification Needed

**From Previous Session:**
- ✅ TurnActionPanel rendering fix deployed and tested
- ⏳ All 30 cards need systematic testing with new fix

**Areas Needing Verification:**
1. Element persistence between actions
2. Condition application to correct targets
3. Persistent effect duration
4. Lost card behavior on rest
5. Summon AI behavior
6. AOE pattern hit detection

---

## Conclusion

The IconTestClass provides comprehensive coverage of all major game mechanics through 30 carefully-designed cards. With 20 modifier types distributed across 44+ action/modifier combinations, this class serves as an excellent test bed for game systems.

All cards are documented and ready for systematic testing with the TurnActionPanel fix now deployed.
