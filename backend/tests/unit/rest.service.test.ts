/**
 * Unit Tests: RestService
 *
 * Tests for rest operations (short rest, long rest)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RestService } from '../../src/services/rest.service';
import { CardPileService } from '../../src/services/card-pile.service';
import type { Character } from '../../../shared/types/entities';
import { CharacterClass } from '../../../shared/types/entities';
import { RandomUtils } from '../../src/utils/random';

// Mock RandomUtils
jest.mock('../../src/utils/random');

describe('RestService', () => {
  let service: RestService;
  let cardPileService: CardPileService;
  let mockCharacter: Character;

  beforeEach(() => {
    cardPileService = new CardPileService();
    service = new RestService(cardPileService);

    // Reset mocks
    jest.clearAllMocks();

    // Create mock character
    mockCharacter = {
      id: 'char-1',
      playerId: 'player-1',
      classType: CharacterClass.BRUTE,
      health: 8,
      maxHealth: 10,
      experience: 0,
      level: 1,
      currentHex: { q: 0, r: 0 },
      abilityDeck: ['card-1', 'card-2', 'card-3', 'card-4', 'card-5'],
      hand: ['card-1', 'card-2'],
      discardPile: ['card-3', 'card-4', 'card-5'],
      lostPile: [],
      activeCards: null,
      conditions: [],
      isExhausted: false,
    };
  });

  describe('canRest', () => {
    it('should allow short rest with 2+ cards in discard', () => {
      const result = service.canRest(mockCharacter, 'short');
      expect(result.valid).toBe(true);
    });

    it('should allow long rest with 2+ cards in discard', () => {
      const result = service.canRest(mockCharacter, 'long');
      expect(result.valid).toBe(true);
    });

    it('should reject rest with 0 cards in discard', () => {
      const char = { ...mockCharacter, discardPile: [] };
      const result = service.canRest(char, 'short');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('2+ cards');
    });

    it('should reject rest with 1 card in discard', () => {
      const char = { ...mockCharacter, discardPile: ['card-3'] };
      const result = service.canRest(char, 'short');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('2+ cards');
    });

    it('should reject rest if character is exhausted', () => {
      const char = { ...mockCharacter, isExhausted: true };
      const result = service.canRest(char, 'short');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('exhausted');
    });

    it('should allow rest with exactly 2 cards in discard', () => {
      const char = { ...mockCharacter, discardPile: ['card-3', 'card-4'] };
      const result = service.canRest(char, 'short');

      expect(result.valid).toBe(true);
    });
  });

  describe('executeShortRest', () => {
    beforeEach(() => {
      (RandomUtils.selectRandom as jest.Mock).mockReturnValue('card-3');
      (RandomUtils.generateSeed as jest.Mock).mockReturnValue(12345);
    });

    it('should select random card from discard', () => {
      const result = service.executeShortRest(mockCharacter);

      expect(RandomUtils.selectRandom).toHaveBeenCalledWith(mockCharacter.discardPile);
      expect(result.randomCard).toBe('card-3');
    });

    it('should set short rest state', () => {
      const result = service.executeShortRest(mockCharacter);

      expect(result.character.shortRestState).toEqual({
        randomCardId: 'card-3',
        randomSeed: 12345,
        hasRerolled: false,
        timestamp: expect.any(Number),
      });
    });

    it('should set rest type to short', () => {
      const result = service.executeShortRest(mockCharacter);

      expect(result.character.restType).toBe('short');
    });

    it('should throw error if cannot rest', () => {
      const char = { ...mockCharacter, discardPile: ['card-3'] };

      expect(() => service.executeShortRest(char)).toThrow('2+ cards');
    });

    it('should not modify card piles yet', () => {
      const result = service.executeShortRest(mockCharacter);

      expect(result.character.hand).toEqual(mockCharacter.hand);
      expect(result.character.discardPile).toEqual(mockCharacter.discardPile);
      expect(result.character.lostPile).toEqual(mockCharacter.lostPile);
    });
  });

  describe('rerollShortRest', () => {
    beforeEach(() => {
      (RandomUtils.selectRandom as jest.Mock).mockReturnValue('card-4');
      (RandomUtils.generateSeed as jest.Mock).mockReturnValue(12345);

      // Setup character with pending short rest
      mockCharacter.shortRestState = {
        randomCardId: 'card-3',
        randomSeed: 12345,
        hasRerolled: false,
        timestamp: Date.now(),
      };
    });

    it('should select new random card', () => {
      const result = service.rerollShortRest(mockCharacter);

      expect(RandomUtils.selectRandom).toHaveBeenCalledWith(mockCharacter.discardPile);
      expect(result.randomCard).toBe('card-4');
    });

    it('should deal 1 damage', () => {
      const result = service.rerollShortRest(mockCharacter);

      expect(result.character.health).toBe(7); // 8 - 1
      expect(result.damageTaken).toBe(1);
    });

    it('should set hasRerolled to true', () => {
      const result = service.rerollShortRest(mockCharacter);

      expect(result.character.shortRestState?.hasRerolled).toBe(true);
    });

    it('should throw error if no short rest in progress', () => {
      const char = { ...mockCharacter, shortRestState: null };

      expect(() => service.rerollShortRest(char)).toThrow('No short rest in progress');
    });

    it('should throw error if already rerolled', () => {
      const char = {
        ...mockCharacter,
        shortRestState: {
          ...mockCharacter.shortRestState!,
          hasRerolled: true,
        },
      };

      expect(() => service.rerollShortRest(char)).toThrow('Already rerolled');
    });

    it('should throw error if would cause exhaustion (1 HP)', () => {
      const char = { ...mockCharacter, health: 1 };

      expect(() => service.rerollShortRest(char)).toThrow('would cause exhaustion');
    });

    it('should allow reroll at 2 HP', () => {
      const char = { ...mockCharacter, health: 2 };
      const result = service.rerollShortRest(char);

      expect(result.character.health).toBe(1);
    });
  });

  describe('finalizeShortRest', () => {
    beforeEach(() => {
      mockCharacter.shortRestState = {
        randomCardId: 'card-3',
        randomSeed: 12345,
        hasRerolled: false,
        timestamp: Date.now(),
      };
    });

    it('should move random card to lost pile', () => {
      const result = service.finalizeShortRest(mockCharacter);

      expect(result.lostPile).toContain('card-3');
      expect(result.discardPile).not.toContain('card-3');
    });

    it('should move remaining discard to hand', () => {
      const result = service.finalizeShortRest(mockCharacter);

      // Should have original hand + remaining discard (card-4, card-5)
      expect(result.hand).toHaveLength(4); // ['card-1', 'card-2', 'card-4', 'card-5']
      expect(result.hand).toContain('card-4');
      expect(result.hand).toContain('card-5');
    });

    it('should clear discard pile', () => {
      const result = service.finalizeShortRest(mockCharacter);

      expect(result.discardPile).toEqual([]);
    });

    it('should clear short rest state', () => {
      const result = service.finalizeShortRest(mockCharacter);

      expect(result.shortRestState).toBeNull();
      expect(result.restType).toBe('none');
      expect(result.isResting).toBe(false);
    });

    it('should throw error if no short rest in progress', () => {
      const char = { ...mockCharacter, shortRestState: null };

      expect(() => service.finalizeShortRest(char)).toThrow('No short rest in progress');
    });
  });

  describe('executeLongRest', () => {
    it('should move chosen card to lost pile', () => {
      const result = service.executeLongRest(mockCharacter, 'card-3');

      expect(result.lostPile).toContain('card-3');
      expect(result.discardPile).not.toContain('card-3');
    });

    it('should move remaining discard to hand', () => {
      const result = service.executeLongRest(mockCharacter, 'card-3');

      // Should have original hand + remaining discard (card-4, card-5)
      expect(result.hand).toHaveLength(4);
      expect(result.hand).toContain('card-4');
      expect(result.hand).toContain('card-5');
    });

    it('should heal 2 HP', () => {
      const result = service.executeLongRest(mockCharacter, 'card-3');

      expect(result.health).toBe(10); // 8 + 2
    });

    it('should not exceed max HP', () => {
      const char = { ...mockCharacter, health: 9, maxHealth: 10 };
      const result = service.executeLongRest(char, 'card-3');

      expect(result.health).toBe(10); // Not 11
    });

    it('should not heal if at max HP', () => {
      const char = { ...mockCharacter, health: 10, maxHealth: 10 };
      const result = service.executeLongRest(char, 'card-3');

      expect(result.health).toBe(10);
    });

    it('should clear rest state', () => {
      const result = service.executeLongRest(mockCharacter, 'card-3');

      expect(result.restType).toBe('none');
      expect(result.isResting).toBe(false);
    });

    it('should throw error if card not in discard', () => {
      expect(() =>
        service.executeLongRest(mockCharacter, 'card-999')
      ).toThrow('not in discard pile');
    });

    it('should throw error if cannot rest', () => {
      const char = { ...mockCharacter, discardPile: ['card-3'] };

      expect(() => service.executeLongRest(char, 'card-3')).toThrow('2+ cards');
    });

    it('should allow choosing any card in discard', () => {
      const result1 = service.executeLongRest(mockCharacter, 'card-3');
      expect(result1.lostPile).toContain('card-3');

      const result2 = service.executeLongRest(mockCharacter, 'card-4');
      expect(result2.lostPile).toContain('card-4');
    });
  });

  describe('declareLongRest', () => {
    it('should set isResting to true', () => {
      const result = service.declareLongRest(mockCharacter);

      expect(result.isResting).toBe(true);
    });

    it('should set restType to long', () => {
      const result = service.declareLongRest(mockCharacter);

      expect(result.restType).toBe('long');
    });

    it('should throw error if cannot rest', () => {
      const char = { ...mockCharacter, discardPile: [] };

      expect(() => service.declareLongRest(char)).toThrow('2+ cards');
    });

    it('should not modify card piles', () => {
      const result = service.declareLongRest(mockCharacter);

      expect(result.hand).toEqual(mockCharacter.hand);
      expect(result.discardPile).toEqual(mockCharacter.discardPile);
      expect(result.lostPile).toEqual(mockCharacter.lostPile);
    });
  });
});
