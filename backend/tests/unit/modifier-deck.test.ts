/**
 * Unit Test: Attack Modifier Deck Service (US2 - T084)
 *
 * Tests attack modifier deck management:
 * - Initialize standard 20-card deck
 * - Draw cards from deck
 * - Reshuffle when null or x2 drawn
 * - Add/remove bless and curse cards
 * - Handle advantage/disadvantage draws
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ModifierDeckService } from '../../src/services/modifier-deck.service';
import { AttackModifierCard } from '../../../shared/types/entities';

describe('ModifierDeckService', () => {
  let deckService: ModifierDeckService;

  beforeEach(() => {
    deckService = new ModifierDeckService();
  });

  describe('initializeStandardDeck', () => {
    it('should create standard 20-card attack modifier deck', () => {
      const deck = deckService.initializeStandardDeck();

      expect(deck).toHaveLength(20);
    });

    it('should include correct distribution of modifiers', () => {
      // Standard deck composition:
      // 1x null, 1x x2
      // 5x +1, 5x -1
      // 6x +0
      // 1x +2, 1x -2

      const deck = deckService.initializeStandardDeck();

      const nullCards = deck.filter((c) => c.modifier === 'null');
      const x2Cards = deck.filter((c) => c.modifier === 'x2');
      const plus1Cards = deck.filter((c) => c.modifier === 1);
      const minus1Cards = deck.filter((c) => c.modifier === -1);
      const zeroCards = deck.filter((c) => c.modifier === 0);
      const plus2Cards = deck.filter((c) => c.modifier === 2);
      const minus2Cards = deck.filter((c) => c.modifier === -2);

      expect(nullCards).toHaveLength(1);
      expect(x2Cards).toHaveLength(1);
      expect(plus1Cards).toHaveLength(5);
      expect(minus1Cards).toHaveLength(5);
      expect(zeroCards).toHaveLength(6);
      expect(plus2Cards).toHaveLength(1);
      expect(minus2Cards).toHaveLength(1);
    });

    it('should mark null and x2 as reshuffle cards', () => {
      const deck = deckService.initializeStandardDeck();

      const nullCard = deck.find((c) => c.modifier === 'null');
      const x2Card = deck.find((c) => c.modifier === 'x2');

      expect(nullCard?.isReshuffle).toBe(true);
      expect(x2Card?.isReshuffle).toBe(true);
    });

    it('should mark other cards as non-reshuffle', () => {
      const deck = deckService.initializeStandardDeck();

      const nonReshuffleCards = deck.filter(
        (c) => c.modifier !== 'null' && c.modifier !== 'x2',
      );

      nonReshuffleCards.forEach((card) => {
        expect(card.isReshuffle).toBe(false);
      });
    });

    it('should shuffle deck initially', () => {
      const deck1 = deckService.initializeStandardDeck();
      const deck2 = deckService.initializeStandardDeck();

      // Extremely unlikely to have same card order if properly shuffled
      const sameOrder = JSON.stringify(deck1) === JSON.stringify(deck2);
      expect(sameOrder).toBe(false);
    });
  });

  describe('drawCard', () => {
    it('should draw top card from deck', () => {
      const deck = deckService.initializeStandardDeck();
      const topCard = deck[0];

      const { card, remainingDeck } = deckService.drawCard(deck);

      expect(card).toEqual(topCard);
      expect(remainingDeck).toHaveLength(deck.length - 1);
    });

    it('should remove drawn card from deck', () => {
      const deck = deckService.initializeStandardDeck();
      const topCard = deck[0];
      const secondCard = deck[1];

      const { remainingDeck } = deckService.drawCard(deck);

      // First card of remaining deck should be the original second card
      expect(remainingDeck[0]).toEqual(secondCard);
      expect(remainingDeck).toHaveLength(deck.length - 1);
    });

    it('should throw error if deck is empty', () => {
      const emptyDeck: AttackModifierCard[] = [];

      expect(() => deckService.drawCard(emptyDeck)).toThrow(
        'Cannot draw from empty deck',
      );
    });

    it('should not mutate original deck', () => {
      const deck = deckService.initializeStandardDeck();
      const originalLength = deck.length;

      deckService.drawCard(deck);

      expect(deck).toHaveLength(originalLength);
    });
  });

  describe('drawWithAdvantage', () => {
    it('should draw 2 cards and return both', () => {
      const deck = deckService.initializeStandardDeck();
      const firstCard = deck[0];
      const secondCard = deck[1];

      const { cards, remainingDeck } = deckService.drawWithAdvantage(deck);

      expect(cards).toHaveLength(2);
      expect(cards[0]).toEqual(firstCard);
      expect(cards[1]).toEqual(secondCard);
      expect(remainingDeck).toHaveLength(deck.length - 2);
    });

    it('should remove both cards from deck', () => {
      const deck = deckService.initializeStandardDeck();
      const thirdCard = deck[2];

      const { remainingDeck } = deckService.drawWithAdvantage(deck);

      // First card of remaining deck should be the original third card
      expect(remainingDeck[0]).toEqual(thirdCard);
      expect(remainingDeck).toHaveLength(deck.length - 2);
    });

    it('should throw if fewer than 2 cards in deck', () => {
      const almostEmptyDeck: AttackModifierCard[] = [
        { modifier: 0, isReshuffle: false },
      ];

      expect(() => deckService.drawWithAdvantage(almostEmptyDeck)).toThrow(
        'Not enough cards in deck for advantage draw',
      );
    });

    it('should throw if deck is empty', () => {
      const emptyDeck: AttackModifierCard[] = [];

      expect(() => deckService.drawWithAdvantage(emptyDeck)).toThrow();
    });

    it('should not mutate original deck', () => {
      const deck = deckService.initializeStandardDeck();
      const originalLength = deck.length;

      deckService.drawWithAdvantage(deck);

      expect(deck).toHaveLength(originalLength);
    });
  });

  describe('reshuffleDeck', () => {
    it('should combine deck and discard pile', () => {
      const deck: AttackModifierCard[] = [
        { modifier: 0, isReshuffle: false },
        { modifier: 1, isReshuffle: false },
      ];
      const discardPile: AttackModifierCard[] = [
        { modifier: -1, isReshuffle: false },
        { modifier: 2, isReshuffle: false },
      ];

      const reshuffled = deckService.reshuffleDeck(deck, discardPile);

      expect(reshuffled).toHaveLength(4);
    });

    it('should contain all cards from both piles', () => {
      const deck: AttackModifierCard[] = [
        { modifier: 0, isReshuffle: false },
      ];
      const discardPile: AttackModifierCard[] = [
        { modifier: 1, isReshuffle: false },
        { modifier: -1, isReshuffle: false },
      ];

      const reshuffled = deckService.reshuffleDeck(deck, discardPile);

      expect(reshuffled).toContainEqual(deck[0]);
      expect(reshuffled).toContainEqual(discardPile[0]);
      expect(reshuffled).toContainEqual(discardPile[1]);
    });

    it('should shuffle cards after combining', () => {
      const deck: AttackModifierCard[] = [
        { modifier: 0, isReshuffle: false },
        { modifier: 1, isReshuffle: false },
        { modifier: 2, isReshuffle: false },
      ];
      const discardPile: AttackModifierCard[] = [
        { modifier: -1, isReshuffle: false },
        { modifier: -2, isReshuffle: false },
      ];

      const originalOrder = [...deck, ...discardPile];
      const reshuffled = deckService.reshuffleDeck(deck, discardPile);

      // Extremely unlikely to maintain same order if properly shuffled
      const sameOrder = JSON.stringify(reshuffled) === JSON.stringify(originalOrder);
      expect(sameOrder).toBe(false);
    });

    it('should handle empty discard pile', () => {
      const deck: AttackModifierCard[] = [
        { modifier: 0, isReshuffle: false },
      ];
      const discardPile: AttackModifierCard[] = [];

      const reshuffled = deckService.reshuffleDeck(deck, discardPile);

      expect(reshuffled).toHaveLength(1);
    });

    it('should handle empty deck', () => {
      const deck: AttackModifierCard[] = [];
      const discardPile: AttackModifierCard[] = [
        { modifier: 0, isReshuffle: false },
        { modifier: 1, isReshuffle: false },
      ];

      const reshuffled = deckService.reshuffleDeck(deck, discardPile);

      expect(reshuffled).toHaveLength(2);
    });
  });

  describe('checkReshuffle', () => {
    it('should trigger reshuffle when null card is drawn', () => {
      const nullCard: AttackModifierCard = {
        modifier: 'null',
        isReshuffle: true,
      };

      const shouldReshuffle = deckService.checkReshuffle(nullCard);

      expect(shouldReshuffle).toBe(true);
    });

    it('should trigger reshuffle when x2 card is drawn', () => {
      const x2Card: AttackModifierCard = { modifier: 'x2', isReshuffle: true };

      const shouldReshuffle = deckService.checkReshuffle(x2Card);

      expect(shouldReshuffle).toBe(true);
    });

    it('should not trigger reshuffle for normal modifiers', () => {
      const normalCard: AttackModifierCard = {
        modifier: 1,
        isReshuffle: false,
      };

      const shouldReshuffle = deckService.checkReshuffle(normalCard);

      expect(shouldReshuffle).toBe(false);
    });

    it('should not trigger reshuffle for zero modifier', () => {
      const zeroCard: AttackModifierCard = { modifier: 0, isReshuffle: false };

      const shouldReshuffle = deckService.checkReshuffle(zeroCard);

      expect(shouldReshuffle).toBe(false);
    });

    it('should not trigger reshuffle for negative modifiers', () => {
      const negativeCard: AttackModifierCard = {
        modifier: -2,
        isReshuffle: false,
      };

      const shouldReshuffle = deckService.checkReshuffle(negativeCard);

      expect(shouldReshuffle).toBe(false);
    });
  });

  describe('addBless', () => {
    it('should add bless card to deck', () => {
      const deck = deckService.initializeStandardDeck();
      const initialSize = deck.length;

      const newDeck = deckService.addBless(deck);

      expect(newDeck).toHaveLength(initialSize + 1);
    });

    it('should add +2 bless card with bless effect', () => {
      const deck = deckService.initializeStandardDeck();

      const newDeck = deckService.addBless(deck);

      const blessCards = newDeck.filter(
        (c) => c.effects && c.effects.includes('bless'),
      );
      expect(blessCards.length).toBeGreaterThan(0);
      expect(blessCards[0].modifier).toBe(2);
      expect(blessCards[0].isReshuffle).toBe(false);
    });

    it('should shuffle bless card into deck', () => {
      const deck = deckService.initializeStandardDeck();
      const topCardBefore = deck[0];

      const newDeck = deckService.addBless(deck);

      // Deck should be shuffled (may or may not change top card)
      expect(newDeck.length).toBe(deck.length + 1);
    });

    it('should allow multiple bless cards', () => {
      const deck = deckService.initializeStandardDeck();

      const deck1 = deckService.addBless(deck);
      const deck2 = deckService.addBless(deck1);

      const blessCards = deck2.filter(
        (c) => c.effects && c.effects.includes('bless'),
      );
      expect(blessCards.length).toBe(2);
    });
  });

  describe('addCurse', () => {
    it('should add curse card to deck', () => {
      const deck = deckService.initializeStandardDeck();
      const initialSize = deck.length;

      const newDeck = deckService.addCurse(deck);

      expect(newDeck).toHaveLength(initialSize + 1);
    });

    it('should add null curse card with curse effect', () => {
      const deck = deckService.initializeStandardDeck();

      const newDeck = deckService.addCurse(deck);

      const curseCards = newDeck.filter(
        (c) => c.effects && c.effects.includes('curse'),
      );
      expect(curseCards.length).toBeGreaterThan(0);
      expect(curseCards[0].modifier).toBe('null');
      expect(curseCards[0].isReshuffle).toBe(false); // Curse doesn't trigger reshuffle
    });

    it('should shuffle curse card into deck', () => {
      const deck = deckService.initializeStandardDeck();

      const newDeck = deckService.addCurse(deck);

      expect(newDeck.length).toBe(deck.length + 1);
    });

    it('should allow multiple curse cards', () => {
      const deck = deckService.initializeStandardDeck();

      const deck1 = deckService.addCurse(deck);
      const deck2 = deckService.addCurse(deck1);

      const curseCards = deck2.filter(
        (c) => c.effects && c.effects.includes('curse'),
      );
      expect(curseCards.length).toBe(2);
    });
  });

  describe('removeBless', () => {
    it('should remove one bless card from deck', () => {
      const deck = deckService.initializeStandardDeck();
      const deck1 = deckService.addBless(deck);
      const deck2 = deckService.addBless(deck1); // 2 bless cards

      const blessCountBefore = deck2.filter(
        (c) => c.effects && c.effects.includes('bless'),
      ).length;
      const newDeck = deckService.removeBless(deck2);
      const blessCountAfter = newDeck.filter(
        (c) => c.effects && c.effects.includes('bless'),
      ).length;

      expect(blessCountAfter).toBe(blessCountBefore - 1);
    });

    it('should return unchanged deck if no bless cards', () => {
      const deck = deckService.initializeStandardDeck();
      const initialSize = deck.length;

      const newDeck = deckService.removeBless(deck);

      expect(newDeck).toHaveLength(initialSize);
    });

    it('should remove exactly one bless card', () => {
      const deck = deckService.initializeStandardDeck();
      const withBless = deckService.addBless(deck);

      const withoutBless = deckService.removeBless(withBless);

      expect(withoutBless.length).toBe(withBless.length - 1);
    });
  });

  describe('removeCurse', () => {
    it('should remove one curse card from deck', () => {
      const deck = deckService.initializeStandardDeck();
      const deck1 = deckService.addCurse(deck);
      const deck2 = deckService.addCurse(deck1); // 2 curse cards

      const curseCountBefore = deck2.filter(
        (c) => c.effects && c.effects.includes('curse'),
      ).length;
      const newDeck = deckService.removeCurse(deck2);
      const curseCountAfter = newDeck.filter(
        (c) => c.effects && c.effects.includes('curse'),
      ).length;

      expect(curseCountAfter).toBe(curseCountBefore - 1);
    });

    it('should return unchanged deck if no curse cards', () => {
      const deck = deckService.initializeStandardDeck();
      const initialSize = deck.length;

      const newDeck = deckService.removeCurse(deck);

      expect(newDeck).toHaveLength(initialSize);
    });

    it('should remove exactly one curse card', () => {
      const deck = deckService.initializeStandardDeck();
      const withCurse = deckService.addCurse(deck);

      const withoutCurse = deckService.removeCurse(withCurse);

      expect(withoutCurse.length).toBe(withCurse.length - 1);
    });
  });

  describe('shuffleDeck', () => {
    it('should randomize card order', () => {
      const cards: AttackModifierCard[] = [
        { modifier: 0, isReshuffle: false },
        { modifier: 1, isReshuffle: false },
        { modifier: 2, isReshuffle: false },
        { modifier: -1, isReshuffle: false },
        { modifier: -2, isReshuffle: false },
        { modifier: 'x2', isReshuffle: true },
        { modifier: 'null', isReshuffle: true },
      ];

      const originalOrder = [...cards];
      const shuffled = deckService.shuffleDeck(cards);

      // Extremely unlikely to maintain exact same order
      const sameOrder = JSON.stringify(shuffled) === JSON.stringify(originalOrder);
      expect(sameOrder).toBe(false);
    });

    it('should preserve all cards', () => {
      const cards: AttackModifierCard[] = [
        { modifier: 0, isReshuffle: false },
        { modifier: 1, isReshuffle: false },
        { modifier: 2, isReshuffle: false },
      ];

      const shuffled = deckService.shuffleDeck(cards);

      expect(shuffled).toHaveLength(cards.length);
      cards.forEach((card) => {
        expect(shuffled).toContainEqual(card);
      });
    });

    it('should handle single card deck', () => {
      const cards: AttackModifierCard[] = [
        { modifier: 0, isReshuffle: false },
      ];

      const shuffled = deckService.shuffleDeck(cards);

      expect(shuffled).toHaveLength(1);
      expect(shuffled[0]).toEqual(cards[0]);
    });

    it('should handle empty deck', () => {
      const cards: AttackModifierCard[] = [];

      const shuffled = deckService.shuffleDeck(cards);

      expect(shuffled).toHaveLength(0);
    });

    it('should not mutate original array', () => {
      const cards: AttackModifierCard[] = [
        { modifier: 0, isReshuffle: false },
        { modifier: 1, isReshuffle: false },
      ];
      const originalLength = cards.length;

      deckService.shuffleDeck(cards);

      expect(cards).toHaveLength(originalLength);
    });
  });

  describe('getRemainingCards', () => {
    it('should return number of cards in deck', () => {
      const deck = deckService.initializeStandardDeck();

      const count = deckService.getRemainingCards(deck);

      expect(count).toBe(20);
    });

    it('should return correct count after modifications', () => {
      const deck = deckService.initializeStandardDeck();
      const withBless = deckService.addBless(deck);

      const count = deckService.getRemainingCards(withBless);

      expect(count).toBe(21);
    });

    it('should return 0 for empty deck', () => {
      const emptyDeck: AttackModifierCard[] = [];

      const count = deckService.getRemainingCards(emptyDeck);

      expect(count).toBe(0);
    });
  });
});
