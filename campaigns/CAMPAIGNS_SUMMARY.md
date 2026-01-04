# Hexhaven Custom Campaigns - Complete Summary

## Project Overview

Two complete 15-scenario campaigns have been designed for Hexhaven with:
- **30 unique scenarios** with detailed hex maps
- **2 custom character classes** (15 cards each)
- **Comprehensive narrative content** (intros, triggers, victories)
- **Complete art direction guides** for map backgrounds
- **Full campaign progression structure** with branching choices

---

## Campaign 1: The Arcane Conspiracy

**Theme**: Dungeon Crawl - Uncover an Evil Wizard's Plan
**Setting**: Medieval fantasy with magical corruption
**Progression**: Villages → Crypts → Tower → Underground Core
**Difficulty**: 1-7

### Scenarios (15 total)
1. **Village Under Siege** (Diff 1) - Starting point, intro to curse
2. **Cursed Crypt** (Diff 1) - First real dungeon
3. **Ancient Library** (Diff 1) - *Side quest option*
4. **Wizard's Outpost** (Diff 2) - First attack on enemy
5. **Goblin Mines** (Diff 2) - Path choice A
6. **The Spectral Halls** (Diff 2) - Path choice B
7. **Tower Entry Hall** (Diff 3) - Major gatekeep
8. **Tower Library** (Diff 3) - Path choice A
9. **Tower Dungeons** (Diff 3) - Path choice B
10. **The Alchemy Lab** (Diff 4) - Major gatekeep
11. **Artifact Chamber** (Diff 4) - Path choice A
12. **Portal Guardian** (Diff 4) - Path choice B
13. **The Descent** (Diff 5) - Final approach
14. **Ritual Chambers** (Diff 6) - Major boss fight
15. **The Arcane Core** (Diff 7) - **FINAL BOSS**

### Custom Class: Spellbound Mage
- **Health**: 6-18 (scales with levels)
- **Hand Size**: 8 cards
- **Specialization**: AoE damage, elemental magic, battlefield control
- **Card Count**: 15 (5 Level 1, 5 Level 2, 5 Level 3)
- **Key Abilities**: Fireball, Infernal Chains, Meteor Storm, Reality Tear

---

## Campaign 2: The Void Expansion

**Theme**: Sci-Fi Space Opera - Defend Against Alien Invasion
**Setting**: Space stations and alien planets
**Progression**: Colony Ship → Stations → Alien Worlds → Alien Homeworld
**Difficulty**: 1-7

### Scenarios (15 total)
1. **Colony Ship Breach** (Diff 1) - Starting point, first contact
2. **Station Alpha Defense** (Diff 1) - Defend major station
3. **Alien Wreckage Salvage** (Diff 1) - *Side quest option*
4. **Mining Station Overrun** (Diff 2) - Major gatekeep
5. **Kepler-442 Expedition** (Diff 2) - Path choice A
6. **The Void Scouts** (Diff 2) - Path choice B
7. **Research Station Lockdown** (Diff 3) - Major gatekeep
8. **Genetic Lab Containment** (Diff 3) - Path choice A
9. **Quantum Observatory** (Diff 3) - Path choice B
10. **The Hive World** (Diff 4) - Major gatekeep
11. **Crystalline Caverns** (Diff 4) - Path choice A
12. **Orbital Platform** (Diff 4) - Path choice B
13. **The Wormhole Transit** (Diff 5) - Cross into alien dimension
14. **The Infected Sector** (Diff 6) - Major boss fight
15. **The Origin Nexus** (Diff 7) - **FINAL BOSS**

### Custom Class: Void Operative
- **Health**: 8-24 (scales with levels)
- **Hand Size**: 10 cards
- **Specialization**: Tactical strikes, defensive positioning, technology adaptation
- **Card Count**: 15 (5 Level 1, 5 Level 2, 5 Level 3)
- **Key Abilities**: Plasma Burst, Satellite Strike, Reality Stabilizer, Void Walker Protocol

---

## File Structure

