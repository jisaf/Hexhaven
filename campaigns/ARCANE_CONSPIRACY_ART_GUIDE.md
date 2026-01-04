# Arcane Conspiracy Campaign - Art Direction Guide

## Campaign Overview
A dungeon crawl campaign following players as they uncover and confront a wizard's dark ritual. The visual progression should move from villages and crypts (natural, earthy tones) through tower interiors (magical, ornate) to the climactic arcane core (otherworldly, reality-warping).

---

## Scenario Art Requirements

| # | Scenario Name | Image File | Difficulty | Hex Count | Background Description | Visual Mood | Key Elements |
|---|---|---|---|---|---|---|---|
| 1 | Village Under Siege | `village-under-siege.png` | 1 | 72 | A quiet farming village with simple stone cottages, wooden fences, and an old mill. Purple cursed vines wrap around buildings. Magical auras swirl in the air. Small garden plots and a central square with a well. | Ominous, mystical, rural | Cottages, purple vines, magical fog, frightened villagers, wooden structures |
| 2 | Cursed Crypt | `cursed-crypt.png` | 1 | 84 | Underground stone crypt with carved burial chambers. Skeletal remains visible in stone alcoves. Glowing purple curse marks cover the walls. The air feels cold and oppressive. Pillars support the ceiling. | Dark, oppressive, supernatural | Stone pillars, burial alcoves, purple glowing runes, skeleton remains, carved walls |
| 3 | Ancient Library | `ancient-library.png` | 1 | 68 | A crumbling library with toppled bookshelves, scattered tomes, magical wards still flickering. Dust motes dance in dim light. Books float eerily around the shelves. | Mystical, scholarly, abandoned | Floating books, bookshelves, glowing spell wards, dust particles, magical auras, reading desks |
| 4 | Wizard's Outpost | `wizards-outpost.png` | 2 | 90 | A fortified tower on a rocky hilltop surrounded by dead vegetation. Dark energy crackles in the air. Magical guards patrol. Lightning strikes during the scene. | Ominous, dangerous, fortified | Tower structure, barren landscape, crackling energy, dark sky, guards in armor |
| 5 | Goblin Mines | `goblin-mines.png` | 2 | 88 | Sprawling underground mine complex. Wooden support beams creak precariously. Ore glitters in the walls. Dark water pools reflect nothing. Goblins work under supervision. | Industrial, claustrophobic, dark | Mine shafts, wooden supports, ore veins, chains, goblin workers, water pools |
| 6 | The Spectral Halls | `spectral-halls.png` | 2 | 85 | Haunted ruins of an ancient palace. Translucent figures drift through stone walls. Moonlight filters through gaps in the ceiling. Everything feels cold and ethereal. | Haunted, ethereal, melancholic | Spectral figures, crumbling palace, moonlit gaps, stone halls, ghostly lights |
| 7 | Tower Entry Hall | `tower-entry-hall.png` | 3 | 95 | The soaring entrance hall of Malachar's tower. Columns reach toward a distant ceiling. Magical wards shimmer at doorways. Arcane symbols glow in the floor. | Grand, magical, intimidating | Towering columns, glowing floor runes, magical barriers, ornate doors, arcane architecture |
| 8 | Tower Library | `tower-library.png` | 3 | 82 | A massive circular library within the tower. Books float in mid-air. Floating magical tomes illuminate the space. Reading desks hold dark grimoires. Spiraling shelves reach toward the ceiling. | Magical, grandiose, scholarly | Floating books, circular chamber, floating tomes glowing, spiral shelves, magical light sources |
| 9 | Tower Dungeons | `tower-dungeons.png` | 3 | 98 | Cramped prison cells and torture chambers deep within the tower. Iron bars and chains everywhere. Dried bloodstains. The smell of despair lingers (visual must convey this). | Dark, horrifying, oppressive | Prison cells, iron bars, chains, blood stains, torture devices, dim lighting, captives |
| 10 | The Alchemy Lab | `alchemy-lab.png` | 4 | 92 | A massive laboratory filled with bubbling alchemical apparatus. Glowing vials line shelves. Strange formulas cover every surface. Chemical smoke swirls. Alchemical ingredients scattered about. | Scientific, alchemical, chaotic | Bubbling apparatus, glowing vials, chemical formulas on walls, smoke, ingredients |
| 11 | Artifact Chamber | `artifact-chamber.png` | 4 | 86 | A vault of ancient artifacts and magical items. Pedestals hold glowing objects. Protective barriers shimmer around treasures. Everything arranged with obsessive precision. | Luxurious, magical, carefully curated | Pedestals, glowing artifacts, shimmering barriers, ornate vault, organized treasures |
| 12 | Portal Guardian | `portal-guardian.png` | 4 | 88 | A planar gateway chamber. Swirling portals open and close. Reality seems unstable here. The floor is marked with summoning circles. Otherworldly energy emanates. | Interdimensional, unstable, surreal | Swirling portals, summoning circles, warped reality, otherworldly colors, energy vortex |
| 13 | The Descent | `the-descent.png` | 5 | 100 | A spiraling staircase descending into the earth. Walls covered in ancient runes. Temperature drops visibly. Purple light emanates from below. Time feels distorted. | Oppressive, reality-warping, ancient | Spiral staircase, glowing runes, purple light, ancient symbols, distorted perspective |
| 14 | Ritual Chambers | `ritual-chambers.png` | 6 | 102 | A vast underground cathedral. Stone pillars reach toward a distant ceiling. A massive ritual circle dominates the center. Arcane energy crackles everywhere. Captured souls float in crystalline vessels. | Ominous, grand, climactic | Cathedral interior, ritual circle, glowing runes, crystalline vessels with souls, crackling energy |
| 15 | The Arcane Core (FINAL) | `arcane-core.png` | 7 | 110 | The ultimate chamber - a massive spherical room at the tower's heart. A towering nexus of arcane power dominates the center, pulsing with reality-warping energy. Malachar transformed stands radiant with power. | Epic, reality-warping, otherworldly | Spherical chamber, reality-distorting nexus, transformed wizard, swirling arcane energy |

