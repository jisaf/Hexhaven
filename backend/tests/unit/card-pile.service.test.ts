/**
 * Unit Tests: CardPileService
 *
 * Tests for card pile management operations
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CardPileService } from '../../src/services/card-pile.service';
import type { Character } from '../../../shared/types/entities';
import { CharacterClass, Condition } from '../../../shared/types/entities';

describe('CardPileService', () => {
  let service: CardPileService;
  let mockCharacter: Character;

  beforeEach(() => {
    service = new CardPileService();

    // Create mock character with cards in different piles
    mockCharacter = {
      id: 'char-1',
      playerId: 'player-1',
      classType: CharacterClass.BRUTE,
      health: 10,
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

  describe('moveCard', () => {
    it('should move card from hand to discard', () => {
      const updated = service.moveCard(mockCharacter, 'card-1', 'hand', 'discard');

      expect(updated.hand).toEqual(['card-2']);
      expect(updated.discardPile).toEqual(['card-3', 'card-4', 'card-1']);
      expect(updated.lostPile).toEqual(['card-5']);
    });

    it('should move card from discard to hand', () => {
      const updated = service.moveCard(mockCharacter, 'card-3', 'discard', 'hand');

      expect(updated.hand).toEqual(['card-1', 'card-2', 'card-3']);
      expect(updated.discardPile).toEqual(['card-4']);
    });

    it('should move card from discard to lost', () => {
      const updated = service.moveCard(mockCharacter, 'card-3', 'discard', 'lost');

      expect(updated.discardPile).toEqual(['card-4']);
      expect(updated.lostPile).toEqual(['card-5', 'card-3']);
    });

    it('should throw error if card not in source pile', () => {
      expect(() =>
        service.moveCard(mockCharacter, 'card-999', 'hand', 'discard')
      ).toThrow('Card card-999 not in hand pile');
    });

    it('should not mutate original character', () => {
      const original = { ...mockCharacter };
      service.moveCard(mockCharacter, 'card-1', 'hand', 'discard');

      expect(mockCharacter).toEqual(original);
    });
  });

  describe('moveCards', () => {
    it('should move multiple cards at once', () => {
      const updated = service.moveCards(
        mockCharacter,
        ['card-3', 'card-4'],
        'discard',
        'hand'
      );

      expect(updated.hand).toEqual(['card-1', 'card-2', 'card-3', 'card-4']);
      expect(updated.discardPile).toEqual([]);
    });

    it('should handle empty array', () => {
      const updated = service.moveCards(mockCharacter, [], 'hand', 'discard');

      expect(updated).toEqual(mockCharacter);
    });

    it('should throw error if any card not found', () => {
      expect(() =>
        service.moveCards(mockCharacter, ['card-3', 'card-999'], 'discard', 'hand')
      ).toThrow();
    });
  });

  describe('playCards', () => {
    it('should move both cards to discard by default', () => {
      const updated = service.playCards(
        mockCharacter,
        'card-1',
        'card-2',
        false,
        false
      );

      expect(updated.hand).toEqual([]);
      expect(updated.discardPile).toEqual(['card-3', 'card-4', 'card-1', 'card-2']);
      expect(updated.lostPile).toEqual(['card-5']);
    });

    it('should move top card to lost if has loss icon', () => {
      const updated = service.playCards(
        mockCharacter,
        'card-1',
        'card-2',
        true, // top has loss
        false
      );

      expect(updated.hand).toEqual([]);
      expect(updated.discardPile).toEqual(['card-3', 'card-4', 'card-2']);
      expect(updated.lostPile).toEqual(['card-5', 'card-1']);
    });

    it('should move bottom card to lost if has loss icon', () => {
      const updated = service.playCards(
        mockCharacter,
        'card-1',
        'card-2',
        false,
        true // bottom has loss
      );

      expect(updated.hand).toEqual([]);
      expect(updated.discardPile).toEqual(['card-3', 'card-4', 'card-1']);
      expect(updated.lostPile).toEqual(['card-5', 'card-2']);
    });

    it('should move both cards to lost if both have loss icons', () => {
      const updated = service.playCards(
        mockCharacter,
        'card-1',
        'card-2',
        true,
        true
      );

      expect(updated.hand).toEqual([]);
      expect(updated.discardPile).toEqual(['card-3', 'card-4']);
      expect(updated.lostPile).toEqual(['card-5', 'card-1', 'card-2']);
    });

    it('should throw error if top card not in hand', () => {
      expect(() =>
        service.playCards(mockCharacter, 'card-999', 'card-2', false, false)
      ).toThrow('Top card card-999 not in hand');
    });

    it('should throw error if bottom card not in hand', () => {
      expect(() =>
        service.playCards(mockCharacter, 'card-1', 'card-999', false, false)
      ).toThrow('Bottom card card-999 not in hand');
    });
  });

  describe('moveAllCards', () => {
    it('should move all cards from discard to hand', () => {
      const updated = service.moveAllCards(mockCharacter, 'discard', 'hand');

      expect(updated.hand).toEqual(['card-1', 'card-2', 'card-3', 'card-4']);
      expect(updated.discardPile).toEqual([]);
    });

    it('should move all cards from hand to lost', () => {
      const updated = service.moveAllCards(mockCharacter, 'hand', 'lost');

      expect(updated.hand).toEqual([]);
      expect(updated.lostPile).toEqual(['card-5', 'card-1', 'card-2']);
    });

    it('should handle empty source pile', () => {
      const emptyChar = { ...mockCharacter, discardPile: [] };
      const updated = service.moveAllCards(emptyChar, 'discard', 'hand');

      expect(updated.discardPile).toEqual([]);
      expect(updated.hand).toEqual(['card-1', 'card-2']);
    });
  });

  describe('getCardCounts', () => {
    it('should return counts for all piles', () => {
      const counts = service.getCardCounts(mockCharacter);

      expect(counts).toEqual({
        hand: 2,
        discard: 2,
        lost: 1,
        total: 5,
      });
    });

    it('should handle empty piles', () => {
      const emptyChar = {
        ...mockCharacter,
        hand: [],
        discardPile: [],
        lostPile: [],
      };
      const counts = service.getCardCounts(emptyChar);

      expect(counts).toEqual({
        hand: 0,
        discard: 0,
        lost: 0,
        total: 5,
      });
    });
  });

  describe('canPlayCards', () => {
    it('should return true if enough cards in hand', () => {
      expect(service.canPlayCards(mockCharacter, 2)).toBe(true);
    });

    it('should return false if insufficient cards', () => {
      const lowCard = { ...mockCharacter, hand: ['card-1'] };
      expect(service.canPlayCards(lowCard, 2)).toBe(false);
    });

    it('should handle custom required count', () => {
      expect(service.canPlayCards(mockCharacter, 1)).toBe(true);
      expect(service.canPlayCards(mockCharacter, 3)).toBe(false);
    });
  });

  describe('canRest', () => {
    it('should return true if enough cards in discard', () => {
      expect(service.canRest(mockCharacter, 2)).toBe(true);
    });

    it('should return false if insufficient cards in discard', () => {
      const lowDiscard = { ...mockCharacter, discardPile: ['card-3'] };
      expect(service.canRest(lowDiscard, 2)).toBe(false);
    });

    it('should handle custom required count', () => {
      expect(service.canRest(mockCharacter, 1)).toBe(true);
      expect(service.canRest(mockCharacter, 3)).toBe(false);
    });
  });
});
