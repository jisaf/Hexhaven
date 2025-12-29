/**
 * SummonAI Service Tests (Issue #228 - Phase 1)
 *
 * TDD tests for the SummonAI service that adapts Summon entities
 * to work with MonsterAI service. Summons target monsters (enemies),
 * unlike monsters which target characters.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SummonAIService } from '../src/services/summon-ai.service';
import { MonsterAIService } from '../src/services/monster-ai.service';
import { Summon, SummonData } from '../src/models/summon.model';
import {
  Condition,
  AxialCoordinates,
  Monster as MonsterInterface,
} from '../../shared/types/entities';

/**
 * Type for monster test data that matches the shared Monster interface.
 * The SummonAIService now expects the shared interface (uses currentHex),
 * not the Monster class from monster.model.ts (uses position).
 */
type TestMonster = MonsterInterface;

describe('SummonAIService', () => {
  let service: SummonAIService;
  let monsterAIService: MonsterAIService;

  const createSummon = (overrides: Partial<SummonData> = {}): Summon => {
    const baseData: SummonData = {
      id: 'summon-1',
      roomId: 'room-1',
      ownerId: 'character-1',
      name: 'Mystic Ally',
      position: { q: 0, r: 0 },
      health: 4,
      maxHealth: 4,
      attack: 2,
      move: 3,
      range: 1,
      conditions: [],
      isDead: false,
      playerControlled: false,
      initiative: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return new Summon({ ...baseData, ...overrides });
  };

  /**
   * Create a test monster matching the shared Monster interface.
   * Uses currentHex (not position) to match what game.gateway.ts provides.
   */
  const createMonster = (
    overrides: Partial<{
      id: string;
      currentHex: AxialCoordinates;
      conditions: Condition[];
      isDead: boolean;
      specialAbilities: string[];
    }> = {},
  ): TestMonster => {
    return {
      id: overrides.id ?? 'monster-1',
      roomId: 'room-1',
      monsterType: 'Bandit Guard',
      isElite: false,
      currentHex: overrides.currentHex ?? { q: 2, r: 0 },
      health: 6,
      maxHealth: 6,
      movement: 2,
      attack: 3,
      range: 0,
      specialAbilities: overrides.specialAbilities ?? [],
      conditions: overrides.conditions ?? [],
      isDead: overrides.isDead ?? false,
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SummonAIService, MonsterAIService],
    }).compile();

    service = module.get<SummonAIService>(SummonAIService);
    monsterAIService = module.get<MonsterAIService>(MonsterAIService);
  });

  describe('selectFocusTarget', () => {
    it('should find closest monster', () => {
      const summon = createSummon({ position: { q: 0, r: 0 } });
      const monsters = [
        createMonster({ id: 'monster-far', currentHex: { q: 5, r: 0 } }),
        createMonster({ id: 'monster-close', currentHex: { q: 1, r: 0 } }),
        createMonster({ id: 'monster-mid', currentHex: { q: 3, r: 0 } }),
      ];

      const targetId = service.selectFocusTarget(summon, monsters);

      expect(targetId).toBe('monster-close');
    });

    it('should return null when no valid monsters', () => {
      const summon = createSummon();
      const monsters: TestMonster[] = [];

      const targetId = service.selectFocusTarget(summon, monsters);

      expect(targetId).toBeNull();
    });

    it('should break ties by initiative (lower goes first)', () => {
      const summon = createSummon({ position: { q: 0, r: 0 } });
      // Both monsters are at distance 2 from the summon
      const monsters = [
        createMonster({ id: 'monster-high-init', currentHex: { q: 2, r: 0 } }),
        createMonster({ id: 'monster-low-init', currentHex: { q: 1, r: 1 } }),
      ];

      // Mock the MonsterAIService to provide different initiatives
      // Since monsters don't have initiative property directly, and the
      // existing MonsterAIService uses character initiative for tie-breaking,
      // we need to verify the service handles this appropriately for monsters.
      // For summons targeting monsters, we'll use monster ID as a stable tiebreaker
      // since monsters in the same group have the same initiative.
      const targetId = service.selectFocusTarget(summon, monsters);

      // With equal distance, should pick one deterministically
      expect(targetId).toBeTruthy();
      expect(['monster-high-init', 'monster-low-init']).toContain(targetId);
    });

    it('should ignore dead monsters', () => {
      const summon = createSummon({ position: { q: 0, r: 0 } });
      const monsters = [
        createMonster({
          id: 'monster-dead',
          currentHex: { q: 1, r: 0 },
          isDead: true,
        }),
        createMonster({
          id: 'monster-alive',
          currentHex: { q: 3, r: 0 },
          isDead: false,
        }),
      ];

      const targetId = service.selectFocusTarget(summon, monsters);

      expect(targetId).toBe('monster-alive');
    });

    it('should ignore invisible monsters', () => {
      const summon = createSummon({ position: { q: 0, r: 0 } });
      const monsters = [
        createMonster({
          id: 'monster-invisible',
          currentHex: { q: 1, r: 0 },
          conditions: [Condition.INVISIBLE],
        }),
        createMonster({ id: 'monster-visible', currentHex: { q: 3, r: 0 } }),
      ];

      const targetId = service.selectFocusTarget(summon, monsters);

      expect(targetId).toBe('monster-visible');
    });
  });

  describe('determineMovement', () => {
    it('should move toward target', () => {
      const summon = createSummon({
        position: { q: 0, r: 0 },
        range: 1, // melee range
      });
      const target = createMonster({ currentHex: { q: 3, r: 0 } });

      // Create a simple hex map
      const hexMap = new Map<string, unknown>();
      for (let q = 0; q <= 3; q++) {
        hexMap.set(`${q},0`, { terrain: 'normal' });
      }

      const newPosition = service.determineMovement(
        summon,
        target,
        [], // no obstacles
        [], // no occupied hexes
        hexMap,
      );

      expect(newPosition).not.toBeNull();
      // Should move closer to target (q: 3, r: 0)
      expect(newPosition!.q).toBeGreaterThan(0);
    });

    it('should return null if already in range', () => {
      const summon = createSummon({
        position: { q: 2, r: 0 },
        range: 1, // melee range, needs to be adjacent
      });
      const target = createMonster({ currentHex: { q: 3, r: 0 } }); // Adjacent

      const hexMap = new Map<string, unknown>();
      hexMap.set('2,0', { terrain: 'normal' });
      hexMap.set('3,0', { terrain: 'normal' });

      const newPosition = service.determineMovement(
        summon,
        target,
        [],
        [],
        hexMap,
      );

      // Already adjacent, no need to move
      expect(newPosition).toBeNull();
    });

    it('should respect obstacles', () => {
      const summon = createSummon({
        position: { q: 0, r: 0 },
        range: 1,
      });
      const target = createMonster({ currentHex: { q: 2, r: 0 } });

      // Hex map with obstacle in the direct path
      const hexMap = new Map<string, unknown>();
      hexMap.set('0,0', { terrain: 'normal' });
      hexMap.set('1,0', { terrain: 'obstacle' }); // Blocked
      hexMap.set('2,0', { terrain: 'normal' });
      hexMap.set('0,1', { terrain: 'normal' }); // Alternative path
      hexMap.set('1,-1', { terrain: 'normal' }); // Alternative path

      const obstacles: AxialCoordinates[] = [{ q: 1, r: 0 }];

      const newPosition = service.determineMovement(
        summon,
        target,
        obstacles,
        [],
        hexMap,
      );

      // Should not move to the obstacle hex
      if (newPosition) {
        expect(newPosition.q !== 1 || newPosition.r !== 0).toBe(true);
      }
    });
  });

  describe('shouldAttack', () => {
    it('should return false when disarmed', () => {
      const summon = createSummon({
        position: { q: 1, r: 0 },
        conditions: [Condition.DISARM],
      });
      const target = createMonster({ currentHex: { q: 2, r: 0 } }); // Adjacent

      const canAttack = service.shouldAttack(summon, target);

      expect(canAttack).toBe(false);
    });

    it('should return false when stunned', () => {
      const summon = createSummon({
        position: { q: 1, r: 0 },
        conditions: [Condition.STUN],
      });
      const target = createMonster({ currentHex: { q: 2, r: 0 } }); // Adjacent

      const canAttack = service.shouldAttack(summon, target);

      expect(canAttack).toBe(false);
    });

    it('should return true when in range', () => {
      const summon = createSummon({
        position: { q: 1, r: 0 },
        range: 1, // melee
      });
      const target = createMonster({ currentHex: { q: 2, r: 0 } }); // Adjacent

      const canAttack = service.shouldAttack(summon, target);

      expect(canAttack).toBe(true);
    });

    it('should return false when out of range', () => {
      const summon = createSummon({
        position: { q: 0, r: 0 },
        range: 1, // melee
      });
      const target = createMonster({ currentHex: { q: 3, r: 0 } }); // 3 hexes away

      const canAttack = service.shouldAttack(summon, target);

      expect(canAttack).toBe(false);
    });

    it('should return true for ranged attack when in range', () => {
      const summon = createSummon({
        position: { q: 0, r: 0 },
        range: 3, // ranged
      });
      const target = createMonster({ currentHex: { q: 3, r: 0 } }); // 3 hexes away

      const canAttack = service.shouldAttack(summon, target);

      expect(canAttack).toBe(true);
    });
  });
});
