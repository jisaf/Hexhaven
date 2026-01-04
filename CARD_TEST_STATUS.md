# Hexhaven Card Action Testing - All 30 IconTestClass Cards

**Test Date**: 2026-01-03
**Tester**: Automated Test Suite
**Branch**: fix/multi-char-long-rest-and-game-creation
**Target Scenario**: Sparring Arena (Solo)

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total Cards | 30 |
| Action Types | 7 (attack, move, heal, loot, special, summon, text) |
| Modifier Types | 20 |
| Cards Tested | 0 |
| Cards Passing | 0 |
| Cards Failing | 0 |

---

## Test Status Table

| # | Card Name | Initiative | Top Action | Bottom Action | Modifiers | Status |
|---|-----------|-----------|-----------|--------------|-----------|--------|
| 1 | Basic Strike | 10 | attack 3 | move 3 | xp 1 | ⏳ Pending |
| 2 | Multi-Target | 12 | attack 2 + range 3 + target 2 | move 3 | range, target | ⏳ Pending |
| 3 | Healing Touch | 15 | heal 4 + range 2 | loot 2 | range | ⏳ Pending |
| 4 | Recovery | 18 | special + recover 2 + lost | heal 3 | recover, lost | ⏳ Pending |
| 5 | Fire Blast | 20 | attack 3 + range 3 + generate fire | move 2 + consume fire (+move 2) | range, infuse, consume | ⏳ Pending |
| 6 | Mind Control | 22 | special + range 3 + lost + xp 2 | move 3 | range, lost, xp | ⏳ Pending |
| 7 | Ice Shield | 25 | special + generate ice + shield 2 | attack 2 + consume ice (+damage 2) | infuse, shield, consume | ⏳ Pending |
| 8 | Augmented Power | 28 | text "Add +2 Attack" + persistent | attack 2 | persistent | ⏳ Pending |
| 9 | Wind Rush | 30 | attack 2 + generate air + push 2 | move 4 + jump | infuse, push, jump | ⏳ Pending |
| 10 | Trap Setter | 32 | attack 2 | special + range 2 | range | ⏳ Pending |
| 11 | Earth Tremor | 35 | attack 2 + generate earth + aoe burst 1 + immobilize | special | infuse, aoe, condition | ⏳ Pending |
| 12 | Phase Walk | 38 | attack 3 | move 4 + jump | jump | ⏳ Pending |
| 13 | Radiant Blessing | 40 | heal 3 + generate light + range 3 (all-allies) | special + bless | infuse, range, condition | ⏳ Pending |
| 14 | Ally Support | 42 | heal 3 + range 3 (target ally) | move 3 | range | ⏳ Pending |
| 15 | Shadow Strike | 45 | attack 4 + generate dark + curse | special + invisible | infuse, condition | ⏳ Pending |
| 16 | Self Heal | 48 | heal 5 | attack 2 | - | ⏳ Pending |
| 17 | Stunning Blow | 50 | attack 3 + stun + lost + xp 2 | move 3 | condition, lost, xp | ⏳ Pending |
| 18 | Teleport Strike | 52 | attack 4 + lost | move 3 + teleport 3 | lost, teleport | ⏳ Pending |
| 19 | Toxic Blade | 55 | attack 2 + poison + wound | move 4 | condition | ⏳ Pending |
| 20 | Line Attack | 58 | attack 2 + aoe line 3 | move 3 | aoe | ⏳ Pending |
| 21 | Confusing Strike | 60 | attack 2 + muddle + disarm | move 3 | condition | ⏳ Pending |
| 22 | Cone Blast | 62 | attack 2 + aoe cone 2 | move 2 | aoe | ⏳ Pending |
| 23 | Magnetic Pull | 65 | attack 2 + range 4 + pull 3 | move 2 + push 1 | range, pull, push | ⏳ Pending |
| 24 | Discard Recovery | 68 | attack 3 | special + discard 1 + recover 1 | discard, recover | ⏳ Pending |
| 25 | Empowering Aura | 70 | special + strengthen + range 2 | heal 2 | condition, range | ⏳ Pending |
| 26 | Round Bonus | 72 | special + shield 2 + round | move 3 | shield, round | ⏳ Pending |
| 27 | Piercing Strike | 75 | attack 3 + pierce 2 | move 3 | pierce | ⏳ Pending |
| 28 | Mystic Ally | 80 | summon Spirit Guardian + lost + xp 2 | move 3 | summon, lost, xp | ⏳ Pending |
| 29 | Persistent Shield | 85 | special + shield 1 + persistent | special + retaliate 2 + persistent | shield, persistent, retaliate | ⏳ Pending |
| 30 | Sweeping Attack | 90 | attack 2 + target 3 | move 2 | target | ⏳ Pending |

