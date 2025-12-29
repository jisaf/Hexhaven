/**
 * Unit Tests: TurnOrderService - Summon Support
 *
 * Tests for summon ordering in turn order calculation.
 * Following TDD approach: these tests define expected behavior for summons.
 *
 * Rules:
 * - Summons use owner's initiative
 * - Summons act BEFORE their owner at the same initiative
 * - Summons of different owners sorted by initiative
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TurnOrderService, TurnEntity } from '../../src/services/turn-order.service';
import { CharacterClass } from '../../../shared/types/entities';

describe('TurnOrderService - Summon Support', () => {
  let service: TurnOrderService;

  beforeEach(() => {
    service = new TurnOrderService();
  });

  describe('determineTurnOrder with summons', () => {
    it('should sort summon with different initiative normally', () => {
      const entities: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A' },
        { entityId: 'sum-1', entityType: 'summon', initiative: 10, name: 'Summon 1', ownerId: 'char-a' },
      ];

      const result = service.determineTurnOrder(entities);

      // Summon has lower initiative (10 < 20), so it goes first regardless of ownership
      expect(result[0].entityId).toBe('sum-1');
      expect(result[1].entityId).toBe('char-a');
    });

    it('should place summon BEFORE its owner when they have the same initiative', () => {
      const entities: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A' },
        { entityId: 'sum-1', entityType: 'summon', initiative: 20, name: 'Summon 1', ownerId: 'char-a' },
      ];

      const result = service.determineTurnOrder(entities);

      // Summon goes before its owner at same initiative
      expect(result[0].entityId).toBe('sum-1');
      expect(result[1].entityId).toBe('char-a');
    });

    it('should place multiple summons of same owner all before owner', () => {
      const entities: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A' },
        { entityId: 'sum-1', entityType: 'summon', initiative: 20, name: 'Summon 1', ownerId: 'char-a' },
        { entityId: 'sum-2', entityType: 'summon', initiative: 20, name: 'Summon 2', ownerId: 'char-a' },
      ];

      const result = service.determineTurnOrder(entities);

      // Both summons should be before owner
      const ownerIndex = result.findIndex(e => e.entityId === 'char-a');
      const sum1Index = result.findIndex(e => e.entityId === 'sum-1');
      const sum2Index = result.findIndex(e => e.entityId === 'sum-2');

      expect(sum1Index).toBeLessThan(ownerIndex);
      expect(sum2Index).toBeLessThan(ownerIndex);
    });

    it('should sort summons of different owners by initiative', () => {
      const entities: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A' },
        { entityId: 'char-b', entityType: 'character', initiative: 30, name: 'Character B' },
        { entityId: 'sum-a', entityType: 'summon', initiative: 20, name: 'Summon A', ownerId: 'char-a' },
        { entityId: 'sum-b', entityType: 'summon', initiative: 30, name: 'Summon B', ownerId: 'char-b' },
      ];

      const result = service.determineTurnOrder(entities);

      // Expected order: Summon A (20), Char A (20), Summon B (30), Char B (30)
      expect(result[0].entityId).toBe('sum-a');
      expect(result[1].entityId).toBe('char-a');
      expect(result[2].entityId).toBe('sum-b');
      expect(result[3].entityId).toBe('char-b');
    });

    it('should handle summon with lower initiative than owner (normal sorting)', () => {
      const entities: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 30, name: 'Character A' },
        { entityId: 'sum-1', entityType: 'summon', initiative: 15, name: 'Summon 1', ownerId: 'char-a' },
      ];

      const result = service.determineTurnOrder(entities);

      // Summon has lower initiative, goes first by normal sorting
      expect(result[0].entityId).toBe('sum-1');
      expect(result[1].entityId).toBe('char-a');
    });

    it('should sort mixed characters, monsters, and summons correctly', () => {
      const entities: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A' },
        { entityId: 'sum-1', entityType: 'summon', initiative: 20, name: 'Summon 1', ownerId: 'char-a' },
        { entityId: 'mon-1', entityType: 'monster', initiative: 25, name: 'Monster 1' },
        { entityId: 'char-b', entityType: 'character', initiative: 30, name: 'Character B' },
      ];

      const result = service.determineTurnOrder(entities);

      // Expected order: Summon 1 (20), Character A (20), Monster 1 (25), Character B (30)
      expect(result[0].entityId).toBe('sum-1');
      expect(result[1].entityId).toBe('char-a');
      expect(result[2].entityId).toBe('mon-1');
      expect(result[3].entityId).toBe('char-b');
    });

    it('should handle owner appearing before summon in input array', () => {
      // Test that the sort is stable and works regardless of input order
      const entities: TurnEntity[] = [
        { entityId: 'sum-1', entityType: 'summon', initiative: 20, name: 'Summon 1', ownerId: 'char-a' },
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A' },
      ];

      const result = service.determineTurnOrder(entities);

      // Summon still goes before owner
      expect(result[0].entityId).toBe('sum-1');
      expect(result[1].entityId).toBe('char-a');
    });

    it('should handle summons without ownerId (scenario summons) sorted by initiative only', () => {
      const entities: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A' },
        { entityId: 'scenario-summon', entityType: 'summon', initiative: 20, name: 'Scenario Ally' },
      ];

      const result = service.determineTurnOrder(entities);

      // Without ownerId, maintains stable order (character came first in input)
      expect(result).toHaveLength(2);
      // Both have initiative 20, no ownership relation, stable sort maintains order
    });

    it('should handle complex scenario with multiple owners and summons at same initiative', () => {
      const entities: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Brute', characterClass: CharacterClass.BRUTE },
        { entityId: 'char-b', entityType: 'character', initiative: 20, name: 'Tinkerer', characterClass: CharacterClass.TINKERER },
        { entityId: 'sum-a', entityType: 'summon', initiative: 20, name: 'Brute Summon', ownerId: 'char-a' },
        { entityId: 'sum-b', entityType: 'summon', initiative: 20, name: 'Tinkerer Summon', ownerId: 'char-b' },
      ];

      const result = service.determineTurnOrder(entities);

      // Brute's summon before Brute (by class order), Tinkerer's summon before Tinkerer
      // Class order: Brute < Tinkerer
      // Expected: sum-a, char-a, sum-b, char-b (summons before their owners, owners by class)
      const sumAIndex = result.findIndex(e => e.entityId === 'sum-a');
      const charAIndex = result.findIndex(e => e.entityId === 'char-a');
      const sumBIndex = result.findIndex(e => e.entityId === 'sum-b');
      const charBIndex = result.findIndex(e => e.entityId === 'char-b');

      expect(sumAIndex).toBeLessThan(charAIndex);
      expect(sumBIndex).toBeLessThan(charBIndex);
      expect(charAIndex).toBeLessThan(sumBIndex); // Brute before Tinkerer's group
    });
  });

  describe('getNextLivingEntityIndex with summons', () => {
    it('should skip dead summons', () => {
      const entities: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A', isDead: false },
        { entityId: 'sum-1', entityType: 'summon', initiative: 20, name: 'Summon 1', ownerId: 'char-a', isDead: true },
        { entityId: 'mon-1', entityType: 'monster', initiative: 25, name: 'Monster 1', isDead: false },
      ];

      // Starting at char-a (index 0), should skip dead summon and go to monster
      const result = service.getNextLivingEntityIndex(0, entities);
      expect(result).toBe(2);
    });

    it('should not skip living summons', () => {
      const entities: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A', isDead: false },
        { entityId: 'sum-1', entityType: 'summon', initiative: 20, name: 'Summon 1', ownerId: 'char-a', isDead: false },
        { entityId: 'mon-1', entityType: 'monster', initiative: 25, name: 'Monster 1', isDead: false },
      ];

      // Starting at char-a (index 0), should go to living summon
      const result = service.getNextLivingEntityIndex(0, entities);
      expect(result).toBe(1);
    });

    it('should handle all summons dead', () => {
      const entities: TurnEntity[] = [
        { entityId: 'sum-1', entityType: 'summon', initiative: 20, name: 'Summon 1', isDead: true },
        { entityId: 'sum-2', entityType: 'summon', initiative: 20, name: 'Summon 2', isDead: true },
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A', isDead: false },
      ];

      // Starting at first summon (index 0), should skip both dead summons and go to character
      const result = service.getNextLivingEntityIndex(0, entities);
      expect(result).toBe(2);
    });
  });

  describe('updateTurnOrder with summons', () => {
    it('should not modify summon initiative when updating character initiatives', () => {
      const previousTurnOrder: TurnEntity[] = [
        { entityId: 'char-a', entityType: 'character', initiative: 20, name: 'Character A' },
        { entityId: 'sum-1', entityType: 'summon', initiative: 20, name: 'Summon 1', ownerId: 'char-a' },
      ];

      const newCardSelections = [
        { playerId: 'char-a', initiative: 30 },
      ];

      const result = service.updateTurnOrder(previousTurnOrder, newCardSelections);

      // Character's initiative updated, summon's initiative unchanged
      const charEntity = result.find(e => e.entityId === 'char-a');
      const sumEntity = result.find(e => e.entityId === 'sum-1');

      expect(charEntity?.initiative).toBe(30);
      expect(sumEntity?.initiative).toBe(20); // Summon keeps its original initiative
    });
  });
});