### Campaign Documentation
```
campaigns/
├── arcane-conspiracy-campaign.md       # Full narrative + scenario descriptions
├── void-expansion-campaign.md          # Full narrative + scenario descriptions
├── ARCANE_CONSPIRACY_ART_GUIDE.md     # Art direction with scenario table
├── VOID_EXPANSION_ART_GUIDE.md        # Art direction with scenario table
└── CAMPAIGNS_SUMMARY.md               # This file
```

### Game Data (JSON)
```
campaigns/
├── arcane-conspiracy-scenarios.json         # Hex maps + scenario data
├── void-expansion-scenarios.json            # Hex maps + scenario data
├── arcane-conspiracy-spellbound-class.json  # 15-card class definition
└── void-expansion-operative-class.json      # 15-card class definition
```

---

## Hex Map Format

All maps use **Axial Coordinates** (q, r) for the hex grid:
- **q**: Column (horizontal, increases left-to-right)
- **r**: Row (vertical, increases top-to-bottom)

### Terrain Types
```json
{
  "q": 0,
  "r": 0,
  "terrain": "normal"              // Normal movement cost
}

{
  "q": 1,
  "r": 1,
  "terrain": "difficult"           // +1 movement cost
}

{
  "q": 2,
  "r": 2,
  "terrain": "obstacle"            // Impassable
}
```

### Map Dimensions
- **Arcane Conspiracy**: 72-110 hexes per scenario (average ~88)
- **Void Expansion**: 76-112 hexes per scenario (average ~92)

### Map Characteristics
- **Branching Design**: Main path with 1-2 larger rooms, 0-3 smaller side rooms
- **Difficulty Progression**: More complex terrain/monster placements at higher difficulties
- **Linear to Circular**: Some maps have linear layouts, others have circular routing

---

## Campaign Progression

### Arcane Conspiracy Structure
```
Act 1: Discovery (Scenarios 1-4)
├─ Village curse investigation
├─ Discover Malachar exists
└─ Attack his outpost

Act 2: Infiltration (Scenarios 5-9)
├─ Strengthen forces (choice of 2 paths)
├─ Enter tower
└─ Learn about the ritual

Act 3: Preparation (Scenarios 10-12)
├─ Gather artifacts
├─ Prevent escape routes
└─ Weaken his power (choice of 2 paths)

Act 4: Confrontation (Scenarios 13-15)
├─ Descend to ritual core
├─ Battle ritual commander (boss)
└─ Face Malachar himself (final boss)
```

### Void Expansion Structure
```
Act 1: Threat Emerges (Scenarios 1-4)
├─ First contact with aliens
├─ Defend home space
└─ Understand their nature

Act 2: Understanding (Scenarios 5-9)
├─ Investigate origins (choice of 2 paths)
├─ Discover dimensional gateways
└─ Learn about hive consciousness

Act 3: Counteroffensive (Scenarios 10-12)
├─ Attack hive world
├─ Infiltrate command (choice of 2 paths)
└─ Prepare invasion of alien dimension

Act 4: Invasion (Scenarios 13-15)
├─ Cross into alien universe
├─ Strike invasion staging area (boss)
└─ Confront Architect Prime (final boss)
```

---

## Custom Classes Statistics

### Spellbound Mage (Arcane Conspiracy)
| Level | Health | Initiative Range | Specialization |
|-------|--------|------------------|-----------------|
| 1 | 6 | 15-52 | AoE attacks, buffs, crowd control |
| 2 | 12 | 25-68 | Advanced elemental magic, positioning |
| 3 | 18 | 36-72 | Reality warping, massive AoE |

**Notable Cards**:
- Fireball (AoE blast)
- Infernal Chains (movement lock)
- Meteor Storm (massive damage)
- Reality Tear (pierce + AoE)
- Arcane Mastery (action copy)

### Void Operative (Void Expansion)
| Level | Health | Initiative Range | Specialization |
|-------|--------|------------------|-----------------|
| 1 | 8 | 22-48 | Tactical positioning, shields |
| 2 | 16 | 24-62 | Multi-target suppression |
| 3 | 24 | 38-70 | Advanced tech, reality stabilization |

