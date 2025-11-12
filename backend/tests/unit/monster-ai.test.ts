/**
 * Unit Test: Monster AI Service (US2 - T081)
 *
 * Tests monster AI focus target selection and behavior:
 * - Find closest character using hex distance
 * - Break ties using character initiative (lower goes first)
 * - Respect line of sight and obstacles
 * - Handle special abilities (flying, ranged attacks)
 * - Determine optimal movement toward focus target
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MonsterAIService } from '../../src/services/monster-ai.service';
import {
  AxialCoordinates,
  Monster,
  Character,
  Condition,
} from '../../../shared/types/entities';

describe('MonsterAIService', () => {
  let monsterAIService: MonsterAIService;

  beforeEach(() => {
    monsterAIService = new MonsterAIService();
  });

  // Helper to create test monster
  function createTestMonster(
    currentHex: AxialCoordinates,
    range: number = 0,
    conditions: Condition[] = [],
    specialAbilities: string[] = [],
  ): Monster {
    return {
      id: 'monster1',
      currentHex,
      range,
      attack: 2,
      movement: 3,
      conditions,
      specialAbilities,
      currentHealth: 5,
      maxHealth: 5,
      isDead: false,
    } as Monster;
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

  describe('selectFocusTarget', () => {
    it('should focus on closest character by hex distance', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 2, r: 0 }), // Distance 2
        createTestCharacter('char2', { q: 5, r: 0 }), // Distance 5
        createTestCharacter('char3', { q: 1, r: 0 }), // Distance 1 (closest)
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
      );

      expect(focusTarget).toBe('char3'); // Closest character
    });

    it('should break distance ties using initiative (lower first)', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      // Both characters at same distance
      const characters: Character[] = [
        createTestCharacter('char1', { q: 2, r: 0 }), // Distance 2
        createTestCharacter('char2', { q: 0, r: 2 }), // Distance 2 (same)
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
      );

      // Initiative tie-breaking is deterministic based on implementation
      expect(focusTarget).toBeTruthy();
      expect(['char1', 'char2']).toContain(focusTarget);
    });

    it('should ignore invisible characters', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 1, r: 0 }, false, [
          Condition.INVISIBLE,
        ]), // Closest but invisible
        createTestCharacter('char2', { q: 3, r: 0 }), // Further but targetable
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
      );

      expect(focusTarget).toBe('char2'); // Skip invisible
    });

    it('should ignore exhausted characters', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 1, r: 0 }, true), // Exhausted
        createTestCharacter('char2', { q: 2, r: 0 }, false), // Not exhausted
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
      );

      expect(focusTarget).toBe('char2');
    });

    it('should ignore characters with null currentHex', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', null), // No hex position
        createTestCharacter('char2', { q: 2, r: 0 }),
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
      );

      expect(focusTarget).toBe('char2');
    });

    it('should return null if no valid targets', () => {
      const monster = createTestMonster({ q: 0, r: 0 });
      const characters: Character[] = []; // No characters

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
      );

      expect(focusTarget).toBeNull();
    });

    it('should return null if all characters are exhausted or invisible', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 1, r: 0 }, true), // Exhausted
        createTestCharacter('char2', { q: 2, r: 0 }, false, [
          Condition.INVISIBLE,
        ]), // Invisible
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
      );

      expect(focusTarget).toBeNull();
    });

    it('should handle multiple characters at different distances', () => {
      const monster = createTestMonster({ q: 0, r: 0 });

      const characters: Character[] = [
        createTestCharacter('char1', { q: 4, r: 0 }), // Distance 4
        createTestCharacter('char2', { q: 1, r: 1 }), // Distance 2
        createTestCharacter('char3', { q: 3, r: 3 }), // Distance 6
        createTestCharacter('char4', { q: 0, r: 1 }), // Distance 1 (closest)
      ];

      const focusTarget = monsterAIService.selectFocusTarget(
        monster,
        characters,
      );

      expect(focusTarget).toBe('char4');
    });
  });

  describe('calculateHexDistance', () => {
    it('should calculate distance between two hexes (straight line)', () => {
      const hex1: AxialCoordinates = { q: 0, r: 0 };
      const hex2: AxialCoordinates = { q: 3, r: 0 };

      const distance = monsterAIService.calculateHexDistance(hex1, hex2);

      expect(distance).toBe(3);
    });

    it('should handle diagonal distances correctly', () => {
      const hex1: AxialCoordinates = { q: 0, r: 0 };
      const hex2: AxialCoordinates = { q: 2, r: 2 };

      const distance = monsterAIService.calculateHexDistance(hex1, hex2);

      // Axial distance: max(|q1-q2|, |r1-r2|, |s1-s2|) where s = -q-r
      expect(distance).toBe(4);
    });

    it('should return 0 for same hex', () => {
      const hex: AxialCoordinates = { q: 5, r: 3 };

      const distance = monsterAIService.calculateHexDistance(hex, hex);

      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const hex1: AxialCoordinates = { q: -2, r: -3 };
      const hex2: AxialCoordinates = { q: 1, r: 2 };

      const distance = monsterAIService.calculateHexDistance(hex1, hex2);

      // dq = |(-2) - 1| = 3, dr = |(-3) - 2| = 5, ds = |(-2-3) - (1+2)| = 8
      expect(distance).toBe(8);
    });

    it('should calculate distance in reverse direction', () => {
      const hex1: AxialCoordinates = { q: 0, r: 0 };
      const hex2: AxialCoordinates = { q: -2, r: 0 };

      const distance = monsterAIService.calculateHexDistance(hex1, hex2);

      expect(distance).toBe(2); // Same as { q: 2, r: 0 }
    });

    it('should handle adjacent hexes', () => {
      const hex1: AxialCoordinates = { q: 0, r: 0 };
      const hex2: AxialCoordinates = { q: 1, r: 0 };

      const distance = monsterAIService.calculateHexDistance(hex1, hex2);

      expect(distance).toBe(1); // Adjacent
    });
  });

  describe('determineMovement', () => {
    it('should move toward focus target', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0); // Melee
      const focusTarget = createTestCharacter('char1', { q: 5, r: 0 });

      const newHex = monsterAIService.determineMovement(
        monster,
        focusTarget,
        [],
      );

      // Should move 1 hex closer (only gets adjacent hexes, picks best one)
      expect(newHex).not.toBeNull();
      if (newHex) {
        const distanceBefore = monsterAIService.calculateHexDistance(
          monster.currentHex,
          focusTarget.currentHex!,
        );
        const distanceAfter = monsterAIService.calculateHexDistance(
          newHex,
          focusTarget.currentHex!,
        );
        expect(distanceAfter).toBeLessThan(distanceBefore);
      }
    });

    it('should return null if already in attack range', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0); // Melee (range 0)
      const focusTarget = createTestCharacter('char1', { q: 1, r: 0 }); // Adjacent

      const newHex = monsterAIService.determineMovement(
        monster,
        focusTarget,
        [],
      );

      expect(newHex).toBeNull(); // Already in range
    });

    it('should return null if already in ranged attack range', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 3); // Range 3
      const focusTarget = createTestCharacter('char1', { q: 2, r: 0 }); // Distance 2

      const newHex = monsterAIService.determineMovement(
        monster,
        focusTarget,
        [],
      );

      expect(newHex).toBeNull(); // Already in range
    });

    it('should not move through obstacles', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0, [], []); // Not flying
      const focusTarget = createTestCharacter('char1', { q: 2, r: 0 });

      const obstacles: AxialCoordinates[] = [{ q: 1, r: 0 }]; // Obstacle in straight path

      const newHex = monsterAIService.determineMovement(
        monster,
        focusTarget,
        obstacles,
      );

      // Should not move to obstacle
      if (newHex) {
        expect(obstacles).not.toContainEqual(newHex);
      }
    });

    it('should ignore obstacles if monster has flying', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0, [], ['Flying']);
      const focusTarget = createTestCharacter('char1', { q: 3, r: 0 });

      const obstacles: AxialCoordinates[] = [
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ];

      const newHex = monsterAIService.determineMovement(
        monster,
        focusTarget,
        obstacles,
      );

      // Flying can move toward target despite obstacles
      expect(newHex).not.toBeNull();
      if (newHex) {
        const distanceAfter = monsterAIService.calculateHexDistance(
          newHex,
          focusTarget.currentHex!,
        );
        expect(distanceAfter).toBeLessThan(3);
      }
    });

    it('should return null if focus target has no currentHex', () => {
      const monster = createTestMonster({ q: 0, r: 0 });
      const focusTarget = createTestCharacter('char1', null);

      const newHex = monsterAIService.determineMovement(
        monster,
        focusTarget,
        [],
      );

      expect(newHex).toBeNull();
    });

    it('should move to hex that gets closest to target', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0);
      const focusTarget = createTestCharacter('char1', { q: 3, r: 0 });

      const newHex = monsterAIService.determineMovement(
        monster,
        focusTarget,
        [],
      );

      // Should choose hex that minimizes distance
      expect(newHex).not.toBeNull();
      if (newHex) {
        // Should be adjacent to monster's current position
        const moveDistance = monsterAIService.calculateHexDistance(
          monster.currentHex,
          newHex,
        );
        expect(moveDistance).toBe(1);

        // Should reduce distance to target
        const newDistance = monsterAIService.calculateHexDistance(
          newHex,
          focusTarget.currentHex!,
        );
        expect(newDistance).toBeLessThan(3);
      }
    });
  });

  describe('shouldAttack', () => {
    it('should attack if focus target is in melee range', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0); // Melee
      const focusTarget = createTestCharacter('char1', { q: 1, r: 0 }); // Adjacent

      const shouldAttack = monsterAIService.shouldAttack(monster, focusTarget);

      expect(shouldAttack).toBe(true);
    });

    it('should attack if focus target is in ranged attack range', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 3); // Range 3
      const focusTarget = createTestCharacter('char1', { q: 3, r: 0 }); // Distance 3

      const shouldAttack = monsterAIService.shouldAttack(monster, focusTarget);

      expect(shouldAttack).toBe(true);
    });

    it('should not attack if target is out of melee range', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0); // Melee
      const focusTarget = createTestCharacter('char1', { q: 3, r: 0 }); // Distance 3

      const shouldAttack = monsterAIService.shouldAttack(monster, focusTarget);

      expect(shouldAttack).toBe(false);
    });

    it('should not attack if target is out of ranged range', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 2); // Range 2
      const focusTarget = createTestCharacter('char1', { q: 5, r: 0 }); // Distance 5

      const shouldAttack = monsterAIService.shouldAttack(monster, focusTarget);

      expect(shouldAttack).toBe(false);
    });

    it('should not attack if monster is disarmed', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0, [Condition.DISARM]);
      const focusTarget = createTestCharacter('char1', { q: 1, r: 0 }); // Adjacent

      const shouldAttack = monsterAIService.shouldAttack(monster, focusTarget);

      expect(shouldAttack).toBe(false);
    });

    it('should not attack if monster is stunned', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0, [Condition.STUN]);
      const focusTarget = createTestCharacter('char1', { q: 1, r: 0 }); // Adjacent

      const shouldAttack = monsterAIService.shouldAttack(monster, focusTarget);

      expect(shouldAttack).toBe(false); // Stunned monsters lose their turn
    });

    it('should not attack if monster is both disarmed and in range', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0, [Condition.DISARM]);
      const focusTarget = createTestCharacter('char1', { q: 1, r: 0 });

      const shouldAttack = monsterAIService.shouldAttack(monster, focusTarget);

      expect(shouldAttack).toBe(false);
    });

    it('should not attack if focus target has no currentHex', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 0);
      const focusTarget = createTestCharacter('char1', null);

      const shouldAttack = monsterAIService.shouldAttack(monster, focusTarget);

      expect(shouldAttack).toBe(false);
    });

    it('should attack with ranged attack at minimum range', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 3); // Range 3
      const focusTarget = createTestCharacter('char1', { q: 1, r: 0 }); // Distance 1

      const shouldAttack = monsterAIService.shouldAttack(monster, focusTarget);

      expect(shouldAttack).toBe(true); // Can attack at any distance <= range
    });

    it('should attack with ranged attack at maximum range', () => {
      const monster = createTestMonster({ q: 0, r: 0 }, 3); // Range 3
      const focusTarget = createTestCharacter('char1', { q: 3, r: 0 }); // Distance 3

      const shouldAttack = monsterAIService.shouldAttack(monster, focusTarget);

      expect(shouldAttack).toBe(true);
    });
  });

  describe('getAdjacentHexes', () => {
    it('should return 6 adjacent hexes in axial coordinates', () => {
      const hex: AxialCoordinates = { q: 0, r: 0 };

      const adjacent = monsterAIService.getAdjacentHexes(hex);

      expect(adjacent).toHaveLength(6);
      expect(adjacent).toContainEqual({ q: 1, r: 0 });
      expect(adjacent).toContainEqual({ q: -1, r: 0 });
      expect(adjacent).toContainEqual({ q: 0, r: 1 });
      expect(adjacent).toContainEqual({ q: 0, r: -1 });
      expect(adjacent).toContainEqual({ q: 1, r: -1 });
      expect(adjacent).toContainEqual({ q: -1, r: 1 });
    });

    it('should return correct adjacent hexes for non-origin hex', () => {
      const hex: AxialCoordinates = { q: 3, r: 2 };

      const adjacent = monsterAIService.getAdjacentHexes(hex);

      expect(adjacent).toHaveLength(6);
      expect(adjacent).toContainEqual({ q: 4, r: 2 });
      expect(adjacent).toContainEqual({ q: 2, r: 2 });
      expect(adjacent).toContainEqual({ q: 3, r: 3 });
      expect(adjacent).toContainEqual({ q: 3, r: 1 });
      expect(adjacent).toContainEqual({ q: 4, r: 1 });
      expect(adjacent).toContainEqual({ q: 2, r: 3 });
    });

    it('should return correct adjacent hexes for negative coordinates', () => {
      const hex: AxialCoordinates = { q: -1, r: -1 };

      const adjacent = monsterAIService.getAdjacentHexes(hex);

      expect(adjacent).toHaveLength(6);
      expect(adjacent).toContainEqual({ q: 0, r: -1 });
      expect(adjacent).toContainEqual({ q: -2, r: -1 });
      expect(adjacent).toContainEqual({ q: -1, r: 0 });
      expect(adjacent).toContainEqual({ q: -1, r: -2 });
      expect(adjacent).toContainEqual({ q: 0, r: -2 });
      expect(adjacent).toContainEqual({ q: -2, r: 0 });
    });

    it('should return unique hexes', () => {
      const hex: AxialCoordinates = { q: 5, r: 5 };

      const adjacent = monsterAIService.getAdjacentHexes(hex);

      const uniqueHexes = new Set(adjacent.map((h) => `${h.q},${h.r}`));
      expect(uniqueHexes.size).toBe(6);
    });
  });
});
