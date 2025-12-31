/**
 * Unit Tests: TurnOrderService
 *
 * Tests for turn order calculation and initiative handling
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TurnOrderService } from '../../src/services/turn-order.service';
import { CharacterClass } from '../../../shared/types/entities';

describe('TurnOrderService', () => {
  let service: TurnOrderService;

  beforeEach(() => {
    service = new TurnOrderService();
  });

  describe('calculateInitiative', () => {
    it('should return minimum of two card initiatives', () => {
      const result = service.calculateInitiative(15, 25);
      expect(result).toBe(15);
    });

    it('should return minimum when bottom is lower', () => {
      const result = service.calculateInitiative(30, 10);
      expect(result).toBe(10);
    });

    it('should return top card initiative when bottom is null', () => {
      const result = service.calculateInitiative(20, null);
      expect(result).toBe(20);
    });

    it('should return bottom card initiative when top is null', () => {
      const result = service.calculateInitiative(null, 25);
      expect(result).toBe(25);
    });

    it('should throw error when both initiatives are null', () => {
      expect(() => service.calculateInitiative(null, null)).toThrow(
        'Cannot calculate initiative without card selections'
      );
    });

    describe('long rest', () => {
      it('should return 99 for long rest', () => {
        const result = service.calculateInitiative(null, null, true);
        expect(result).toBe(99);
      });

      it('should ignore card initiatives when long resting', () => {
        const result = service.calculateInitiative(10, 20, true);
        expect(result).toBe(99);
      });

      it('should return 99 even with very low card initiatives', () => {
        const result = service.calculateInitiative(1, 5, true);
        expect(result).toBe(99);
      });

      it('should return normal initiative when isLongRest is false', () => {
        const result = service.calculateInitiative(10, 20, false);
        expect(result).toBe(10);
      });
    });
  });

  describe('determineTurnOrder', () => {
    it('should sort by initiative (lowest first)', () => {
      const entities = [
        { entityId: '1', entityType: 'character' as const, initiative: 30, name: 'Player 1' },
        { entityId: '2', entityType: 'character' as const, initiative: 10, name: 'Player 2' },
        { entityId: '3', entityType: 'character' as const, initiative: 20, name: 'Player 3' },
      ];

      const result = service.determineTurnOrder(entities);

      expect(result[0].initiative).toBe(10);
      expect(result[1].initiative).toBe(20);
      expect(result[2].initiative).toBe(30);
    });

    it('should place long rest players last (initiative 99)', () => {
      const entities = [
        { entityId: '1', entityType: 'character' as const, initiative: 30, name: 'Player 1' },
        { entityId: '2', entityType: 'character' as const, initiative: 99, name: 'Player 2 (Long Rest)' },
        { entityId: '3', entityType: 'character' as const, initiative: 20, name: 'Player 3' },
      ];

      const result = service.determineTurnOrder(entities);

      expect(result[0].initiative).toBe(20);
      expect(result[1].initiative).toBe(30);
      expect(result[2].initiative).toBe(99);
      expect(result[2].name).toContain('Long Rest');
    });

    it('should handle multiple long rest players', () => {
      const entities = [
        { entityId: '1', entityType: 'character' as const, initiative: 99, name: 'Player 1', characterClass: CharacterClass.BRUTE },
        { entityId: '2', entityType: 'character' as const, initiative: 15, name: 'Player 2' },
        { entityId: '3', entityType: 'character' as const, initiative: 99, name: 'Player 3', characterClass: CharacterClass.TINKERER },
      ];

      const result = service.determineTurnOrder(entities);

      expect(result[0].initiative).toBe(15);
      expect(result[1].initiative).toBe(99);
      expect(result[2].initiative).toBe(99);
      // Both have init 99, should be tie-broken by character class
      expect(result[1].characterClass).toBe(CharacterClass.BRUTE);
      expect(result[2].characterClass).toBe(CharacterClass.TINKERER);
    });

    it('should break ties with character class order', () => {
      const entities = [
        { entityId: '1', entityType: 'character' as const, initiative: 20, name: 'Scoundrel', characterClass: CharacterClass.SCOUNDREL },
        { entityId: '2', entityType: 'character' as const, initiative: 20, name: 'Brute', characterClass: CharacterClass.BRUTE },
        { entityId: '3', entityType: 'character' as const, initiative: 20, name: 'Tinkerer', characterClass: CharacterClass.TINKERER },
      ];

      const result = service.determineTurnOrder(entities);

      expect(result[0].characterClass).toBe(CharacterClass.BRUTE);
      expect(result[1].characterClass).toBe(CharacterClass.TINKERER);
      expect(result[2].characterClass).toBe(CharacterClass.SCOUNDREL);
    });

    it('should handle empty array', () => {
      const result = service.determineTurnOrder([]);
      expect(result).toEqual([]);
    });

    it('should handle single entity', () => {
      const entities = [
        { entityId: '1', entityType: 'character' as const, initiative: 20, name: 'Player 1' },
      ];

      const result = service.determineTurnOrder(entities);
      expect(result).toHaveLength(1);
      expect(result[0].entityId).toBe('1');
    });
  });

  describe('getNextEntityIndex', () => {
    it('should return next index', () => {
      const result = service.getNextEntityIndex(0, [1, 2, 3]);
      expect(result).toBe(1);
    });

    it('should wrap to 0 at end', () => {
      const result = service.getNextEntityIndex(2, [1, 2, 3]);
      expect(result).toBe(0);
    });
  });

  describe('getNextLivingEntityIndex', () => {
    it('should skip dead entities', () => {
      const entities = [
        { entityId: '1', isDead: false },
        { entityId: '2', isDead: true },
        { entityId: '3', isDead: false },
      ];

      const result = service.getNextLivingEntityIndex(0, entities);
      expect(result).toBe(2);
    });

    it('should skip exhausted entities', () => {
      const entities = [
        { entityId: '1', isExhausted: false },
        { entityId: '2', isExhausted: true },
        { entityId: '3', isExhausted: false },
      ];

      const result = service.getNextLivingEntityIndex(0, entities);
      expect(result).toBe(2);
    });

    it('should find next living entity after multiple dead ones', () => {
      const entities = [
        { entityId: '1', isDead: false },
        { entityId: '2', isDead: true },
        { entityId: '3', isDead: true },
        { entityId: '4', isDead: false },
      ];

      const result = service.getNextLivingEntityIndex(0, entities);
      expect(result).toBe(3);
    });

    it('should wrap around to find living entity', () => {
      const entities = [
        { entityId: '1', isDead: false },
        { entityId: '2', isDead: true },
        { entityId: '3', isDead: false },
      ];

      const result = service.getNextLivingEntityIndex(2, entities);
      expect(result).toBe(0);
    });
  });

  describe('getCharacterClassOrder', () => {
    it('should return predefined class order', () => {
      const order = service.getCharacterClassOrder();
      expect(order).toHaveLength(6);
      expect(order[0]).toBe(CharacterClass.BRUTE);
      expect(order[1]).toBe(CharacterClass.TINKERER);
    });
  });

  describe('compareCharacterClasses', () => {
    it('should return negative when class1 comes before class2', () => {
      const result = service.compareCharacterClasses(
        CharacterClass.BRUTE,
        CharacterClass.TINKERER
      );
      expect(result).toBeLessThan(0);
    });

    it('should return positive when class1 comes after class2', () => {
      const result = service.compareCharacterClasses(
        CharacterClass.SCOUNDREL,
        CharacterClass.BRUTE
      );
      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 for same class', () => {
      const result = service.compareCharacterClasses(
        CharacterClass.BRUTE,
        CharacterClass.BRUTE
      );
      expect(result).toBe(0);
    });
  });

  describe('calculateInitiativeFromSelectedCard (Issue #411)', () => {
    it('should return the selected card initiative directly', () => {
      const result = service.calculateInitiativeFromSelectedCard(25);
      expect(result).toBe(25);
    });

    it('should return low initiative correctly', () => {
      const result = service.calculateInitiativeFromSelectedCard(5);
      expect(result).toBe(5);
    });

    it('should return high initiative correctly', () => {
      const result = service.calculateInitiativeFromSelectedCard(85);
      expect(result).toBe(85);
    });

    it('should return 99 for long rest even with selected card', () => {
      const result = service.calculateInitiativeFromSelectedCard(25, true);
      expect(result).toBe(99);
    });

    it('should return selected initiative when not long resting', () => {
      const result = service.calculateInitiativeFromSelectedCard(15, false);
      expect(result).toBe(15);
    });
  });
});
