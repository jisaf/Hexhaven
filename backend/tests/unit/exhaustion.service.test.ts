/**
 * Unit Tests: ExhaustionService
 *
 * Tests for exhaustion detection and execution
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExhaustionService } from '../../src/services/exhaustion.service';
import type { Character } from '../../../shared/types/entities';
import { CharacterClass } from '../../../shared/types/entities';

describe('ExhaustionService', () => {
  let service: ExhaustionService;
  let mockCharacter: Character;

  beforeEach(() => {
    service = new ExhaustionService();

    // Create mock character with healthy state
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
      discardPile: ['card-3', 'card-4'],
      lostPile: ['card-5'],
      activeCards: null,
      conditions: [],
      isExhausted: false,
    };
  });

  describe('checkExhaustion', () => {
    describe('already exhausted', () => {
      it('should return exhausted if character is already exhausted', () => {
        const char = { ...mockCharacter, isExhausted: true, exhaustionReason: 'damage' as const };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(true);
        expect(result.reason).toBe('damage');
        expect(result.message).toContain('already exhausted');
      });

      it('should use default reason if exhaustionReason is null', () => {
        const char = { ...mockCharacter, isExhausted: true };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(true);
        expect(result.reason).toBe('damage');
      });
    });

    describe('health-based exhaustion', () => {
      it('should detect exhaustion at 0 HP', () => {
        const char = { ...mockCharacter, health: 0 };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(true);
        expect(result.reason).toBe('damage');
        expect(result.message).toContain('0 HP');
        expect(result.details?.health).toBe(0);
      });

      it('should detect exhaustion below 0 HP', () => {
        const char = { ...mockCharacter, health: -3 };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(true);
        expect(result.reason).toBe('damage');
        expect(result.message).toContain('-3 HP');
      });

      it('should not exhaust at 1 HP', () => {
        const char = { ...mockCharacter, health: 1 };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(false);
        expect(result.reason).toBeNull();
      });
    });

    describe('card-based exhaustion', () => {
      it('should detect exhaustion with 0 hand, 0 discard', () => {
        const char = {
          ...mockCharacter,
          hand: [],
          discardPile: [],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(true);
        expect(result.reason).toBe('insufficient_cards');
        expect(result.message).toContain('Cannot play 2 cards');
        expect(result.message).toContain('cannot rest');
        expect(result.details?.cardsInHand).toBe(0);
        expect(result.details?.cardsInDiscard).toBe(0);
        expect(result.details?.canPlayCards).toBe(false);
        expect(result.details?.canRest).toBe(false);
      });

      it('should detect exhaustion with 1 hand, 0 discard', () => {
        const char = {
          ...mockCharacter,
          hand: ['card-1'],
          discardPile: [],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(true);
        expect(result.reason).toBe('insufficient_cards');
        expect(result.message).toContain('0 in discard');
      });

      it('should detect exhaustion with 0 hand, 1 discard', () => {
        const char = {
          ...mockCharacter,
          hand: [],
          discardPile: ['card-3'],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(true);
        expect(result.reason).toBe('insufficient_cards');
        expect(result.message).toContain('1 in discard');
      });

      it('should detect exhaustion with 1 hand, 1 discard', () => {
        const char = {
          ...mockCharacter,
          hand: ['card-1'],
          discardPile: ['card-3'],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(true);
        expect(result.reason).toBe('insufficient_cards');
      });

      it('should NOT exhaust with 2 hand, 0 discard (can play cards)', () => {
        const char = {
          ...mockCharacter,
          hand: ['card-1', 'card-2'],
          discardPile: [],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(false);
        expect(result.details?.canPlayCards).toBe(true);
        expect(result.details?.canRest).toBe(false);
      });

      it('should NOT exhaust with 1 hand, 2 discard (can rest)', () => {
        const char = {
          ...mockCharacter,
          hand: ['card-1'],
          discardPile: ['card-3', 'card-4'],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(false);
        expect(result.details?.canPlayCards).toBe(false);
        expect(result.details?.canRest).toBe(true);
      });

      it('should NOT exhaust with 0 hand, 2 discard (can rest)', () => {
        const char = {
          ...mockCharacter,
          hand: [],
          discardPile: ['card-3', 'card-4'],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(false);
        expect(result.details?.canRest).toBe(true);
      });

      it('should NOT exhaust with 2 hand, 2 discard (can do both)', () => {
        const char = {
          ...mockCharacter,
          hand: ['card-1', 'card-2'],
          discardPile: ['card-3', 'card-4'],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(false);
        expect(result.details?.canPlayCards).toBe(true);
        expect(result.details?.canRest).toBe(true);
      });

      it('should NOT exhaust with 3+ hand', () => {
        const char = {
          ...mockCharacter,
          hand: ['card-1', 'card-2', 'card-3'],
          discardPile: [],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(false);
      });

      it('should NOT exhaust with 3+ discard', () => {
        const char = {
          ...mockCharacter,
          hand: ['card-1'],
          discardPile: ['card-3', 'card-4', 'card-5'],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(false);
      });
    });

    describe('health takes precedence', () => {
      it('should exhaust from damage even with sufficient cards', () => {
        const char = {
          ...mockCharacter,
          health: 0,
          hand: ['card-1', 'card-2'],
          discardPile: ['card-3', 'card-4'],
        };
        const result = service.checkExhaustion(char);

        expect(result.isExhausted).toBe(true);
        expect(result.reason).toBe('damage');
      });
    });
  });

  describe('executeExhaustion', () => {
    it('should move all hand cards to lost pile', () => {
      const result = service.executeExhaustion(mockCharacter, 'damage');

      expect(result.hand).toEqual([]);
      expect(result.lostPile).toContain('card-1');
      expect(result.lostPile).toContain('card-2');
    });

    it('should move all discard cards to lost pile', () => {
      const result = service.executeExhaustion(mockCharacter, 'damage');

      expect(result.discardPile).toEqual([]);
      expect(result.lostPile).toContain('card-3');
      expect(result.lostPile).toContain('card-4');
    });

    it('should preserve existing lost pile cards', () => {
      const result = service.executeExhaustion(mockCharacter, 'damage');

      expect(result.lostPile).toContain('card-5');
      expect(result.lostPile.length).toBe(5); // original 1 + hand 2 + discard 2
    });

    it('should move active effect cards to lost pile', () => {
      const char = {
        ...mockCharacter,
        activeEffects: [
          { cardId: 'card-6', effectType: 'persistent' as const, appliedAt: 1 },
          { cardId: 'card-7', effectType: 'round' as const, appliedAt: 1 },
        ],
      };
      const result = service.executeExhaustion(char, 'damage');

      expect(result.activeEffects).toEqual([]);
      expect(result.lostPile).toContain('card-6');
      expect(result.lostPile).toContain('card-7');
      expect(result.lostPile.length).toBe(7); // 1 + 2 + 2 + 2 active
    });

    it('should handle undefined activeEffects gracefully', () => {
      const char = { ...mockCharacter, activeEffects: undefined };
      const result = service.executeExhaustion(char, 'damage');

      expect(result.lostPile.length).toBe(5);
      expect(result.activeEffects).toEqual([]);
    });

    it('should set isExhausted to true', () => {
      const result = service.executeExhaustion(mockCharacter, 'damage');

      expect(result.isExhausted).toBe(true);
    });

    it('should set exhaustionReason', () => {
      const resultDamage = service.executeExhaustion(mockCharacter, 'damage');
      expect(resultDamage.exhaustionReason).toBe('damage');

      const resultCards = service.executeExhaustion(mockCharacter, 'insufficient_cards');
      expect(resultCards.exhaustionReason).toBe('insufficient_cards');
    });

    it('should remove character from board (set currentHex to null)', () => {
      const result = service.executeExhaustion(mockCharacter, 'damage');

      expect(result.currentHex).toBeNull();
    });

    it('should clear active cards', () => {
      const char = {
        ...mockCharacter,
        activeCards: { top: 'card-1', bottom: 'card-2' },
      };
      const result = service.executeExhaustion(char, 'damage');

      expect(result.activeCards).toBeNull();
    });

    it('should clear rest state', () => {
      const char = {
        ...mockCharacter,
        isResting: true,
        restType: 'long' as const,
        shortRestState: {
          randomCardId: 'card-3',
          randomSeed: 12345,
          hasRerolled: false,
          timestamp: Date.now(),
        },
      };
      const result = service.executeExhaustion(char, 'damage');

      expect(result.isResting).toBe(false);
      expect(result.restType).toBe('none');
      expect(result.shortRestState).toBeNull();
    });

    it('should preserve other character properties', () => {
      const result = service.executeExhaustion(mockCharacter, 'damage');

      expect(result.id).toBe('char-1');
      expect(result.playerId).toBe('player-1');
      expect(result.classType).toBe(CharacterClass.BRUTE);
      expect(result.health).toBe(8); // Health unchanged
      expect(result.maxHealth).toBe(10);
      expect(result.abilityDeck).toEqual(mockCharacter.abilityDeck);
      expect(result.conditions).toEqual(mockCharacter.conditions);
    });

    it('should not mutate original character', () => {
      const original = { ...mockCharacter };
      service.executeExhaustion(mockCharacter, 'damage');

      expect(mockCharacter).toEqual(original);
    });
  });

  describe('isPartyExhausted', () => {
    it('should return true if all characters exhausted', () => {
      const characters: Character[] = [
        { ...mockCharacter, id: 'char-1', isExhausted: true },
        { ...mockCharacter, id: 'char-2', isExhausted: true },
        { ...mockCharacter, id: 'char-3', isExhausted: true },
      ];

      expect(service.isPartyExhausted(characters)).toBe(true);
    });

    it('should return false if any character not exhausted', () => {
      const characters: Character[] = [
        { ...mockCharacter, id: 'char-1', isExhausted: true },
        { ...mockCharacter, id: 'char-2', isExhausted: false },
        { ...mockCharacter, id: 'char-3', isExhausted: true },
      ];

      expect(service.isPartyExhausted(characters)).toBe(false);
    });

    it('should return false if no characters exhausted', () => {
      const characters: Character[] = [
        { ...mockCharacter, id: 'char-1', isExhausted: false },
        { ...mockCharacter, id: 'char-2', isExhausted: false },
      ];

      expect(service.isPartyExhausted(characters)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(service.isPartyExhausted([])).toBe(false);
    });

    it('should return true for single exhausted character', () => {
      const characters: Character[] = [
        { ...mockCharacter, isExhausted: true },
      ];

      expect(service.isPartyExhausted(characters)).toBe(true);
    });

    it('should return false for single active character', () => {
      const characters: Character[] = [
        { ...mockCharacter, isExhausted: false },
      ];

      expect(service.isPartyExhausted(characters)).toBe(false);
    });
  });

  describe('getExhaustionRisk', () => {
    it('should return critical if already exhausted', () => {
      const char = { ...mockCharacter, isExhausted: true };
      expect(service.getExhaustionRisk(char)).toBe('critical');
    });

    it('should return critical if would be exhausted now', () => {
      const char = {
        ...mockCharacter,
        hand: ['card-1'],
        discardPile: ['card-3'],
      };
      expect(service.getExhaustionRisk(char)).toBe('critical');
    });

    it('should return warning for low health (2 HP)', () => {
      const char = { ...mockCharacter, health: 2 };
      expect(service.getExhaustionRisk(char)).toBe('warning');
    });

    it('should return warning for low health (1 HP)', () => {
      const char = { ...mockCharacter, health: 1 };
      expect(service.getExhaustionRisk(char)).toBe('warning');
    });

    it('should return warning for low cards (2 hand, 2 discard)', () => {
      const char = {
        ...mockCharacter,
        health: 8,
        hand: ['card-1', 'card-2'],
        discardPile: ['card-3', 'card-4'],
      };
      expect(service.getExhaustionRisk(char)).toBe('warning');
    });

    it('should return warning for low cards (2 hand, 1 discard)', () => {
      const char = {
        ...mockCharacter,
        health: 8,
        hand: ['card-1', 'card-2'],
        discardPile: ['card-3'],
      };
      expect(service.getExhaustionRisk(char)).toBe('warning');
    });

    it('should return warning for low cards (1 hand, 2 discard)', () => {
      const char = {
        ...mockCharacter,
        health: 8,
        hand: ['card-1'],
        discardPile: ['card-3', 'card-4'],
      };
      expect(service.getExhaustionRisk(char)).toBe('warning');
    });

    it('should return warning for both low health and low cards', () => {
      const char = {
        ...mockCharacter,
        health: 2,
        hand: ['card-1', 'card-2'],
        discardPile: ['card-3', 'card-4'],
      };
      expect(service.getExhaustionRisk(char)).toBe('warning');
    });

    it('should return safe for healthy state (3+ HP, 3+ cards)', () => {
      const char = {
        ...mockCharacter,
        health: 5,
        hand: ['card-1', 'card-2', 'card-3'],
        discardPile: ['card-4'],
      };
      expect(service.getExhaustionRisk(char)).toBe('safe');
    });

    it('should return safe at exactly 3 HP with good cards', () => {
      const char = {
        ...mockCharacter,
        health: 3,
        hand: ['card-1', 'card-2', 'card-3'],
        discardPile: ['card-4'],
      };
      expect(service.getExhaustionRisk(char)).toBe('safe');
    });

    it('should return safe with full health and few cards (but not critical)', () => {
      const char = {
        ...mockCharacter,
        health: 10,
        hand: ['card-1', 'card-2', 'card-3'],
        discardPile: [],
      };
      expect(service.getExhaustionRisk(char)).toBe('safe');
    });
  });
});
