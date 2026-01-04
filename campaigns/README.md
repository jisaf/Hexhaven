# Hexhaven Custom Campaigns

This directory contains two complete, original campaigns for Hexhaven with full scenario design, narrative content, custom classes, and art direction guides.

## 📚 Quick Start

**New to these campaigns?** Start here:
1. Read `CAMPAIGNS_SUMMARY.md` for a complete overview
2. Choose a campaign:
   - **Arcane Conspiracy**: Medieval fantasy dungeon crawl
   - **Void Expansion**: Sci-fi space opera
3. Read the campaign markdown file for full narrative
4. Check the art guide for visualization requirements

---

## 📖 Campaign Files

### The Arcane Conspiracy (Dungeon Crawl)
A 15-scenario campaign where players uncover an evil wizard's plot through dungeon exploration, tower infiltration, and a final confrontation in the arcane core.

- **Campaign Guide**: `arcane-conspiracy-campaign.md` (full narrative, 15 scenarios)
- **Art Direction**: `ARCANE_CONSPIRACY_ART_GUIDE.md` (scenario table + visual mood)
- **Game Data**: `arcane-conspiracy-scenarios.json` (hex maps, monsters, objectives)
- **Custom Class**: `arcane-conspiracy-spellbound-class.json` (Spellbound Mage - 15 cards)

**Key Stats**:
- 15 scenarios, Difficulty 1-7
- ~1,325 hexes total
- Branching choices at multiple points
- 2 side quest options
- Estimated playtime: 30-40 hours

---

### The Void Expansion (Space Opera)
A 15-scenario campaign where humanity defends against an alien collective consciousness spreading through dimensions, from space stations to alien planets to their origin nexus.

- **Campaign Guide**: `void-expansion-campaign.md` (full narrative, 15 scenarios)
- **Art Direction**: `VOID_EXPANSION_ART_GUIDE.md` (scenario table + visual mood)
- **Game Data**: `void-expansion-scenarios.json` (hex maps, monsters, objectives)
- **Custom Class**: `void-expansion-operative-class.json` (Void Operative - 15 cards)

**Key Stats**:
- 15 scenarios, Difficulty 1-7
- ~1,380 hexes total
- Branching choices at multiple points
- 2 side quest options
- Estimated playtime: 35-45 hours

---

## 🎨 Art & Visualization

### Scenario Art Table
Both campaigns include detailed art guides with:
- Scenario name and theme
- Image filename for art generation
- Detailed background description
- Visual mood and key elements
- Color palette guidance

**See**: `ARCANE_CONSPIRACY_ART_GUIDE.md` and `VOID_EXPANSION_ART_GUIDE.md`

### Hex Map Visualization
Complete guide to understanding and exporting hex maps:
- Axial coordinate system explained
- Example maps from both campaigns
- Color schemes for terrain
- Export formats (SVG, PNG, JSON)

**See**: `HEX_MAP_VISUALIZER.md`

---

## 🎮 Game Classes

### Spellbound Mage (Arcane Conspiracy)
- **Theme**: Wizard channeling magical spirits
- **Health**: 6-18
- **Hand Size**: 8 cards
- **Specialization**: AoE elemental magic, battlefield control
- **Key Cards**: Fireball, Meteor Storm, Reality Tear, Infernal Chains

### Void Operative (Void Expansion)
- **Theme**: Soldier enhanced with alien technology
- **Health**: 8-24
- **Hand Size**: 10 cards
- **Specialization**: Tactical strikes, defensive positioning, tech adaptation
- **Key Cards**: Plasma Burst, Satellite Strike, Reality Stabilizer, Void Walker Protocol

Both classes have:
- 5 Level 1 cards (starting)
- 5 Level 2 cards (mid-game)
- 5 Level 3 cards (late-game)

---

## 📊 Campaign Structure

### Act Breakdown

**Arcane Conspiracy**:
1. **Act 1 - Discovery** (Scenarios 1-4): Uncover the curse, learn about Malachar
2. **Act 2 - Infiltration** (Scenarios 5-9): Gather strength, enter the tower
3. **Act 3 - Preparation** (Scenarios 10-12): Collect artifacts, weaken wizard's power
4. **Act 4 - Confrontation** (Scenarios 13-15): Final descent and ultimate battle

**Void Expansion**:
1. **Act 1 - Threat Emerges** (Scenarios 1-4): First contact, understand aliens
2. **Act 2 - Understanding** (Scenarios 5-9): Investigate origins, discover dimensions
3. **Act 3 - Counteroffensive** (Scenarios 10-12): Attack hive world, prepare invasion
4. **Act 4 - Invasion** (Scenarios 13-15): Cross dimensions, confront the Architect

---

## 📋 Scenario List

### The Arcane Conspiracy

| # | Name | Diff | Hexes | Type |
|---|---|---|---|---|
| 1 | Village Under Siege | 1 | 72 | Starting |
| 2 | Cursed Crypt | 1 | 84 | Main |
| 3 | Ancient Library | 1 | 68 | Side Quest |
| 4 | Wizard's Outpost | 2 | 90 | Gatekeep |
| 5 | Goblin Mines | 2 | 88 | Choice A |
| 6 | Spectral Halls | 2 | 85 | Choice B |
| 7 | Tower Entry Hall | 3 | 95 | Gatekeep |
| 8 | Tower Library | 3 | 82 | Choice A |
| 9 | Tower Dungeons | 3 | 98 | Choice B |
| 10 | Alchemy Lab | 4 | 92 | Gatekeep |
| 11 | Artifact Chamber | 4 | 86 | Choice A |
| 12 | Portal Guardian | 4 | 88 | Choice B |
| 13 | The Descent | 5 | 100 | Progression |
| 14 | Ritual Chambers | 6 | 102 | Boss Fight |
| 15 | Arcane Core | 7 | 110 | **FINAL BOSS** |

