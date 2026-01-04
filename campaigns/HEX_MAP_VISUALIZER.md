# Hexhaven Hex Map Visualization Guide

## Hex Grid Coordinate System

Hexhaven uses **Axial Coordinates** (q, r) to represent hex positions:

```
       q increases →

     -2  -1  0  1  2
  0   .  .  .  .  .
  1    .  .  .  .  .
r 2     .  .  .  .  .
  3    .  .  .  .  .
  4   .  .  .  .  .
  ↓
```

## Map Visualization Examples

### Example 1: Village Under Siege (Scenario 1 - Arcane Conspiracy)

```
Hex Map Grid (72 hexes) - Axial Coordinates
Terrain: N = Normal, D = Difficult, O = Obstacle

       -2  -1   0   1   2   3   4
    0   O   D   N   N   N   D   .
    1   .   N   N   N   N   D   .
    2   O   N   N   D   N   N   .
    3   O   D   N   N   N   .   N
    4   .   N   N   N   D   N   N
    5   .   D   N   N   N   D   .
    6   .   N   N   N   .   N   .
    7   .   D   N   N   N   .   .
    8   .   N   N   .   .   N   .
    9   .   .   N   N   N   .   .

Legend:
• = Creature spawn area
✦ = Treasure location
S = Starting position
O = Obstacle/Impassable
D = Difficult terrain (extra movement cost)
N = Normal terrain
. = Not part of map
```

**Key Positions**:
- Starting positions: (0,0), (1,0), (2,0), (0,1)
- Monster group 1: (3,4), (2,6)
- Monster group 2: (4,5)
- Monster group 3: (1,8), (4,3)
- Treasure 1: (1,4) - Gold pouch
- Treasure 2: (-1,7) - Ancient scroll
- Gate objective: (3,8)

### Example 2: Cursed Crypt (Scenario 2 - Arcane Conspiracy)

```
Hex Map Grid (84 hexes)

       -2  -1   0   1   2   3   4
    0   D   N   N   N   N   .   .
    1   N   N   N   N   N   D   N
    2   O   N   N   D   N   N   N
    3   N   D   N   N   N   N   D
    4   N   N   N   N   D   N   N
    5   O   N   N   N   N   N   .
    6   N   N   N   N   N   D   .
    7   N   D   N   D   N   N   .
    8   N   N   N   N   N   N   .
    9   N   N   N   N   N   N   N

Key Positions:
- Living Bones 1: (2,5)
- Living Bones 2: (1,8)
- Living Bones 3: (3,4)
- Bandit Guard 1: (2,7)
- Bandit Guard 2: (0,6)
- Bandit Mage: (1,9) ← Boss/Elite
- Cursed Amulet: (1,4)
- Ancient Tome: (0,5)
- Sanctuary/Curse Focus: (2,9)
```

### Example 3: Tower Entry Hall (Scenario 7 - Arcane Conspiracy)

```
Hex Map Grid (95 hexes) - Large Scale

        -2  -1   0   1   2   3   4   5   6
     0   N   N   N   N   N   N   N   .   .
     1   N   N   N   N   N   N   N   D   N
     2   D   N   N   N   N   D   N   N   N
     3   N   N   N   N   D   N   N   N   D
     4   N   D   N   N   N   N   N   D   N
     5   N   N   N   N   N   N   N   N   N
     6   D   N   N   N   N   N   N   N   D
     7   N   N   N   N   D   N   N   D   N
     8   N   N   N   N   N   N   N   N   N
     9   N   D   N   N   N   N   D   N   N

Key Positions:
- Inox Guard 1: (3,3)
- Inox Guard 2: (1,7)
- Inox Shaman: (4,2)
- Bandit Guard 1: (2,5)
- Bandit Guard 2: (4,7)
- Bandit Archer: (5,1)
- Golem: (6,4) ← Boss
- Arcane Focus: (2,4)
- Mage Ring: (1,9)
- Far Exit: (6,9)
```

### Example 4: Colony Ship Breach (Scenario 1 - Void Expansion)

```
Hex Map Grid (76 hexes) - Space Station Interior

       -1   0   1   2   3   4   5
    0   N   N   N   N   N   .   .
    1   N   N   N   N   N   D   .
    2   D   N   N   D   N   N   N
    3   N   N   N   N   N   N   D
    4   N   D   N   N   D   N   N
    5   N   N   N   N   N   N   N
    6   D   N   N   N   N   D   N
    7   N   N   N   D   N   N   N
    8   N   N   N   N   N   N   N
    9   N   D   N   N   N   N   .

Key Positions:
- Starting positions: (0,0), (1,0), (2,0), (-1,1)
- Alien Drone 1: (2,2)
- Alien Drone 2: (4,3)
- Alien Scout: (3,5)
- Living Bones 1: (1,7)
- Living Bones 2: (4,2)
- Repair Kit: (3,4)
- Emergency Beacon: (2,8)
- Command Center/Breach: (4,8)
```