---

## Floor Art Generation Prompts

These prompts guide the art generation process. Replace green hexes with the described floor art, maintain the top-down view, include no items on floors, and preserve aspect ratio.

**IMPORTANT:** Orange (difficult terrain) and red (obstacle) areas should fade out or become semi-transparent/shadowed to visually indicate they are NOT part of the navigable map. The green areas represent the fully walkable floor; orange shows difficult/hazardous zones fading into the shadows; red areas fade to black/void to show complete obstruction. This visual distinction makes it immediately clear which areas are navigable in gameplay.

### Scenario 1: Village Under Siege
**Floor Art Prompt:** Replace the green area with a dirt road and grassy village floor viewed from above. The road should run from the top left corner to the bottom right corner, with natural grass on either side. A small stone well clearing should be visible in the small area to the left side. Include worn dirt paths between building foundations (no buildings visible, just floor level). Orange areas (difficult terrain) should show trampled mud and destroyed crops, but fade/desaturate into shadow as they recede from the green navigable area. Red areas (obstacles) should show scorched earth and cracked stone, fading to black/void to clearly indicate they are not walkable. Everything should have a warm, earthy color palette with hints of purple curse haze settling on the ground.

### Scenario 2: Cursed Crypt
**Floor Prompt:** Replace the green area with stone crypt floor tiles viewed from directly above. Include subtle cracks running through the stone with faint purple glowing lines visible in the cracks. The floor should have carved circular burial chamber markers inlaid in the stone (viewed from above). Orange areas (difficult terrain) should show damaged/broken tiles with exposed earth underneath, fading into shadow. Red areas (obstacles) should display deep cracks with intense purple-glowing energy emanating from below, fading to black void to show they are impassable. The overall tone should be cold gray stone with purple luminescence.

### Scenario 3: Ancient Library
**Floor Prompt:** Replace green areas with aged wooden library floor viewed from above. The wood should show wear and water damage. Scattered book pages and torn parchment should lie across the floor in random patterns. Faint magical ward patterns should be barely visible in the grain. Orange areas (difficult terrain) should show warped/swollen wood and torn pages concentrated here, fading to shadow. Red areas (obstacles) should display burnt wood and ashes from destroyed books, fading to black to indicate impassable wreckage. Include dust mote shadows on the floor suggesting dimension and light filtering from above.

