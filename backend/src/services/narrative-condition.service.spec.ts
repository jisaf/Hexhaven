/**
 * Narrative Condition Service Unit Tests
 *
 * Tests for the narrative trigger condition evaluation system.
 * Covers all condition types and compound AND/OR logic.
 */

import { NarrativeConditionService } from './narrative-condition.service';
import type {
  NarrativeCondition,
  NarrativeGameContext,
  CharacterOnHexCondition,
  CharactersOnHexesCondition,
  MonstersKilledCondition,
  RoundReachedCondition,
  AllEnemiesDeadCondition,
  TreasureCollectedCondition,
  DoorOpenedCondition,
  LootCollectedCondition,
  CompoundCondition,
} from '../../../shared/types/narrative';

describe('NarrativeConditionService', () => {
  let service: NarrativeConditionService;

  // Default game context for testing
  const createDefaultContext = (): NarrativeGameContext => ({
    currentRound: 3,
    characters: [
      { id: 'char-1', characterClass: 'brute', hex: { q: 0, r: 0 } },
      { id: 'char-2', characterClass: 'tinkerer', hex: { q: 1, r: 1 } },
    ],
    monsters: [
      { id: 'mon-1', type: 'living-bones', isAlive: true },
      { id: 'mon-2', type: 'living-bones', isAlive: false },
      { id: 'mon-3', type: 'bandit-guard', isAlive: true },
    ],
    monstersKilled: 1,
    monstersKilledByType: { 'living-bones': 1 },
    openedDoors: [{ q: 5, r: 5 }],
    collectedTreasures: ['treasure-1'],
    collectedLootHexes: [{ q: 2, r: 2 }],
  });

  beforeEach(() => {
    service = new NarrativeConditionService();
  });

  describe('character_on_hex condition', () => {
    it('should return true when any character is on the specified hex', () => {
      const condition: CharacterOnHexCondition = {
        type: 'character_on_hex',
        params: { hex: { q: 0, r: 0 } },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when no character is on the specified hex', () => {
      const condition: CharacterOnHexCondition = {
        type: 'character_on_hex',
        params: { hex: { q: 10, r: 10 } },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });

    it('should return true when specific character ID is on the hex', () => {
      const condition: CharacterOnHexCondition = {
        type: 'character_on_hex',
        params: { hex: { q: 0, r: 0 }, characterId: 'char-1' },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when wrong character ID is on the hex', () => {
      const condition: CharacterOnHexCondition = {
        type: 'character_on_hex',
        params: { hex: { q: 0, r: 0 }, characterId: 'char-2' },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });

    it('should return true when character of specific class is on the hex', () => {
      const condition: CharacterOnHexCondition = {
        type: 'character_on_hex',
        params: { hex: { q: 0, r: 0 }, characterClass: 'brute' },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when wrong character class is on the hex', () => {
      const condition: CharacterOnHexCondition = {
        type: 'character_on_hex',
        params: { hex: { q: 0, r: 0 }, characterClass: 'tinkerer' },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });
  });

  describe('characters_on_hexes condition', () => {
    it('should return true when all hexes are occupied (requireAll=true)', () => {
      const condition: CharactersOnHexesCondition = {
        type: 'characters_on_hexes',
        params: {
          hexes: [
            { q: 0, r: 0 },
            { q: 1, r: 1 },
          ],
          requireAll: true,
          mustBeSimultaneous: true,
        },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when not all hexes are occupied (requireAll=true)', () => {
      const condition: CharactersOnHexesCondition = {
        type: 'characters_on_hexes',
        params: {
          hexes: [
            { q: 0, r: 0 },
            { q: 5, r: 5 },
          ],
          requireAll: true,
          mustBeSimultaneous: true,
        },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });

    it('should return true when at least one hex is occupied (requireAll=false)', () => {
      const condition: CharactersOnHexesCondition = {
        type: 'characters_on_hexes',
        params: {
          hexes: [
            { q: 0, r: 0 },
            { q: 10, r: 10 },
          ],
          requireAll: false,
          mustBeSimultaneous: true,
        },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when no hexes are occupied (requireAll=false)', () => {
      const condition: CharactersOnHexesCondition = {
        type: 'characters_on_hexes',
        params: {
          hexes: [
            { q: 10, r: 10 },
            { q: 11, r: 11 },
          ],
          requireAll: false,
          mustBeSimultaneous: true,
        },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });
  });

  describe('monsters_killed condition', () => {
    it('should return true when total kills meet threshold', () => {
      const condition: MonstersKilledCondition = {
        type: 'monsters_killed',
        params: { count: 1 },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when total kills do not meet threshold', () => {
      const condition: MonstersKilledCondition = {
        type: 'monsters_killed',
        params: { count: 5 },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });

    it('should return true when kills of specific type meet threshold', () => {
      const condition: MonstersKilledCondition = {
        type: 'monsters_killed',
        params: { count: 1, monsterType: 'living-bones' },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when kills of specific type do not meet threshold', () => {
      const condition: MonstersKilledCondition = {
        type: 'monsters_killed',
        params: { count: 2, monsterType: 'living-bones' },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });

    it('should return false when no monsters of specific type killed', () => {
      const condition: MonstersKilledCondition = {
        type: 'monsters_killed',
        params: { count: 1, monsterType: 'bandit-guard' },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });
  });

  describe('round_reached condition', () => {
    it('should return true when round is reached', () => {
      const condition: RoundReachedCondition = {
        type: 'round_reached',
        params: { round: 3 },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return true when round is exceeded', () => {
      const condition: RoundReachedCondition = {
        type: 'round_reached',
        params: { round: 2 },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when round is not reached', () => {
      const condition: RoundReachedCondition = {
        type: 'round_reached',
        params: { round: 5 },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });
  });

  describe('all_enemies_dead condition', () => {
    it('should return false when some enemies are alive', () => {
      const condition: AllEnemiesDeadCondition = {
        type: 'all_enemies_dead',
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });

    it('should return true when all enemies are dead', () => {
      const condition: AllEnemiesDeadCondition = {
        type: 'all_enemies_dead',
      };
      const context: NarrativeGameContext = {
        ...createDefaultContext(),
        monsters: [
          { id: 'mon-1', type: 'living-bones', isAlive: false },
          { id: 'mon-2', type: 'living-bones', isAlive: false },
        ],
      };

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return true when there are no monsters', () => {
      const condition: AllEnemiesDeadCondition = {
        type: 'all_enemies_dead',
      };
      const context: NarrativeGameContext = {
        ...createDefaultContext(),
        monsters: [],
      };

      expect(service.evaluate(condition, context)).toBe(true);
    });
  });

  describe('treasure_collected condition', () => {
    it('should return true when treasure is collected', () => {
      const condition: TreasureCollectedCondition = {
        type: 'treasure_collected',
        params: { treasureId: 'treasure-1' },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when treasure is not collected', () => {
      const condition: TreasureCollectedCondition = {
        type: 'treasure_collected',
        params: { treasureId: 'treasure-99' },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });
  });

  describe('door_opened condition', () => {
    it('should return true when door at hex is opened', () => {
      const condition: DoorOpenedCondition = {
        type: 'door_opened',
        params: { doorHex: { q: 5, r: 5 } },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when door at hex is not opened', () => {
      const condition: DoorOpenedCondition = {
        type: 'door_opened',
        params: { doorHex: { q: 10, r: 10 } },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });
  });

  describe('loot_collected condition', () => {
    it('should return true when loot at hex is collected', () => {
      const condition: LootCollectedCondition = {
        type: 'loot_collected',
        params: { hex: { q: 2, r: 2 } },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when loot at hex is not collected', () => {
      const condition: LootCollectedCondition = {
        type: 'loot_collected',
        params: { hex: { q: 10, r: 10 } },
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });
  });

  describe('negation', () => {
    it('should negate true conditions to false', () => {
      const condition: CharacterOnHexCondition = {
        type: 'character_on_hex',
        params: { hex: { q: 0, r: 0 } },
        negate: true,
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });

    it('should negate false conditions to true', () => {
      const condition: CharacterOnHexCondition = {
        type: 'character_on_hex',
        params: { hex: { q: 10, r: 10 } },
        negate: true,
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });
  });

  describe('compound conditions - AND', () => {
    it('should return true when all conditions are true', () => {
      const condition: CompoundCondition = {
        operator: 'AND',
        conditions: [
          { type: 'round_reached', params: { round: 3 } },
          { type: 'character_on_hex', params: { hex: { q: 0, r: 0 } } },
        ],
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when any condition is false', () => {
      const condition: CompoundCondition = {
        operator: 'AND',
        conditions: [
          { type: 'round_reached', params: { round: 3 } },
          { type: 'character_on_hex', params: { hex: { q: 99, r: 99 } } },
        ],
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });

    it('should return false for empty conditions', () => {
      const condition: CompoundCondition = {
        operator: 'AND',
        conditions: [],
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });
  });

  describe('compound conditions - OR', () => {
    it('should return true when at least one condition is true', () => {
      const condition: CompoundCondition = {
        operator: 'OR',
        conditions: [
          { type: 'round_reached', params: { round: 10 } },
          { type: 'character_on_hex', params: { hex: { q: 0, r: 0 } } },
        ],
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false when all conditions are false', () => {
      const condition: CompoundCondition = {
        operator: 'OR',
        conditions: [
          { type: 'round_reached', params: { round: 10 } },
          { type: 'character_on_hex', params: { hex: { q: 99, r: 99 } } },
        ],
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });

    it('should return false for empty conditions', () => {
      const condition: CompoundCondition = {
        operator: 'OR',
        conditions: [],
      };
      const context = createDefaultContext();

      expect(service.evaluate(condition, context)).toBe(false);
    });
  });

  describe('nested compound conditions', () => {
    it('should evaluate nested AND within OR', () => {
      const condition: CompoundCondition = {
        operator: 'OR',
        conditions: [
          {
            operator: 'AND',
            conditions: [
              { type: 'round_reached', params: { round: 3 } },
              { type: 'monsters_killed', params: { count: 1 } },
            ],
          },
          { type: 'all_enemies_dead' },
        ],
      };
      const context = createDefaultContext();

      // First AND is true (round 3 reached AND 1 monster killed)
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate nested OR within AND', () => {
      const condition: CompoundCondition = {
        operator: 'AND',
        conditions: [
          { type: 'round_reached', params: { round: 3 } },
          {
            operator: 'OR',
            conditions: [
              { type: 'all_enemies_dead' },
              { type: 'monsters_killed', params: { count: 1 } },
            ],
          },
        ],
      };
      const context = createDefaultContext();

      // Round 3 reached AND (all enemies dead OR 1 monster killed)
      // = true AND (false OR true) = true AND true = true
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should handle deeply nested conditions', () => {
      const condition: CompoundCondition = {
        operator: 'AND',
        conditions: [
          {
            operator: 'OR',
            conditions: [
              { type: 'round_reached', params: { round: 3 } },
              {
                operator: 'AND',
                conditions: [
                  { type: 'all_enemies_dead' },
                  { type: 'monsters_killed', params: { count: 5 } },
                ],
              },
            ],
          },
          { type: 'character_on_hex', params: { hex: { q: 0, r: 0 } } },
        ],
      };
      const context = createDefaultContext();

      // (round >= 3 OR (all dead AND 5 killed)) AND char on hex
      // = (true OR (false AND false)) AND true
      // = (true OR false) AND true
      // = true AND true = true
      expect(service.evaluate(condition, context)).toBe(true);
    });
  });
});
