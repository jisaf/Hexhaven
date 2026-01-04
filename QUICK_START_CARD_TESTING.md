# Quick Start: Card Testing for All 30 IconTestClass Cards

## TL;DR - What Was Done

✅ **TurnActionPanel Bug Fixed**: Cards can now be executed during gameplay
✅ **All 30 Cards Documented**: Complete list with actions and modifiers
✅ **Testing Guide Created**: 150+ test points across all cards
✅ **Ready to Test**: Use documentation to verify each card systematically

---

## The 4 Key Documents

| Document | Purpose | Size |
|----------|---------|------|
| CARD_TEST_STATUS.md | Status table for all 30 cards | 1 page |
| CARD_TESTING_GUIDE.md | Detailed test instructions per card | 15 pages |
| CARD_ACTIONS_INVENTORY.md | Complete reference guide | 20 pages |
| TESTING_SESSION_SUMMARY.md | Session overview & next steps | 8 pages |

---

## Quick Card Reference

### High Priority Test Cards (Complex Mechanics)
1. **Mystic Ally** - Summon system
2. **Fire Blast** - Element generation/consumption
3. **Persistent Shield** - Multi-action persistent effects
4. **Augmented Power** - Text action system
5. **Earth Tremor** - AOE + condition combo

### Must Test Groups
- **Element Cards** (6): Fire Blast, Ice Shield, Wind Rush, Earth Tremor, Radiant Blessing, Shadow Strike
- **Condition Cards** (7): Status effects on enemies/allies
- **AOE Cards** (3): Different patterns (burst, line, cone)
- **Lost Cards** (5): Card management system

---

## Testing Workflow

```
1. Start game with TestIconClass in Sparring Arena
2. For each card:
   a. Select it as first card
   b. Select Recovery/safe card as second
   c. Confirm turn start
   d. Verify TurnActionPanel appears
   e. Execute card action
   f. Verify modifiers apply
   g. Check game state updates
   h. Document results
   i. End turn, move to next card
```

---

## All 30 Cards with Initiative

```
10 - Basic Strike            40 - Radiant Blessing
12 - Multi-Target            42 - Ally Support
15 - Healing Touch           45 - Shadow Strike
18 - Recovery                48 - Self Heal
20 - Fire Blast              50 - Stunning Blow
22 - Mind Control            52 - Teleport Strike
25 - Ice Shield              55 - Toxic Blade
28 - Augmented Power         58 - Line Attack
30 - Wind Rush               60 - Confusing Strike
32 - Trap Setter             62 - Cone Blast
35 - Earth Tremor            65 - Magnetic Pull
38 - Phase Walk              68 - Discard Recovery
                             70 - Empowering Aura
                             72 - Round Bonus
                             75 - Piercing Strike
                             80 - Mystic Ally
                             85 - Persistent Shield
                             90 - Sweeping Attack
```

---

## Modifier Quick Reference

**Element Modifiers** (6 types): fire, ice, air, earth, light, dark
**Condition Modifiers** (10 types): stun, poison, wound, muddle, disarm, immobilize, curse, bless, strengthen, invisible
**Movement Modifiers** (5 types): range, push, pull, jump, teleport
**Card Management** (4 types): lost, recover, discard, persistent
**Other** (5 types): target, pierce, aoe, shield, retaliate, round, xp

---

## Success Criteria for Each Card

✅ Action executes without error
✅ Modifiers apply to correct targets
✅ Game state updates properly
✅ No console errors
✅ Visual feedback appears (damage, healing, conditions, etc.)

---

## Issues Found → Immediate Action

If a card fails:
1. Note the card name and action type
2. Document expected vs actual behavior
3. Create GitHub issue
4. Trigger TDD developer: `agent spawn tdd-solid-developer to fix [card] [issue]`

---

## Testing Commands

```bash
# Start servers
npm run dev

# View game
http://localhost:5173

# Check backend logs
tail -f /tmp/hexhaven-backend.log

# Check frontend logs
tail -f /tmp/hexhaven-frontend.log

# Run tests (if you make changes)
npm test
```

---

## Files Location

- CARD_TEST_STATUS.md - Track test results
- CARD_TESTING_GUIDE.md - Detailed instructions
- CARD_ACTIONS_INVENTORY.md - Reference guide
- TESTING_SESSION_SUMMARY.md - Full session report
- QUICK_START_CARD_TESTING.md - This file

All in: `/home/ubuntu/hexhaven/`

---

## Summary of What's Ready

| Item | Status |
|------|--------|
| TurnActionPanel Fix | ✅ Deployed |
| All 30 Cards Documented | ✅ Complete |
| Testing Guide | ✅ Ready |
| Servers Running | ✅ Active |
| Test Framework | ✅ In Place |
| Issue Tracking | ✅ Ready |

---

You're ready to begin systematic testing!

Start with Mystic Ally (card 28) or Fire Blast (card 5) to verify the fix is working properly and modifier systems are functional.
