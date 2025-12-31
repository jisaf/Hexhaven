# Gloomhaven Game Rules Documentation

This directory contains the complete Gloomhaven rulebook, split into manageable, topic-focused sections for better organization and AI processing.

## Overview

The original `game-rules.md` file (135KB, 1487 lines) was too large for optimal processing by AI assistants and difficult to navigate. It has been reorganized into a modular structure while preserving all original content.

## Quick Start

**Start here:** [index.md](./index.md) - Navigation hub with links to all sections

## Documentation Structure

### Core Game Mechanics
1. **[core-rules.md](./core-rules.md)** - Components, character mats, ability cards, items, monster statistics, battle goals, attack modifiers
2. **[scenario-setup.md](./scenario-setup.md)** - Setting up scenarios, overlay tiles, scenario levels, map configuration
3. **[character-turns.md](./character-turns.md)** - Card selection, resting, determining initiative, character turn structure

### Combat & Abilities
4. **[combat.md](./combat.md)** - Attack mechanics, advantage/disadvantage, area effects, attack effects, line-of-sight
5. **[conditions-and-elements.md](./conditions-and-elements.md)** - Status conditions (poison, wound, stun, etc.), elemental infusions
6. **[abilities.md](./abilities.md)** - Active bonuses, shield, retaliate, heal, summon, recover/refresh, loot, gaining experience
7. **[character-management.md](./character-management.md)** - Taking damage, exhaustion mechanics, item usage

### Monsters
8. **[monster-rules.md](./monster-rules.md)** - Monster turns, order of action, focus, movement, attacks, special abilities, bosses

### Campaign Mode
9. **[campaign.md](./campaign.md)** - Campaign board, party sheet, character sheet, personal quests, events, achievements
10. **[town-activities.md](./town-activities.md)** - Creating characters, visiting Gloomhaven, leveling up, buying/selling items, enhancing cards, retirement, prosperity
11. **[scenario-completion.md](./scenario-completion.md)** - Finishing scenarios, rewards, special conditions for opening envelopes

### Optional Rules
12. **[variants.md](./variants.md)** - Solo play, open information, reduced randomness, permanent death, random dungeon deck

## Features

### For Developers
- **Modular**: Each file focuses on a specific topic (2000-5000 lines max)
- **AI-Friendly**: Sized appropriately for LLM context windows
- **Maintainable**: Easy to update specific rules without navigating entire rulebook
- **Type-Safe Cross-References**: Links validated and consistent

### For Players
- **Quick Navigation**: Jump directly to the rule section you need
- **Searchable**: Find specific mechanics quickly
- **Complete**: All original content preserved with proper formatting
- **Linked**: Related sections reference each other

## Navigation

Each documentation file includes:
- **Back to Index** link at the top
- **Cross-references** to related sections
- **See Also** sections linking to relevant topics
- Original **page number references** from physical rulebook

## Image References

All images are referenced from the project root:
```markdown
![Description](../../img/rulebook/example.png)
```

## Contributing

When updating game rules documentation:

1. **Find the right file**: Use index.md to locate the appropriate section
2. **Read first**: Use the Read tool to view current content
3. **Edit precisely**: Make targeted changes, preserving formatting
4. **Update cross-references**: If adding new mechanics, link from related sections
5. **Test links**: Verify image paths and cross-references work

## Version History

- **2025-12-31**: Initial modular structure created
  - Split from single 1487-line file
  - Created 13 topic-focused documents
  - Established navigation and cross-reference system
  - Updated all codebase references

## Related Documentation

- [Action System](../action-system.md) - Implementation of game rules in code
- [Deck Management System](../deck-management-system.md) - Card pile mechanics
- [Character System](../character-system.md) - Character state management

## Original Source

This is an unofficial lightweight, searchable copy of the Gloomhaven rulebook. All text is taken directly from the official rule book. Any mistakes in transcription are unintentional.

The original single-file version is preserved at: `/home/ubuntu/hexhaven/game-rules.md`

---

**Questions?** Start with [index.md](./index.md) for quick navigation to any rule topic.