### Scenario 4: Wizard's Outpost
**Floor Prompt:** Replace green areas with barren rocky ground and cracked earth viewed from above. The terrain should look lifeless with dead grass and withered vegetation. Large cracks spider-webbing across the ground should hint at magical damage beneath. Small stones and boulders scattered throughout. Orange areas (difficult terrain) should show burned/charred earth and more extensive cracks, fading into shadow. Red areas (obstacles) should display deep fissures with crackling dark energy visible in the depths, fading to black void. Sky should appear stormy and oppressive in the background.

### Scenario 5: Goblin Mines
**Floor Prompt:** Replace green areas with mine shaft floor made of packed earth and exposed bedrock. Include wooden support beam foundations and shadows they cast from above. Ore veins should be faintly visible in the stone walls/floor boundaries (gold-colored striations). Small piles of ore scattered throughout. Orange areas (difficult terrain) should show collapsed sections with looser rock and debris, fading into shadow. Red areas (obstacles) should display cave-ins with heavy blockages and dangerous unstable stone, fading to black void. The color palette should be browns, grays, and metallics.

### Scenario 6: The Spectral Halls
**Floor Prompt:** Replace green areas with elegant palace marble floor viewed from above. The marble should have subtle veining and be cracked with age. Large decorative floor tiles should form patterns (viewed from above perspective). Phantom footprints should be barely visible as frost patterns on the stone. Orange areas (difficult terrain) should show heavily damaged/broken marble pieces, fading into shadow. Red areas (obstacles) should display large voids where entire floor sections have vanished into shadow/void, completely black and impassable. Cold blue-white color palette with hints of ghostly pale green.

### Scenario 7: Tower Entry Hall
**Floor Prompt:** Replace green areas with grand tower floor made of polished stone with inlaid metallic runes viewed from above. The runes should glow faintly with magical energy (glowing lines in the stone). The floor should be pristine and symmetric, suggesting careful magical placement. Orange areas (difficult terrain) should show where magical wards are degrading with cracked stone and dimmed runes, fading into shadow. Red areas (obstacles) should display broken wards with shattered stone and disrupted magical patterns, fading to black void. Brilliant blues, purples, and golds should dominate the color palette.

### Scenario 8: Tower Library
**Floor Prompt:** Replace green areas with circular stone library floor arranged in concentric rings viewed from above. The floor should be covered with floating book silhouettes creating shadows (as if viewing floating books from below). Magical circle patterns should be visible in the stone rings. Orange areas (difficult terrain) should show disturbed sections where books have crashed to the ground, creating mess and debris, fading into shadow. Red areas (obstacles) should display complete destruction with fragments and magical backlash scars, fading to black void. Warm gold and cool purple light should illuminate the floor.

### Scenario 9: Tower Dungeons
**Floor Prompt:** Replace green areas with dungeon stone floor covered in grime and dampness viewed from above. Include rusted chain attachment points and shadow outlines of restraints on the floor. Dark stains (blood, rust) should create patterns across the stone. Orange areas (difficult terrain) should show blood concentration areas and broken chain links scattered, fading into shadow. Red areas (obstacles) should display fresh blood pools and torn flesh remnants (suggest violence without graphic detail), fading to black void to show complete danger. The palette should be dark grays, blacks, and rust reds with sickly yellow lighting.

### Scenario 10: The Alchemy Lab
**Floor Prompt:** Replace green areas with stone laboratory floor covered with chemical stains and scorch marks viewed from above. Include faint outlines of apparatus bases and burned rings where experiments occurred. Spilled liquid stains (various colors faded) should mark the floor in patterns. Orange areas (difficult terrain) should show active chemical burns and concentrated reagent spills creating hazardous zones, fading into shadow. Red areas (obstacles) should display explosive scorch marks and deep chemical damage to the stone itself, fading to black void. The palette should include browns, grays, and chemical-stain colors (blues, greens, purples faded).

### Scenario 11: Artifact Chamber
**Floor Prompt:** Replace green areas with polished vault floor made of dark stone with metallic inlays viewed from above. The floor should show ornate geometric patterns and pedestals bases arranged symmetrically. Faint energy grid patterns should be visible in the stone, suggesting barrier enchantments. Orange areas (difficult terrain) should show degraded sections where protective barriers are failing, fading into shadow. Red areas (obstacles) should display broken energy patterns with cracked stone and scattered metallic fragments, fading to black void. Rich blacks, golds, and silver should dominate with hints of blue magical auras.