### The Void Expansion

| # | Name | Diff | Hexes | Type |
|---|---|---|---|---|
| 1 | Colony Ship Breach | 1 | 76 | Starting |
| 2 | Station Alpha Defense | 1 | 80 | Main |
| 3 | Alien Wreckage Salvage | 1 | 72 | Side Quest |
| 4 | Mining Station Overrun | 2 | 94 | Gatekeep |
| 5 | Kepler-442 Expedition | 2 | 86 | Choice A |
| 6 | The Void Scouts | 2 | 88 | Choice B |
| 7 | Research Station Lockdown | 3 | 96 | Gatekeep |
| 8 | Genetic Lab Containment | 3 | 90 | Choice A |
| 9 | Quantum Observatory | 3 | 92 | Choice B |
| 10 | The Hive World | 4 | 98 | Gatekeep |
| 11 | Crystalline Caverns | 4 | 94 | Choice A |
| 12 | Orbital Platform | 4 | 90 | Choice B |
| 13 | The Wormhole Transit | 5 | 102 | Progression |
| 14 | The Infected Sector | 6 | 104 | Boss Fight |
| 15 | The Origin Nexus | 7 | 112 | **FINAL BOSS** |

---

## 🔧 Integration Guide

### To add these campaigns to Hexhaven:

1. **Copy scenario data**
   - `cp arcane-conspiracy-scenarios.json ../backend/prisma/seed-data/`
   - `cp void-expansion-scenarios.json ../backend/prisma/seed-data/`

2. **Add character classes**
   - Add Spellbound Mage to `character-classes.json`
   - Add Void Operative to `character-classes.json`

3. **Register campaigns in seed.ts**
   - Add campaign template with scenario references
   - Set up progression/unlock logic

4. **Generate artwork**
   - Use art guides to create/commission 30 scenario backgrounds
   - Export with hex grid overlay
   - Place in `frontend/public/maps/`

5. **Optional enhancements**
   - Record voice acting for narratives
   - Create soundtrack for each campaign
   - Implement visual transitions between scenarios

---

## 📊 Statistics

| Metric | Arcane | Void | Total |
|--------|--------|------|-------|
| Scenarios | 15 | 15 | 30 |
| Total Hexes | 1,325 | 1,380 | 2,705 |
| Difficulty Range | 1-7 | 1-7 | 1-7 |
| Cards (Classes) | 15 | 15 | 30 |
| Decision Points | 4 | 4 | 8 |
| Side Quests | 2 | 2 | 4 |
| Boss Encounters | 2 | 2 | 4 |
| Est. Play Time | 30-40h | 35-45h | 65-85h |

---

## 🎯 Monster Variety

### Arcane Conspiracy Common Enemies
Bandit Guard, Bandit Archer, Living Bones, Inox Guard, Inox Shaman, Golem, Cultist, Wraith, and boss encounters with Inox Warlord and Malachar the Ascended.

### Void Expansion Common Enemies
Alien Drone, Alien Scout, Alien Swarm, Alien Warrior, Alien Tech, Xenomorph, Hybrid (genetic), Consciousness Fragment, and boss encounters with Alien Commander and Architect Prime.

---

## 📝 Document Map

```
campaigns/
├── README.md                                 ← You are here
├── CAMPAIGNS_SUMMARY.md                     ← Overview of everything
├── HEX_MAP_VISUALIZER.md                    ← Map visualization guide
│
├── arcane-conspiracy-campaign.md             ← Full narrative guide
├── arcane-conspiracy-scenarios.json          ← Game data (hex maps, etc)
├── arcane-conspiracy-spellbound-class.json   ← Custom class definition
├── ARCANE_CONSPIRACY_ART_GUIDE.md           ← Art direction table
│
├── void-expansion-campaign.md                ← Full narrative guide
├── void-expansion-scenarios.json             ← Game data (hex maps, etc)
├── void-expansion-operative-class.json       ← Custom class definition
└── VOID_EXPANSION_ART_GUIDE.md              ← Art direction table
```

---

## 🌟 Highlights

### What Makes These Campaigns Special

**Arcane Conspiracy**:
- Medieval dungeon crawl with clear story arc
- Progression from village-scale to world-ending threat
- Choice-based pathways for replayability
- Two side quest options
- Climactic final confrontation with transformed wizard

**Void Expansion**:
- Cosmic space opera with dimensional horror
- Progression from defending home to invading alien homeworld
- Exploration of alien civilization and origins
- Tech vs. biology visual contrast
- Epic scale encounters with alien intelligence

---

## 💡 Usage Tips

1. **First Time?** Read `CAMPAIGNS_SUMMARY.md` for a 5-minute overview
2. **Planning Play?** Check difficulty progression and estimated time
3. **Designing Art?** Use the `ART_GUIDE.md` files - they have everything needed
4. **Game Dev Integration?** See the JSON files and integration guide
5. **Customization?** All scenarios are fully editable - tweak to your needs!

---

## 📜 License

These campaigns were created for Hexhaven and are ready for integration into the game.

---

## Questions?

- **Campaign narrative**: See the full campaign markdown files
- **Hex maps**: See `HEX_MAP_VISUALIZER.md`
- **Art requirements**: See `ARCANE_CONSPIRACY_ART_GUIDE.md` or `VOID_EXPANSION_ART_GUIDE.md`
- **Game integration**: See `CAMPAIGNS_SUMMARY.md` integration section

Enjoy creating your Hexhaven campaigns! 🎲✨

