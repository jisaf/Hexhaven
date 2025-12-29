/**
 * Unit Tests: Monster AI Service - Summon Targeting
 *
 * Tests for monster focus target selection when summons are present.
 * Following Gloomhaven rules:
 * - Monsters consider both characters AND summons when selecting focus
 * - At same distance: prefer summons over their owner
 * - Break remaining ties with initiative (lower goes first)
 *
 * TDD: These tests define expected behavior before implementation.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MonsterAIService } from '../../src/services/monster-ai.service';
import {
  AxialCoordinates,
  Monster,
  Character,
  Condition,
  Summon,
} from '../../../shared/types/entities';

describe('MonsterAIService - Summon Targeting', () => {
  let monsterAIService: MonsterAIService;

  beforeEach(() => {
    monsterAIService = new MonsterAIService();
  });

  // Helper to create test monster
  function createTestMonster(
    currentHex: AxialCoordinates,
    range: number = 0,
  ): Monster {
    return {
      id: 'monster1',
      roomId: 'test-room',
      monsterType: 'Bandit Guard',
      isElite: false,
      currentHex,
      range,
      attack: 2,
      movement: 3,
      conditions: [],
      specialAbilities: [],
      health: 5,
      maxHealth: 5,
      isDead: false,
    };
  }

  // Helper to create test character
  function createTestCharacter(
    id: string,
    currentHex: AxialCoordinates | null,
    isExhausted: boolean = false,
    conditions: Condition[] = [],
  ): Character {
    return {
      id,
      currentHex,
      isExhausted,
      conditions,
      activeCards: null,
    } as Character;
  }

  // Helper to create test summon
  function createTestSummon(
    id: string,
    currentHex: AxialCoordinates,
    options: {
      isDead?: boolean;
      conditions?: Condition[];
      ownerId?: string;
      initiative?: number;
    } = {},
  ): Summon {
    return {
      id,
      roomId: 'test-room',
      name: `Summon ${id}`,
      currentHex,
      health: 3,
      maxHealth: 3,
      attack: 1,
      move: 2,
      range: 0,
      isDead: options.isDead ?? false,
      conditions: options.conditions ?? [],
      ownerId: options.ownerId,
      initiative: options.initiative ?? 50,
    };
  }

  describe('selectFocusTarget with summons', () => {
    it('should target closest character when no summons are provided', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 2, r: 0 }), // Distance 2
        createTestCharacter('char2', { q: 1, r: 0 }), // Distance 1 (closest)
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
      );

      expect(focusTarget).toBe('char2');
    });

    it('should target closest summon when summon is closer than characters', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 3, r: 0 }), // Distance 3
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 1, r: 0 }), // Distance 1 (closest)
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      expect(focusTarget).toBe('summon1');
    });

    it('should target summon at same distance as character (summon has no owner)', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 2, r: 0 }), // Distance 2
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 0, r: 2 }), // Distance 2 (same as char1)
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      // At same distance, summons are preferred over characters
      expect(focusTarget).toBe('summon1');
    });

    it('should target summon before its owner at same distance', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 2, r: 0 }), // Distance 2
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 0, r: 2 }, { ownerId: 'char1' }), // Distance 2 (same), owned by char1
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      // At same distance, summon is preferred over its owner
      expect(focusTarget).toBe('summon1');
    });

    it('should target character if character is closer than summon', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 1, r: 0 }), // Distance 1 (closest)
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 3, r: 0 }), // Distance 3
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      expect(focusTarget).toBe('char1');
    });

    it('should ignore dead summons', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 3, r: 0 }), // Distance 3
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 1, r: 0 }, { isDead: true }), // Dead, would be closest
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      expect(focusTarget).toBe('char1');
    });

    it('should ignore invisible summons', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 3, r: 0 }), // Distance 3
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 1, r: 0 }, { conditions: [Condition.INVISIBLE] }), // Invisible, would be closest
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      expect(focusTarget).toBe('char1');
    });

    it('should use initiative to break ties between summons at same distance', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 5, r: 0 }), // Distance 5 (farther)
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 2, r: 0 }, { initiative: 50 }), // Distance 2
        createTestSummon('summon2', { q: 0, r: 2 }, { initiative: 20 }), // Distance 2, lower initiative
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      // Same distance, lower initiative wins
      expect(focusTarget).toBe('summon2');
    });

    it('should work without summons parameter (backward compatible)', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 2, r: 0 }), // Distance 2
        createTestCharacter('char2', { q: 1, r: 0 }), // Distance 1 (closest)
      ];

      // Call without summons parameter
      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
      );

      expect(focusTarget).toBe('char2');
    });

    it('should handle empty summons array', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 1, r: 0 }), // Distance 1
      ];

      const summons: Summon[] = [];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      expect(focusTarget).toBe('char1');
    });

    it('should return null if only dead/invisible summons and no valid characters', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 1, r: 0 }, true), // Exhausted
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 1, r: 0 }, { isDead: true }),
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      expect(focusTarget).toBeNull();
    });

    it('should target only valid summon when all characters are invalid', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 1, r: 0 }, true), // Exhausted
        createTestCharacter('char2', { q: 2, r: 0 }, false, [Condition.INVISIBLE]), // Invisible
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 3, r: 0 }), // Valid summon
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      expect(focusTarget).toBe('summon1');
    });

    it('should prefer summon over non-owner character at same distance', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 2, r: 0 }), // Distance 2 - not the summon's owner
        createTestCharacter('char2', { q: 5, r: 0 }), // Distance 5 - this is the owner
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 0, r: 2 }, { ownerId: 'char2' }), // Distance 2, owned by char2
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      // At same distance, summon is preferred over any character
      expect(focusTarget).toBe('summon1');
    });

    it('should use initiative tie-breaker between character and summon when summon has no owner relation', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      // Set up character with activeCards to have a defined initiative
      const char1 = createTestCharacter('char1', { q: 2, r: 0 });

      const characters: Character[] = [char1];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 0, r: 2 }, { initiative: 10 }), // Distance 2, very low initiative
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      // Summons preferred at same distance
      expect(focusTarget).toBe('summon1');
    });

    it('should handle multiple summons and characters at mixed distances', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 3, r: 0 }), // Distance 3
        createTestCharacter('char2', { q: 4, r: 0 }), // Distance 4
      ];

      const summons: Summon[] = [
        createTestSummon('summon1', { q: 5, r: 0 }, { initiative: 20 }), // Distance 5
        createTestSummon('summon2', { q: 2, r: 0 }, { initiative: 30 }), // Distance 2 (closest)
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      // summon2 is closest at distance 2
      expect(focusTarget).toBe('summon2');
    });

    it('should handle summon with null currentHex (edge case)', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 2, r: 0 }),
      ];

      // Create summon with null hex - simulating a summon that was removed but not cleaned up
      const summons: Summon[] = [
        {
          ...createTestSummon('summon1', { q: 1, r: 0 }),
          currentHex: null as unknown as AxialCoordinates, // Force null for edge case test
        },
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
        summons,
      );

      // Should skip summon with null hex and target character
      expect(focusTarget).toBe('char1');
    });
  });
});