---

## Modifier Coverage Matrix

| Modifier Type | Cards Using | Tested |
|---------------|------------|--------|
| range | Multi-Target, Healing Touch, Fire Blast, Trap Setter, Radiant Blessing, Ally Support, Empowering Aura, Magnetic Pull | ⏳ |
| target | Multi-Target, Sweeping Attack | ⏳ |
| pierce | Piercing Strike | ⏳ |
| aoe | Earth Tremor, Line Attack, Cone Blast | ⏳ |
| jump | Wind Rush, Phase Walk | ⏳ |
| teleport | Teleport Strike | ⏳ |
| push | Wind Rush, Magnetic Pull | ⏳ |
| pull | Magnetic Pull | ⏳ |
| infuse | Fire Blast, Ice Shield, Wind Rush, Earth Tremor, Radiant Blessing, Shadow Strike | ⏳ |
| consume | Fire Blast, Ice Shield | ⏳ |
| condition | Earth Tremor, Radiant Blessing, Shadow Strike, Stunning Blow, Toxic Blade, Confusing Strike, Empowering Aura | ⏳ |
| round | Round Bonus | ⏳ |
| persistent | Augmented Power, Persistent Shield (x2) | ⏳ |
| lost | Recovery, Mind Control, Stunning Blow, Teleport Strike, Mystic Ally | ⏳ |
| recover | Recovery, Discard Recovery | ⏳ |
| discard | Discard Recovery | ⏳ |
| shield | Ice Shield, Persistent Shield, Round Bonus | ⏳ |
| retaliate | Persistent Shield | ⏳ |
| heal | (modifier on cards with heal action) | ⏳ |
| xp | Basic Strike, Mind Control, Stunning Blow, Mystic Ally | ⏳ |

---

## Action Type Coverage

| Action Type | Cards | Examples | Status |
|------------|-------|----------|--------|
| attack | 18 | Basic Strike, Fire Blast, Wind Rush, Earth Tremor, etc. | ⏳ |
| move | 20 | Basic Strike, Multi-Target, Healing Touch, etc. | ⏳ |
| heal | 7 | Healing Touch, Recovery, Radiant Blessing, Ally Support, Self Heal, Empowering Aura | ⏳ |
| loot | 1 | Healing Touch | ⏳ |
| special | 11 | Recovery, Mind Control, Ice Shield, Augmented Power, Trap Setter, Earth Tremor, etc. | ⏳ |
| summon | 1 | Mystic Ally | ⏳ |
| text | 1 | Augmented Power | ⏳ |

---

## Testing Notes

- All cards will be tested in solo Sparring Arena scenario
- TurnActionPanel fix should be verified working during each test
- All card actions and modifiers will be documented as they execute
- Any bugs found will trigger immediate TDD developer issue
- Tests will be sequential to avoid server/state conflicts

---

## Issues Found During Testing

*None yet - testing in progress*

---

## Legend

- ⏳ Pending - Not yet tested
- ✅ Pass - Card executed successfully, all actions and modifiers work as expected
- ❌ Fail - Card failed to execute or modifiers didn't apply correctly
- ⚠️ Partial - Some aspects work, some don't
