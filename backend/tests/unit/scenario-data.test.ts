/**
 * Unit Test: Load Scenario Data (5 scenarios with maps and objectives) (US5 - T167)
 *
 * Tests:
 * 1. Scenario JSON file loads successfully
 * 2. All 5 scenarios are present
 * 3. Each scenario has required attributes (name, difficulty, map, monsters, objectives)
 * 4. Map layouts are unique per scenario
 * 5. Monster groups are valid
 * 6. Player start positions are defined
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Scenario Data Loading (US5 - T167)', () => {
  let scenarioData: any;

  beforeAll(() => {
    // Load scenario data JSON
    const dataPath = path.join(__dirname, '../../src/data/scenarios.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    scenarioData = JSON.parse(rawData);
  });

  it('should load scenarios.json successfully', () => {
    expect(scenarioData).toBeDefined();
    expect(scenarioData.scenarios).toBeDefined();
    expect(Array.isArray(scenarioData.scenarios)).toBe(true);
  });

  it('should contain all 5 scenarios', () => {
    const scenarios = scenarioData.scenarios;
    expect(scenarios.length).toBeGreaterThanOrEqual(5);
  });

  it('should have unique scenario IDs', () => {
    const scenarios = scenarioData.scenarios;
    const ids = scenarios.map((scenario: any) => scenario.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(scenarios.length);

    // IDs should follow pattern "scenario-{number}"
    ids.forEach((id: string) => {
      expect(id).toMatch(/^scenario-\d+$/);
    });
  });

  it('should have unique scenario names', () => {
    const scenarios = scenarioData.scenarios;
    const names = scenarios.map((scenario: any) => scenario.name);
    const uniqueNames = new Set(names);

    expect(uniqueNames.size).toBe(scenarios.length);

    // Names should be meaningful strings
    names.forEach((name: string) => {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(3);
    });
  });

  it('should have valid difficulty levels', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      expect(scenario.difficulty).toBeDefined();
      expect(typeof scenario.difficulty).toBe('number');
      expect(scenario.difficulty).toBeGreaterThanOrEqual(0);
      expect(scenario.difficulty).toBeLessThanOrEqual(7); // Max difficulty is 7
    });
  });

  it('should have primary objectives for each scenario', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      expect(scenario.objectivePrimary).toBeDefined();
      expect(typeof scenario.objectivePrimary).toBe('string');
      expect(scenario.objectivePrimary.length).toBeGreaterThan(5); // Meaningful objective
    });
  });

  it('should have unique map layouts for each scenario', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      expect(scenario.mapLayout).toBeDefined();
      expect(Array.isArray(scenario.mapLayout)).toBe(true);
      expect(scenario.mapLayout.length).toBeGreaterThan(10); // Minimum viable map size
    });

    // Verify different scenarios have different map sizes
    const mapSizes = scenarios.map((scenario: any) => scenario.mapLayout.length);
    const uniqueSizes = new Set(mapSizes);

    // At least some scenarios should have different map sizes
    expect(uniqueSizes.size).toBeGreaterThan(1);
  });

  it('should have valid hex tiles in map layouts', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      scenario.mapLayout.forEach((tile: any) => {
        // Valid coordinates
        expect(tile.coordinates).toBeDefined();
        expect(typeof tile.coordinates.q).toBe('number');
        expect(typeof tile.coordinates.r).toBe('number');

        // Valid terrain
        expect(tile.terrain).toBeDefined();
        expect(['normal', 'obstacle', 'difficult', 'hazardous']).toContain(tile.terrain);

        // Has required tile attributes
        expect(tile).toHaveProperty('occupiedBy');
        expect(tile).toHaveProperty('hasLoot');
        expect(tile).toHaveProperty('hasTreasure');
      });
    });
  });

  it('should have unique hex coordinates within each scenario', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      const coordinates = scenario.mapLayout.map(
        (tile: any) => `${tile.coordinates.q},${tile.coordinates.r}`
      );
      const uniqueCoords = new Set(coordinates);

      expect(uniqueCoords.size).toBe(scenario.mapLayout.length);
    });
  });

  it('should have valid monster groups for each scenario', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      expect(scenario.monsterGroups).toBeDefined();
      expect(Array.isArray(scenario.monsterGroups)).toBe(true);
      expect(scenario.monsterGroups.length).toBeGreaterThan(0); // At least one monster group

      scenario.monsterGroups.forEach((group: any) => {
        expect(group.type).toBeDefined();
        expect(typeof group.type).toBe('string');
        expect(group.count).toBeGreaterThan(0);
        expect(Array.isArray(group.spawnPoints)).toBe(true);
        expect(group.spawnPoints.length).toBe(group.count); // Spawn point for each monster
        expect(typeof group.isElite).toBe('boolean');
      });
    });
  });

  it('should have valid spawn points within map bounds', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      const validCoordinates = new Set(
        scenario.mapLayout.map((tile: any) => `${tile.coordinates.q},${tile.coordinates.r}`)
      );

      scenario.monsterGroups.forEach((group: any) => {
        group.spawnPoints.forEach((spawn: any) => {
          const spawnKey = `${spawn.q},${spawn.r}`;
          expect(validCoordinates.has(spawnKey)).toBe(true);
        });
      });
    });
  });

  it('should have valid player start positions', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      expect(scenario.playerStartPositions).toBeDefined();
      expect(typeof scenario.playerStartPositions).toBe('object');

      // playerStartPositions is a Record<number, AxialCoordinates[]>
      // Should support player counts from 1-4
      const playerCounts = Object.keys(scenario.playerStartPositions);
      expect(playerCounts.length).toBeGreaterThanOrEqual(2); // At least support 2 player counts

      const validCoordinates = new Set(
        scenario.mapLayout.map((tile: any) => `${tile.coordinates.q},${tile.coordinates.r}`)
      );

      // Check each player count's start positions
      playerCounts.forEach((count: string) => {
        const positions = scenario.playerStartPositions[count];
        expect(Array.isArray(positions)).toBe(true);
        expect(positions.length).toBe(parseInt(count)); // Should have positions for all players

        positions.forEach((pos: any) => {
          const posKey = `${pos.q},${pos.r}`;
          expect(validCoordinates.has(posKey)).toBe(true);
        });
      });
    });
  });

  it('should have required scenario attributes', () => {
    const scenarios = scenarioData.scenarios;

    const requiredAttributes = [
      'id',
      'name',
      'difficulty',
      'objectivePrimary',
      'mapLayout',
      'monsterGroups',
      'playerStartPositions'
    ];

    scenarios.forEach((scenario: any) => {
      requiredAttributes.forEach(attr => {
        expect(scenario).toHaveProperty(attr);
      });
    });
  });

  it('should load Black Barrow (scenario-1) with expected values', () => {
    const blackBarrow = scenarioData.scenarios.find((s: any) => s.id === 'scenario-1');

    expect(blackBarrow).toBeDefined();
    expect(blackBarrow.name).toBe('Black Barrow');
    expect(blackBarrow.difficulty).toBe(1);
    expect(blackBarrow.objectivePrimary).toContain('Kill all enemies');
    expect(blackBarrow.mapLayout.length).toBe(16);
    expect(blackBarrow.treasures).toBeDefined();
    expect(blackBarrow.treasures.length).toBeGreaterThan(0);
  });

  it('should load Crypt of Blood (scenario-2) with hazardous terrain', () => {
    const cryptOfBlood = scenarioData.scenarios.find((s: any) => s.id === 'scenario-2');

    expect(cryptOfBlood).toBeDefined();
    expect(cryptOfBlood.name).toBe('Crypt of Blood');
    expect(cryptOfBlood.difficulty).toBe(2);
    expect(cryptOfBlood.objectivePrimary).toContain('Survive');

    // Check for hazardous terrain
    const hazardousTiles = cryptOfBlood.mapLayout.filter(
      (tile: any) => tile.terrain === 'hazardous'
    );
    expect(hazardousTiles.length).toBeGreaterThan(0);

    // Check for difficult terrain
    const difficultTiles = cryptOfBlood.mapLayout.filter(
      (tile: any) => tile.terrain === 'difficult'
    );
    expect(difficultTiles.length).toBeGreaterThan(0);
  });

  it('should load Inox Encampment (scenario-3) with larger map', () => {
    const inoxEncampment = scenarioData.scenarios.find((s: any) => s.id === 'scenario-3');

    expect(inoxEncampment).toBeDefined();
    expect(inoxEncampment.name).toBe('Inox Encampment');
    expect(inoxEncampment.objectivePrimary).toContain('Inox Shaman');

    // Inox Encampment should have a larger map than Black Barrow
    const blackBarrow = scenarioData.scenarios.find((s: any) => s.id === 'scenario-1');
    expect(inoxEncampment.mapLayout.length).toBeGreaterThan(blackBarrow.mapLayout.length);
  });

  it('should have different monster types per scenario', () => {
    const scenarios = scenarioData.scenarios;

    const scenario1Monsters = scenarios[0].monsterGroups.map((g: any) => g.type);
    const scenario2Monsters = scenarios[1].monsterGroups.map((g: any) => g.type);

    // Different scenarios should have different monster sets
    const overlap = scenario1Monsters.filter((type: string) => scenario2Monsters.includes(type));

    // Some scenarios might share monsters, but not all
    expect(scenario1Monsters).not.toEqual(scenario2Monsters);
  });

  it('should have monster stats defined in monster groups', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      scenario.monsterGroups.forEach((group: any) => {
        expect(group.stats).toBeDefined();
        expect(group.stats.health).toBeGreaterThan(0);
        expect(group.stats.movement).toBeGreaterThanOrEqual(0);
        expect(group.stats.attack).toBeGreaterThanOrEqual(0);
        expect(group.stats.range).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(group.stats.specialAbilities)).toBe(true);
      });
    });
  });

  it('should have elite monsters with higher stats than normal', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      const monstersByType = new Map<string, any[]>();

      scenario.monsterGroups.forEach((group: any) => {
        if (!monstersByType.has(group.type)) {
          monstersByType.set(group.type, []);
        }
        monstersByType.get(group.type)!.push(group);
      });

      // Check if any monster type has both elite and normal variants
      monstersByType.forEach((groups: any[], type: string) => {
        const eliteGroup = groups.find(g => g.isElite);
        const normalGroup = groups.find(g => !g.isElite);

        if (eliteGroup && normalGroup) {
          // Elite should have higher health or attack
          const eliteStronger =
            eliteGroup.stats.health > normalGroup.stats.health ||
            eliteGroup.stats.attack > normalGroup.stats.attack;
          expect(eliteStronger).toBe(true);
        }
      });
    });
  });

  it('should have treasures array defined (even if empty)', () => {
    const scenarios = scenarioData.scenarios;

    scenarios.forEach((scenario: any) => {
      expect(scenario).toHaveProperty('treasures');
      expect(Array.isArray(scenario.treasures)).toBe(true);

      // If treasures exist, they should have valid coordinates
      if (scenario.treasures.length > 0) {
        const validCoordinates = new Set(
          scenario.mapLayout.map((tile: any) => `${tile.coordinates.q},${tile.coordinates.r}`)
        );

        scenario.treasures.forEach((treasure: any) => {
          const treasureKey = `${treasure.q},${treasure.r}`;
          expect(validCoordinates.has(treasureKey)).toBe(true);
        });
      }
    });
  });

  it('should have terrain variety across scenarios', () => {
    const scenarios = scenarioData.scenarios;

    const terrainTypes = new Set<string>();

    scenarios.forEach((scenario: any) => {
      scenario.mapLayout.forEach((tile: any) => {
        terrainTypes.add(tile.terrain);
      });
    });

    // Should use at least 3 different terrain types across all scenarios
    expect(terrainTypes.size).toBeGreaterThanOrEqual(3);
    expect(terrainTypes.has('normal')).toBe(true);
  });
});
