/**
 * Modifier Deck Service (US2 - T094)
 *
 * Manages attack modifier decks:
 * - Initialize standard 20-card deck
 * - Draw cards and handle reshuffles
 * - Add/remove bless and curse cards
 * - Handle advantage/disadvantage draws
 */

import { Injectable } from '@nestjs/common';
import { AttackModifierCard } from '../../../shared/types/entities';

@Injectable()
export class ModifierDeckService {
  /**
   * Initialize a standard 20-card attack modifier deck
   */
  initializeStandardDeck(): AttackModifierCard[] {
    const deck: AttackModifierCard[] = [
      // 1x null (miss, reshuffle)
      { modifier: 'null', isReshuffle: true },
      // 1x x2 (critical, reshuffle)
      { modifier: 'x2', isReshuffle: true },
      // 5x +1
      { modifier: 1, isReshuffle: false },
      { modifier: 1, isReshuffle: false },
      { modifier: 1, isReshuffle: false },
      { modifier: 1, isReshuffle: false },
      { modifier: 1, isReshuffle: false },
      // 5x -1
      { modifier: -1, isReshuffle: false },
      { modifier: -1, isReshuffle: false },
      { modifier: -1, isReshuffle: false },
      { modifier: -1, isReshuffle: false },
      { modifier: -1, isReshuffle: false },
      // 6x +0
      { modifier: 0, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
      { modifier: 0, isReshuffle: false },
      // 1x -2
      { modifier: -2, isReshuffle: false },
      // 1x +2
      { modifier: 2, isReshuffle: false },
    ];

    return this.shuffleDeck(deck);
  }

  /**
   * Draw top card from deck
   */
  drawCard(deck: AttackModifierCard[]): {
    card: AttackModifierCard;
    remainingDeck: AttackModifierCard[];
  } {
    if (deck.length === 0) {
      throw new Error('Cannot draw from empty deck');
    }

    const [card, ...remainingDeck] = deck;
    return { card, remainingDeck };
  }

  /**
   * Draw 2 cards for advantage/disadvantage
   */
  drawWithAdvantage(deck: AttackModifierCard[]): {
    cards: [AttackModifierCard, AttackModifierCard];
    remainingDeck: AttackModifierCard[];
  } {
    if (deck.length < 2) {
      throw new Error('Not enough cards in deck for advantage draw');
    }

    const [card1, card2, ...remainingDeck] = deck;
    return { cards: [card1, card2], remainingDeck };
  }

  /**
   * Reshuffle discard pile back into deck
   */
  reshuffleDeck(
    deck: AttackModifierCard[],
    discardPile: AttackModifierCard[],
  ): AttackModifierCard[] {
    const combined = [...deck, ...discardPile];
    return this.shuffleDeck(combined);
  }

  /**
   * Check if card triggers reshuffle (null or x2)
   */
  checkReshuffle(card: AttackModifierCard): boolean {
    return card.isReshuffle;
  }

  /**
   * Add bless card (+2, temporary)
   */
  addBless(deck: AttackModifierCard[]): AttackModifierCard[] {
    const blessCard: AttackModifierCard = {
      modifier: 2,
      isReshuffle: false,
      effects: ['bless'],
    };

    const newDeck = [...deck, blessCard];
    return this.shuffleDeck(newDeck);
  }

  /**
   * Add curse card (null, temporary)
   */
  addCurse(deck: AttackModifierCard[]): AttackModifierCard[] {
    const curseCard: AttackModifierCard = {
      modifier: 'null',
      isReshuffle: false,
      effects: ['curse'],
    };

    const newDeck = [...deck, curseCard];
    return this.shuffleDeck(newDeck);
  }

  /**
   * Remove one bless card from deck
   */
  removeBless(deck: AttackModifierCard[]): AttackModifierCard[] {
    const blessIndex = deck.findIndex((card) =>
      card.effects?.includes('bless'),
    );

    if (blessIndex === -1) {
      return deck; // No bless card to remove
    }

    return [...deck.slice(0, blessIndex), ...deck.slice(blessIndex + 1)];
  }

  /**
   * Remove one curse card from deck
   */
  removeCurse(deck: AttackModifierCard[]): AttackModifierCard[] {
    const curseIndex = deck.findIndex((card) =>
      card.effects?.includes('curse'),
    );

    if (curseIndex === -1) {
      return deck; // No curse card to remove
    }

    return [...deck.slice(0, curseIndex), ...deck.slice(curseIndex + 1)];
  }

  /**
   * Shuffle deck (Fisher-Yates algorithm)
   */
  shuffleDeck(deck: AttackModifierCard[]): AttackModifierCard[] {
    const shuffled = [...deck];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Get remaining card count
   */
  getRemainingCards(deck: AttackModifierCard[]): number {
    return deck.length;
  }
}
