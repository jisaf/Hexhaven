# Gloomhaven Game Rules

> **For AI Agents**: Start with this index, then read specific sections as needed for your task.

This directory contains the complete Gloomhaven rulebook split into manageable sections for easier reference and AI processing.

## Quick Navigation

### Core Game Mechanics (Most Referenced)

| Document | Size | Content |
|----------|------|---------|
| [Character Turns](./character-turns.md) | 39KB | Card selection, resting, initiative, turn structure, movement, attacks |
| [Combat System](./combat.md) | 12KB | Attack mechanics, advantage/disadvantage, area effects, line-of-sight |
| [Conditions & Elements](./conditions-and-elements.md) | 7KB | Status conditions (stun, poison, etc.), elemental infusions |
| [Monster Rules](./monster-rules.md) | 11KB | Monster turns, focus, movement, attacks, bosses |

### Character & Abilities

| Document | Size | Content |
|----------|------|---------|
| [Character Abilities](./abilities.md) | 9KB | Shield, retaliate, heal, summon, recover, loot, XP |
| [Character Management](./character-management.md) | 2KB | Damage, exhaustion, item usage |
| [Core Rules](./core-rules.md) | 15KB | Components, character mats, ability cards, modifier decks |

### Campaign & Progression

| Document | Size | Content |
|----------|------|---------|
| [Campaign Overview](./campaign.md) | 12KB | Campaign board, party sheet, character sheet, personal quests |
| [End of Round](./end-of-round.md) | 6KB | Round cleanup, scenario completion checks |
| [Scenario Completion](./scenario-completion.md) | 2KB | Victory/defeat conditions, rewards |

### Reference (Large Files)

| Document | Size | Content |
|----------|------|---------|
| [Town Activities](./town-activities.md) | 124KB | Full rulebook content - leveling, items, enhancements, retirement |

## Round Structure Quick Reference

```
1. CARD SELECTION    → Each player selects 2 cards OR declares long rest
2. INITIATIVE        → Reveal leading cards, determine turn order
3. CHARACTER TURNS   → Move, Attack, Abilities in initiative order
4. MONSTER TURNS     → AI-controlled based on ability cards
5. END OF ROUND      → Element decay, short rest, round tracker
```

## Key Concepts for Implementation

### Turn Order
- Initiative = leading card's initiative value
- Ties: players choose, then monsters by standee number
- Long rest = initiative 99

### Combat Flow
```
Attack Value + Modifier Card - Shield = Damage
```
- Modifier deck: 20 cards (+0, +1, -1, +2, -2, 2x, null, etc.)
- Advantage: draw 2, use better
- Disadvantage: draw 2, use worse

### Conditions
| Negative | Positive |
|----------|----------|
| Poison (+1 dmg taken) | Strengthen (advantage) |
| Wound (1 dmg/turn) | Invisible (untargetable) |
| Muddle (disadvantage) | Regenerate (heal 1/turn) |
| Immobilize (can't move) | Ward (halve next damage) |
| Disarm (can't attack) | Bless (+2 to deck) |
| Stun (lose turn) | |

### Elements
- **States**: Inert → Strong → Waning → Inert
- **Generation**: Card effect creates element at Strong
- **Consumption**: Use Strong/Waning for bonus, returns to Inert
- **Decay**: End of round, Strong→Waning, Waning→Inert

## Original Source

Based on the official Gloomhaven rulebook. The complete single-file version: `/home/ubuntu/hexhaven/game-rules.md`