### Scenario 12: Portal Guardian
**Floor Prompt:** Replace green areas with stone ritual floor containing summoning circle patterns viewed from above. The circles should be detailed with arcane symbols and geometric shapes. Faint glowing lines should mark out the circles and connecting pathways. Orange areas (difficult terrain) should show partially activated circles with unstable energy visualization, fading into shadow. Red areas (obstacles) should display fully active/overloaded circles with chaotic energy patterns and torn/blackened stone from reality distortion, fading to black void. Otherworldly colors (purples, blues, unnatural greens) should shimmer across the floor.

### Scenario 13: The Descent
**Floor Prompt:** Replace green areas with spiral staircase floor viewed from a top-down bird's eye perspective showing the spiral pattern. Each step should be visible as you spiral downward. Ancient rune carvings should line the stairs' edges. Orange areas (difficult terrain) should show worn/broken stair sections and faded runes, fading into shadow. Red areas (obstacles) should display shattered stairs with deep cracks and glowing ancient runes becoming more intense, fading to black void. The color should progress from stone gray at top to deep purple and black as you descend in the image.

### Scenario 14: Ritual Chambers
**Floor Prompt:** Replace green areas with cathedral stone floor showing massive ritual circle from above. The circle should contain detailed arcane symbols, concentric rings, and geometric precision. Carved stone floor should show age and purpose. Orange areas (difficult terrain) should show degradation of the outer circle with cracked lines and faded symbols, fading into shadow. Red areas (obstacles) should display the inner core with shattered stone and intense magical backlash patterns, fading to black void. The palette should be dark grays with purple and blue magical light, becoming more intense toward the center.

### Scenario 15: The Arcane Core (FINAL)
**Floor Prompt:** Replace green areas with a spherical chamber floor (perspective showing it's curved) with flowing arcane patterns that seem to move and twist when viewed. The floor should display impossible geometry with patterns that don't follow normal perspective. Ancient runes should spiral inward toward a central nexus point. Orange areas (difficult terrain) should show reality distortion with warped and impossible floor sections, fading into shadow. Red areas (obstacles) should display complete reality breakdown with fractured geometry and reality tears, fading to black void. The palette should include all magical colors combined (purple, blue, green, gold) in impossible unnatural ways that hurt to look at.

---

## Color Palette Guide

### Early Game (Scenarios 1-3)
- **Primary Colors**: Earthy browns, forest greens, stone grays
- **Accent Colors**: Purple (curse), gold (magical highlights)
- **Mood**: Natural with magical corruption

### Mid Game (Scenarios 4-9)
- **Primary Colors**: Dark grays, blacks, deep purples
- **Accent Colors**: Bright blues (magical wards), orange (fire), purple (arcane power)
- **Mood**: Increasingly magical and architectural

### Late Game (Scenarios 10-15)
- **Primary Colors**: Black, deep purple, iridescent colors
- **Accent Colors**: Bright whites (magic), rainbow iridescence (dimensional rifts)
- **Mood**: Otherworldly and epic

---

## Map Background Specifications

All maps should use a consistent hex grid overlay (hexagons approximately 40-60px diameter) with:
- Semi-transparent hex outlines (for gameplay readability)
- Clear terrain differentiation:
  - **Normal terrain**: Light gray/green base
  - **Difficult terrain**: Darker shade with visual obstruction
  - **Obstacles**: Solid black or complete obstruction marker

---

## Progression Notes

1. **Early Stages**: Emphasize natural environments corrupted by dark magic
2. **Middle Stages**: Transition to magical architecture and supernatural spaces
3. **Final Stages**: Reality itself should appear warped and unstable
4. **Boss Encounters**: Each major location should have an oppressive feeling of power and malevolence

---

## Specific Location Details

### Village Under Siege (Scenario 1)
- Must show a working village in distress
- Include NPCs (villagers) showing fear
- Purple magical effects should be obvious but not overwhelming
- Small scale, intimate feeling

### Cursed Crypt (Scenario 2)
- Underground, enclosed feeling
- Show burial chambers with disturbed remains
- Purple runes should be a visual focal point
- Cold, dead color palette

### Tower Entry Hall (Scenario 7)
- Transition point - first look at the main threat
- Grand architecture showing wizard's power
- Should inspire awe and dread simultaneously
- Large, imposing scale

### The Arcane Core (Scenario 15)
- Most otherworldly and reality-warping appearance
- Should look impossible/unstable
- Malachar should appear transcendent and terrible
- Reality should appear to be bending