### Example 5: The Hive World (Scenario 10 - Void Expansion)

```
Hex Map Grid (98 hexes) - Planet Scale

        -2  -1   0   1   2   3   4   5
     0   N   N   N   N   N   N   N   .
     1   N   N   N   N   N   N   N   D
     2   D   N   N   N   N   D   N   N
     3   N   N   N   N   N   N   N   N
     4   N   D   N   N   D   N   N   D
     5   N   N   N   N   N   N   N   N
     6   D   N   N   N   N   N   N   D
     7   N   N   N   N   D   N   N   N
     8   N   N   N   N   N   N   N   N
     9   N   D   N   N   N   N   D   N
    10   N   N   N   N   N   N   N   N

Key Positions:
- Hive Drone 1: (2,3)
- Hive Drone 2: (4,4)
- Hive Drone 3: (1,6)
- Hive Drone 4: (5,8)
- Hive Warrior 1: (2,2)
- Hive Warrior 2: (4,7)
- Hive Priest: (3,9) ← Queen/Boss
- Hive Pheromone: (2,8)
- Biological Core: (3,10)
```

## Visual Map Export Guide

### For Art Generation:
1. Place background image (from art guide)
2. Overlay semi-transparent hex grid with coordinates
3. Mark terrain types with colors:
   - **Green**: Normal terrain
   - **Orange**: Difficult terrain
   - **Dark Red**: Obstacles
4. Mark positions:
   - **Red Circles**: Monsters (size indicates threat level)
   - **Gold Stars**: Treasure
   - **Blue Circles**: Starting positions
   - **Purple Icons**: Objectives

### Color Scheme for Hex Grid Overlay:
```
Green Hex Grid (Normal Terrain):
- Line Color: #00FF00 (lime green)
- Line Opacity: 0.3
- Fill Opacity: 0 (transparent)

Difficult Terrain Highlight:
- Fill Color: #FF8800 (orange)
- Fill Opacity: 0.15
- Border: #FF4400

Obstacle Highlight:
- Fill Color: #440000 (dark red)
- Fill Opacity: 0.3
- Border: #FF0000
```

## Implementation Notes

### For Python/Web Visualization:
```python
def visualize_hex_map(hexes, dimensions=(50, 50)):
    """
    Convert axial coordinates to pixel positions for SVG export

    Args:
        hexes: List of {"q": int, "r": int, "terrain": str}
        dimensions: (width_px, height_px) of each hex

    Returns:
        SVG string with hex grid and terrain overlays
    """
    # Axial to Pixel conversion:
    x = dimensions[0] * (3/2 * q)
    y = dimensions[1] * (sqrt(3)/2 * q + sqrt(3) * r)
```

### For Interactive Maps:
- Use a hex grid library (e.g., HexTiles.js)
- Implement click detection per hex
- Highlight movement range in real-time
- Show terrain modifiers on hover

## Export Format

Save maps in these formats:
1. **SVG** (vector) - For web/print
2. **PNG** (raster) - For in-game display
3. **JSON** (data) - For game mechanics

---

## Coordinate Reference Tables

### Arcane Conspiracy - Scenario Bounds

| Scenario | Min Q | Max Q | Min R | Max R | Total Hexes |
|----------|-------|-------|-------|-------|-------------|
| 1 - Village | -2 | 4 | 0 | 9 | 72 |
| 2 - Crypt | -2 | 4 | 0 | 9 | 84 |
| 4 - Outpost | -2 | 6 | 0 | 9 | 90 |
| 7 - Tower | -2 | 6 | 0 | 9 | 95 |
| 15 - Core | -3 | 7 | 0 | 11 | 110 |

### Void Expansion - Scenario Bounds

| Scenario | Min Q | Max Q | Min R | Max R | Total Hexes |
|----------|-------|-------|-------|-------|-------------|
| 1 - Breach | -1 | 5 | 0 | 9 | 76 |
| 4 - Mining | -2 | 5 | 0 | 9 | 94 |
| 10 - Hive | -2 | 5 | 0 | 10 | 98 |
| 14 - Sector | -2 | 6 | 0 | 10 | 104 |
| 15 - Nexus | -3 | 7 | 0 | 11 | 112 |

