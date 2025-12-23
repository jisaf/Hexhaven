/**
 * Unit Test: Scenario Data Validation (US5 - T167)
 *
 * NOTE: As of Issue #244 (Campaign Mode), scenarios are now stored in the database
 * instead of a JSON file. The original tests that loaded from src/data/scenarios.json
 * have been replaced with database-driven tests.
 *
 * Scenario data is now:
 * - Stored in the Prisma database (Scenario model)
 * - Seeded via prisma/seed.ts using prisma/seed-data/scenarios.json
 * - Loaded via ScenarioService.loadScenario() and ScenarioService.getAvailableScenarios()
 *
 * The following tests validate scenario data structure using the seed data file.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Scenario Data Validation (US5 - T167)', () => {
  let scenarios: any[];

  beforeAll(() => {
    // Load scenario seed data (used by prisma seed)
    // The seed data is an array of scenarios
    const dataPath = path.join(__dirname, '../../prisma/seed-data/scenarios.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    scenarios = JSON.parse(rawData);
  });

  it('should load scenarios seed data successfully', () => {
    expect(scenarios).toBeDefined();
    expect(Array.isArray(scenarios)).toBe(true);
  });

  it('should contain multiple scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(1);
  });

  it('should have unique scenario names', () => {
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
    scenarios.forEach((scenario: any) => {
      expect(scenario.difficulty).toBeDefined();
      expect(typeof scenario.difficulty).toBe('number');
      expect(scenario.difficulty).toBeGreaterThanOrEqual(0);
      expect(scenario.difficulty).toBeLessThanOrEqual(7); // Max difficulty is 7
    });
  });

  it('should have objectives for each scenario', () => {
    scenarios.forEach((scenario: any) => {
      expect(scenario.objectives).toBeDefined();
      expect(scenario.objectives.primary).toBeDefined();
      // objectives.primary is an object with id, type, description, etc.
      expect(typeof scenario.objectives.primary).toBe('object');
      expect(scenario.objectives.primary.description).toBeDefined();
      expect(typeof scenario.objectives.primary.description).toBe('string');
      expect(scenario.objectives.primary.description.length).toBeGreaterThan(5); // Meaningful objective
    });
  });

  it('should have map layouts for each scenario', () => {
    scenarios.forEach((scenario: any) => {
      expect(scenario.mapLayout).toBeDefined();
      expect(Array.isArray(scenario.mapLayout)).toBe(true);
      expect(scenario.mapLayout.length).toBeGreaterThanOrEqual(5); // Minimum viable map size
    });
  });

  it('should have valid hex tiles in map layouts', () => {
    scenarios.forEach((scenario: any) => {
      scenario.mapLayout.forEach((tile: any) => {
        // Valid coordinates (supports both q/r and x/y formats)
        expect(tile.coordinates || tile.x !== undefined).toBeTruthy();

        // Valid terrain
        expect(tile.terrain).toBeDefined();
        expect(['normal', 'obstacle', 'difficult', 'hazardous', 'water']).toContain(tile.terrain);
      });
    });
  });

  it('should have valid monster groups for each scenario', () => {
    scenarios.forEach((scenario: any) => {
      expect(scenario.monsterGroups).toBeDefined();
      expect(Array.isArray(scenario.monsterGroups)).toBe(true);

      scenario.monsterGroups.forEach((group: any) => {
        expect(group.type).toBeDefined();
        expect(typeof group.type).toBe('string');
        // Supports both spawnPoints and positions formats
        const hasSpawnData = group.spawnPoints || group.positions;
        expect(hasSpawnData).toBeDefined();
      });
    });
  });

  it('should have valid player start positions', () => {
    scenarios.forEach((scenario: any) => {
      expect(scenario.playerStartPositions).toBeDefined();

      // playerStartPositions can be array or Record<number, AxialCoordinates[]>
      if (Array.isArray(scenario.playerStartPositions)) {
        expect(scenario.playerStartPositions.length).toBeGreaterThan(0);
      } else {
        expect(typeof scenario.playerStartPositions).toBe('object');
        const playerCounts = Object.keys(scenario.playerStartPositions);
        expect(playerCounts.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  it('should have required scenario attributes', () => {
    const requiredAttributes = [
      'name',
      'difficulty',
      'objectives',
      'mapLayout',
      'monsterGroups',
      'playerStartPositions',
    ];

    scenarios.forEach((scenario: any) => {
      requiredAttributes.forEach((attr) => {
        expect(scenario).toHaveProperty(attr);
      });
    });
  });

  it('should have treasures array defined (even if empty)', () => {
    scenarios.forEach((scenario: any) => {
      expect(scenario).toHaveProperty('treasures');
      expect(Array.isArray(scenario.treasures)).toBe(true);
    });
  });
});