**Notable Cards**:
- Plasma Burst (single target)
- Tactical Repositioning (movement + attack)
- Multi-Target Suppression (AoE stun)
- Satellite Strike (massive ranged damage)
- Void Walker Protocol (mobility + AoE)

---

## Monster Usage

### Arcane Conspiracy Common Monsters
- Bandit Guard (melee, common)
- Bandit Archer (ranged, common)
- Living Bones (undead, common)
- Inox Guard (tough, mid-game)
- Inox Shaman (support, mid-game)
- Golem (construct, tough)
- Cultist (minion, various)
- Wraith (spectral, late game)

### Void Expansion Common Monsters
- Alien Drone (melee, common)
- Alien Scout (ranged, common)
- Alien Swarm (swarm, multiple)
- Alien Warrior (tough, mid-game)
- Alien Tech (support, mid-game)
- Xenomorph (boss, dangerous)
- Hybrid (genetic, mid-late)
- Consciousness Fragment (collective, late)

---

## Art Generation Notes

### Hexhaven Visualization
To export hex maps with green grid overlays:

1. **Map Layer**: Background image (from art guide)
2. **Hex Grid Layer**: Semi-transparent green hexagons (axial coordinates)
3. **Terrain Indicators**: Visual distinction between normal/difficult/obstacle
4. **Monster Positions**: Indicated by creature markers

### File Naming Convention
```
{campaign-slug}-scenario-{number:02d}-{name-slug}.png

Examples:
- arcane-conspiracy-scenario-01-village-under-siege.png
- void-expansion-scenario-10-hive-world.png
```

---

## Integration with Hexhaven

To integrate these campaigns into Hexhaven:

1. **Add to Campaign Templates** (`backend/prisma/seed.ts`)
   - Reference the JSON scenario files
   - Add campaign unlock logic

2. **Add to Database Seed** (`backend/prisma/seed-data/`)
   - Copy JSON scenario files to this directory
   - Run database seeding

3. **Add Character Classes** (`backend/prisma/seed-data/character-classes.json`)
   - Add Spellbound Mage definition
   - Add Void Operative definition

4. **Add Maps** (frontend assets)
   - Generate/create art for all 30 scenarios
   - Export with hex grid overlay
   - Place in `frontend/public/maps/`

5. **Add Narratives** (optional)
   - Create voice lines for intro/victory narratives
   - Add background music per scenario

---

## Statistics Summary

| Metric | Arcane Conspiracy | Void Expansion | Total |
|--------|------------------|-----------------|-------|
| Scenarios | 15 | 15 | 30 |
| Total Hexes | ~1,325 | ~1,380 | ~2,705 |
| Difficulty Range | 1-7 | 1-7 | 1-7 |
| Custom Classes | 1 | 1 | 2 |
| Total Cards | 15 | 15 | 30 |
| Decision Points | 4 | 4 | 8 |
| Side Quests | 2 | 2 | 4 |
| Boss Encounters | 2 | 2 | 4 |
| Est. Play Time | 30-40 hrs | 35-45 hrs | 65-85 hrs |

---

## Next Steps

1. **Generate Artwork**: Use art guides to create or commission map backgrounds
2. **Export Hex Maps**: Create visual representations with green hex grids
3. **Database Integration**: Add campaigns to Hexhaven's campaign system
4. **Playtesting**: Test scenario balance and difficulty progression
5. **Narrative Recording**: Optional voice acting and sound design
6. **Polish**: Fine-tune monster placement, treasures, and rewards

---

## Files Generated

✅ Campaign narratives (2 markdown files, ~8,000 words)
✅ Scenario descriptions (30 detailed scenarios)
✅ Custom classes (2 classes × 15 cards each)
✅ Art direction guides (2 comprehensive guides)
✅ Hex map data (JSON format, ready for import)
✅ Monster/objective definitions
✅ Progression structure documentation

